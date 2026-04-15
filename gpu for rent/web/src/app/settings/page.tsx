import { createClient } from '@/utils/supabase/server';
import Link from 'next/link';
import SSHKeyManager from './SSHKeyManager';
import ApiKeyManager from './ApiKeyManager';
import ProfileDropdown from '../console/ProfileDropdown';

import ConsoleSidebar from '../components/ConsoleSidebar';

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
      walletBalance = p.wallet_balance_inr
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
    <div className="min-h-screen flex bg-[#050505] text-white font-sans">
      <ConsoleSidebar 
        role={profile?.role || 'renter'} 
        walletBalance={walletBalance} 
        userEmail={user?.email} 
        userPhone={profile?.phone} 
      />

      {/* MAIN CONTENT */}
      <main className="flex-1 flex flex-col h-screen overflow-y-auto">
        <header className="h-16 flex items-center justify-between px-8 border-b border-white/10 bg-[#050505] sticky top-0 z-10">
          <h1 className="text-xl font-bold">Settings</h1>
          <div className="flex items-center gap-4">
            <ProfileDropdown userName={userName} email={user?.email || ''} />
          </div>
        </header>

        <div className="p-8 max-w-5xl mx-auto w-full">
          
          <div className="grid md:grid-cols-2 gap-6 mb-12">
            {/* ACCOUNT SETTINGS */}
            <div className="bg-white/5 border border-white/10 p-6 rounded-xl">
              <h2 className="text-xl font-bold mb-6">Account</h2>
              <div className="space-y-4">
                <div>
                  <div className="text-xs text-gray-500 mb-1">Email Address</div>
                  <div className="text-sm font-medium">{user?.email}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-1">User ID</div>
                  <div className="text-sm font-mono text-gray-400">{user?.id}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-1">Account Role</div>
                  <div className="text-sm font-medium capitalize">{profile?.role || 'Renter'}</div>
                </div>
                <div className="pt-4 border-t border-white/10">
                  <p className="text-xs text-gray-500">Need to delete your account? <a href="mailto:support@velocityinfra.in" className="text-red-400 hover:text-red-300 transition-colors">Contact support</a>.</p>
                </div>
              </div>
            </div>

            {/* API KEYS */}
            <ApiKeyManager />
          </div>

          <SSHKeyManager initialKeys={sshKeys} />

        </div>
      </main>
    </div>
  );
}
