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

  const { error: debitError } = await supabase.rpc('debit_wallet', {
    p_user_id: payout.host_id,
    p_amount: payout.net_amount_usd,
  })

  if (debitError) {
    await supabase
      .from('host_payouts')
      .update({ status: 'failed' })
      .eq('id', payoutId)
    return NextResponse.json(
      { error: `Wallet debit failed: ${debitError.message}` },
      { status: 500 }
    )
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
