import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import Razorpay from 'razorpay'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: Request) {
  const authHeader = request.headers.get('Authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: users, error } = await supabase
    .from('users')
    .select('id, wallet_balance_inr, auto_topup_enabled, auto_topup_amount_inr, auto_topup_threshold_inr')
    .eq('auto_topup_enabled', true)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const hasRazorpay = process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET

  let created = 0
  let processed = 0
  const errors: string[] = []

  for (const user of users || []) {
    if (user.wallet_balance_inr > user.auto_topup_threshold_inr) continue

    const { data: existing } = await supabase
      .from('pending_topups')
      .select('id')
      .eq('user_id', user.id)
      .in('status', ['pending', 'processing'])
      .limit(1)

    if (existing && existing.length > 0) continue

    const amountInr = user.auto_topup_amount_inr || 500

    const { data: topup, error: insertError } = await supabase
      .from('pending_topups')
      .insert({
        user_id: user.id,
        amount_inr: amountInr,
      })
      .select('id')
      .single()

    if (insertError || !topup) {
      errors.push(`Insert failed for user ${user.id}: ${insertError?.message}`)
      continue
    }

    created++

    if (!hasRazorpay) {
      await supabase
        .from('pending_topups')
        .update({ status: 'notified' })
        .eq('id', topup.id)
      processed++
      continue
    }

    try {
      const instance = new Razorpay({
        key_id: process.env.RAZORPAY_KEY_ID!,
        key_secret: process.env.RAZORPAY_KEY_SECRET!,
      })

      const order = await instance.orders.create({
        amount: amountInr * 100,
        currency: 'INR',
        receipt: `autotopup_${topup.id}`,
        notes: { userId: user.id, topupId: topup.id },
      })

      await supabase
        .from('pending_topups')
        .update({
          razorpay_order_id: order.id,
          status: 'notified',
        })
        .eq('id', topup.id)

      processed++
    } catch (err: any) {
      errors.push(`Razorpay order failed for user ${user.id}: ${err.message}`)
      await supabase
        .from('pending_topups')
        .update({ status: 'failed' })
        .eq('id', topup.id)
    }
  }

  return NextResponse.json({
    status: 'ok',
    topups_created: created,
    topups_processed: processed,
    errors: errors.length > 0 ? errors : undefined,
  })
}
