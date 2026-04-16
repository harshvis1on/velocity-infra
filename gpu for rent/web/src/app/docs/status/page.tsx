import type { Metadata } from 'next';
import { DocTable, InfoBox, StatusBadge, WarningBox } from '../shared';

export const metadata: Metadata = {
  title: 'Roadmap | Velocity Docs',
  description:
    "What we've shipped, what we're building next, and what's on the horizon for Velocity.",
};

export default function StatusDocsPage() {
  return (
    <article className="space-y-12 text-[#E2E8F0]">
      <header className="space-y-3">
        <p className="text-sm font-medium uppercase tracking-widest text-primary/90">Platform</p>
        <h1 className="text-3xl font-bold font-heading tracking-tight text-white md:text-4xl">
          Roadmap
        </h1>
        <p className="max-w-2xl text-lg leading-relaxed text-[#94A3B8]">
          What we&apos;ve shipped, what we&apos;re building next, and what&apos;s on the horizon.
        </p>
      </header>

      <InfoBox>
        <p>
          Live = shipped, Coming Soon = in active development, Planned = on the roadmap.
        </p>
      </InfoBox>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold font-heading text-white">Core Infrastructure</h2>
        <div className="overflow-x-auto rounded-xl border border-white/[0.06]">
          <table className="w-full min-w-[640px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-white/[0.06] bg-white/[0.03]">
                {['Feature', 'Status', 'Details'].map((h) => (
                  <th key={h} className="px-3 py-3 font-semibold text-white">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                [
                  'Database & schema',
                  '✅ Live',
                  'Full PostgreSQL with RLS, realtime, and triggers',
                ],
                ['Authentication', '✅ Live', 'Email, Google, and GitHub OAuth'],
                ['Onboarding', '✅ Live', 'Role selection, profile setup, instant access'],
                [
                  'API authentication',
                  '✅ Live',
                  'Session-based and API key authentication',
                ],
              ].map((row, i) => (
                <tr key={i} className="border-b border-white/5 last:border-0">
                  {row.map((cell, j) => (
                    <td key={j} className="px-3 py-3 align-top text-[#E2E8F0]">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold font-heading text-white">GPU Marketplace</h2>
        <div className="overflow-x-auto rounded-xl border border-white/[0.06]">
          <table className="w-full min-w-[640px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-white/[0.06] bg-white/[0.03]">
                {['Feature', 'Status', 'Details'].map((h) => (
                  <th key={h} className="px-3 py-3 font-semibold text-white">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                [
                  'Marketplace UI',
                  '✅ Live',
                  'Browse, filter by GPU model, VRAM, and price',
                ],
                [
                  'Offer management',
                  '✅ Live',
                  'Create, update, and unlist GPU offers',
                ],
                [
                  'GPU slicing',
                  '✅ Live',
                  'Rent 1, 2, 4, or 8 GPUs from a single machine',
                ],
                [
                  'Proxy GPU sourcing',
                  '✅ Live',
                  'Automatic sourcing from partner providers',
                ],
              ].map((row, i) => (
                <tr key={i} className="border-b border-white/5 last:border-0">
                  {row.map((cell, j) => (
                    <td key={j} className="px-3 py-3 align-top text-[#E2E8F0]">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold font-heading text-white">Instance Lifecycle</h2>
        <div className="overflow-x-auto rounded-xl border border-white/[0.06]">
          <table className="w-full min-w-[640px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-white/[0.06] bg-white/[0.03]">
                {['Feature', 'Status', 'Details'].map((h) => (
                  <th key={h} className="px-3 py-3 font-semibold text-white">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                [
                  'Deploy from template',
                  '✅ Live',
                  'One-click deploy with pre-built environments',
                ],
                [
                  'SSH and terminal access',
                  '✅ Live',
                  'Direct SSH, web terminal in console',
                ],
                [
                  'Stop and destroy',
                  '✅ Live',
                  'Manage instances from console or CLI',
                ],
                [
                  'Custom Docker images',
                  '🔜 Coming Soon',
                  'Bring your own container images',
                ],
                [
                  'Persistent volumes',
                  '🔜 Coming Soon',
                  'Attach storage that survives restarts',
                ],
              ].map((row, i) => (
                <tr key={i} className="border-b border-white/5 last:border-0">
                  {row.map((cell, j) => (
                    <td key={j} className="px-3 py-3 align-top text-[#E2E8F0]">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold font-heading text-white">Host System</h2>
        <div className="overflow-x-auto rounded-xl border border-white/[0.06]">
          <table className="w-full min-w-[640px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-white/[0.06] bg-white/[0.03]">
                {['Feature', 'Status', 'Details'].map((h) => (
                  <th key={h} className="px-3 py-3 font-semibold text-white">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                [
                  'Machine registration',
                  '✅ Live',
                  'Register via dashboard or CLI agent',
                ],
                [
                  'Host agent',
                  '✅ Live',
                  'Docker management, heartbeat, security monitoring',
                ],
                [
                  'Self-test suite',
                  '✅ Live',
                  'CUDA, network, PCIe, deep learning benchmarks',
                ],
                [
                  'Verification tiers',
                  '✅ Live',
                  'Automatic 3-tier promotion based on uptime',
                ],
                [
                  'Maintenance windows',
                  '✅ Live',
                  'Schedule downtime with advance warnings',
                ],
              ].map((row, i) => (
                <tr key={i} className="border-b border-white/5 last:border-0">
                  {row.map((cell, j) => (
                    <td key={j} className="px-3 py-3 align-top text-[#E2E8F0]">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold font-heading text-white">Billing</h2>
        <div className="overflow-x-auto rounded-xl border border-white/[0.06]">
          <table className="w-full min-w-[640px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-white/[0.06] bg-white/[0.03]">
                {['Feature', 'Status', 'Details'].map((h) => (
                  <th key={h} className="px-3 py-3 font-semibold text-white">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                [
                  'Per-minute billing',
                  '✅ Live',
                  'Automatic deduction every minute via pg_cron',
                ],
                [
                  'Wallet system',
                  '✅ Live',
                  'Razorpay deposits with UPI, cards, net banking',
                ],
                [
                  'GST compliance',
                  '✅ Live',
                  '18% GST calculated and stored per transaction',
                ],
                [
                  'Tax invoices',
                  '🔜 Coming Soon',
                  'Downloadable GST-compliant invoices',
                ],
              ].map((row, i) => (
                <tr key={i} className="border-b border-white/5 last:border-0">
                  {row.map((cell, j) => (
                    <td key={j} className="px-3 py-3 align-top text-[#E2E8F0]">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold font-heading text-white">Serverless</h2>
        <div className="overflow-x-auto rounded-xl border border-white/[0.06]">
          <table className="w-full min-w-[640px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-white/[0.06] bg-white/[0.03]">
                {['Feature', 'Status', 'Details'].map((h) => (
                  <th key={h} className="px-3 py-3 font-semibold text-white">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                [
                  'Endpoint management',
                  '✅ Live',
                  'Create, update, and delete inference endpoints',
                ],
                [
                  'Request routing',
                  '✅ Live',
                  'Load-balanced routing to GPU workers',
                ],
                ['Auto-scaling', '🔜 Coming Soon', 'Automatic scaling based on request volume'],
                ['Python SDK', '✅ Live', 'Full SDK for programmatic inference'],
              ].map((row, i) => (
                <tr key={i} className="border-b border-white/5 last:border-0">
                  {row.map((cell, j) => (
                    <td key={j} className="px-3 py-3 align-top text-[#E2E8F0]">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </article>
  );
}
