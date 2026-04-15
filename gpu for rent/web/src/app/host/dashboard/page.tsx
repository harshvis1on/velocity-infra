import { createClient } from '@/utils/supabase/server';
import Link from 'next/link';
import AddMachineModal from './AddMachineModal';
import CreateOfferModal from './CreateOfferModal';
import dynamic from 'next/dynamic';
const SeedButton = dynamic(() => import('./SeedButton'), { ssr: false });
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

  if (user) {
    const { data: p } = await supabase
      .from('users')
      .select('wallet_balance_inr, phone, role')
      .eq('id', user.id)
      .single()

    if (p) {
      profile = p;
      walletBalance = p.wallet_balance_inr
    }

    const { data: machines } = await supabase
      .from('machines')
      .select(`
        *,
        instances (id, renter_id, status, created_at, ended_at, total_cost_inr),
        offers (id, status, price_per_gpu_hr_inr, storage_price_per_gb_month_inr, min_gpu, offer_end_date, interruptible_min_price_inr, reserved_discount_factor),
        rental_contracts (id, gpu_count, gpu_indices, status, rental_end_date, renter_id, rental_type, price_per_gpu_hr_inr),
        maintenance_windows (id, start_date, duration_hrs, status)
      `)
      .eq('host_id', user.id)
      .order('created_at', { ascending: false })

    if (machines) myMachines = machines
  }

  const activeMachines = myMachines.filter(m => m.status === 'available' || m.status === 'rented').length
  const listedMachines = myMachines.filter(m => m.offers?.some((o: any) => o.status === 'active')).length
  const totalGpus = myMachines.reduce((acc, m) => acc + m.gpu_count, 0)
  const allocatedGpus = myMachines.reduce((acc, m) => acc + (m.gpu_allocated || 0), 0)
  const totalEarned = myMachines.reduce((acc, m) => {
    const machineEarned = m.instances?.reduce((a: number, i: any) => a + (i.total_cost_inr || 0), 0) || 0
    return acc + machineEarned
  }, 0)
  const activeRentals = myMachines.reduce((acc, m) => {
    return acc + (m.rental_contracts?.filter((c: any) => c.status === 'active').length || 0)
  }, 0)

  const completedJobs = myMachines.reduce((acc, m) => {
    return acc + (m.instances?.filter((i: any) => i.status === 'terminated' || i.ended_at).length || 0)
  }, 0)

  const xp = completedJobs * 10 + (activeMachines * 50) + Math.floor(totalEarned / 100)
  const TIERS = [
    { name: 'Bronze', icon: '🥉', min: 0, fee: '15%', color: 'from-amber-700 to-amber-900', next: 1000 },
    { name: 'Silver', icon: '🥈', min: 1000, fee: '12%', color: 'from-gray-300 to-gray-500', next: 5000 },
    { name: 'Gold', icon: '🥇', min: 5000, fee: '10%', color: 'from-yellow-400 to-yellow-600', next: 15000 },
    { name: 'Platinum', icon: '💎', min: 15000, fee: '7%', color: 'from-cyan-300 to-cyan-600', next: 50000 },
    { name: 'Diamond', icon: '👑', min: 50000, fee: '5%', color: 'from-primary to-emerald-500', next: 100000 },
  ]
  const currentTier = [...TIERS].reverse().find(t => xp >= t.min) || TIERS[0]
  const nextTier = TIERS[TIERS.indexOf(currentTier) + 1]
  const tierProgress = nextTier ? Math.min(100, ((xp - currentTier.min) / (nextTier.min - currentTier.min)) * 100) : 100

  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Host';

  return (
    <div className="min-h-screen flex bg-[#050505] text-white font-sans">
      <ConsoleSidebar
        role={profile?.role || 'host'}
        walletBalance={walletBalance}
        userEmail={user?.email}
        userPhone={profile?.phone}
      />

      <main className="flex-1 flex flex-col h-screen overflow-y-auto">
        <header className="h-14 flex items-center justify-between px-8 border-b border-white/10 bg-[#050505] sticky top-0 z-10">
          <h1 className="text-lg font-bold">Provider Dashboard</h1>
          <div className="flex items-center gap-3">
            {process.env.NODE_ENV === 'development' && <SeedButton />}
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
              { label: 'Total Earned', value: `₹${totalEarned.toFixed(0)}`, sub: 'all time', highlight: true },
              { label: 'Balance', value: `₹${walletBalance.toFixed(0)}`, sub: 'withdrawable', highlight: true },
            ].map(stat => (
              <div key={stat.label} className="bg-white/5 border border-white/10 rounded-xl p-4">
                <div className="text-[11px] text-gray-500 uppercase tracking-wider mb-1">{stat.label}</div>
                <div className={`text-xl font-bold font-mono ${stat.highlight ? 'text-primary' : 'text-white'}`}>{stat.value}</div>
                <div className="text-[10px] text-gray-500 mt-0.5">{stat.sub}</div>
              </div>
            ))}
          </div>

          {/* Provider Tier & XP */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-5 mb-6">
            <div className="flex flex-col md:flex-row md:items-center gap-4">
              <div className="flex items-center gap-3 shrink-0">
                <span className="text-3xl">{currentTier.icon}</span>
                <div>
                  <div className="text-sm font-bold text-white">{currentTier.name} Provider</div>
                  <div className="text-xs text-gray-500">Platform fee: {currentTier.fee}</div>
                </div>
              </div>
              <div className="flex-1">
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-gray-400 font-mono">{xp.toLocaleString()} XP</span>
                  {nextTier && <span className="text-gray-600">{nextTier.min.toLocaleString()} XP for {nextTier.name}</span>}
                </div>
                <div className="h-2.5 bg-white/5 rounded-full overflow-hidden border border-white/10">
                  <div
                    className={`h-full rounded-full bg-gradient-to-r ${currentTier.color} transition-all duration-500`}
                    style={{ width: `${tierProgress}%` }}
                  />
                </div>
                {nextTier && (
                  <div className="text-[10px] text-gray-600 mt-1">
                    {(nextTier.min - xp).toLocaleString()} XP to {nextTier.name} ({nextTier.fee} fee)
                  </div>
                )}
              </div>
              <div className="flex gap-2 shrink-0">
                {[
                  { label: 'Jobs', value: completedJobs, icon: '🎯' },
                  { label: 'GPUs', value: totalGpus, icon: '🖥️' },
                ].map(s => (
                  <div key={s.label} className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-center min-w-[60px]">
                    <div className="text-sm">{s.icon}</div>
                    <div className="text-xs font-bold font-mono text-white">{s.value}</div>
                    <div className="text-[9px] text-gray-600">{s.label}</div>
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
            <div className="mt-6 flex items-center justify-center gap-6 text-xs text-gray-500">
              <Link href="/host/setup" className="hover:text-primary transition-colors">+ Add another machine</Link>
              <span className="text-white/10">|</span>
              <Link href="/host/datacenter-apply" className="hover:text-primary transition-colors">Apply for Enterprise tier</Link>
              <span className="text-white/10">|</span>
              <Link href="/docs/hosting" className="hover:text-primary transition-colors">Hosting docs</Link>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
