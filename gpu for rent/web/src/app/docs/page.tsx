import Link from 'next/link';
import type { ReactNode } from 'react';

type BadgeKind = 'live' | 'partial' | 'planned' | 'tracking';

function StatusBadge({ kind }: { kind: BadgeKind }) {
  const map: Record<BadgeKind, { label: string; className: string }> = {
    live: {
      label: 'Live',
      className: 'border-primary/20 bg-primary/[0.06] text-primary',
    },
    partial: {
      label: 'Partial',
      className: 'border-amber-500/20 bg-amber-500/[0.06] text-amber-400',
    },
    planned: {
      label: 'Planned',
      className: 'border-white/10 bg-white/[0.03] text-gray-500',
    },
    tracking: {
      label: 'Tracking',
      className: 'border-amber-500/20 bg-amber-500/[0.06] text-amber-400',
    },
  };
  const { label, className } = map[kind];
  return (
    <span className={`inline-flex shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium ${className}`}>
      {label}
    </span>
  );
}

const DOC_CARDS: {
  href: string;
  title: string;
  description: string;
  badge: BadgeKind;
  icon: ReactNode;
}[] = [
  {
    href: '/docs/quickstart',
    title: 'Quickstart Guide',
    description: 'Rent your first GPU in under 2 minutes',
    badge: 'live',
    icon: <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>,
  },
  {
    href: '/docs/instances',
    title: 'GPU Instances',
    description: 'Browse marketplace, deploy, connect via SSH',
    badge: 'live',
    icon: <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" /></svg>,
  },
  {
    href: '/docs/hosting',
    title: 'Become a Provider',
    description: 'List your GPUs and earn yield',
    badge: 'live',
    icon: <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>,
  },
  {
    href: '/docs/quickstart',
    title: 'Templates',
    description: 'Pre-built Docker environments',
    badge: 'live',
    icon: <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" /></svg>,
  },
  {
    href: '/docs/cli',
    title: 'CLI Reference',
    description: 'Manage everything from the terminal',
    badge: 'live',
    icon: <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>,
  },
  {
    href: '/docs/sdk',
    title: 'Python SDK',
    description: 'Programmatic access to GPU cloud',
    badge: 'partial',
    icon: <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>,
  },
  {
    href: '/docs/api',
    title: 'API Reference',
    description: 'REST API for all platform operations',
    badge: 'live',
    icon: <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 9h8m-8 4h5m-5 4h8M9 5h6a2 2 0 012 2v12a2 2 0 01-2 2H9a2 2 0 01-2-2V7a2 2 0 012-2z" /></svg>,
  },
  {
    href: '/docs/billing',
    title: 'Pricing & Billing',
    description: 'Per-GPU/min billing, GST, invoices',
    badge: 'live',
    icon: <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
  },
  {
    href: '/docs/security',
    title: 'Security',
    description: 'Container hardening, abuse detection, KYC',
    badge: 'live',
    icon: <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>,
  },
  {
    href: '/docs/status',
    title: 'Production Status',
    description: "What works, what doesn't, what's planned",
    badge: 'tracking',
    icon: <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>,
  },
];

const DIFFERENTIATORS = [
  { text: 'India-first: INR pricing, UPI payments, GST invoices' },
  { text: 'DPDP compliant, all data stays in India' },
  { text: 'GPU slicing: rent 1, 2, 4, or 8 GPUs from one machine' },
  { text: 'Per-minute billing, pay for what you use' },
  { text: 'Verified hosts with identity verification for every provider' },
  { text: 'Agent-friendly: works with Cursor, Claude Code, and Codex' },
];

export default function DocsWelcomePage() {
  return (
    <div className="space-y-16">
      {/* Hero */}
      <header className="space-y-4">
        <div className="text-[11px] uppercase tracking-[0.2em] text-gray-600 font-medium">
          Documentation
        </div>
        <h1 className="text-4xl md:text-5xl font-extrabold text-white tracking-tight leading-[1.05]">
          Velocity <span className="text-primary">Docs</span>
        </h1>
        <p className="max-w-2xl text-lg text-gray-500 leading-relaxed">
          Everything you need to rent GPUs at up to 80% off cloud pricing. Deploy in seconds, or list your hardware to earn.
        </p>
      </header>

      {/* Status banner */}
      <div
        role="status"
        className="rounded-xl border border-amber-500/10 bg-amber-500/[0.03] px-5 py-4 text-sm leading-relaxed text-amber-200/80"
      >
        <p className="font-medium">
          Platform Status: Pre-Production. Core infrastructure is built. Some features are
          incomplete or untested. This documentation honestly reflects what works today and
          what&apos;s still in progress.
        </p>
      </div>

      {/* How it works */}
      <section className="space-y-3">
        <h2 className="text-2xl font-bold text-white">How it works</h2>
        <p className="text-gray-500 leading-relaxed max-w-3xl">
          Velocity is a GPU marketplace where AI developers rent GPUs at a fraction of cloud pricing.
          Browse available hardware, deploy in seconds, and pay per minute. Providers can list their
          own GPUs and earn yield from idle hardware.
        </p>
      </section>

      {/* Card grid */}
      <section className="space-y-6">
        <h2 className="text-2xl font-bold text-white">Explore the docs</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {DOC_CARDS.map((card) => (
            <Link
              key={card.href + card.title}
              href={card.href}
              className="group flex flex-col rounded-xl border border-white/[0.06] p-5 transition-all hover:border-primary/20 hover:bg-white/[0.02]"
            >
              <div className="flex items-start justify-between gap-3">
                <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.03] text-gray-500 transition-colors group-hover:text-primary group-hover:border-primary/20">
                  {card.icon}
                </span>
                <StatusBadge kind={card.badge} />
              </div>
              <h3 className="mt-4 font-medium text-white group-hover:text-primary transition-colors text-sm">
                {card.title}
              </h3>
              <p className="mt-1.5 flex-1 text-xs text-gray-600 leading-relaxed">{card.description}</p>
              <span className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-gray-600 group-hover:text-primary transition-colors">
                Read more
                <svg className="h-3 w-3 transition-transform group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* What makes us different */}
      <section className="space-y-6 border-t border-white/[0.04] pt-14">
        <h2 className="text-2xl font-bold text-white">What makes us <span className="text-primary">different</span></h2>
        <ul className="grid gap-2.5 sm:grid-cols-2 max-w-4xl">
          {DIFFERENTIATORS.map((item) => (
            <li
              key={item.text}
              className="flex gap-3 items-start rounded-lg border border-white/[0.04] px-4 py-3 text-sm text-gray-500 leading-snug"
            >
              <span className="text-primary text-xs mt-0.5 shrink-0">✓</span>
              <span>{item.text}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
