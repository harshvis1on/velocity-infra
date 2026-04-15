import Link from 'next/link'

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#060606] text-white" style={{ fontFamily: 'var(--font-sans, Outfit, sans-serif)' }}>
      <div className="max-w-3xl mx-auto px-6 pt-32 pb-24">
        <Link href="/" className="text-xs text-gray-600 hover:text-primary transition-colors mb-10 inline-flex items-center gap-1.5">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          Back to Home
        </Link>
        <div className="text-[11px] uppercase tracking-[0.2em] text-gray-600 mb-4">Legal</div>
        <h1 className="text-4xl md:text-5xl font-extrabold text-white tracking-tight leading-[1.05] mb-4">Privacy <span className="text-primary">Policy</span></h1>
        <p className="text-sm text-gray-600 mb-14">Last updated: April 2026</p>
        
        <div className="max-w-none space-y-10 text-gray-400 text-[15px] leading-[1.8]">
          <section>
            <h2 className="text-lg font-bold text-white mb-3">1. Information We Collect</h2>
            <p>We collect information necessary to operate the marketplace: email address, name, company details, GSTIN (optional), KYC documents, SSH public keys, and payment information processed through Razorpay.</p>
          </section>
          
          <section>
            <h2 className="text-lg font-bold text-white mb-3">2. DPDP Compliance</h2>
            <p>Velocity is fully compliant with India&apos;s Digital Personal Data Protection Act (DPDP). All personal data is processed and stored within Indian jurisdiction. We act as a Data Fiduciary as defined under the DPDP Act.</p>
          </section>
          
          <section>
            <h2 className="text-lg font-bold text-white mb-3">3. Data Storage &amp; Security</h2>
            <p>All data is stored on servers located in India. We use enterprise-grade encryption (AES-256 at rest, TLS 1.3 in transit) and implement strict access controls. User authentication is managed through Supabase with industry-standard security practices.</p>
          </section>
          
          <section>
            <h2 className="text-lg font-bold text-white mb-3">4. How We Use Your Data</h2>
            <p>Your data is used solely for: operating the marketplace, processing payments, generating tax-compliant invoices, KYC verification, and communicating service updates. We never sell your data to third parties.</p>
          </section>
          
          <section>
            <h2 className="text-lg font-bold text-white mb-3">5. Data Retention</h2>
            <p>Account data is retained for the duration of your account plus 7 years for tax compliance. Compute logs are retained for 90 days. You may request data deletion at any time, subject to legal retention requirements.</p>
          </section>
          
          <section>
            <h2 className="text-lg font-bold text-white mb-3">6. Your Rights</h2>
            <p>Under the DPDP Act, you have the right to access, correct, and erase your personal data. You may also withdraw consent for data processing. Contact our Data Protection Officer at <a href="mailto:privacy@velocity.run" className="text-primary hover:underline">privacy@velocity.run</a>.</p>
          </section>
          
          <section>
            <h2 className="text-lg font-bold text-white mb-3">7. Contact</h2>
            <p>Data Protection Officer: <a href="mailto:privacy@velocity.run" className="text-primary hover:underline">privacy@velocity.run</a></p>
          </section>
        </div>
      </div>
    </div>
  )
}
