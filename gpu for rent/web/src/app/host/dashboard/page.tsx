import { createClient } from '@/utils/supabase/server';
import Link from 'next/link';
import AddMachineModal from './AddMachineModal';
import CreateOfferModal from './CreateOfferModal';
import dynamic from 'next/dynamic';
const SeedButton = dynamic(() => import('./SeedButton'), { ssr: false });
import SyncProxyButton from './SyncProxyButton';
import MachineList from './MachineList';
import EarningsDashboard from './EarningsDashboard';
import ProfileDropdown from '../../console/ProfileDropdown';
import ConsoleSidebar from '../../components/ConsoleSidebar';

export default async function HostDashboard() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let walletBalance = 0;
  let myMachines: any[] = [];
  let profile: any = null;
  let totalEarned = 0;

  if (user) {
    const [{ data: p }, { data: machines }, { data: earningsTx }] = await Promise.all([
      supabase
        .from('users')
        .select('wallet_balance_usd, phone, role, referral_code, xp, provider_tier')
        .eq('id', user.id)
        .single(),
      supabase
        .from('machines')
        .select(`
          *,
          instances (id, renter_id, status, created_at, ended_at, total_cost_usd),
          offers (id, status, price_per_gpu_hr_usd, storage_price_per_gb_month_usd, min_gpu, offer_end_date, interruptible_min_price_usd, reserved_discount_factor),
          rental_contracts (id, gpu_count, gpu_indices, status, rental_end_date, renter_id, rental_type, price_per_gpu_hr_usd),
          maintenance_windows (id, start_date, duration_hrs, status)
        `)
        .eq('host_id', user.id)
        .neq('status', 'removed')
        .order('created_at', { ascending: false }),
      supabase
        .from('transactions')
        .select('amount_usd')
        .eq('user_id', user.id)
        .eq('type', 'host_payout')
        .eq('status', 'completed'),
    ])

    if (p) {
      profile = p;
      walletBalance = p.wallet_balance_usd
    }
    if (machines) myMachines = machines
    totalEarned = (earningsTx || []).reduce((sum, tx) => sum + (tx.amount_usd || 0), 0)
  }
  const activeRentals = myMachines.reduce((acc, m) => {
    return acc + (m.rental_contracts?.filter((c: any) => c.status === 'active').length || 0)
  }, 0)

  const completedJobs = myMachines.reduce((acc, m) => {
    return acc + (m.instances?.filter((i: any) => i.status === 'terminated' || i.ended_at).length || 0)
  }, 0)

  const activeMachines = myMachines.filter((m: any) => m.status !== 'offline' && m.status !== 'removed').length
  const listedMachines = myMachines.filter((m: any) => m.listed).length
  const totalGpus = myMachines.reduce((acc: number, m: any) => acc + (m.gpu_count || 0), 0)
  const allocatedGpus = myMachines.reduce((acc: number, m: any) => acc + (m.gpu_allocated || 0), 0)

  const xp = profile?.xp ?? 0
  const TIERS = [
    { name: 'Bronze', key: 'bronze', icon: '🥉', min: 0, fee: '15%', color: 'from-amber-700 to-amber-900', next: 1000 },
    { name: 'Silver', key: 'silver', icon: '🥈', min: 1000, fee: '12%', color: 'from-gray-300 to-gray-500', next: 5000 },
    { name: 'Gold', key: 'gold', icon: '🥇', min: 5000, fee: '10%', color: 'from-yellow-400 to-yellow-600', next: 15000 },
    { name: 'Platinum', key: 'platinum', icon: '💎', min: 15000, fee: '7%', color: 'from-cyan-300 to-cyan-600', next: 50000 },
    { name: 'Diamond', key: 'diamond', icon: '👑', min: 50000, fee: '5%', color: 'from-primary to-violet-400', next: 100000 },
  ]
  const dbTier = profile?.provider_tier || 'bronze'
  const currentTier = TIERS.find(t => t.key === dbTier) || TIERS[0]
  const nextTier = TIERS[TIERS.indexOf(currentTier) + 1]
  const tierProgress = nextTier ? Math.min(100, ((xp - currentTier.min) / (nextTier.min - currentTier.min)) * 100) : 100

  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Host';

  return (
    <div className="min-h-screen flex bg-[#0B0F19] text-[#E2E8F0]">
      <ConsoleSidebar
        role={profile?.role || 'host'}
        walletBalance={walletBalance}
        userEmail={user?.email}
        userPhone={profile?.phone}
        referralCode={profile?.referral_code}
      />

      <main className="flex-1 flex flex-col h-screen overflow-y-auto">
        <header className="h-14 flex items-center justify-between px-8 border-b border-white/[0.06] bg-[#0B0F19]/80 backdrop-blur-xl sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <h1 className="text-sm font-medium text-white">Provider Dashboard</h1>
            {activeRentals > 0 && (
              <div className="hidden sm:flex items-center gap-1.5 text-[10px] text-primary">
                <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                {activeRentals} active {activeRentals === 1 ? 'rental' : 'rentals'}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            {process.env.NODE_ENV === 'development' && <SeedButton />}
            <SyncProxyButton />
            <CreateOfferModal machines={myMachines} />
            <AddMachineModal />
            <ProfileDropdown userName={userName} email={user?.email || ''} />
          </div>
        </header>

        <div className="p-6 max-w-6xl mx-auto w-full">
          {/* Stats row */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
            {[
              { label: 'Machines', value: `${activeMachines}`, sub: `${listedMachines} listed` },
              { label: 'GPUs', value: `${totalGpus}`, sub: `${allocatedGpus} rented` },
              { label: 'Active Rentals', value: `${activeRentals}`, sub: activeRentals > 0 ? 'earning now' : 'waiting' },
              { label: 'Total Earned', value: `$${totalEarned.toFixed(0)}`, sub: 'all time', highlight: true },
              { label: 'Balance', value: `$${walletBalance.toFixed(0)}`, sub: 'withdrawable', highlight: true },
            ].map(stat => (
              <div key={stat.label} className="border border-white/[0.06] rounded-xl p-4 bg-white/[0.02]">
                <div className="text-[10px] text-[#64748B] uppercase tracking-[0.15em] mb-1.5">{stat.label}</div>
                <div className={`text-xl font-bold tabular-nums ${stat.highlight ? 'text-primary' : 'text-[#E2E8F0]'}`}>{stat.value}</div>
                <div className="text-[10px] text-[#64748B] mt-0.5">{stat.sub}</div>
              </div>
            ))}
          </div>

          {/* Provider Tier & XP */}
          <div className="border border-white/[0.06] rounded-xl p-5 mb-6 bg-white/[0.02]">
            <div className="flex flex-col md:flex-row md:items-center gap-4">
              <div className="flex items-center gap-3 shrink-0">
                <span className="text-3xl">{currentTier.icon}</span>
                <div>
                  <div className="text-sm font-bold text-[#E2E8F0]">{currentTier.name} Provider</div>
                  <div className="text-xs text-[#64748B]">Platform fee: {currentTier.fee}</div>
                </div>
              </div>
              <div className="flex-1">
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-[#94A3B8] tabular-nums">{xp.toLocaleString()} XP</span>
                  {nextTier && <span className="text-[#475569]">{nextTier.min.toLocaleString()} XP for {nextTier.name}</span>}
                </div>
                <div className="h-2 bg-white/[0.04] rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full bg-gradient-to-r ${currentTier.color} transition-all duration-500`}
                    style={{ width: `${tierProgress}%` }}
                  />
                </div>
                {nextTier && (
                  <div className="text-[10px] text-[#475569] mt-1">
                    {(nextTier.min - xp).toLocaleString()} XP to {nextTier.name} ({nextTier.fee} fee)
                  </div>
                )}
              </div>
              <div className="flex gap-2 shrink-0">
                {[
                  { label: 'Jobs', value: completedJobs },
                  { label: 'GPUs', value: totalGpus },
                ].map(s => (
                  <div key={s.label} className="border border-white/[0.06] rounded-lg px-3 py-2 text-center min-w-[56px]">
                    <div className="text-sm font-bold text-[#E2E8F0] tabular-nums">{s.value}</div>
                    <div className="text-[9px] text-[#64748B] uppercase tracking-wider">{s.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Earnings */}
          {user && (
            <div className="mb-6">
              <EarningsDashboard hostId={user.id} machines={myMachines} />
            </div>
          )}

          {/* Machines table */}
          <MachineList machines={myMachines} />

          {/* Quick help */}
          {myMachines.length > 0 && (
            <div className="mt-6 flex items-center justify-center gap-6 text-xs text-[#64748B]">
              <Link href="/host/setup" className="hover:text-primary transition-colors">+ Add machine</Link>
              <span className="text-white/[0.06]">|</span>
              <Link href="/host/datacenter-apply" className="hover:text-primary transition-colors">Enterprise tier</Link>
              <span className="text-white/[0.06]">|</span>
              <Link href="/docs/hosting" className="hover:text-primary transition-colors">Docs</Link>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
