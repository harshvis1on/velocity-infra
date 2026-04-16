import { USD_TO_INR } from '@/lib/currency'

const DEFAULT_MARGIN_PERCENT = 20;

export function getMarginPercent(): number {
  const env = process.env.PROXY_MARGIN_PERCENT;
  if (env) {
    const parsed = parseFloat(env);
    if (!isNaN(parsed) && parsed >= 0 && parsed <= 100) return parsed;
  }
  return DEFAULT_MARGIN_PERCENT;
}

export function getUsdToInr(): number {
  const env = process.env.USD_TO_INR_RATE;
  if (env) {
    const parsed = parseFloat(env);
    if (!isNaN(parsed) && parsed > 0) return parsed;
  }
  return USD_TO_INR;
}

export function applyMargin(upstreamPriceUsd: number): {
  priceInr: number;
  costInr: number;
  marginInr: number;
} {
  const rate = getUsdToInr();
  const margin = getMarginPercent() / 100;
  const costInr = upstreamPriceUsd * rate;
  const priceInr = costInr * (1 + margin);
  return {
    priceInr: Math.round(priceInr * 100) / 100,
    costInr: Math.round(costInr * 100) / 100,
    marginInr: Math.round((priceInr - costInr) * 100) / 100,
  };
}

export function applyStorageMargin(upstreamPerGbMonthUsd: number): number {
  const rate = getUsdToInr();
  const margin = getMarginPercent() / 100;
  return Math.round(upstreamPerGbMonthUsd * rate * (1 + margin) * 100) / 100;
}
