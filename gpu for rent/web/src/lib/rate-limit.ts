type RateLimitStore = Map<string, { count: number; resetAt: number }>

const stores = new Map<string, RateLimitStore>()

function getStore(name: string): RateLimitStore {
  if (!stores.has(name)) {
    stores.set(name, new Map())
  }
  return stores.get(name)!
}

export interface RateLimitConfig {
  name: string
  maxRequests: number
  windowMs: number
}

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetAt: number
}

export function rateLimit(config: RateLimitConfig, key: string): RateLimitResult {
  const store = getStore(config.name)
  const now = Date.now()
  const entry = store.get(key)

  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + config.windowMs })
    return { allowed: true, remaining: config.maxRequests - 1, resetAt: now + config.windowMs }
  }

  if (entry.count >= config.maxRequests) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt }
  }

  entry.count++
  return { allowed: true, remaining: config.maxRequests - entry.count, resetAt: entry.resetAt }
}

// Predefined limits
export const BILLING_LIMIT: RateLimitConfig = {
  name: 'billing',
  maxRequests: 10,
  windowMs: 60 * 1000,
}

export const RENT_LIMIT: RateLimitConfig = {
  name: 'rent',
  maxRequests: 5,
  windowMs: 60 * 1000,
}

export const API_KEY_LIMIT: RateLimitConfig = {
  name: 'api_keys',
  maxRequests: 20,
  windowMs: 60 * 1000,
}

export const SERVERLESS_LIMIT: RateLimitConfig = {
  name: 'serverless',
  maxRequests: 100,
  windowMs: 60 * 1000,
}

// Cleanup stale entries every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now()
    stores.forEach((store) => {
      store.forEach((entry, key) => {
        if (now > entry.resetAt) {
          store.delete(key)
        }
      })
    })
  }, 5 * 60 * 1000)
}
