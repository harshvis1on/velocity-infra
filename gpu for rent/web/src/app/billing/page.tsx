import { createClient } from '@/utils/supabase/server';
import Link from 'next/link';
import AddFundsButton from '../console/AddFundsButton';
import ProfileDropdown from '../console/ProfileDropdown';

import ConsoleSidebar from '../components/ConsoleSidebar';
import AutoTopUpSettings from './AutoTopUpSettings';

export default async function BillingPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  let walletBalance = 0;
  let transactions: any[] = [];
  let profile: any = null;

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

    const { data: t } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (t) {
      transactions = t
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
          <h1 className="text-xl font-bold">Billing</h1>
          <div className="flex items-center gap-4">
            <ProfileDropdown userName={userName} email={user?.email || ''} />
          </div>
        </header>

        <div className="p-8 max-w-5xl mx-auto w-full">
          
          <div className="grid md:grid-cols-3 gap-6 mb-12">
            {/* CURRENT BALANCE */}
            <div className="bg-white/5 border border-white/10 p-6 rounded-xl flex flex-col justify-between">
              <div>
                <h3 className="text-gray-400 font-medium mb-1">Wallet Balance</h3>
                <div className="text-4xl font-mono font-bold text-white mb-2">₹{walletBalance.toFixed(2)}</div>
                <p className="text-xs text-gray-500">Used to pay for GPU pods and storage. Billed by the minute.</p>
              </div>
              <div className="mt-6">
                <AddFundsButton userEmail={user?.email} userPhone={profile?.phone} />
              </div>
            </div>

            {/* GST PROFILE */}
            <div className="bg-white/5 border border-white/10 p-6 rounded-xl">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-white font-medium">GST Profile</h3>
                <Link href="/settings" className="text-xs text-primary hover:text-white transition-colors">Edit in Settings</Link>
              </div>
              <div className="space-y-4">
                <div>
                  <div className="text-xs text-gray-500 mb-1">Company Name</div>
                  <div className="text-sm font-medium">{profile?.company_name || 'Not provided'}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-1">GSTIN</div>
                  <div className="text-sm font-mono">{profile?.gstin || 'Not provided'}</div>
                </div>
                <div className="p-3 bg-primary/10 border border-primary/20 rounded-lg text-xs text-primary">
                  Add your GSTIN to get 18% ITC invoices with every top-up.
                </div>
              </div>
            </div>

            <AutoTopUpSettings
              initialEnabled={profile?.auto_topup_enabled || false}
              initialAmount={profile?.auto_topup_amount_inr || 500}
              initialThreshold={profile?.auto_topup_threshold_inr || 50}
            />
          </div>

          {/* TRANSACTIONS */}
          <div className="mb-12">
            <h2 className="text-xl font-bold mb-6">Transaction History</h2>
            <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/10 text-xs text-gray-400 bg-black/30">
                    <th className="py-3 pl-6 font-medium">Date</th>
                    <th className="py-3 font-medium">Description</th>
                    <th className="py-3 font-medium">Reference ID</th>
                    <th className="py-3 font-medium text-right">Amount</th>
                    <th className="py-3 font-medium text-right pr-6">Invoice</th>
                  </tr>
                </thead>
                <tbody className="text-sm divide-y divide-white/5">
                  {transactions.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-gray-500">
                        No transactions yet. Add funds to get started.
                      </td>
                    </tr>
                  ) : (
                    transactions.map((tx) => (
                      <tr key={tx.id} className="hover:bg-white/5 transition-colors">
                        <td className="py-4 pl-6 text-gray-300">
                          {new Date(tx.created_at).toLocaleDateString()}
                        </td>
                        <td className="py-4">
                          <div className="font-medium text-white">
                            {tx.type === 'deposit' ? 'Wallet Top-up (UPI)' : tx.type === 'auto_deduct' ? 'Compute Usage (Auto)' : 'Compute Usage'}
                          </div>
                          <div className={`text-xs ${tx.status === 'completed' ? 'text-green-500' : 'text-yellow-500'}`}>
                            {tx.status}
                          </div>
                        </td>
                        <td className="py-4 text-gray-500 font-mono text-xs">
                          {tx.reference_id || '-'}
                        </td>
                        <td className="py-4 text-right">
                          <span className={`font-mono font-bold ${tx.type === 'deposit' ? 'text-green-400' : 'text-white'}`}>
                            {tx.type === 'deposit' ? '+' : '-'}₹{tx.amount_inr.toFixed(2)}
                          </span>
                        </td>
                        <td className="py-4 text-right pr-6">
                          {tx.type === 'deposit' && tx.status === 'completed' ? (
                            <a
                              href={`/api/billing/invoice/${tx.id}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs text-primary hover:text-white transition-colors flex items-center justify-end gap-1 ml-auto"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                              Invoice
                            </a>
                          ) : (
                            <span className="text-gray-600">-</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
