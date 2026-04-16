import { createClient } from '@/utils/supabase/server';
import SSHKeyManager from './SSHKeyManager';
import ApiKeyManager from './ApiKeyManager';
import ProfileDropdown from '../console/ProfileDropdown';
import ConsoleSidebar from '../components/ConsoleSidebar';
import SettingsTabs from './SettingsTabs';

export default async function SettingsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  let walletBalance = 0;
  let profile: any = null;
  let sshKeys: any[] = [];

  if (user) {
    const { data: p } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single()
    
    if (p) {
      profile = p;
      walletBalance = p.wallet_balance_usd
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

  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User';

  return (
    <div className="min-h-screen flex bg-[#0B0F19] text-[#E2E8F0]">
      <ConsoleSidebar 
        role={profile?.role || 'renter'} 
        walletBalance={walletBalance} 
        userEmail={user?.email} 
        userPhone={profile?.phone}
        referralCode={profile?.referral_code}
      />

      <main className="flex-1 flex flex-col h-screen overflow-y-auto">
        <header className="h-14 flex items-center justify-between px-8 border-b border-white/[0.06] bg-[#0B0F19]/80 backdrop-blur-xl sticky top-0 z-10">
          <h1 className="text-sm font-heading font-medium text-[#E2E8F0]">Settings</h1>
          <div className="flex items-center gap-4">
            <ProfileDropdown userName={userName} email={user?.email || ''} />
          </div>
        </header>

        <div className="p-8 max-w-4xl mx-auto w-full">
          <SettingsTabs
            profile={profile}
            userEmail={user?.email || ''}
            userId={user?.id || ''}
          />

          <div className="mt-8 pt-8 border-t border-white/[0.06]">
            <div className="text-[10px] text-[#475569] uppercase tracking-[0.15em] mb-6">Security & Keys</div>
            <div className="grid md:grid-cols-2 gap-4 mb-8">
              <ApiKeyManager />
            </div>
            <SSHKeyManager initialKeys={sshKeys} />
          </div>
        </div>
      </main>
    </div>
  );
}
