import type { Metadata } from 'next';
import { StatusBadge } from '../shared';

export const metadata: Metadata = {
  title: 'Security | Velocity Docs',
  description:
    'How Velocity protects workloads with container isolation, network controls, abuse prevention, platform hardening, authentication, and data protection.',
};

export default function SecurityDocsPage() {
  return (
    <article className="space-y-12 text-[#E2E8F0]">
      <header className="space-y-3">
        <p className="text-sm font-medium uppercase tracking-widest text-primary/90">Platform</p>
        <h1 className="text-3xl font-bold font-heading tracking-tight text-white md:text-4xl">Security</h1>
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge kind="live" />
          <p className="max-w-2xl text-lg leading-relaxed text-[#94A3B8]">
            Defense in depth for GPU workloads: isolation at the container and network layers, continuous
            abuse monitoring, and strong identity and data controls across the Velocity platform.
          </p>
        </div>
      </header>

      <section className="space-y-4">
        <h2 className="flex flex-wrap items-center gap-2 text-xl font-semibold font-heading text-white">
          Container Isolation <StatusBadge kind="live" />
        </h2>
        <p className="leading-relaxed">
          Customer workloads run in hardened Docker containers with NVIDIA GPU access provided through
          the NVIDIA Container Toolkit. Containers are constrained with least-privilege options and
          resource limits, and traffic is segmented on dedicated isolated networks.
        </p>
        <ul className="list-disc space-y-2 pl-5 leading-relaxed">
          <li>Docker-based execution with NVIDIA Container Toolkit for GPU passthrough</li>
          <li>
            <code className="text-primary/95 font-mono">--security-opt no-new-privileges</code> to block
            privilege escalation
          </li>
          <li>
            All Linux capabilities dropped via{' '}
            <code className="text-primary/95 font-mono">--cap-drop ALL</code>
          </li>
          <li>CPU, memory, and process limits enforced per workload</li>
          <li>Dedicated network isolation for container traffic</li>
        </ul>
      </section>

      <section className="space-y-4">
        <h2 className="flex flex-wrap items-center gap-2 text-xl font-semibold font-heading text-white">
          Network Security <StatusBadge kind="live" />
        </h2>
        <p className="leading-relaxed">
          Connections to Velocity services and the control plane use modern TLS. High-risk outbound
          paths such as SMTP and common mining ports are restricted, host-level firewall rules
          complement container policies, and Cloudflare sits in front of web properties to mitigate
          large-scale denial-of-service attacks.
        </p>
        <ul className="list-disc space-y-2 pl-5 leading-relaxed">
          <li>TLS 1.3 for encrypted transport between clients and platform endpoints</li>
          <li>Outbound SMTP and common cryptocurrency mining ports blocked where applicable</li>
          <li>
            <code className="text-primary/95 font-mono">iptables</code>-based rules aligned with abuse
            and acceptable-use policies
          </li>
          <li>Cloudflare used for DDoS protection and edge security for public-facing assets</li>
        </ul>
      </section>

      <section className="space-y-4">
        <h2 className="flex flex-wrap items-center gap-2 text-xl font-semibold font-heading text-white">
          Abuse Prevention <StatusBadge kind="live" />
        </h2>
        <p className="leading-relaxed">
          Velocity monitors GPU and process activity to detect unauthorized mining and similar misuse.
          Signals from process lists, network patterns, and GPU telemetry feed automated enforcement so
          policy violations can be addressed quickly.
        </p>
        <ul className="list-disc space-y-2 pl-5 leading-relaxed">
          <li>Heuristics and scanning aimed at cryptocurrency mining and related abuse</li>
          <li>Process and command-line inspection for known mining tooling</li>
          <li>Detection of connections to common mining pool endpoints</li>
          <li>
            <code className="text-primary/95 font-mono">nvidia-smi</code> and related telemetry for GPU
            utilization anomalies
          </li>
          <li>Automated suspension or restriction when abuse thresholds are met</li>
        </ul>
      </section>

      <section className="space-y-4">
        <h2 className="flex flex-wrap items-center gap-2 text-xl font-semibold font-heading text-white">
          Platform Security <StatusBadge kind="live" />
        </h2>
        <p className="leading-relaxed">
          The web application and APIs apply browser security headers, strict data access rules in the
          database layer, validated inputs, and consistent session and authorization checks so only
          appropriate roles can reach sensitive operations.
        </p>
        <ul className="list-disc space-y-2 pl-5 leading-relaxed">
          <li>
            Security headers including HSTS, Content-Security-Policy, and{' '}
            <code className="text-primary/95 font-mono">X-Frame-Options</code>
          </li>
          <li>Supabase Row Level Security policies on application tables</li>
          <li>Request and payload validation using Zod schemas</li>
          <li>Secure session handling for authenticated browser sessions</li>
          <li>Role-based access control for console and API capabilities</li>
        </ul>
      </section>

      <section className="space-y-4">
        <h2 className="flex flex-wrap items-center gap-2 text-xl font-semibold font-heading text-white">
          Authentication <StatusBadge kind="live" />
        </h2>
        <p className="leading-relaxed">
          Human users sign in through Supabase Auth with email or supported OAuth providers. Programmatic
          access uses API keys so automation can be scoped and rotated without sharing passwords.
        </p>
        <ul className="list-disc space-y-2 pl-5 leading-relaxed">
          <li>Email and OAuth sign-in via Supabase Auth</li>
          <li>API key authentication for scripts, CI, and integrations</li>
          <li>Session management designed around secure cookies and server-side validation</li>
        </ul>
      </section>

      <section className="space-y-4">
        <h2 className="flex flex-wrap items-center gap-2 text-xl font-semibold font-heading text-white">
          Data Protection <StatusBadge kind="live" />
        </h2>
        <p className="leading-relaxed">
          Customer and operational data is encrypted in transit and at rest, hosted in India to support
          residency expectations, and handled in line with India&apos;s Digital Personal Data Protection
          Act. We review controls on an ongoing basis as part of our security program.
        </p>
        <ul className="list-disc space-y-2 pl-5 leading-relaxed">
          <li>AES-256 encryption for data at rest in supported storage tiers</li>
          <li>TLS 1.3 for data in transit to and within the platform where applicable</li>
          <li>Primary data residency in India for hosted customer data</li>
          <li>Processes aligned with DPDP Act requirements for personal data</li>
          <li>Regular security reviews and audits of platform configuration and practices</li>
        </ul>
      </section>

      <section className="space-y-4">
        <h2 className="flex flex-wrap items-center gap-2 text-xl font-semibold font-heading text-white">
          Reporting Vulnerabilities <StatusBadge kind="live" />
        </h2>
        <p className="leading-relaxed">
          If you believe you have found a security issue in Velocity, we appreciate responsible
          disclosure. Please email{' '}
          <a
            href="mailto:security@velocity.run"
            className="text-primary underline decoration-primary/40 underline-offset-2 hover:text-primary/90"
          >
            security@velocity.run
          </a>{' '}
          with a clear description, affected components, and steps to reproduce. We will work with you
          to understand impact and coordinate fixes.
        </p>
        <ul className="list-disc space-y-2 pl-5 leading-relaxed">
          <li>Contact: security@velocity.run</li>
          <li>Responsible disclosure and coordinated disclosure are welcome</li>
          <li>Please avoid public disclosure until we have had a reasonable time to remediate</li>
        </ul>
      </section>
    </article>
  );
}
