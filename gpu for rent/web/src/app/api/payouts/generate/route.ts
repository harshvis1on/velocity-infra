import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const TDS_RATE = 0.01
const PLATFORM_FEE_RATE = 0.15

export async function POST(request: Request) {
  const authHeader = request.headers.get('Authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: Record<string, string> = {}
  try { body = await request.json() } catch { /* GET request or empty body */ }
  const periodStart = body.periodStart || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const periodEnd = body.periodEnd || new Date().toISOString()

  const { data: hostEarnings, error } = await supabase
    .from('transactions')
    .select('user_id, amount_usd')
    .eq('type', 'host_payout')
    .eq('status', 'completed')
    .gte('created_at', periodStart)
    .lte('created_at', periodEnd)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const earningsByHost: Record<string, number> = {}
  for (const tx of hostEarnings || []) {
    earningsByHost[tx.user_id] = (earningsByHost[tx.user_id] || 0) + tx.amount_usd
  }

  let payoutsCreated = 0
  for (const [hostId, grossAmount] of Object.entries(earningsByHost)) {
    if (grossAmount < 1) continue

    const tdsAmount = Math.round(grossAmount * TDS_RATE * 100) / 100
    const netAmount = Math.round((grossAmount - tdsAmount) * 100) / 100

    await supabase.from('host_payouts').insert({
      host_id: hostId,
      amount_gross_usd: grossAmount,
      tds_amount_usd: tdsAmount,
      platform_fee_usd: 0,
      net_amount_usd: netAmount,
      period_start: periodStart,
      period_end: periodEnd,
    })
    payoutsCreated++
  }

  return NextResponse.json({ status: 'ok', payouts_created: payoutsCreated })
}

export async function GET(request: Request) {
  return POST(request)
}
