import type { Metadata } from 'next';
import Link from 'next/link';
import { StatusBadge } from '../shared';

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
        with email or Google/GitHub OAuth. You&apos;ll receive{' '}
        <span className="text-white font-medium">₹65 in free credits</span> (about 1 hour of RTX
        4090 compute) instantly. Got a friend&apos;s referral link? Use it at signup and you{' '}
        <em>both</em> earn bonus credits when you rent your first GPU.
      </>
    ),
  },
  {
    title: 'Complete KYC',
    badge: 'live' as const,
    body: (
      <>
        Choose your role (Rent or Host), enter your name, and optionally your company. That&apos;s
        it. Takes 10 seconds.
      </>
    ),
  },
  {
    title: 'Add Funds (or use your free credits)',
    badge: 'live' as const,
    body: (
      <>
        Your wallet supports UPI, cards, and net banking via Razorpay. Minimum deposit is ₹100. Your
        signup credits are enough to test-drive a GPU without adding any funds.
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
    badge: 'live' as const,
    body: (
      <p>
        SSH access via{' '}
        <code className="rounded bg-[#080D16] px-1.5 py-0.5 font-mono text-[13px] text-primary/95">
          ssh root@IP -p PORT
        </code>
        . Jupyter available on select templates. Web terminal available in the console.
      </p>
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
    <article className="space-y-10 text-[#E2E8F0]">
      <header className="space-y-3">
        <p className="text-sm font-medium uppercase tracking-widest text-primary/90">Getting started</p>
        <h1 className="text-3xl font-bold font-heading tracking-tight text-white md:text-4xl">Quickstart Guide</h1>
        <p className="max-w-2xl text-lg leading-relaxed text-[#94A3B8]">
          From signup to a running GPU in under 2 minutes. Follow these steps to deploy
          your first workload.
        </p>
      </header>

      <section className="space-y-8">
        <h2 className="text-xl font-semibold font-heading text-white">Steps</h2>
        <ol className="list-none space-y-8">
          {steps.map((step, i) => (
            <li key={step.title} className="border-l-2 border-white/10 pl-6">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-medium font-mono text-[#94A3B8]">{i + 1}.</span>
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
