import type { Metadata } from 'next';
import Link from 'next/link';
import { InfoBox, StatusBadge, WarningBox } from '../shared';

export const metadata: Metadata = {
  title: 'Quickstart Guide | Velocity Docs',
  description:
    'Create an account, complete KYC, add funds, browse GPUs, deploy an instance, and connect.',
};

const steps = [
  {
    title: 'Create an Account',
    badge: 'live' as const,
    body: (
      <>
        Sign up at{' '}
        <Link href="/signup" className="text-primary underline-offset-2 hover:underline">
          /signup
        </Link>{' '}
        with email or Google/GitHub OAuth.
      </>
    ),
  },
  {
    title: 'Complete KYC',
    badge: 'live' as const,
    body: <>Phone OTP verification is required. PAN verification applies to hosts.</>,
  },
  {
    title: 'Add Funds',
    badge: 'live' as const,
    body: (
      <>
        Razorpay supports UPI, cards, and net banking. Minimum ₹100. Funds go to your wallet for
        per-minute billing.
      </>
    ),
  },
  {
    title: 'Browse GPU Marketplace',
    badge: 'live' as const,
    body: <>Filter by GPU model, price, and verification tier.</>,
  },
  {
    title: 'Deploy an Instance',
    badge: 'live' as const,
    body: (
      <>
        Choose a template, GPU count, and rental type. Instances typically become ready in about 90
        seconds.
      </>
    ),
  },
  {
    title: 'Connect',
    badge: 'partial' as const,
    body: (
      <div className="space-y-3">
        <p>
          SSH:{' '}
          <code className="rounded bg-black/40 px-1.5 py-0.5 font-mono text-[13px] text-primary/95">
            ssh root@IP -p PORT
          </code>
          . Jupyter is available on select templates.
        </p>
        <WarningBox title="Note">
          <p>
            SSH works when the host has a public IP. Cloudflare Tunnel-based access is available
            for hosts behind NAT. A web terminal is available at{' '}
            <code className="rounded bg-black/30 px-1 py-0.5 font-mono text-[12px] text-primary/95">
              /console/terminal/[instanceId]
            </code>.
          </p>
        </WarningBox>
      </div>
    ),
  },
  {
    title: 'Manage',
    badge: 'live' as const,
    body: <>Stop, destroy, and monitor instances from the console or CLI.</>,
  },
];

export default function QuickstartPage() {
  return (
    <article className="space-y-10 text-gray-300">
      <header className="space-y-3">
        <p className="text-sm font-medium uppercase tracking-widest text-primary/90">Getting started</p>
        <h1 className="text-3xl font-bold tracking-tight text-white md:text-4xl">Quickstart Guide</h1>
        <p className="max-w-2xl text-lg leading-relaxed text-gray-400">
          From signup to a running GPU in under 2 minutes. Follow these steps to deploy
          your first workload.
        </p>
      </header>

      <WarningBox>
        <p className="font-medium text-amber-200">Migration notice</p>
        <p className="text-amber-100/90">
          This quickstart reflects the current state of the platform. Some steps may require the{' '}
          <code className="rounded bg-black/30 px-1 py-0.5 font-mono text-[12px]">
            hosting-v3-schema.sql
          </code>{' '}
          migration to be applied to your Supabase database.
        </p>
      </WarningBox>

      <InfoBox>
        <p className="font-medium text-primary">Status legend</p>
        <p className="flex flex-wrap items-center gap-2 text-gray-300">
          <StatusBadge kind="live" /> <StatusBadge kind="partial" /> <StatusBadge kind="planned" />
        </p>
      </InfoBox>

      <section className="space-y-8">
        <h2 className="text-xl font-semibold text-white">Steps</h2>
        <ol className="list-none space-y-8">
          {steps.map((step, i) => (
            <li key={step.title} className="border-l-2 border-white/10 pl-6">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-medium text-gray-500">{i + 1}.</span>
                <h3 className="text-lg font-semibold text-white">{step.title}</h3>
                <StatusBadge kind={step.badge} />
              </div>
              <div className="mt-3 leading-relaxed">{step.body}</div>
            </li>
          ))}
        </ol>
      </section>
    </article>
  );
}
