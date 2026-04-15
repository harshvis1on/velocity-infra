import type { Metadata } from 'next';
import { StatusBadge, WarningBox } from '../shared';

export const metadata: Metadata = {
  title: 'Security | Velocity Docs',
  description:
    'Container hardening, network rules, abuse detection, platform controls, KYC, DPDP, and gaps.',
};

export default function SecurityDocsPage() {
  return (
    <article className="space-y-12 text-gray-300">
      <header className="space-y-3">
        <p className="text-sm font-medium uppercase tracking-widest text-primary/90">Platform</p>
        <h1 className="text-3xl font-bold tracking-tight text-white md:text-4xl">Security</h1>
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge kind="live" />
          <p className="max-w-2xl text-lg leading-relaxed text-gray-400">
            Defense in depth across containers, network, application, and identity.
          </p>
        </div>
      </header>

      <section className="space-y-4">
        <h2 className="flex flex-wrap items-center gap-2 text-xl font-semibold text-white">
          Container security <StatusBadge kind="live" />
        </h2>
        <ul className="list-disc space-y-2 pl-5 leading-relaxed">
          <li>
            <code className="text-primary/95">--security-opt no-new-privileges</code>
          </li>
          <li>
            All capabilities dropped (<code className="text-primary/95">--cap-drop ALL</code>)
          </li>
          <li>
            Read-only root filesystem (<code className="text-primary/95">--read-only</code>)
          </li>
          <li>tmpfs for /tmp and /run</li>
          <li>Resource limits: CPU, memory, PIDs</li>
          <li>
            Dedicated Docker network (<code className="text-primary/95">velocity-net</code>)
          </li>
        </ul>
      </section>

      <section className="space-y-4">
        <h2 className="flex flex-wrap items-center gap-2 text-xl font-semibold text-white">
          Network security <StatusBadge kind="live" />
        </h2>
        <p className="leading-relaxed">
          Blocked ports: SMTP (25, 465, 587), BitTorrent ranges, mining stratum—applied via iptables
          rules inside containers.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="flex flex-wrap items-center gap-2 text-xl font-semibold text-white">
          Abuse detection <StatusBadge kind="live" />
        </h2>
        <ul className="list-disc space-y-2 pl-5 leading-relaxed">
          <li>Process name scanning for mining software</li>
          <li>Pool connection pattern detection</li>
          <li>nvidia-smi compute app monitoring</li>
          <li>
            Violations logged to <code className="text-primary/95">abuse_logs</code> table
          </li>
        </ul>
      </section>

      <section className="space-y-4">
        <h2 className="flex flex-wrap items-center gap-2 text-xl font-semibold text-white">
          Platform security <StatusBadge kind="live" />
        </h2>
        <ul className="list-disc space-y-2 pl-5 leading-relaxed">
          <li>
            Security headers: HSTS, CSP, X-Frame-Options (DENY), COOP, CORP
          </li>
          <li>Supabase Row Level Security on all tables</li>
          <li>
            Middleware: session management, KYC gating, banned user checks, role-based access
          </li>
          <li>Input validation via Zod schemas</li>
        </ul>
      </section>

      <section className="space-y-4">
        <h2 className="flex flex-wrap items-center gap-2 text-xl font-semibold text-white">
          KYC verification <StatusBadge kind="live" />
        </h2>
        <ul className="list-disc space-y-2 pl-5 leading-relaxed">
          <li>Phone OTP (Twilio)</li>
          <li>PAN verification (for hosts)</li>
          <li>GSTIN validation (optional)</li>
        </ul>
      </section>

      <section className="space-y-4">
        <h2 className="flex flex-wrap items-center gap-2 text-xl font-semibold text-white">
          DPDP compliance <StatusBadge kind="live" />
        </h2>
        <p className="leading-relaxed">
          All data stored in India (Supabase region), aligned with the Digital Personal Data
          Protection Act.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="flex flex-wrap items-center gap-2 text-xl font-semibold text-white">
          What&apos;s NOT production-ready <StatusBadge kind="planned" />
        </h2>
        <WarningBox>
          <ul className="list-disc space-y-2 pl-5">
            <li>CSP blocks some Razorpay CDN scripts (needs tuning)</li>
            <li>No WAF / DDoS protection</li>
            <li>No penetration testing done</li>
            <li>No SOC 2 certification yet</li>
            <li>Abuse detection is basic (no ML-based detection)</li>
            <li>No data encryption at rest beyond Supabase defaults</li>
            <li>No audit logging</li>
            <li>No 2FA for user accounts</li>
            <li>Rate limiting table exists but is not enforced on API routes</li>
          </ul>
        </WarningBox>
      </section>
    </article>
  );
}
