import Link from 'next/link'

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#0B0F19] text-[#E2E8F0]">
      <div className="max-w-3xl mx-auto px-6 pt-32 pb-24">
        <Link href="/" className="text-xs text-[#64748B] hover:text-primary transition-colors mb-10 inline-flex items-center gap-1.5">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          Back to Home
        </Link>
        <div className="text-[11px] uppercase tracking-[0.2em] text-[#475569] mb-4">Legal</div>
        <h1 className="text-4xl md:text-5xl font-heading font-extrabold text-[#E2E8F0] tracking-tight leading-[1.05] mb-4">Privacy <span className="text-primary">Policy</span></h1>
        <p className="text-sm text-[#475569] mb-14">Last updated: April 2026</p>
        
        <div className="max-w-none space-y-10 text-[#94A3B8] text-[15px] leading-[1.8]">
          <section>
            <h2 className="text-lg font-bold text-[#E2E8F0] mb-3">1. Information We Collect</h2>
            <p>
              Velocity (&quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) collects account information you provide when you register or use velocity.run, including your name, email address, company name, optional GSTIN where you supply it for billing or tax purposes, and identity verification information when onboarding or compliance requires it. We collect operational and usage data related to GPU instances and the marketplace, such as instance logs, resource identifiers, and GPU usage metrics needed to meter services and support you. Payment card and bank details are collected and processed by Razorpay; we receive transaction references, amounts, and status from Razorpay rather than storing full card numbers on our systems. We also collect device and browser information (for example IP address, user agent, and general location derived from IP) and SSH public keys that you upload so we can provision secure access to compute resources.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[#E2E8F0] mb-3">2. How We Collect Information</h2>
            <p>
              We collect information directly from you when you create an account, complete onboarding or KYC steps, add payment methods, configure instances, upload SSH keys, or contact support. We automatically collect certain technical data when you use the platform, including through cookies and similar technologies, server logs, and analytics that help us understand performance and usage patterns. Where you sign in using a third-party identity provider linked through our authentication stack, we receive profile identifiers and email from that provider as permitted by your consent with them and our integration settings.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[#E2E8F0] mb-3">3. How We Use Your Data</h2>
            <p>
              We use personal data to operate the Velocity GPU cloud marketplace, including matching hosts and renters, provisioning infrastructure, and delivering the services described in our terms. We process payments, reconcile transactions, and generate tax-compliant invoices and records as required for commerce in India. We use usage and technical data to detect and prevent fraud, abuse, and security incidents, and to monitor reliability and capacity. We also use data to improve the product, troubleshoot issues, and send service-related notices, security alerts, and substantive updates about Velocity (marketing communications, where used, follow your preferences and applicable law).
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[#E2E8F0] mb-3">4. Legal Basis for Processing</h2>
            <p>
              Where the Digital Personal Data Protection Act, 2023 (DPDP Act) applies, we rely on permitted grounds including consent where required, performance of a contract with you, compliance with legal obligations (such as tax and accounting rules), and legitimate interests that are not overridden by your rights (for example securing the platform, analytics tied to service improvement, and fraud prevention). Where we ask for consent, you may withdraw it in line with Section 10 below, subject to exceptions that allow continued processing when the law requires. We document our bases so that processing remains transparent and proportionate to the purpose.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[#E2E8F0] mb-3">5. Data Sharing</h2>
            <p>
              We share personal data with Razorpay Limited and its affiliates as necessary to process payments, refunds, and payouts you initiate on the platform. We use Supabase and related infrastructure providers to host authentication, application data, and database services that power velocity.run. We do not sell your personal data to third parties and we do not share it for third-party behavioral advertising. We may disclose information to law enforcement, regulators, courts, or other authorities when required by applicable law, or when we reasonably believe disclosure is necessary to protect rights, safety, or the integrity of the service.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[#E2E8F0] mb-3">6. Cookies and Tracking</h2>
            <p>
              We use essential cookies and similar technologies that are required for authentication, session management, security (including CSRF protection where applicable), and core site functionality; these cannot be switched off without impairing access to the service. Where we deploy analytics cookies or similar tools, we aim to make them optional where feasible and to align collection with our privacy notices and your choices. We do not use third-party advertising trackers to profile you across unrelated websites for ad retargeting on Velocity.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[#E2E8F0] mb-3">7. Data Storage and Security</h2>
            <p>
              Personal data is primarily processed and stored using Supabase and associated cloud infrastructure, with a focus on regions and configurations appropriate for our India-focused operations. Data at rest is protected using strong encryption such as AES-256 where supported by our providers, and data in transit is protected using TLS 1.2 or higher (including TLS 1.3 where available). We apply database controls including row-level security policies, role-based access, and least-privilege principles for internal systems. Our application is deployed on Vercel for edge and serverless delivery; we review vendor practices and conduct regular access reviews and security monitoring to reduce unauthorized access risk.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[#E2E8F0] mb-3">8. DPDP Act Compliance</h2>
            <p>
              Velocity acts as a Data Fiduciary under India&apos;s Digital Personal Data Protection Act, 2023 for personal data we determine the purpose and means of processing. We process personal data fairly, for specified purposes, and limit collection to what is adequate and necessary for those purposes (data minimization). We maintain reasonable safeguards and governance practices, support your rights as described in this policy, and manage consent and notices in line with the Act and applicable rules. We also align internal processes for breach readiness, vendor oversight, and cooperation with the Data Protection Board of India where relevant.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[#E2E8F0] mb-3">9. Data Retention</h2>
            <p>
              We retain account and profile data for as long as your account remains active and for a reasonable period afterward to resolve disputes, enforce agreements, and meet legal requirements. Financial and tax-related records, including invoices and transaction metadata, may be retained for up to seven years or longer if Indian law requires a longer period for your transaction type. Compute and instance-related logs are generally retained for approximately ninety days unless a longer period is needed for security investigations or legal holds. Payment records processed through Razorpay are also retained according to legal and regulatory requirements applicable to payment processing.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[#E2E8F0] mb-3">10. Your Rights</h2>
            <p>
              Subject to applicable law, you may request access to your personal data, correction of inaccurate information, and erasure where grounds apply. You may request data portability in a structured, machine-readable format where technically feasible and required by law. You may withdraw consent for processing that is based on consent, without affecting the lawfulness of processing before withdrawal. If you believe we have infringed the DPDP Act, you may lodge a complaint with the Data Protection Board of India in accordance with procedures the Board prescribes. For requests related to this policy, contact us using the details in Section 14.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[#E2E8F0] mb-3">11. International Transfers</h2>
            <p>
              Your personal data is primarily stored and processed in India through our chosen infrastructure providers. A limited subset of data may transit or be processed outside India when required for content delivery networks, edge functions (including hosting on Vercel), email delivery, or subprocessors that operate globally, in each case with appropriate contractual and technical safeguards as required by law. We work to minimize cross-border transfers and to ensure that any transfer meets the conditions set out under the DPDP Act and related instruments.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[#E2E8F0] mb-3">12. Children</h2>
            <p>
              Velocity is not directed at individuals under eighteen (18) years of age, and we do not knowingly collect personal data from children. If you are a parent or guardian and believe a child has provided us with personal data, please contact us at privacy@velocity.run and we will take steps to delete such information where required by law. By using the service, you represent that you are at least eighteen or the age of majority in your jurisdiction.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[#E2E8F0] mb-3">13. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time to reflect changes in law, our services, or our practices. When we make material changes, we will provide at least thirty (30) days&apos; notice by posting the updated policy on velocity.run and, where appropriate, by email or in-product notice before the changes take effect. Your continued use of the service after the effective date of material changes constitutes acceptance of the revised policy where permitted by law; if you do not agree, you should stop using the service and may exercise your rights regarding your data as described above.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[#E2E8F0] mb-3">14. Contact</h2>
            <p>
              For privacy questions, requests, or concerns, including matters related to the DPDP Act, contact our Data Protection Officer at{' '}
              <a href="mailto:privacy@velocity.run" className="text-primary hover:underline">privacy@velocity.run</a>
              . Please include your registered email and a clear description of your request so we can respond efficiently.
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
