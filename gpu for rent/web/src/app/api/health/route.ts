import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export async function GET() {
  const start = Date.now()
  const checks: Record<string, { status: string; latency_ms?: number; error?: string }> = {}

  try {
    const dbStart = Date.now()
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    const { error } = await supabase.from('users').select('id').limit(1)
    checks.database = {
      status: error ? 'unhealthy' : 'healthy',
      latency_ms: Date.now() - dbStart,
      ...(error && { error: error.message }),
    }
  } catch (e: any) {
    checks.database = { status: 'unhealthy', error: e.message }
  }

  checks.razorpay = {
    status: process.env.RAZORPAY_KEY_ID ? 'configured' : 'missing',
  }

  checks.supabase_auth = {
    status: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'configured' : 'missing',
  }

  checks.cron_secret = {
    status: process.env.CRON_SECRET ? 'configured' : 'missing',
    ...((!process.env.CRON_SECRET) && { error: 'CRON_SECRET not set — scheduled tasks (billing, payouts) will reject requests' }),
  }

  checks.webhook_secret = {
    status: process.env.RAZORPAY_WEBHOOK_SECRET ? 'configured' : 'missing',
    ...((!process.env.RAZORPAY_WEBHOOK_SECRET) && { error: 'RAZORPAY_WEBHOOK_SECRET not set — payment webhooks will return 503' }),
  }

  const allHealthy = Object.values(checks).every(
    c => c.status === 'healthy' || c.status === 'configured'
  )

  return NextResponse.json(
    {
      status: allHealthy ? 'healthy' : 'degraded',
      version: process.env.npm_package_version || '1.0.0',
      timestamp: new Date().toISOString(),
      uptime_ms: Date.now() - start,
      checks,
    },
    { status: allHealthy ? 200 : 503 }
  )
}
