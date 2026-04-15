import { NextResponse } from 'next/server'
import { rateLimit, type RateLimitConfig } from './rate-limit'

export function withRateLimit(config: RateLimitConfig) {
  return function getClientKey(request: Request): NextResponse | null {
    const forwarded = request.headers.get('x-forwarded-for')
    const ip = forwarded?.split(',')[0]?.trim() || 'unknown'

    const result = rateLimit(config, ip)

    if (!result.allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': String(config.maxRequests),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': String(Math.ceil(result.resetAt / 1000)),
            'Retry-After': String(Math.ceil((result.resetAt - Date.now()) / 1000)),
          },
        }
      )
    }

    return null
  }
}
