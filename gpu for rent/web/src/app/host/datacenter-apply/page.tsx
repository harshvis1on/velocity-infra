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
      .select('wallet_balance_inr, phone, role')
      .eq('id', user.id)
      .single()
    
    if (p) {
      profile = p
      walletBalance = p.wallet_balance_inr
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
    <div className="min-h-screen flex bg-[#050505] text-white font-sans">
      <ConsoleSidebar 
        role={profile?.role || 'host'} 
        walletBalance={walletBalance} 
        userEmail={user?.email} 
        userPhone={profile?.phone} 
      />

      {/* MAIN CONTENT */}
      <main className="flex-1 flex flex-col h-screen overflow-y-auto">
        <header className="h-16 flex items-center justify-between px-8 border-b border-white/10 bg-[#050505] sticky top-0 z-10">
          <h1 className="text-xl font-bold">Secure Cloud — Datacenter Partner Application</h1>
          <div className="flex items-center gap-4">
            <div className="w-8 h-8 rounded-full bg-gradient-to-r from-primary to-blue-500"></div>
          </div>
        </header>

        <div className="p-8 max-w-4xl mx-auto w-full">
          {/* HEADER SECTION */}
          <div className="mb-10 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 text-primary mb-4">
              <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z" clipRule="evenodd" /></svg>
            </div>
            <h2 className="text-3xl font-bold mb-2">Become a Secure Cloud Partner</h2>
            <p className="text-gray-400 max-w-2xl mx-auto">
              Join Velocity Infra's elite tier of datacenter providers. Secure Cloud partners benefit from enterprise-grade visibility, higher trust scores, and priority access to enterprise workloads.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 mb-12">
            {/* BENEFITS */}
            <div className="bg-gradient-to-br from-primary/5 to-blue-500/5 border border-primary/20 rounded-2xl p-6">
              <h2 className="text-lg font-bold text-primary mb-4 flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                Enterprise Benefits
              </h2>
              <ul className="space-y-4 text-sm text-gray-300">
                <li className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-primary">✓</div>
                  <div>
                    <span className="font-bold text-white block">Enterprise Badge</span>
                    <span className="text-gray-400">Exclusive badge on all your GPU listings to signal trust.</span>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-primary">✓</div>
                  <div>
                    <span className="font-bold text-white block">"Verified Only" Inclusion</span>
                    <span className="text-gray-400">Your machines appear when renters filter for verified hosts.</span>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-primary">✓</div>
                  <div>
                    <span className="font-bold text-white block">Higher Ranking</span>
                    <span className="text-gray-400">Boosted visibility in the marketplace sorting algorithm.</span>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-primary">✓</div>
                  <div>
                    <span className="font-bold text-white block">Priority Support</span>
                    <span className="text-gray-400">Direct channel to the Velocity Infra engineering team.</span>
                  </div>
                </li>
              </ul>
            </div>

            {/* REQUIREMENTS */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                Requirements
              </h2>
              <div className="space-y-4 text-sm">
                <div className="flex items-start gap-3">
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 ${machineCount >= 5 ? 'border-green-500 bg-green-500/20' : 'border-gray-600'}`}>
                    {machineCount >= 5 && <svg className="w-3 h-3 text-green-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>}
                  </div>
                  <div>
                    <div className="font-bold text-white">5+ GPU servers listed ({machineCount} listed)</div>
                    <div className="text-gray-400">You must have at least 5 GPU servers active on the platform.</div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full border-2 border-gray-600 shrink-0"></div>
                  <div>
                    <div className="font-bold text-white">ISO/IEC 27001 certification</div>
                    <div className="text-gray-400">Active third-party security certification required.</div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full border-2 border-gray-600 shrink-0"></div>
                  <div>
                    <div className="font-bold text-white">Registered business (GST/CIN)</div>
                    <div className="text-gray-400">Equipment must be owned by a registered Indian business entity.</div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full border-2 border-gray-600 shrink-0"></div>
                  <div>
                    <div className="font-bold text-white">Identity verification</div>
                    <div className="text-gray-400">PAN and Aadhaar verification of the authorized signatory.</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* EXISTING APPLICATION STATUS */}
          {existingApplication && (
            <div className={`border rounded-xl p-6 mb-8 ${
              existingApplication.status === 'approved' ? 'bg-green-500/5 border-green-500/20' :
              existingApplication.status === 'rejected' ? 'bg-red-500/5 border-red-500/20' :
              'bg-yellow-500/5 border-yellow-500/20'
            }`}>
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-bold">Application Status</h3>
                <span className={`text-xs font-bold uppercase px-2 py-1 rounded-full ${
                  existingApplication.status === 'approved' ? 'bg-green-500/20 text-green-400' :
                  existingApplication.status === 'rejected' ? 'bg-red-500/20 text-red-400' :
                  'bg-yellow-500/20 text-yellow-400'
                }`}>
                  {existingApplication.status}
                </span>
              </div>
              <p className="text-sm text-gray-400">
                Submitted on {new Date(existingApplication.created_at).toLocaleDateString()}
                {existingApplication.review_notes && (
                  <span className="block mt-2 text-gray-300">Note: {existingApplication.review_notes}</span>
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
