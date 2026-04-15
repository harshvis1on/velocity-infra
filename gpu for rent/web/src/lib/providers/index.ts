import type { GpuProvider, ProviderName } from './types';
import { vastProvider } from './vast';
import { runpodProvider } from './runpod';

const providers: Record<ProviderName, GpuProvider> = {
  vast: vastProvider,
  runpod: runpodProvider,
};

export function getProvider(name: ProviderName): GpuProvider {
  const provider = providers[name];
  if (!provider) throw new Error(`Unknown provider: ${name}`);
  return provider;
}

export function getAllProviders(): GpuProvider[] {
  return Object.values(providers);
}

export function getEnabledProviders(): GpuProvider[] {
  const enabled: GpuProvider[] = [];
  if (process.env.VAST_API_KEY) enabled.push(vastProvider);
  if (process.env.RUNPOD_API_KEY) enabled.push(runpodProvider);
  return enabled;
}

export function getProxyHostId(): string {
  const id = process.env.VELOCITY_PROXY_HOST_ID;
  if (!id) throw new Error('VELOCITY_PROXY_HOST_ID not configured');
  return id;
}

export { type GpuProvider, type ProviderName } from './types';
