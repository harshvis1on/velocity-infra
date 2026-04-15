'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'

interface EarningsData {
  totalAllTime: number
  thisMonth: number
  thisWeek: number
  pendingPayout: number
  totalPlatformFees: number
  currentTier: { name: string; fee: string }
  payouts: any[]
  dailyEarnings: { date: string; amount: number }[]
  machineUtilization: { machineId: string; gpu_model: string; utilization: number; earned: number }[]
}

export default function EarningsDashboard({ hostId, machines }: { hostId: string; machines: any[] }) {
  const [data, setData] = useState<EarningsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d')

  useEffect(() => {
    async function fetchEarnings() {
      setLoading(true)
      const supabase = createClient()

      const now = new Date()
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      const rangeStart = timeRange === '7d' ? weekAgo : timeRange === '30d' ? monthAgo : new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)

      const [{ data: allTimeTx }, { data: payouts }, { data: userProfile }, { data: instanceFees }] = await Promise.all([
        supabase
          .from('transactions')
          .select('amount_inr, created_at')
          .eq('user_id', hostId)
          .eq('type', 'host_payout')
          .eq('status', 'completed'),
        supabase
          .from('host_payouts')
          .select('*')
          .eq('host_id', hostId)
          .order('created_at', { ascending: false })
          .limit(20),
        supabase
          .from('users')
          .select('provider_tier')
          .eq('id', hostId)
          .single(),
        supabase
          .from('machines')
          .select('instances(platform_fee_inr)')
          .eq('host_id', hostId),
      ])

      const TIERS: Record<string, { name: string; fee: string }> = {
        bronze: { name: 'Bronze', fee: '15%' },
        silver: { name: 'Silver', fee: '12%' },
        gold: { name: 'Gold', fee: '10%' },
        platinum: { name: 'Platinum', fee: '7%' },
        diamond: { name: 'Diamond', fee: '5%' },
      }
      const tierKey = userProfile?.provider_tier || 'bronze'
      const currentTier = TIERS[tierKey] || TIERS.bronze

      const totalPlatformFees = (instanceFees || []).reduce((sum, m) => {
        const fees = (m.instances as any[] || []).reduce(
          (s: number, i: any) => s + (i.platform_fee_inr || 0), 0
        )
        return sum + fees
      }, 0)

      const totalAllTime = (allTimeTx || []).reduce((sum, t) => sum + t.amount_inr, 0)

      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
      const thisMonth = (allTimeTx || [])
        .filter(t => new Date(t.created_at) >= monthStart)
        .reduce((sum, t) => sum + t.amount_inr, 0)

      const thisWeek = (allTimeTx || [])
        .filter(t => new Date(t.created_at) >= weekAgo)
        .reduce((sum, t) => sum + t.amount_inr, 0)

      const pendingPayout = (payouts || [])
        .filter(p => p.status === 'pending')
        .reduce((sum, p) => sum + p.net_amount_inr, 0)

      const rangeEarnings = (allTimeTx || []).filter(t => new Date(t.created_at) >= rangeStart)
      const dailyMap: Record<string, number> = {}
      for (const tx of rangeEarnings) {
        const day = new Date(tx.created_at).toISOString().split('T')[0]
        dailyMap[day] = (dailyMap[day] || 0) + tx.amount_inr
      }
      const dailyEarnings = Object.entries(dailyMap)
        .map(([date, amount]) => ({ date, amount }))
        .sort((a, b) => a.date.localeCompare(b.date))

      const machineUtilization = machines.map(m => {
        const instances = m.instances || []
        const runningHrs = instances.reduce((sum: number, i: any) => {
          if (!i.created_at) return sum
          const start = new Date(i.created_at)
          const end = i.ended_at ? new Date(i.ended_at) : now
          return sum + (end.getTime() - start.getTime()) / (1000 * 60 * 60)
        }, 0)
        const totalHrs = m.created_at
          ? (now.getTime() - new Date(m.created_at).getTime()) / (1000 * 60 * 60)
          : 1
        const earned = instances.reduce((sum: number, i: any) => sum + (i.total_cost_inr || 0), 0)
        return {
          machineId: m.id,
          gpu_model: m.gpu_model,
          utilization: Math.min(100, (runningHrs / Math.max(totalHrs, 1)) * 100),
          earned,
        }
      })

      setData({
        totalAllTime,
        thisMonth,
        thisWeek,
        pendingPayout,
        totalPlatformFees,
        currentTier,
        payouts: payouts || [],
        dailyEarnings,
        machineUtilization,
      })
      setLoading(false)
    }

    fetchEarnings()
  }, [hostId, machines, timeRange])

  if (loading) {
    return (
      <div className="bg-white/5 border border-white/10 rounded-xl p-8 animate-pulse">
        <div className="h-6 bg-white/10 rounded w-48 mb-6"></div>
        <div className="grid grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <div key={i} className="h-24 bg-white/5 rounded-lg"></div>)}
        </div>
      </div>
    )
  }

  if (!data) return null

  const maxDailyEarning = Math.max(...data.dailyEarnings.map(d => d.amount), 1)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Earnings</h2>
        <div className="flex gap-1 bg-white/5 border border-white/10 rounded-lg p-1">
          {(['7d', '30d', '90d'] as const).map(range => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                timeRange === range ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              {range}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white/5 border border-white/10 p-4 rounded-xl">
          <div className="text-xs text-gray-400 mb-1">All Time</div>
          <div className="text-2xl font-bold font-mono text-primary">₹{data.totalAllTime.toFixed(2)}</div>
        </div>
        <div className="bg-white/5 border border-white/10 p-4 rounded-xl">
          <div className="text-xs text-gray-400 mb-1">This Month</div>
          <div className="text-2xl font-bold font-mono">₹{data.thisMonth.toFixed(2)}</div>
        </div>
        <div className="bg-white/5 border border-white/10 p-4 rounded-xl">
          <div className="text-xs text-gray-400 mb-1">This Week</div>
          <div className="text-2xl font-bold font-mono">₹{data.thisWeek.toFixed(2)}</div>
        </div>
        <div className="bg-white/5 border border-white/10 p-4 rounded-xl">
          <div className="text-xs text-gray-400 mb-1">Pending Payout</div>
          <div className="text-2xl font-bold font-mono text-yellow-400">₹{data.pendingPayout.toFixed(2)}</div>
        </div>
      </div>

      <div className="bg-white/5 border border-white/10 rounded-xl p-5">
        <h3 className="text-sm font-bold text-gray-400 mb-3">Platform Fees</h3>
        <div className="flex items-center gap-6">
          <div>
            <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Total Fees Paid</div>
            <div className="text-xl font-bold font-mono text-red-400">₹{data.totalPlatformFees.toFixed(2)}</div>
          </div>
          <div className="w-px h-10 bg-white/[0.06]" />
          <div>
            <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Current Tier</div>
            <div className="text-xl font-bold text-white">{data.currentTier.name}</div>
          </div>
          <div className="w-px h-10 bg-white/[0.06]" />
          <div>
            <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Fee Rate</div>
            <div className="text-xl font-bold text-primary">{data.currentTier.fee}</div>
          </div>
          {data.totalAllTime > 0 && (
            <>
              <div className="w-px h-10 bg-white/[0.06]" />
              <div>
                <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Effective Rate</div>
                <div className="text-xl font-bold font-mono text-gray-300">
                  {((data.totalPlatformFees / (data.totalAllTime + data.totalPlatformFees)) * 100).toFixed(1)}%
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {data.dailyEarnings.length > 0 && (
        <div className="bg-white/5 border border-white/10 rounded-xl p-6">
          <h3 className="text-sm font-bold text-gray-400 mb-4">Daily Revenue</h3>
          <div className="flex items-end gap-1 h-32">
            {data.dailyEarnings.map((d, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative">
                <div
                  className="w-full bg-primary/30 hover:bg-primary/50 rounded-t transition-colors min-h-[2px]"
                  style={{ height: `${(d.amount / maxDailyEarning) * 100}%` }}
                />
                <div className="absolute -top-8 bg-black/90 border border-white/10 text-xs text-white px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                  ₹{d.amount.toFixed(2)} — {d.date}
                </div>
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-2 text-[10px] text-gray-500">
            <span>{data.dailyEarnings[0]?.date}</span>
            <span>{data.dailyEarnings[data.dailyEarnings.length - 1]?.date}</span>
          </div>
        </div>
      )}

      {data.machineUtilization.length > 0 && (
        <div className="bg-white/5 border border-white/10 rounded-xl p-6">
          <h3 className="text-sm font-bold text-gray-400 mb-4">Machine Utilization</h3>
          <div className="space-y-3">
            {data.machineUtilization.map(m => (
              <div key={m.machineId} className="flex items-center gap-4">
                <div className="w-24 text-xs text-gray-300 font-mono truncate" title={m.machineId}>
                  {m.gpu_model}
                </div>
                <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${m.utilization > 70 ? 'bg-green-500' : m.utilization > 30 ? 'bg-yellow-500' : 'bg-red-500'}`}
                    style={{ width: `${m.utilization}%` }}
                  />
                </div>
                <div className="w-16 text-right text-xs font-mono text-gray-400">
                  {m.utilization.toFixed(1)}%
                </div>
                <div className="w-24 text-right text-xs font-mono text-primary">
                  ₹{m.earned.toFixed(2)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {data.payouts.length > 0 && (
        <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-white/10">
            <h3 className="text-sm font-bold text-gray-400">Payout History</h3>
          </div>
          <table className="w-full text-sm">
            <thead className="text-xs text-gray-500 uppercase bg-black/20">
              <tr>
                <th className="py-2 px-4 text-left">Period</th>
                <th className="py-2 px-4 text-right">Gross</th>
                <th className="py-2 px-4 text-right">TDS (1%)</th>
                <th className="py-2 px-4 text-right">Net</th>
                <th className="py-2 px-4 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {data.payouts.map(p => (
                <tr key={p.id} className="hover:bg-white/5">
                  <td className="py-3 px-4 text-gray-300 text-xs">
                    {new Date(p.period_start).toLocaleDateString()} — {new Date(p.period_end).toLocaleDateString()}
                  </td>
                  <td className="py-3 px-4 text-right font-mono">₹{Number(p.amount_gross_inr).toFixed(2)}</td>
                  <td className="py-3 px-4 text-right font-mono text-red-400">-₹{Number(p.tds_amount_inr).toFixed(2)}</td>
                  <td className="py-3 px-4 text-right font-mono text-primary font-bold">₹{Number(p.net_amount_inr).toFixed(2)}</td>
                  <td className="py-3 px-4 text-right">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded ${
                      p.status === 'paid' ? 'bg-green-500/10 text-green-400' :
                      p.status === 'processing' ? 'bg-blue-500/10 text-blue-400' :
                      p.status === 'failed' ? 'bg-red-500/10 text-red-400' :
                      'bg-yellow-500/10 text-yellow-400'
                    }`}>
                      {p.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
