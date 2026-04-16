/**
 * Currency utilities — USD is the platform's source of truth.
 * Razorpay charges in INR at checkout; conversion happens at the API layer.
 */

const USD_TO_INR = 85

export function formatUSD(
  amount: number,
  opts?: { decimals?: number; suffix?: string; compact?: boolean }
): string {
  const decimals = opts?.decimals ?? 2
  const suffix = opts?.suffix ?? ''
  if (opts?.compact && amount >= 1000) {
    return `$${(amount / 1000).toFixed(1)}k${suffix}`
  }
  return `$${amount.toFixed(decimals)}${suffix}`
}

/** Convert a USD amount to INR for Razorpay checkout */
export function usdToInr(usd: number): number {
  return usd * USD_TO_INR
}

/** Convert an INR amount back to USD (e.g. from Razorpay webhook) */
export function inrToUsd(inr: number): number {
  return inr / USD_TO_INR
}

export { USD_TO_INR }
