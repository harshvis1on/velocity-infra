import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: Request) {
  const authHeader = request.headers.get('Authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const payoutId = body.payoutId

  if (!payoutId) {
    return NextResponse.json({ error: 'payoutId required' }, { status: 400 })
  }

  const { data: payout, error } = await supabase
    .from('host_payouts')
    .select('*')
    .eq('id', payoutId)
    .eq('status', 'pending')
    .single()

  if (error || !payout) {
    return NextResponse.json({ error: 'Payout not found or not pending' }, { status: 404 })
  }

  await supabase
    .from('host_payouts')
    .update({ status: 'processing' })
    .eq('id', payoutId)

  // In production, this would call Razorpay Route/Payout API
  // For MVP, mark as paid and deduct from host wallet
  const { data: host } = await supabase
    .from('users')
    .select('wallet_balance_inr')
    .eq('id', payout.host_id)
    .single()

  if (host) {
    const newBalance = Math.max(0, host.wallet_balance_inr - payout.net_amount_inr)
    await supabase
      .from('users')
      .update({ wallet_balance_inr: newBalance })
      .eq('id', payout.host_id)
  }

  await supabase
    .from('host_payouts')
    .update({
      status: 'paid',
      paid_at: new Date().toISOString(),
      payout_ref: `manual_${Date.now()}`,
    })
    .eq('id', payoutId)

  return NextResponse.json({ status: 'paid', payout_id: payoutId })
}
