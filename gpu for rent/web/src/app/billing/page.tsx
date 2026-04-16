'use client'

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import Link from 'next/link';
import AddFundsButton from '../console/AddFundsButton';
import ProfileDropdown from '../console/ProfileDropdown';

import ConsoleSidebar from '../components/ConsoleSidebar';
import AutoTopUpSettings from './AutoTopUpSettings';
import { formatUSD } from '@/lib/currency';

export default function BillingPage() {


  const [walletBalance, setWalletBalance] = useState(0)
  const [transactions, setTransactions] = useState<any[]>([])
  const [profile, setProfile] = useState<any>(null)
  const [user, setUser] = useState<any>(null)
  const [hasPendingTopup, setHasPendingTopup] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      const supabase = createClient()
      const { data: { user: u } } = await supabase.auth.getUser()
      setUser(u)

      if (u) {
        const { data: p } = await supabase
          .from('users')
          .select('*')
          .eq('id', u.id)
          .single()

        if (p) {
          setProfile(p)
          setWalletBalance(p.wallet_balance_usd)
        }

        const { data: t } = await supabase
          .from('transactions')
          .select('*')
          .eq('user_id', u.id)
          .order('created_at', { ascending: false })

        if (t) setTransactions(t)

        const { data: pendingTopups } = await supabase
          .from('pending_topups')
          .select('id')
          .eq('user_id', u.id)
          .in('status', ['pending', 'notified'])
          .limit(1)

        setHasPendingTopup((pendingTopups && pendingTopups.length > 0) || false)
      }
      setLoading(false)
    }
    fetchData()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex bg-[#0B0F19] text-[#E2E8F0] items-center justify-center">
        <div className="animate-pulse text-[#64748B]">Loading...</div>
      </div>
    )
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
          <h1 className="text-sm font-heading font-medium text-[#E2E8F0]">Billing</h1>
          <div className="flex items-center gap-4">
            <ProfileDropdown userName={userName} email={user?.email || ''} />
          </div>
        </header>

        <div className="p-8 max-w-5xl mx-auto w-full">

          {hasPendingTopup && (
            <div className="mb-6 flex items-center justify-between gap-4 rounded-xl border border-yellow-500/20 bg-yellow-500/10 px-5 py-3">
              <div className="flex items-center gap-3">
                <svg className="h-5 w-5 shrink-0 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-sm text-yellow-200">Your balance is low. Top up to keep your instances running.</span>
              </div>
              <AddFundsButton userEmail={user?.email} userPhone={profile?.phone} />
            </div>
          )}

          <div className="grid md:grid-cols-3 gap-4 mb-12">
            {/* CURRENT BALANCE */}
            <div className="border border-white/[0.06] p-6 rounded-xl flex flex-col justify-between bg-white/[0.03]">
              <div>
                <div className="text-[10px] text-[#475569] uppercase tracking-[0.15em] mb-2">Wallet Balance</div>
                <div className="text-4xl font-bold text-[#E2E8F0] mb-1 font-mono tabular-nums">{formatUSD(walletBalance)}</div>
                <p className="text-xs text-[#475569]">Billed by the minute for GPU pods and storage. All balances in USD.</p>
              </div>
              <div className="mt-6">
                <AddFundsButton userEmail={user?.email} userPhone={profile?.phone} />
              </div>
            </div>

            {/* GST PROFILE */}
            <div className="border border-white/[0.06] p-6 rounded-xl bg-white/[0.03]">
              <div className="flex justify-between items-start mb-4">
                <div className="text-[10px] text-[#475569] uppercase tracking-[0.15em]">GST Profile</div>
                <Link href="/settings" className="text-[11px] text-[#64748B] hover:text-primary transition-colors">Edit →</Link>
              </div>
              <div className="space-y-4">
                <div>
                  <div className="text-[10px] text-[#475569] mb-1">Company Name</div>
                  <div className="text-sm font-medium text-[#E2E8F0]">{profile?.company_name || 'Not provided'}</div>
                </div>
                <div>
                  <div className="text-[10px] text-[#475569] mb-1">GSTIN</div>
                  <div className="text-sm tabular-nums text-[#E2E8F0]">{profile?.gstin || 'Not provided'}</div>
                </div>
                <div className="p-3 bg-primary/[0.05] border border-primary/10 rounded-xl text-xs text-primary/80">
                  Add your GSTIN to get 18% ITC invoices with every top-up.
                </div>
              </div>
            </div>

            <AutoTopUpSettings
              initialEnabled={profile?.auto_topup_enabled || false}
              initialAmount={profile?.auto_topup_amount_usd || 500}
              initialThreshold={profile?.auto_topup_threshold_usd || 50}
            />
          </div>

          {/* TRANSACTIONS */}
          <div className="mb-12">
            <div className="text-[10px] text-[#475569] uppercase tracking-[0.15em] mb-4">Transaction History</div>
            <div className="border border-white/[0.06] rounded-xl overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/[0.06] text-[10px] text-[#475569] uppercase tracking-wider">
                    <th className="py-3 pl-6 font-medium">Date</th>
                    <th className="py-3 font-medium">Description</th>
                    <th className="py-3 font-medium hidden sm:table-cell">Reference</th>
                    <th className="py-3 font-medium text-right">Amount</th>
                    <th className="py-3 font-medium text-right pr-6">Invoice</th>
                  </tr>
                </thead>
                <tbody className="text-sm divide-y divide-white/[0.04]">
                  {transactions.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-[#475569]">
                        No transactions yet. Add funds to get started.
                      </td>
                    </tr>
                  ) : (
                    transactions.map((tx) => (
                      <tr key={tx.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="py-4 pl-6 text-[#64748B] tabular-nums text-xs">
                          {new Date(tx.created_at).toLocaleDateString()}
                        </td>
                        <td className="py-4">
                          <div className="font-medium text-[#E2E8F0] text-sm">
                            {tx.type === 'deposit' ? 'Wallet Top-up' : tx.type === 'auto_deduct' ? 'Compute Usage (Auto)' : 'Compute Usage'}
                          </div>
                          <div className={`text-[10px] uppercase tracking-wider ${tx.status === 'completed' ? 'text-primary/70' : 'text-yellow-500/70'}`}>
                            {tx.status}
                          </div>
                        </td>
                        <td className="py-4 text-[#475569] text-xs tabular-nums hidden sm:table-cell">
                          {tx.reference_id || '-'}
                        </td>
                        <td className="py-4 text-right">
                          <span className={`font-bold font-mono tabular-nums ${tx.type === 'deposit' ? 'text-primary' : 'text-[#E2E8F0]'}`}>
                            {tx.type === 'deposit' ? '+' : '-'}{formatUSD(tx.amount_usd)}
                          </span>
                        </td>
                        <td className="py-4 text-right pr-6">
                          {tx.type === 'deposit' && tx.status === 'completed' ? (
                            <a
                              href={`/api/billing/invoice/${tx.id}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs text-[#64748B] hover:text-primary transition-colors inline-flex items-center gap-1"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                              PDF
                            </a>
                          ) : (
                            <span className="text-[#475569]">-</span>
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
