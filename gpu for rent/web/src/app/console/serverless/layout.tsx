import { createClient } from '@/utils/supabase/server';
import ProfileDropdown from '../ProfileDropdown';
import ConsoleSidebar from '../../components/ConsoleSidebar';

export default async function ServerlessLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  let walletBalance = 0;
  let profile: any = null;

  if (user) {
    const { data: p } = await supabase
      .from('users')
      .select('wallet_balance_usd, phone, role, referral_code')
      .eq('id', user.id)
      .single()
    
    if (p) {
      profile = p;
      walletBalance = p.wallet_balance_usd
    }
  }

  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User';

  return (
    <div className="min-h-screen flex bg-[#0B0F19] text-white">
      <ConsoleSidebar 
        role={profile?.role || 'renter'} 
        walletBalance={walletBalance} 
        userEmail={user?.email} 
        userPhone={profile?.phone}
        referralCode={profile?.referral_code}
      />

      {/* MAIN CONTENT */}
      <main className="flex-1 flex flex-col h-screen overflow-y-auto">
        <header className="h-16 flex items-center justify-between px-8 border-b border-white/[0.06] bg-[#0B0F19] sticky top-0 z-10">
          <h1 className="text-xl font-bold">Serverless</h1>
          <div className="flex items-center gap-4">
            <ProfileDropdown userName={userName} email={user?.email || ''} />
          </div>
        </header>

        {children}
      </main>
    </div>
  );
}
