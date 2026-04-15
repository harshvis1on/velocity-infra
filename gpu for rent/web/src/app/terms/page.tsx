import Link from 'next/link'

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#060606] text-white" style={{ fontFamily: 'var(--font-sans, Outfit, sans-serif)' }}>
      <div className="max-w-3xl mx-auto px-6 pt-32 pb-24">
        <Link href="/" className="text-xs text-gray-600 hover:text-primary transition-colors mb-10 inline-flex items-center gap-1.5">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          Back to Home
        </Link>
        <div className="text-[11px] uppercase tracking-[0.2em] text-gray-600 mb-4">Legal</div>
        <h1 className="text-4xl md:text-5xl font-extrabold text-white tracking-tight leading-[1.05] mb-4">Terms of <span className="text-primary">Service</span></h1>
        <p className="text-sm text-gray-600 mb-14">Last updated: April 2026</p>
        
        <div className="max-w-none space-y-10 text-gray-400 text-[15px] leading-[1.8]">
          <section>
            <h2 className="text-lg font-bold text-white mb-3">1. Acceptance of Terms</h2>
            <p>By accessing and using Velocity&apos;s GPU cloud marketplace (&quot;Service&quot;), you agree to be bound by these Terms of Service. Velocity operates as a peer-to-peer marketplace connecting GPU hosts with renters globally.</p>
          </section>
          
          <section>
            <h2 className="text-lg font-bold text-white mb-3">2. Service Description</h2>
            <p>Velocity provides a decentralized GPU cloud marketplace where hosts can list their GPU hardware for rent, and renters can deploy compute instances. We do not own or operate the underlying hardware.</p>
          </section>
          
          <section>
            <h2 className="text-lg font-bold text-white mb-3">3. User Obligations</h2>
            <p>Users must provide accurate KYC information, comply with all applicable laws including the Digital Personal Data Protection Act (DPDP), and not use the service for any illegal purposes.</p>
          </section>
          
          <section>
            <h2 className="text-lg font-bold text-white mb-3">4. Billing &amp; Payments</h2>
            <p>Payments are processed through Razorpay. Billing is calculated per-minute. GST at 18% is applicable on transactions where required. Hosts receive payouts after a 7-day settlement period.</p>
          </section>
          
          <section>
            <h2 className="text-lg font-bold text-white mb-3">5. Data Localization</h2>
            <p>All user data and compute workloads are processed within Indian data centers, in compliance with India&apos;s data sovereignty requirements.</p>
          </section>
          
          <section>
            <h2 className="text-lg font-bold text-white mb-3">6. Limitation of Liability</h2>
            <p>Velocity acts as a marketplace facilitator. We are not responsible for hardware failures, data loss, or service interruptions caused by host machines. Users are advised to maintain their own backups.</p>
          </section>
          
          <section>
            <h2 className="text-lg font-bold text-white mb-3">7. Contact</h2>
            <p>For any questions regarding these terms, contact us at <a href="mailto:legal@velocity.run" className="text-primary hover:underline">legal@velocity.run</a>.</p>
          </section>
        </div>
      </div>
    </div>
  )
}
