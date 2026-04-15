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

  const { data: users, error } = await supabase
    .from('users')
    .select('id, wallet_balance_inr, auto_topup_enabled, auto_topup_amount_inr, auto_topup_threshold_inr')
    .eq('auto_topup_enabled', true)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  let created = 0
  for (const user of users || []) {
    if (user.wallet_balance_inr > user.auto_topup_threshold_inr) continue

    const { data: existing } = await supabase
      .from('pending_topups')
      .select('id')
      .eq('user_id', user.id)
      .in('status', ['pending', 'processing'])
      .limit(1)

    if (existing && existing.length > 0) continue

    await supabase.from('pending_topups').insert({
      user_id: user.id,
      amount_inr: user.auto_topup_amount_inr || 500,
    })
    created++
  }

  return NextResponse.json({ status: 'ok', topups_created: created })
}
