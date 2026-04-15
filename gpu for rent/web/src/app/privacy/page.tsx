import Link from 'next/link'

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#050505] text-white">
      <div className="max-w-3xl mx-auto px-6 py-20">
        <Link href="/" className="text-sm text-primary hover:text-white transition-colors mb-8 inline-block">&larr; Back to Home</Link>
        <h1 className="text-4xl font-bold mb-8">Privacy Policy</h1>
        
        <div className="max-w-none space-y-8 text-gray-300 text-[15px] leading-relaxed">
          <p className="text-lg text-gray-400">Last updated: April 2026</p>
          
          <section>
            <h2 className="text-xl font-bold text-white mb-3">1. Information We Collect</h2>
            <p>We collect information necessary to operate the marketplace: email address, name, company details, GSTIN (optional), KYC documents, SSH public keys, and payment information processed through Razorpay.</p>
          </section>
          
          <section>
            <h2 className="text-xl font-bold text-white mb-3">2. DPDP Compliance</h2>
            <p>Velocity Infra is fully compliant with India&apos;s Digital Personal Data Protection Act (DPDP). All personal data is processed and stored within Indian jurisdiction. We act as a Data Fiduciary as defined under the DPDP Act.</p>
          </section>
          
          <section>
            <h2 className="text-xl font-bold text-white mb-3">3. Data Storage &amp; Security</h2>
            <p>All data is stored on servers located in India. We use enterprise-grade encryption (AES-256 at rest, TLS 1.3 in transit) and implement strict access controls. User authentication is managed through Supabase with industry-standard security practices.</p>
          </section>
          
          <section>
            <h2 className="text-xl font-bold text-white mb-3">4. How We Use Your Data</h2>
            <p>Your data is used solely for: operating the marketplace, processing payments, generating GST-compliant invoices, KYC verification, and communicating service updates. We never sell your data to third parties.</p>
          </section>
          
          <section>
            <h2 className="text-xl font-bold text-white mb-3">5. Data Retention</h2>
            <p>Account data is retained for the duration of your account plus 7 years for tax compliance. Compute logs are retained for 90 days. You may request data deletion at any time, subject to legal retention requirements.</p>
          </section>
          
          <section>
            <h2 className="text-xl font-bold text-white mb-3">6. Your Rights</h2>
            <p>Under the DPDP Act, you have the right to access, correct, and erase your personal data. You may also withdraw consent for data processing. Contact our Data Protection Officer at <a href="mailto:privacy@velocityinfra.in" className="text-primary hover:underline">privacy@velocityinfra.in</a>.</p>
          </section>
          
          <section>
            <h2 className="text-xl font-bold text-white mb-3">7. Contact</h2>
            <p>Data Protection Officer: <a href="mailto:privacy@velocityinfra.in" className="text-primary hover:underline">privacy@velocityinfra.in</a></p>
          </section>
        </div>
      </div>
    </div>
  )
}
