import { Suspense } from 'react';
import { createClient } from '@/utils/supabase/server';
import Link from 'next/link';
import AddFundsButton from './AddFundsButton';
import Marketplace from './Marketplace';
import ProfileDropdown from './ProfileDropdown';

import ConsoleSidebar from '../components/ConsoleSidebar';

export default async function ConsolePage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  // Fetch actual wallet balance from public.users table
  let walletBalance = 0;
  let initialOffers: any[] = [];
  let activeInstances: any[] = [];
  let templates: any[] = [];
  let sshKeys: any[] = [];
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

    const { data: offers } = await supabase
      .from('offers')
      .select(
        '*,machines(id,gpu_model,gpu_count,vram_gb,ram_gb,vcpu_count,storage_gb,location,machine_tier,reliability_score,gpu_allocated,inet_down_mbps,inet_up_mbps,public_ip,dlperf_score)'
      )
      .eq('status', 'active')
      .order('price_per_gpu_hr_inr', { ascending: true })

    if (offers) {
      initialOffers = offers
    }

    const { data: instanceData } = await supabase
      .from('instances')
      .select(`
        *,
        machines (*),
        rental_contracts (*)
      `)
      .eq('renter_id', user.id)
      .in('status', ['creating', 'loading', 'running', 'stopped'])
      .order('created_at', { ascending: false })

    if (instanceData) {
      activeInstances = instanceData
    }

    const { data: tpls } = await supabase
      .from('templates')
      .select('*')
      .order('created_at', { ascending: true })

    if (tpls) {
      templates = tpls
    }

    const { data: keys } = await supabase
      .from('ssh_keys')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (keys) {
      sshKeys = keys
    }
  }

  const currentSpendRate = activeInstances
    .filter(i => i.status === 'running')
    .reduce((acc, i) => {
      const disk = i.disk_size_gb || 0;
      const rc = Array.isArray(i.rental_contracts) ? i.rental_contracts[0] : i.rental_contracts;
      const gpus = i.gpu_count || 1;
      if (rc?.price_per_gpu_hr_inr != null) {
        const gpuHr =
          i.rental_type === 'interruptible' && i.bid_price_inr != null
            ? Number(i.bid_price_inr) * gpus
            : Number(rc.price_per_gpu_hr_inr) * gpus;
        const storageHr =
          (Number(rc.storage_price_per_gb_month_inr || 0) * disk) / (30 * 24);
        return acc + gpuHr + storageHr;
      }
      const computePrice = i.machines?.price_per_hour_inr || 0;
      const storagePrice = (i.machines?.storage_price_per_gb_hr || 0) * disk;
      return acc + computePrice + storagePrice;
    }, 0);

  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User';

  return (
    <div className="min-h-screen flex bg-[#050505] text-white font-sans">
      <ConsoleSidebar 
        role={profile?.role || 'renter'} 
        walletBalance={walletBalance} 
        userEmail={user?.email} 
        userPhone={profile?.phone} 
        currentSpendRate={currentSpendRate}
      />

      {/* MAIN CONTENT */}
      <main className="flex-1 flex flex-col h-screen overflow-y-auto">
        <header className="h-16 flex items-center justify-between px-8 border-b border-white/10 bg-[#050505] sticky top-0 z-10">
          <h1 className="text-xl font-bold">GPU Marketplace</h1>
          <div className="flex items-center gap-4">
            <ProfileDropdown userName={userName} email={user?.email || ''} />
          </div>
        </header>

        <div className="px-8 pt-8 pb-2">
          <h2 className="text-2xl font-bold text-white">
            Welcome back, {userName}
          </h2>
          <p className="text-gray-400 text-sm mt-1">Browse GPUs at up to 80% off cloud pricing. Deploy in seconds.</p>
        </div>

        <Suspense fallback={<div className="px-8 py-12 text-gray-500 text-sm">Loading marketplace…</div>}>
          <Marketplace
            initialOffers={initialOffers}
            activeInstances={activeInstances}
            walletBalance={walletBalance}
            templates={templates}
            sshKeys={sshKeys}
          />
        </Suspense>

        <div className="px-8 pb-8">
          <div className="bg-gradient-to-r from-primary/[0.04] to-yellow-400/[0.02] border border-primary/10 rounded-xl p-4 flex items-center gap-3">
            <span className="text-lg">🎁</span>
            <p className="text-sm text-gray-400 flex-1">Know someone who needs GPUs? <Link href="/invite" className="text-primary font-medium hover:underline">Invite them and both get free GPU hours →</Link></p>
          </div>
        </div>
      </main>
    </div>
  );
}
