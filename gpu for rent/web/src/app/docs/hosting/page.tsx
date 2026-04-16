import type { Metadata } from 'next';
import { CodeBlock, DocTable, InfoBox, StatusBadge, WarningBox } from '../shared';

export const metadata: Metadata = {
  title: 'Become a Provider | Velocity Docs',
  description:
    'List GPUs on the marketplace, requirements, verification tiers, host agent, slicing, and gaps.',
};

const hostGaps = [
  'Earnings dashboard with charts and analytics',
  'Automatic payout to bank account (manual withdrawal only planned)',
  'Host reputation / rating system',
  'Real-time GPU utilization monitoring UI',
  'Bandwidth billing (fields exist; not enforced)',
  'Multi-machine management from a single agent process',
  'Auto-pricing based on market rates',
];

export default function HostingPage() {
  return (
    <article className="space-y-12 text-[#E2E8F0]">
      <header className="space-y-3">
        <p className="text-sm font-medium uppercase tracking-widest text-primary/90">For Providers</p>
        <h1 className="text-3xl font-bold font-heading tracking-tight text-white md:text-4xl">Become a Provider</h1>
        <p className="max-w-2xl text-lg leading-relaxed text-[#94A3B8]">
          Monetize idle GPUs with automated per-minute billing—plus what is still evolving for
          providers.
        </p>
      </header>

      <section className="space-y-4">
        <h2 className="flex flex-wrap items-center gap-2 text-xl font-semibold font-heading text-white">
          Overview <StatusBadge kind="live" />
        </h2>
        <ul className="list-disc space-y-2 pl-5 leading-relaxed">
          <li>List idle GPUs on the public marketplace.</li>
          <li>Earn 85–95% of compute charges from renters (depends on your provider tier).</li>
          <li>Fully automated billing—per minute, per GPU.</li>
        </ul>
      </section>

      <section className="space-y-4">
        <h2 className="flex flex-wrap items-center gap-2 text-xl font-semibold font-heading text-white">
          XP &amp; Provider Tiers <StatusBadge kind="live" />
        </h2>
        <p className="leading-relaxed">
          You earn XP by hosting successful jobs, verifying machines, maintaining uptime, and
          referring other providers. Higher tiers reduce your platform fee:
        </p>
        <ul className="list-disc space-y-2 pl-5 leading-relaxed">
          <li><span className="text-white">Bronze (0 XP):</span> 15% platform fee — starting tier</li>
          <li><span className="text-white">Silver (1,000 XP):</span> 12% platform fee</li>
          <li><span className="text-white">Gold (5,000 XP):</span> 10% platform fee</li>
          <li><span className="text-white">Platinum (15,000 XP):</span> 7% platform fee</li>
          <li><span className="text-white">Diamond (50,000 XP):</span> 5% platform fee</li>
        </ul>
        <p className="leading-relaxed text-sm text-[#94A3B8]">
          XP is granted automatically: +10 XP per hour of successfully hosted compute, +50 XP for
          machine verification, +200 XP for 30-day perfect uptime streaks, +25 XP per completed
          referral.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="flex flex-wrap items-center gap-2 text-xl font-semibold font-heading text-white">
          Requirements <StatusBadge kind="live" />
        </h2>
        <DocTable
          headers={['Requirement', 'Details']}
          rows={[
            ['OS', 'Linux (Ubuntu 20.04 or newer)'],
            ['GPU', 'NVIDIA GPU with Compute Capability 7.0+ (e.g. RTX 3090, RTX 4090, A100, H100)'],
            ['Driver', 'NVIDIA Driver 525 or newer'],
            ['Container runtime', 'Docker 24+ with NVIDIA Container Toolkit'],
            ['Network', '100+ Mbps (500+ Mbps recommended)'],
            ['RAM', '8+ GB per GPU'],
            ['Storage', '100+ GB SSD'],
            ['Power', 'Stable power supply'],
          ]}
        />
      </section>

      <section className="space-y-4">
        <h2 className="flex flex-wrap items-center gap-2 text-xl font-semibold font-heading text-white">
          Listing Your Machine <StatusBadge kind="live" />
        </h2>
        <ol className="list-decimal space-y-3 pl-5 leading-relaxed">
          <li>Sign up and complete KYC (phone OTP; PAN for hosts).</li>
          <li>Add machine specifications via the dashboard or CLI.</li>
          <li>
            Create an offer: per-GPU price, storage price, minimum GPU slice, and offer end date.
          </li>
          <li>Publish—the machine appears on the marketplace when requirements are met.</li>
        </ol>
      </section>

      <section className="space-y-4">
        <h2 className="flex flex-wrap items-center gap-2 text-xl font-semibold font-heading text-white">
          Verification Tiers <StatusBadge kind="live" />
        </h2>
        <ul className="list-disc space-y-2 pl-5 leading-relaxed">
          <li>
            <span className="text-white">Community (default):</span> new machines entering the pool.
          </li>
          <li>
            <span className="text-white">Verified (auto-promoted):</span> reliability ≥ 85%,
            self-test passed, 100+ heartbeats, GPU temperature under 90°C.
          </li>
          <li>
            <span className="text-white">Enterprise (application):</span> Tier 3/4 datacenter,
            ISO 27001, SOC 2—by review.
          </li>
        </ul>
      </section>

      <section className="space-y-4">
        <h2 className="flex flex-wrap items-center gap-2 text-xl font-semibold font-heading text-white">
          Host Agent <StatusBadge kind="live" />
        </h2>
        <p className="leading-relaxed">
          The agent polls for jobs, launches Docker containers, applies security controls, sends
          heartbeats, and runs abuse detection.
        </p>
        <CodeBlock>
          {`# Install
pip install -r requirements.txt

# Run (use your API key — never the service role key)
SUPABASE_URL=https://xxx.supabase.co \\
MACHINE_ID=your-uuid \\
VELOCITY_JOB_SECRET=your-shared-secret \\
python agent.py --api-key vi_live_xxxxx

# Self-test
python agent.py --self-test`}
        </CodeBlock>
        <WarningBox title="Required: VELOCITY_JOB_SECRET">
          <p className="text-amber-100/90">
            The agent requires <code className="font-mono text-sm">VELOCITY_JOB_SECRET</code> to
            verify signed job payloads. Without this, the agent will reject all jobs. Set the same
            secret on both the API server and the agent.
          </p>
        </WarningBox>
      </section>

      <section className="space-y-4">
        <h2 className="flex flex-wrap items-center gap-2 text-xl font-semibold font-heading text-white">
          GPU Slicing <StatusBadge kind="live" />
        </h2>
        <ul className="list-disc space-y-2 pl-5 leading-relaxed">
          <li>Set <code className="font-mono text-sm">min_gpu</code> to allow partial rentals.</li>
          <li>
            The agent passes{' '}
            <code className="font-mono text-sm">--gpus &quot;device=X,Y&quot;</code> for isolation.
          </li>
        </ul>
      </section>

      <section className="space-y-4">
        <h2 className="flex flex-wrap items-center gap-2 text-xl font-semibold font-heading text-white">
          Maintenance Windows <StatusBadge kind="live" />
        </h2>
        <p className="leading-relaxed">
          Schedule maintenance from the dashboard or CLI. Active instances receive warnings before
          disruptive work.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="flex flex-wrap items-center gap-2 text-xl font-semibold font-heading text-white">
          What&apos;s NOT Built Yet for Hosts <StatusBadge kind="planned" />
        </h2>
        <WarningBox title="Provider roadmap gaps">
          <ul className="list-disc space-y-2 pl-5 text-amber-100/90">
            {hostGaps.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </WarningBox>
        <InfoBox>
          <p className="text-[#E2E8F0]">
            Treat earnings and operational tooling as evolving. Verify payout and analytics behavior
            in your environment before relying on it for finance workflows.
          </p>
        </InfoBox>
      </section>
    </article>
  );
}
