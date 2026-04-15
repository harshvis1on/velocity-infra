import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/utils/supabase/middleware'

const RATE_LIMIT_WINDOW_MS = 60_000
const MAX_REQUESTS_PER_WINDOW = 120
const MAX_AUTH_FAILURES_PER_WINDOW = 10

const rateLimitMap = new Map<string, { count: number; authFails: number; windowStart: number }>()

function getClientIp(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  )
}

function checkRateLimit(ip: string): { allowed: boolean; isAuthAbuse: boolean } {
  const now = Date.now()
  const entry = rateLimitMap.get(ip)

  if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
    rateLimitMap.set(ip, { count: 1, authFails: 0, windowStart: now })
    return { allowed: true, isAuthAbuse: false }
  }

  entry.count++

  if (entry.count > MAX_REQUESTS_PER_WINDOW) {
    return { allowed: false, isAuthAbuse: false }
  }
  if (entry.authFails > MAX_AUTH_FAILURES_PER_WINDOW) {
    return { allowed: false, isAuthAbuse: true }
  }

  return { allowed: true, isAuthAbuse: false }
}

function recordAuthFailure(ip: string) {
  const entry = rateLimitMap.get(ip)
  if (entry) entry.authFails++
}

const ALLOWED_ORIGINS = [
  'https://velocity-infra.vercel.app',
  'http://localhost:3000',
  'http://localhost:3001',
]

function isOriginAllowed(origin: string | null): boolean {
  if (!origin) return true // Same-origin requests (no Origin header)
  return ALLOWED_ORIGINS.some(o => origin.startsWith(o))
}

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])

function isApiRoute(pathname: string): boolean {
  return pathname.startsWith('/api/')
}

function isApiKeyAuth(request: NextRequest): boolean {
  const auth = request.headers.get('authorization') || ''
  return auth.includes('vi_live_') || request.headers.get('x-velocity-key') === 'true'
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const method = request.method
  const ip = getClientIp(request)

  // --- Rate limiting ---
  const { allowed, isAuthAbuse } = checkRateLimit(ip)
  if (!allowed) {
    return NextResponse.json(
      { error: isAuthAbuse ? 'Too many failed auth attempts. Try again later.' : 'Rate limit exceeded. Try again in a minute.' },
      { status: 429, headers: { 'Retry-After': '60' } }
    )
  }

  // --- Origin verification for mutating requests ---
  if (MUTATING_METHODS.has(method) && isApiRoute(pathname)) {
    if (!isApiKeyAuth(request)) {
      const origin = request.headers.get('origin')
      if (!isOriginAllowed(origin)) {
        recordAuthFailure(ip)
        return NextResponse.json(
          { error: 'Forbidden: invalid origin' },
          { status: 403 }
        )
      }
    }
  }

  // --- Static/public paths that skip session logic ---
  if (
    pathname.startsWith('/agent/') ||
    pathname.startsWith('/api/host/machines') ||
    pathname.startsWith('/api/host/heartbeat')
  ) {
    return NextResponse.next()
  }

  // --- Supabase session management + route protection ---
  const response = await updateSession(request)

  // Track auth failures for IP abuse detection
  if (pathname.startsWith('/api/auth') || pathname === '/login') {
    if (response.status === 401 || response.status === 403) {
      recordAuthFailure(ip)
    }
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
