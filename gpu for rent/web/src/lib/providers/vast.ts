import type { GpuProvider, ProxyGpuOffer, ProvisionOpts, ProvisionResult, InstanceStatus } from './types';

const VAST_API_BASE = 'https://cloud.vast.ai/api/v0';

function headers(): HeadersInit {
  const key = process.env.VAST_API_KEY;
  if (!key) throw new Error('VAST_API_KEY not configured');
  return {
    'Authorization': `Bearer ${key}`,
    'Content-Type': 'application/json',
  };
}

function normalizeGpuModel(raw: string): string {
  const map: Record<string, string> = {
    'RTX 4090': 'RTX 4090',
    'RTX 3090': 'RTX 3090',
    'A100': 'A100 80GB',
    'A100 80GB': 'A100 80GB',
    'A100_SXM4': 'A100 80GB',
    'A100_PCIE': 'A100 80GB',
    'H100': 'H100 SXM5',
    'H100_SXM5': 'H100 SXM5',
    'H100_PCIE': 'H100 80GB',
    'L40S': 'L40S 48GB',
    'A6000': 'A6000 48GB',
    'RTX 4080': 'RTX 4080',
    'RTX 3080': 'RTX 3080',
  };
  for (const [pattern, normalized] of Object.entries(map)) {
    if (raw.toUpperCase().includes(pattern.toUpperCase())) return normalized;
  }
  return raw;
}

async function vastFetch(path: string, init?: RequestInit) {
  const res = await fetch(`${VAST_API_BASE}${path}`, {
    ...init,
    headers: { ...headers(), ...init?.headers },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Vast API ${res.status}: ${text}`);
  }
  return res.json();
}

export const vastProvider: GpuProvider = {
  name: 'vast',

  async syncAvailableGpus(): Promise<ProxyGpuOffer[]> {
    const data = await vastFetch('/bundles/', {
      method: 'GET',
    });

    const offers: ProxyGpuOffer[] = [];
    const items = data.offers || data || [];

    for (const item of items) {
      if (!item.gpu_name || !item.num_gpus || !item.dph_total) continue;
      if (item.rented || item.verification === 'unverified') continue;

      offers.push({
        providerMachineId: String(item.id),
        provider: 'vast',
        gpuModel: normalizeGpuModel(item.gpu_name),
        gpuCount: item.num_gpus,
        vramGb: Math.round(item.gpu_ram || 0),
        ramGb: Math.round((item.cpu_ram || 0) / 1024),
        vcpuCount: item.cpu_cores || 0,
        storageGb: Math.round(item.disk_space || 0),
        pricePerGpuHrUsd: item.dph_total / item.num_gpus,
        storagePricePerGbMonthUsd: (item.storage_cost || 0.05) * 720,
        location: item.geolocation || 'Unknown',
        available: true,
        reliability: item.reliability2 || item.reliability || 0.9,
        internetDownMbps: item.inet_down || undefined,
        internetUpMbps: item.inet_up || undefined,
      });
    }

    return offers;
  },

  async provisionInstance(opts: ProvisionOpts): Promise<ProvisionResult> {
    const body: Record<string, unknown> = {
      image: opts.dockerImage,
      disk: opts.diskSizeGb,
      onstart: opts.sshPublicKey
        ? `mkdir -p ~/.ssh && echo '${opts.sshPublicKey}' >> ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys`
        : undefined,
      env: opts.env || {},
    };

    const data = await vastFetch(`/asks/${opts.providerMachineId}/`, {
      method: 'PUT',
      body: JSON.stringify(body),
    });

    const instanceId = data.new_contract || data.id || String(data);

    let connectionInfo = { sshHost: '', sshPort: 22, sshUser: 'root' };
    let attempts = 0;
    while (attempts < 20) {
      await new Promise(r => setTimeout(r, 3000));
      try {
        const instances = await vastFetch('/instances/');
        const inst = (instances.instances || instances || []).find(
          (i: Record<string, unknown>) => String(i.id) === String(instanceId)
        );
        if (inst && inst.actual_status === 'running' && inst.ssh_host) {
          connectionInfo = {
            sshHost: inst.ssh_host,
            sshPort: inst.ssh_port || 22,
            sshUser: 'root',
          };
          break;
        }
      } catch { /* retry */ }
      attempts++;
    }

    return {
      providerId: String(instanceId),
      connectionInfo,
      actualCostPerHrUsd: data.dph_total || 0,
    };
  },

  async stopInstance(providerId: string): Promise<void> {
    await vastFetch(`/instances/${providerId}/`, {
      method: 'PUT',
      body: JSON.stringify({ state: 'stopped' }),
    });
  },

  async destroyInstance(providerId: string): Promise<void> {
    await vastFetch(`/instances/${providerId}/`, {
      method: 'DELETE',
    });
  },

  async getInstanceStatus(providerId: string): Promise<InstanceStatus> {
    try {
      const instances = await vastFetch('/instances/');
      const inst = (instances.instances || instances || []).find(
        (i: Record<string, unknown>) => String(i.id) === providerId
      );
      if (!inst) return 'destroyed';

      const statusMap: Record<string, InstanceStatus> = {
        running: 'running',
        loading: 'creating',
        created: 'creating',
        exited: 'stopped',
        stopped: 'stopped',
        error: 'error',
      };
      return statusMap[inst.actual_status] || 'unknown';
    } catch {
      return 'unknown';
    }
  },
};
