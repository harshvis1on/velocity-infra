import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const dayOfWeek = now.getDay()
  const weekStart = new Date(now)
  weekStart.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1))
  weekStart.setHours(0, 0, 0, 0)
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()

  const [allTimeTxRes, monthTxRes, weekTxRes, dailyTxRes, machinesRes] = await Promise.all([
    supabase
      .from('transactions')
      .select('amount_inr')
      .eq('user_id', user.id)
      .eq('type', 'host_payout')
      .eq('status', 'completed'),

    supabase
      .from('transactions')
      .select('amount_inr')
      .eq('user_id', user.id)
      .eq('type', 'host_payout')
      .eq('status', 'completed')
      .gte('created_at', monthStart),

    supabase
      .from('transactions')
      .select('amount_inr')
      .eq('user_id', user.id)
      .eq('type', 'host_payout')
      .eq('status', 'completed')
      .gte('created_at', weekStart.toISOString()),

    supabase
      .from('transactions')
      .select('amount_inr, created_at')
      .eq('user_id', user.id)
      .eq('type', 'host_payout')
      .eq('status', 'completed')
      .gte('created_at', thirtyDaysAgo),

    supabase
      .from('machines')
      .select('id, instances(platform_fee_inr)')
      .eq('host_id', user.id),
  ])

  const totalEarned = (allTimeTxRes.data || []).reduce((sum, t) => sum + (t.amount_inr || 0), 0)
  const thisMonth = (monthTxRes.data || []).reduce((sum, t) => sum + (t.amount_inr || 0), 0)
  const thisWeek = (weekTxRes.data || []).reduce((sum, t) => sum + (t.amount_inr || 0), 0)

  const totalPlatformFees = (machinesRes.data || []).reduce((sum, m) => {
    const machineFees = (m.instances as any[] || []).reduce(
      (s: number, i: any) => s + (i.platform_fee_inr || 0), 0
    )
    return sum + machineFees
  }, 0)

  const dailyMap: Record<string, number> = {}
  for (const tx of dailyTxRes.data || []) {
    const day = new Date(tx.created_at).toISOString().split('T')[0]
    dailyMap[day] = (dailyMap[day] || 0) + (tx.amount_inr || 0)
  }
  const dailyEarnings = Object.entries(dailyMap)
    .map(([date, amount]) => ({ date, amount }))
    .sort((a, b) => a.date.localeCompare(b.date))

  return NextResponse.json({
    totalEarned,
    totalPlatformFees,
    thisMonth,
    thisWeek,
    dailyEarnings,
  })
}
