import type { Metadata } from 'next';
import { DocTable, InfoBox, StatusBadge, WarningBox } from '../shared';

export const metadata: Metadata = {
  title: 'Production Readiness Tracker | Velocity Docs',
  description:
    'Honest status by feature area: what works, what is partial, and what is missing for Velocity.',
};

export default function StatusDocsPage() {
  return (
    <article className="space-y-12 text-gray-300">
      <header className="space-y-3">
        <p className="text-sm font-medium uppercase tracking-widest text-primary/90">Platform</p>
        <h1 className="text-3xl font-bold tracking-tight text-white md:text-4xl">
          Production Readiness Tracker
        </h1>
        <p className="max-w-2xl text-lg leading-relaxed text-gray-400">
          A blunt, area-by-area view of the product. Use this as the living roadmap—not marketing
          copy.
        </p>
      </header>

      <InfoBox>
        <p>
          Status badges: <StatusBadge kind="live" /> shipped and used in production paths,{' '}
          <StatusBadge kind="partial" /> works with caveats,{' '}
          <StatusBadge kind="planned" /> not built or not reliable yet.
        </p>
      </InfoBox>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-white">Core infrastructure</h2>
        <div className="overflow-x-auto rounded-lg border border-white/10">
          <table className="w-full min-w-[640px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-white/10 bg-white/[0.03]">
                {['Feature', 'Status', 'What works', 'What’s missing'].map((h) => (
                  <th key={h} className="px-3 py-3 font-semibold text-white">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                [
                  'Database schema',
                  '✅ Live',
                  'Tables, RLS, realtime, triggers',
                  'Schema migrations not auto-applied',
                ],
                [
                  'Authentication',
                  '✅ Live',
                  'Email, Google, GitHub OAuth',
                  '2FA and account deletion not yet available',
                ],
                [
                  'KYC onboarding',
                  '✅ Live',
                  'Phone OTP, PAN verification',
                  'Aadhaar verification stub only',
                ],
                [
                  'Middleware / auth',
                  '✅ Live',
                  'Session, KYC gates, role checks',
                  'No API key auth for REST',
                ],
              ].map((row, i) => (
                <tr key={i} className="border-b border-white/5 last:border-0">
                  {row.map((cell, j) => (
                    <td key={j} className="px-3 py-3 align-top text-gray-300">
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
        <h2 className="text-xl font-semibold text-white">GPU marketplace</h2>
        <div className="overflow-x-auto rounded-lg border border-white/10">
          <table className="w-full min-w-[640px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-white/10 bg-white/[0.03]">
                {['Feature', 'Status', 'What works', 'What’s missing'].map((h) => (
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
                  'Browse offers, filter, rental type tabs',
                  'Sorting and saved searches not yet available',
                ],
                [
                  'Offer management',
                  '✅ Live',
                  'Create, update, unlist offers',
                  'No offer analytics, no edit history',
                ],
                [
                  'GPU slicing',
                  '✅ Live',
                  'min_gpu, GPU index allocation',
                  'No GPU memory isolation',
                ],
                [
                  'Rental contracts',
                  '✅ Live',
                  'Create contracts, lock terms',
                  'No contract extension, no early termination penalty',
                ],
              ].map((row, i) => (
                <tr key={i} className="border-b border-white/5 last:border-0">
                  {row.map((cell, j) => (
                    <td key={j} className="px-3 py-3 align-top text-gray-300">
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
        <h2 className="text-xl font-semibold text-white">Instance lifecycle</h2>
        <div className="overflow-x-auto rounded-lg border border-white/10">
          <table className="w-full min-w-[640px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-white/10 bg-white/[0.03]">
                {['Feature', 'Status', 'What works', 'What’s missing'].map((h) => (
                  <th key={h} className="px-3 py-3 font-semibold text-white">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                [
                  'Instance creation',
                  '✅ Live',
                  'Deploy from offer with template',
                  'No custom Docker images',
                ],
                [
                  'Instance running',
                  '✅ Live',
                  'Docker container with GPU access',
                  'No live monitoring UI',
                ],
                [
                  'Instance stop / destroy',
                  '✅ Live',
                  'Via console actions',
                  'No data backup on destroy',
                ],
                [
                  'SSH access',
                  '🔧 Partial',
                  'Works with public IP hosts',
                  'No web terminal; tunneling unreliable',
                ],
                [
                  'Jupyter access',
                  '🔧 Partial',
                  'Works on Jupyter-mode templates',
                  'No direct URL generation',
                ],
              ].map((row, i) => (
                <tr key={i} className="border-b border-white/5 last:border-0">
                  {row.map((cell, j) => (
                    <td key={j} className="px-3 py-3 align-top text-gray-300">
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
        <h2 className="text-xl font-semibold text-white">Host system</h2>
        <div className="overflow-x-auto rounded-lg border border-white/10">
          <table className="w-full min-w-[640px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-white/10 bg-white/[0.03]">
                {['Feature', 'Status', 'What works', 'What’s missing'].map((h) => (
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
                  'Dashboard + CLI',
                  'No auto-discovery',
                ],
                [
                  'Host agent',
                  '✅ Live',
                  'Docker mgmt, heartbeat, security',
                  'Single machine per agent only',
                ],
                [
                  'Self-test',
                  '✅ Live',
                  'CUDA, network, PCIe, DLPerf',
                  'No automated re-testing schedule',
                ],
                [
                  'Verification',
                  '✅ Live',
                  '3-tier auto-promotion',
                  'Demotion logic basic',
                ],
                [
                  'Maintenance windows',
                  '✅ Live',
                  'Schedule, warn instances',
                  'No auto-migration of instances',
                ],
              ].map((row, i) => (
                <tr key={i} className="border-b border-white/5 last:border-0">
                  {row.map((cell, j) => (
                    <td key={j} className="px-3 py-3 align-top text-gray-300">
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
        <h2 className="text-xl font-semibold text-white">Billing</h2>
        <div className="overflow-x-auto rounded-lg border border-white/10">
          <table className="w-full min-w-[640px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-white/10 bg-white/[0.03]">
                {['Feature', 'Status', 'What works', 'What’s missing'].map((h) => (
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
                  'pg_cron every minute',
                  'No invoice generation',
                ],
                [
                  'Wallet system',
                  '✅ Live',
                  'Razorpay deposits, auto-deduct',
                  'Payouts and refunds not yet available',
                ],
                [
                  'GST compliance',
                  '✅ Live',
                  'Tax split stored per transaction',
                  'No filing integration',
                ],
              ].map((row, i) => (
                <tr key={i} className="border-b border-white/5 last:border-0">
                  {row.map((cell, j) => (
                    <td key={j} className="px-3 py-3 align-top text-gray-300">
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
        <h2 className="text-xl font-semibold text-white">Serverless</h2>
        <div className="overflow-x-auto rounded-lg border border-white/10">
          <table className="w-full min-w-[640px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-white/10 bg-white/[0.03]">
                {['Feature', 'Status', 'What works', 'What’s missing'].map((h) => (
                  <th key={h} className="px-3 py-3 font-semibold text-white">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                [
                  'Endpoint CRUD',
                  '✅ Live',
                  'Create, update, delete endpoints',
                  'No versioning',
                ],
                [
                  'Request routing',
                  '✅ Live',
                  'Load-balanced to workers',
                  'No request queuing',
                ],
                [
                  'Autoscaler',
                  '🔧 Partial',
                  'Basic cron-based scaling',
                  'Not load-tested',
                ],
                [
                  'Python SDK',
                  '🔧 Partial',
                  'generate() + generate_async()',
                  'Inference only; no GPU Cloud ops',
                ],
              ].map((row, i) => (
                <tr key={i} className="border-b border-white/5 last:border-0">
                  {row.map((cell, j) => (
                    <td key={j} className="px-3 py-3 align-top text-gray-300">
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
        <h2 className="text-xl font-semibold text-white">CLI</h2>
        <div className="overflow-x-auto rounded-lg border border-white/10">
          <table className="w-full min-w-[640px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-white/10 bg-white/[0.03]">
                {['Feature', 'Status', 'What works', 'What’s missing'].map((h) => (
                  <th key={h} className="px-3 py-3 font-semibold text-white">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                [
                  'Authentication',
                  '✅ Live',
                  'API key storage',
                  'No token refresh',
                ],
                [
                  'Renter commands',
                  '✅ Live',
                  'search, create, list, ssh',
                  'No stop / destroy, no logs',
                ],
                [
                  'Host commands',
                  '✅ Live',
                  'Full CRUD for machines / offers',
                  'No interactive mode',
                ],
              ].map((row, i) => (
                <tr key={i} className="border-b border-white/5 last:border-0">
                  {row.map((cell, j) => (
                    <td key={j} className="px-3 py-3 align-top text-gray-300">
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
        <h2 className="text-xl font-semibold text-white">Security</h2>
        <div className="overflow-x-auto rounded-lg border border-white/10">
          <table className="w-full min-w-[640px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-white/10 bg-white/[0.03]">
                {['Feature', 'Status', 'What works', 'What’s missing'].map((h) => (
                  <th key={h} className="px-3 py-3 font-semibold text-white">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                [
                  'Container hardening',
                  '✅ Live',
                  'no-new-privileges, cap-drop, etc.',
                  'No seccomp profiles',
                ],
                [
                  'Abuse detection',
                  '✅ Live',
                  'Mining detection, port blocking',
                  'Basic heuristics only',
                ],
                [
                  'RLS policies',
                  '✅ Live',
                  'All tables protected',
                  'No admin dashboard',
                ],
              ].map((row, i) => (
                <tr key={i} className="border-b border-white/5 last:border-0">
                  {row.map((cell, j) => (
                    <td key={j} className="px-3 py-3 align-top text-gray-300">
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
        <h2 className="flex flex-wrap items-center gap-2 text-xl font-semibold text-white">
          NOT built at all <StatusBadge kind="planned" />
        </h2>
        <WarningBox title="Major gaps">
          <DocTable
            headers={['Missing capability', 'Notes']}
            rows={[
              ['Web-based terminal (SSH in browser)', '—'],
              ['File browser / upload-download UI', '—'],
              ['Instance snapshots / checkpoints', '—'],
              ['Persistent volumes', '—'],
              ['Custom Docker image support', '—'],
              ['Multi-node clusters (InfiniBand)', '—'],
              ['Team / organization accounts', '—'],
              ['Admin dashboard', '—'],
              ['Usage analytics / graphs', '—'],
              ['Webhook notifications', '—'],
              ['Status page / uptime monitoring', '—'],
              ['Mobile app', '—'],
              ['Documentation search', '—'],
            ]}
          />
        </WarningBox>
      </section>
    </article>
  );
}
