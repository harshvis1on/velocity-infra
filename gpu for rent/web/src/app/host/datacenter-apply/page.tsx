import { createClient } from '@/utils/supabase/server'
import Link from 'next/link'
import DatacenterForm from './DatacenterForm'

import ConsoleSidebar from '../../components/ConsoleSidebar'

export default async function DatacenterApplyPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let existingApplication: any = null
  let machineCount = 0
  let profile: any = null
  let walletBalance = 0

  if (user) {
    const { data: p } = await supabase
      .from('users')
      .select('wallet_balance_usd, phone, role, referral_code')
      .eq('id', user.id)
      .single()
    
    if (p) {
      profile = p
      walletBalance = p.wallet_balance_usd
    }

    const { data: app } = await supabase
      .from('datacenter_applications')
      .select('*')
      .eq('host_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()
    
    if (app) existingApplication = app

    const { count } = await supabase
      .from('machines')
      .select('*', { count: 'exact', head: true })
      .eq('host_id', user.id)

    machineCount = count || 0
  }

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
          <h1 className="text-sm font-medium text-white">Enterprise Application</h1>
          <div className="flex items-center gap-4">
            <div className="w-6 h-6 rounded-md bg-gradient-to-r from-primary to-blue-500" />
          </div>
        </header>

        <div className="p-8 max-w-4xl mx-auto w-full">
          <div className="mb-10 text-center">
            <div className="text-[11px] uppercase tracking-[0.2em] text-[#64748B] mb-6">Secure Cloud Program</div>
            <h2 className="text-3xl md:text-4xl font-bold font-heading text-[#E2E8F0] mb-3">Become an <span className="text-primary">Enterprise Partner</span></h2>
            <p className="text-[#94A3B8] max-w-2xl mx-auto text-sm">
              Join Velocity&apos;s elite tier of datacenter providers. Enterprise partners get higher trust scores, priority workloads, and reduced platform fees.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 mb-12">
            <div className="border border-primary/10 rounded-xl p-6 bg-primary/[0.02]">
              <div className="text-[10px] uppercase tracking-[0.15em] text-primary mb-4 font-medium">Enterprise Benefits</div>
              <ul className="space-y-4 text-sm text-[#94A3B8]">
                <li className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-primary">✓</div>
                  <div>
                    <span className="font-bold text-[#E2E8F0] block">Enterprise Badge</span>
                    <span className="text-[#64748B]">Exclusive badge on all your GPU listings to signal trust.</span>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-primary">✓</div>
                  <div>
                    <span className="font-bold text-[#E2E8F0] block">"Verified Only" Inclusion</span>
                    <span className="text-[#64748B]">Your machines appear when renters filter for verified hosts.</span>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-primary">✓</div>
                  <div>
                    <span className="font-bold text-[#E2E8F0] block">Higher Ranking</span>
                    <span className="text-[#64748B]">Boosted visibility in the marketplace sorting algorithm.</span>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-primary">✓</div>
                  <div>
                    <span className="font-bold text-[#E2E8F0] block">Priority Support</span>
                    <span className="text-[#64748B]">Direct channel to the Velocity Infra engineering team.</span>
                  </div>
                </li>
              </ul>
            </div>

            <div className="border border-white/[0.06] rounded-xl p-6 bg-white/[0.02]">
              <div className="text-[10px] uppercase tracking-[0.15em] text-[#64748B] mb-4 font-medium">Requirements</div>
              <div className="space-y-4 text-sm">
                <div className="flex items-start gap-3">
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 ${machineCount >= 5 ? 'border-primary bg-primary/20' : 'border-[#475569]'}`}>
                    {machineCount >= 5 && <svg className="w-3 h-3 text-primary" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>}
                  </div>
                  <div>
                    <div className="font-bold text-[#E2E8F0]">5+ GPU servers listed ({machineCount} listed)</div>
                    <div className="text-[#64748B]">You must have at least 5 GPU servers active on the platform.</div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full border-2 border-[#475569] shrink-0"></div>
                  <div>
                    <div className="font-bold text-[#E2E8F0]">ISO/IEC 27001 certification</div>
                    <div className="text-[#64748B]">Active third-party security certification required.</div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full border-2 border-[#475569] shrink-0"></div>
                  <div>
                    <div className="font-bold text-[#E2E8F0]">Registered business (GST/CIN)</div>
                    <div className="text-[#64748B]">Equipment must be owned by a registered Indian business entity.</div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full border-2 border-[#475569] shrink-0"></div>
                  <div>
                    <div className="font-bold text-[#E2E8F0]">Identity verification</div>
                    <div className="text-[#64748B]">PAN and Aadhaar verification of the authorized signatory.</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* EXISTING APPLICATION STATUS */}
          {existingApplication && (
            <div className={`border rounded-xl p-6 mb-8 ${
              existingApplication.status === 'approved' ? 'bg-primary/5 border-primary/20' :
              existingApplication.status === 'rejected' ? 'bg-red-500/5 border-red-500/20' :
              'bg-yellow-500/5 border-yellow-500/20'
            }`}>
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-bold text-[#E2E8F0]">Application Status</h3>
                <span className={`text-xs font-bold uppercase px-2 py-1 rounded-full ${
                  existingApplication.status === 'approved' ? 'bg-primary/20 text-primary' :
                  existingApplication.status === 'rejected' ? 'bg-red-500/20 text-red-400' :
                  'bg-yellow-500/20 text-yellow-400'
                }`}>
                  {existingApplication.status}
                </span>
              </div>
              <p className="text-sm text-[#94A3B8]">
                Submitted on {new Date(existingApplication.created_at).toLocaleDateString()}
                {existingApplication.review_notes && (
                  <span className="block mt-2 text-[#E2E8F0]">Note: {existingApplication.review_notes}</span>
                )}
              </p>
            </div>
          )}

          {/* APPLICATION FORM */}
          {(!existingApplication || existingApplication.status === 'rejected') && (
            <DatacenterForm />
          )}
        </div>
      </main>
    </div>
  )
}
