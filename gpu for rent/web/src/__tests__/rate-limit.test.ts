import { describe, it, expect, beforeEach, vi } from 'vitest'
import { rateLimit, BILLING_LIMIT, RENT_LIMIT, API_KEY_LIMIT, SERVERLESS_LIMIT } from '@/lib/rate-limit'
import type { RateLimitConfig } from '@/lib/rate-limit'

describe('Rate Limiter', () => {
  const testConfig: RateLimitConfig = {
    name: 'test_limiter',
    maxRequests: 3,
    windowMs: 10_000,
  }

  it('allows requests under the limit', () => {
    const key = `test_${Date.now()}`
    const r1 = rateLimit(testConfig, key)
    expect(r1.allowed).toBe(true)
    expect(r1.remaining).toBe(2)

    const r2 = rateLimit(testConfig, key)
    expect(r2.allowed).toBe(true)
    expect(r2.remaining).toBe(1)
  })

  it('blocks requests at the limit', () => {
    const key = `block_${Date.now()}`
    rateLimit(testConfig, key)
    rateLimit(testConfig, key)
    rateLimit(testConfig, key)

    const r4 = rateLimit(testConfig, key)
    expect(r4.allowed).toBe(false)
    expect(r4.remaining).toBe(0)
  })

  it('resets after window expires', () => {
    const key = `expire_${Date.now()}`
    const shortConfig: RateLimitConfig = { name: 'short_test', maxRequests: 1, windowMs: 50 }

    const r1 = rateLimit(shortConfig, key)
    expect(r1.allowed).toBe(true)

    const r2 = rateLimit(shortConfig, key)
    expect(r2.allowed).toBe(false)

    vi.useFakeTimers()
    vi.advanceTimersByTime(100)
    const r3 = rateLimit(shortConfig, key)
    expect(r3.allowed).toBe(true)
    vi.useRealTimers()
  })

  it('tracks different keys independently', () => {
    const now = Date.now()
    const keyA = `a_${now}`
    const keyB = `b_${now}`

    rateLimit(testConfig, keyA)
    rateLimit(testConfig, keyA)
    rateLimit(testConfig, keyA)

    const rA = rateLimit(testConfig, keyA)
    expect(rA.allowed).toBe(false)

    const rB = rateLimit(testConfig, keyB)
    expect(rB.allowed).toBe(true)
  })

  it('returns a future resetAt timestamp', () => {
    const key = `reset_${Date.now()}`
    const result = rateLimit(testConfig, key)
    expect(result.resetAt).toBeGreaterThan(Date.now() - 1)
  })

  describe('predefined configs', () => {
    it('BILLING_LIMIT allows 10 per 60s', () => {
      expect(BILLING_LIMIT.maxRequests).toBe(10)
      expect(BILLING_LIMIT.windowMs).toBe(60_000)
    })

    it('RENT_LIMIT allows 5 per 60s', () => {
      expect(RENT_LIMIT.maxRequests).toBe(5)
      expect(RENT_LIMIT.windowMs).toBe(60_000)
    })

    it('API_KEY_LIMIT allows 20 per 60s', () => {
      expect(API_KEY_LIMIT.maxRequests).toBe(20)
      expect(API_KEY_LIMIT.windowMs).toBe(60_000)
    })

    it('SERVERLESS_LIMIT allows 100 per 60s', () => {
      expect(SERVERLESS_LIMIT.maxRequests).toBe(100)
      expect(SERVERLESS_LIMIT.windowMs).toBe(60_000)
    })
  })
})
