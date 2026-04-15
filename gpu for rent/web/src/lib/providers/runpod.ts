import type { GpuProvider, ProxyGpuOffer, ProvisionOpts, ProvisionResult, InstanceStatus } from './types';

const RUNPOD_API = 'https://api.runpod.io/graphql';

function getApiKey(): string {
  const key = process.env.RUNPOD_API_KEY;
  if (!key) throw new Error('RUNPOD_API_KEY not configured');
  return key;
}

function normalizeGpuModel(displayName: string): string {
  const map: Record<string, string> = {
    'NVIDIA GeForce RTX 4090': 'RTX 4090',
    'NVIDIA GeForce RTX 3090': 'RTX 3090',
    'NVIDIA A100 80GB PCIe': 'A100 80GB',
    'NVIDIA A100-SXM4-80GB': 'A100 80GB',
    'NVIDIA H100 80GB HBM3': 'H100 SXM5',
    'NVIDIA H100 PCIe': 'H100 80GB',
    'NVIDIA L40S': 'L40S 48GB',
    'NVIDIA RTX A6000': 'A6000 48GB',
    'NVIDIA RTX 4080': 'RTX 4080',
    'NVIDIA A40': 'A40 48GB',
  };
  for (const [pattern, normalized] of Object.entries(map)) {
    if (displayName.includes(pattern)) return normalized;
  }
  if (displayName.includes('4090')) return 'RTX 4090';
  if (displayName.includes('A100')) return 'A100 80GB';
  if (displayName.includes('H100')) return 'H100 SXM5';
  return displayName;
}

async function graphql<T = Record<string, unknown>>(query: string, variables?: Record<string, unknown>): Promise<T> {
  const res = await fetch(`${RUNPOD_API}?api_key=${getApiKey()}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`RunPod API ${res.status}: ${text}`);
  }
  const json = await res.json();
  if (json.errors?.length) {
    throw new Error(`RunPod GraphQL: ${json.errors[0].message}`);
  }
  return json.data as T;
}

export const runpodProvider: GpuProvider = {
  name: 'runpod',

  async syncAvailableGpus(): Promise<ProxyGpuOffer[]> {
    const data = await graphql<{
      gpuTypes: Array<{
        id: string;
        displayName: string;
        memoryInGb: number;
        secureCloud: boolean;
        communityCloud: boolean;
        lowestPrice: {
          minimumBidPrice: number;
          uninterruptablePrice: number;
          stockStatus: string;
        } | null;
      }>;
    }>(`
      query {
        gpuTypes {
          id
          displayName
          memoryInGb
          secureCloud
          communityCloud
          lowestPrice(input: { gpuCount: 1 }) {
            minimumBidPrice
            uninterruptablePrice
            stockStatus
          }
        }
      }
    `);

    const offers: ProxyGpuOffer[] = [];

    for (const gpu of data.gpuTypes) {
      if (!gpu.lowestPrice) continue;
      if (gpu.lowestPrice.stockStatus === 'Out of Stock') continue;
      if (!gpu.lowestPrice.uninterruptablePrice || gpu.lowestPrice.uninterruptablePrice <= 0) continue;

      offers.push({
        providerMachineId: gpu.id,
        provider: 'runpod',
        gpuModel: normalizeGpuModel(gpu.displayName),
        gpuCount: 1,
        vramGb: gpu.memoryInGb,
        ramGb: 32,
        vcpuCount: 8,
        storageGb: 100,
        pricePerGpuHrUsd: gpu.lowestPrice.uninterruptablePrice,
        storagePricePerGbMonthUsd: 0.07,
        location: gpu.secureCloud ? 'Secure Cloud' : 'Community Cloud',
        available: true,
        reliability: gpu.secureCloud ? 0.99 : 0.95,
      });
    }

    return offers;
  },

  async provisionInstance(opts: ProvisionOpts): Promise<ProvisionResult> {
    const data = await graphql<{
      podFindAndDeployOnDemand: {
        id: string;
        costPerHr: number;
        desiredStatus: string;
        runtime: {
          ports: Array<{ ip: string; privatePort: number; publicPort: number }>;
        } | null;
      };
    }>(`
      mutation($input: PodFindAndDeployOnDemandInput!) {
        podFindAndDeployOnDemand(input: $input) {
          id
          costPerHr
          desiredStatus
          runtime {
            ports {
              ip
              privatePort
              publicPort
            }
          }
        }
      }
    `, {
      input: {
        gpuTypeId: opts.providerMachineId,
        cloudType: 'ALL',
        gpuCount: opts.gpuCount,
        volumeInGb: opts.diskSizeGb,
        containerDiskInGb: 20,
        dockerArgs: '',
        imageName: opts.dockerImage,
        env: Object.entries(opts.env || {}).map(([key, value]) => ({ key, value })),
        ports: '22/tcp,8888/http',
        name: `velocity-${Date.now()}`,
      },
    });

    const pod = data.podFindAndDeployOnDemand;
    let connectionInfo = { sshHost: '', sshPort: 22, sshUser: 'root' };

    let attempts = 0;
    while (attempts < 30) {
      await new Promise(r => setTimeout(r, 5000));
      try {
        const status = await graphql<{
          pod: {
            id: string;
            desiredStatus: string;
            runtime: {
              ports: Array<{ ip: string; privatePort: number; publicPort: number }>;
            } | null;
          };
        }>(`
          query($podId: String!) {
            pod(input: { podId: $podId }) {
              id
              desiredStatus
              runtime {
                ports {
                  ip
                  privatePort
                  publicPort
                }
              }
            }
          }
        `, { podId: pod.id });

        if (status.pod.runtime?.ports?.length) {
          const sshPort = status.pod.runtime.ports.find(p => p.privatePort === 22);
          if (sshPort) {
            connectionInfo = {
              sshHost: sshPort.ip,
              sshPort: sshPort.publicPort,
              sshUser: 'root',
            };
            break;
          }
        }
      } catch { /* retry */ }
      attempts++;
    }

    return {
      providerId: pod.id,
      connectionInfo,
      actualCostPerHrUsd: pod.costPerHr || 0,
    };
  },

  async stopInstance(providerId: string): Promise<void> {
    await graphql(`
      mutation($podId: String!) {
        podStop(input: { podId: $podId }) { id desiredStatus }
      }
    `, { podId: providerId });
  },

  async destroyInstance(providerId: string): Promise<void> {
    await graphql(`
      mutation($podId: String!) {
        podTerminate(input: { podId: $podId })
      }
    `, { podId: providerId });
  },

  async getInstanceStatus(providerId: string): Promise<InstanceStatus> {
    try {
      const data = await graphql<{
        pod: { id: string; desiredStatus: string; runtime: unknown } | null;
      }>(`
        query($podId: String!) {
          pod(input: { podId: $podId }) {
            id
            desiredStatus
            runtime { uptimeInSeconds }
          }
        }
      `, { podId: providerId });

      if (!data.pod) return 'destroyed';

      const statusMap: Record<string, InstanceStatus> = {
        RUNNING: 'running',
        CREATED: 'creating',
        RESTARTING: 'creating',
        EXITED: 'stopped',
        PAUSED: 'stopped',
        DEAD: 'error',
      };
      return statusMap[data.pod.desiredStatus] || 'unknown';
    } catch {
      return 'unknown';
    }
  },
};
