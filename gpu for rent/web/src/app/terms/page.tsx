import Link from 'next/link'

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#0B0F19] text-[#E2E8F0]">
      <div className="max-w-3xl mx-auto px-6 pt-32 pb-24">
        <Link href="/" className="text-xs text-[#64748B] hover:text-primary transition-colors mb-10 inline-flex items-center gap-1.5">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          Back to Home
        </Link>
        <div className="text-[11px] uppercase tracking-[0.2em] text-[#475569] mb-4">Legal</div>
        <h1 className="text-4xl md:text-5xl font-heading font-extrabold text-[#E2E8F0] tracking-tight leading-[1.05] mb-4">Terms of <span className="text-primary">Service</span></h1>
        <p className="text-sm text-[#475569] mb-14">Last updated: April 2026</p>
        
        <div className="max-w-none space-y-10 text-[#94A3B8] text-[15px] leading-[1.8]">
          <section>
            <h2 className="text-lg font-bold text-[#E2E8F0] mb-3">1. Acceptance of Terms</h2>
            <p>These Terms of Service (&quot;Terms&quot;) form a binding agreement between you and Velocity regarding your access to and use of the website at velocity.run, related applications, and the GPU cloud marketplace and related services we provide (together, the &quot;Platform&quot;). By creating an account, clicking to accept these Terms, or otherwise using the Platform, you confirm that you have read, understood, and agree to be bound by these Terms and our policies referenced herein.</p>
            <p>If you do not agree, you must not access or use the Platform. You represent that you have the legal capacity to enter into this agreement and, if you use the Platform on behalf of an organization, that you have authority to bind that organization.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[#E2E8F0] mb-3">2. Definitions</h2>
            <p>For these Terms: &quot;Platform&quot; means Velocity&apos;s websites, APIs, dashboards, billing systems, and software we operate to facilitate GPU compute between parties. &quot;Renter&quot; means a user who funds a wallet and deploys or uses compute capacity on the Platform. &quot;Host&quot; means a user who lists GPU hardware or related resources for use by Renters through the Platform.</p>
            <p>&quot;Instance&quot; means a virtual or containerized compute environment, session, or deployment made available to a Renter on Host-supplied infrastructure, as described in the product. &quot;Wallet&quot; means the prepaid balance or ledger associated with your account that is used to pay for usage and fees in accordance with these Terms and our billing rules.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[#E2E8F0] mb-3">3. Account Registration</h2>
            <p>You may register using email-based authentication or third-party sign-in (&quot;OAuth&quot;) providers supported by our authentication partner (Supabase), subject to their applicable terms and our account requirements. You agree to provide accurate, current, and complete registration and profile information, and to update it promptly when it changes.</p>
            <p>Unless we expressly permit otherwise, you may maintain only one personal account. You are responsible for safeguarding your credentials, for all activity under your account, and for notifying us promptly at legal@velocity.run if you suspect unauthorized access. We may suspend or verify accounts to protect the Platform, comply with law, or enforce these Terms.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[#E2E8F0] mb-3">4. Platform Description</h2>
            <p>Velocity operates a marketplace that connects Hosts who supply GPU capacity with Renters who consume it for workloads such as machine learning, inference, development, and related compute. We provide software, orchestration, discovery, billing, and support tooling; we do not replace independent commercial and technical judgment between Hosts and Renters regarding suitability of workloads or hardware.</p>
            <p>To improve availability and pricing, capacity shown to Renters may be sourced or routed through intermediaries or pooled arrangements in line with our product design. Where the Platform uses proxy or aggregated sourcing of GPU capacity, that sourcing may be transparent to Renters in the user interface or documentation, and Renters acknowledge that underlying Host identity or network path may not be fully visible in every view.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[#E2E8F0] mb-3">5. Renter Terms</h2>
            <p>Renters must maintain a funded Wallet or complete payment flows we specify before usage accrues. Usage is billed on a per-minute (or finer) basis according to the rates, Instance types, and templates displayed at the time of deployment, unless otherwise stated in writing. You are responsible for stopping Instances you no longer need and for monitoring spend.</p>
            <p>Templates, images, and starter content we make available are licensed for use on the Platform in connection with your workloads and may be subject to separate notices or third-party licenses where stated. You agree not to use the Platform for cryptocurrency mining, password cracking, unlawful surveillance, distribution of malware, or any activity that violates law or our Acceptable Use Policy.</p>
            <p>You must comply with applicable export, sanctions, and telecommunications rules, and you must not use Instances to store or process illegal content, infringe intellectual property, or harm third parties. We may throttle, suspend, or terminate workloads that violate these Terms or present security or legal risk.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[#E2E8F0] mb-3">6. Host Terms</h2>
            <p>Hosts may list eligible GPU hardware and related resources subject to our onboarding, verification, and technical requirements. You represent that you have the right to offer the listed capacity, that it matches the specifications you publish, and that your operation complies with applicable law, landlord or datacenter agreements, and power and network rules.</p>
            <p>Hosts are expected to maintain reasonable uptime and responsiveness consistent with the expectations we communicate for the Host program, including keeping agent or node software we require installed, updated, and securely configured. Revenue share, fees, and payout schedules are as stated in the Host terms, dashboards, or separate agreements you accept when joining the program.</p>
            <p>Payouts are typically settled after any stated holding or review period and may require valid tax and banking details. We may withhold or offset amounts for chargebacks, fraud, refunds, penalties, or breach. Hosts must cooperate with incident response and must not interfere with metering, billing, or Platform security controls.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[#E2E8F0] mb-3">7. Billing and Payments</h2>
            <p>Payments are processed through Razorpay or other processors we designate. You authorize us and our payment partners to charge your chosen payment methods and to store payment tokens as needed to operate wallets, subscriptions, or top-ups. The Platform uses a prepaid Wallet model for many Renter charges: funds are drawn down as usage accrues at the applicable per-minute rates unless we offer invoicing for qualified accounts.</p>
            <p>Taxes such as GST at 18% (or other rates required by law) may be added to invoices or checkout totals where applicable, and you are responsible for any withholding or reporting obligations that apply to you. If an Instance or Host-backed deployment fails due to a verified provider-side outage or error that we attribute to the Host or our infrastructure controls, we may credit or refund affected usage in line with our published refund policy for downtime.</p>
            <p>Chargebacks and payment reversals undermine a prepaid marketplace. You agree to contact support before initiating a reversal, and you acknowledge that unjustified chargebacks may lead to suspension, collection, and recovery of fees. Payout timing, minimums, and deductions for Hosts are described in the Host experience and may change with notice where required.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[#E2E8F0] mb-3">8. Intellectual Property</h2>
            <p>As between you and Velocity, you retain ownership of your code, models, datasets, prompts, and other content you upload or generate using your own resources, subject to licenses you grant below and rights of your licensors. You grant Velocity a non-exclusive, worldwide license to host, process, transmit, and display your content solely as needed to operate, secure, and improve the Platform for you.</p>
            <p>Velocity and its licensors own all rights in the Platform software, branding, documentation, and aggregate analytics derived from service operation (excluding your confidential content). Except for the limited right to use the Platform during your subscription or access period, no rights are granted to our trademarks or source code. Feedback you provide may be used without restriction or obligation to you.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[#E2E8F0] mb-3">9. Data and Privacy</h2>
            <p>Our collection and use of personal data are described in the Velocity Privacy Policy available on velocity.run. By using the Platform, you consent to those practices, which are designed to align with the Digital Personal Data Protection Act, 2023 and other applicable Indian privacy requirements where they apply to our role.</p>
            <p>You are responsible for lawful bases or notices you may owe to your own end users or employees whose data you place on Instances. We implement administrative, technical, and organizational measures appropriate to the service, but you should encrypt sensitive data and maintain backups according to your risk profile.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[#E2E8F0] mb-3">10. Acceptable Use Policy</h2>
            <p>You may not use the Platform or any Instance for cryptocurrency mining, illegal gambling, child exploitation material, hate or harassment campaigns, or distribution of malware, spam, or phishing. You may not probe, scan, or attack third-party systems without authorization, abuse outbound network capacity, or operate open proxies or anonymizers for unlawful traffic.</p>
            <p>You may not resell, sublicense, or redistribute Platform access or Host capacity to third parties without our written authorization, including operating an unauthorized bureau or &quot;white label&quot; service on top of Velocity. You may not misrepresent Instance origin, circumvent metering, or interfere with other users&apos; workloads. We may investigate violations and cooperate with law enforcement when required.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[#E2E8F0] mb-3">11. Service Availability</h2>
            <p>We strive to keep the Platform and its control plane available on a best-effort basis, with maintenance windows communicated when practicable. The marketplace depends on Host hardware and third-party networks, so intermittent failures, latency, or regional degradation may occur without advance notice.</p>
            <p>At launch, we do not guarantee a specific uptime service level agreement for the Platform unless we provide a separate written SLA for your account. Where a provider-side failure is confirmed under our policies, we may automatically refund or credit eligible compute charges for the affected window as described in billing support documentation.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[#E2E8F0] mb-3">12. Limitation of Liability</h2>
            <p>Velocity facilitates connections and payments between Renters and Hosts and operates shared software. We are not liable for Host hardware defects, misconfigurations, data loss on Instances, network issues outside our reasonable control, or consequential damages such as lost profits, lost data, or business interruption, except where liability cannot be excluded under applicable law.</p>
            <p>To the maximum extent permitted by law, our aggregate liability arising out of or relating to the Platform or these Terms in any twelve-month period is limited to the fees you paid to Velocity for the Platform itself in that period (excluding pass-through amounts paid to Hosts where separately accounted). Some jurisdictions do not allow certain limitations; in those cases, our liability is limited to the fullest extent allowed.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[#E2E8F0] mb-3">13. Indemnification</h2>
            <p>You will defend, indemnify, and hold harmless Velocity, its affiliates, and their directors, officers, employees, and agents from and against any third-party claims, damages, losses, and expenses (including reasonable attorneys&apos; fees) arising out of your content, your workloads, your breach of these Terms, or your violation of law.</p>
            <p>We will provide reasonable notice of any claim we seek indemnification for and cooperate in your defense at your expense. You may not settle any claim that imposes an obligation on us without our prior written consent.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[#E2E8F0] mb-3">14. Termination</h2>
            <p>You may close your account through the settings or flows we provide, subject to completion of outstanding charges and investigation holds. We may suspend or terminate access if you breach these Terms, create risk or legal exposure, fail to pay, or if we discontinue all or part of the Platform with reasonable notice where practicable.</p>
            <p>Upon termination, your right to use the Platform stops immediately. Prepaid Wallet balances may be refunded or forfeited according to our then-current policy and applicable law, net of fees, chargebacks, and amounts you owe. Sections that by nature should survive (including intellectual property, limitation of liability, indemnity, dispute resolution, and governing law) will survive termination.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[#E2E8F0] mb-3">15. Dispute Resolution</h2>
            <p>These Terms are governed by the laws of India, without regard to conflict-of-law rules that would apply another jurisdiction&apos;s laws. Subject to mandatory consumer protections that may apply to you, you agree that the courts in Mumbai, Maharashtra shall have exclusive jurisdiction over any dispute arising out of or relating to these Terms or the Platform.</p>
            <p>Before filing a claim, you agree to contact us at legal@velocity.run and attempt to resolve the dispute in good faith for at least thirty days. Nothing in this section limits our right to seek injunctive relief for misuse of the Platform or intellectual property.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[#E2E8F0] mb-3">16. Changes to Terms</h2>
            <p>We may update these Terms to reflect new features, legal requirements, or risk management needs. We will post the revised Terms on velocity.run and update the &quot;Last updated&quot; date. If a change is material and adversely affects your rights, we will provide at least thirty days&apos; notice by email, in-product notice, or another reasonable method before the change takes effect.</p>
            <p>Continued use after the effective date of updated Terms constitutes acceptance. If you do not agree, you must stop using the Platform before the effective date and may close your account as described above.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[#E2E8F0] mb-3">17. Contact</h2>
            <p>For questions about these Terms, notices, or legal compliance, contact Velocity at <a href="mailto:legal@velocity.run" className="text-primary hover:underline">legal@velocity.run</a>. Physical correspondence may be directed to the registered address we publish on velocity.run when available.</p>
          </section>
        </div>
      </div>
    </div>
  )
}
