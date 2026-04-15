import Link from 'next/link'

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#050505] text-white">
      <div className="max-w-3xl mx-auto px-6 py-20">
        <Link href="/" className="text-sm text-primary hover:text-white transition-colors mb-8 inline-block">&larr; Back to Home</Link>
        <h1 className="text-4xl font-bold mb-8">Terms of Service</h1>
        
        <div className="max-w-none space-y-8 text-gray-300 text-[15px] leading-relaxed">
          <p className="text-lg text-gray-400">Last updated: April 2026</p>
          
          <section>
            <h2 className="text-xl font-bold text-white mb-3">1. Acceptance of Terms</h2>
            <p>By accessing and using Velocity Infra&apos;s GPU cloud marketplace (&quot;Service&quot;), you agree to be bound by these Terms of Service. Velocity Infra operates as a peer-to-peer marketplace connecting GPU hosts with renters across India.</p>
          </section>
          
          <section>
            <h2 className="text-xl font-bold text-white mb-3">2. Service Description</h2>
            <p>Velocity Infra provides a decentralized GPU cloud marketplace where hosts can list their GPU hardware for rent, and renters can deploy compute instances. We do not own or operate the underlying hardware.</p>
          </section>
          
          <section>
            <h2 className="text-xl font-bold text-white mb-3">3. User Obligations</h2>
            <p>Users must provide accurate KYC information, comply with all applicable Indian laws including the Digital Personal Data Protection Act (DPDP), and not use the service for any illegal purposes.</p>
          </section>
          
          <section>
            <h2 className="text-xl font-bold text-white mb-3">4. Billing &amp; Payments</h2>
            <p>All payments are processed in INR through Razorpay. Billing is calculated per-minute. GST at 18% is applicable on all transactions. Hosts receive payouts after a 7-day settlement period.</p>
          </section>
          
          <section>
            <h2 className="text-xl font-bold text-white mb-3">5. Data Localization</h2>
            <p>All user data and compute workloads are processed within Indian data centers, in compliance with India&apos;s data sovereignty requirements.</p>
          </section>
          
          <section>
            <h2 className="text-xl font-bold text-white mb-3">6. Limitation of Liability</h2>
            <p>Velocity Infra acts as a marketplace facilitator. We are not responsible for hardware failures, data loss, or service interruptions caused by host machines. Users are advised to maintain their own backups.</p>
          </section>
          
          <section>
            <h2 className="text-xl font-bold text-white mb-3">7. Contact</h2>
            <p>For any questions regarding these terms, contact us at <a href="mailto:legal@velocityinfra.in" className="text-primary hover:underline">legal@velocityinfra.in</a>.</p>
          </section>
        </div>
      </div>
    </div>
  )
}
