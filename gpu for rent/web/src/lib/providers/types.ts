export type ProviderName = 'vast' | 'runpod';

export interface ProxyGpuOffer {
  providerMachineId: string;
  provider: ProviderName;
  gpuModel: string;
  gpuCount: number;
  vramGb: number;
  ramGb: number;
  vcpuCount: number;
  storageGb: number;
  pricePerGpuHrUsd: number;
  storagePricePerGbMonthUsd: number;
  location: string;
  available: boolean;
  reliability: number;
  internetDownMbps?: number;
  internetUpMbps?: number;
}

export interface ProvisionOpts {
  providerMachineId: string;
  dockerImage: string;
  gpuCount: number;
  diskSizeGb: number;
  sshPublicKey?: string;
  env?: Record<string, string>;
}

export interface ConnectionInfo {
  sshHost?: string;
  sshPort?: number;
  sshUser?: string;
  sshPassword?: string;
  jupyterUrl?: string;
  publicIp?: string;
}

export interface ProvisionResult {
  providerId: string;
  connectionInfo: ConnectionInfo;
  actualCostPerHrUsd: number;
}

export type InstanceStatus = 'creating' | 'running' | 'stopped' | 'destroyed' | 'error' | 'unknown';

export interface GpuProvider {
  name: ProviderName;
  syncAvailableGpus(): Promise<ProxyGpuOffer[]>;
  provisionInstance(opts: ProvisionOpts): Promise<ProvisionResult>;
  stopInstance(providerId: string): Promise<void>;
  destroyInstance(providerId: string): Promise<void>;
  getInstanceStatus(providerId: string): Promise<InstanceStatus>;
}
