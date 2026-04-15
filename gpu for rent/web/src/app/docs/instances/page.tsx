import type { Metadata } from 'next';
import { CodeBlock, DocTable, InfoBox, StatusBadge, WarningBox } from '../shared';

export const metadata: Metadata = {
  title: 'GPU Instances | Velocity Docs',
  description:
    'Docker-based GPU instances, types, slicing, deploy paths, connectivity, storage, and templates.',
};

const templates = [
  'PyTorch 2.2',
  'vLLM',
  'TGI',
  'ComfyUI',
  'SD WebUI (A1111)',
  'SD WebUI Forge',
  'Fooocus',
  'Axolotl',
  'Open-Sora',
  'NVIDIA CUDA',
  'Ubuntu 22.04',
];

const notBuilt = [
  'Web terminal / browser-based SSH',
  'File browser / upload UI',
  'Instance snapshots / checkpoints',
  'Auto-restart on crash',
  'GPU monitoring graphs in dashboard',
  'Multi-GPU instance migration',
  'Custom Docker image support (beyond templates)',
  'Volume mounting from cloud storage (S3/GCS)',
];

export default function InstancesPage() {
  return (
    <article className="space-y-12 text-gray-300">
      <header className="space-y-3">
        <p className="text-sm font-medium uppercase tracking-widest text-primary/90">GPU Cloud</p>
        <h1 className="text-3xl font-bold tracking-tight text-white md:text-4xl">GPU Instances</h1>
        <p className="max-w-2xl text-lg leading-relaxed text-gray-400">
          How instances are provisioned, billed, and connected—and where gaps remain.
        </p>
      </header>

      <section className="space-y-4">
        <h2 className="flex flex-wrap items-center gap-2 text-xl font-semibold text-white">
          Overview <StatusBadge kind="live" />
        </h2>
        <ul className="list-disc space-y-2 pl-5 leading-relaxed">
          <li>Instances are Docker containers on host machines with GPU access.</li>
          <li>Each instance gets dedicated GPU(s), SSH access, and a Docker environment.</li>
          <li>
            Lifecycle: <span className="text-white/90">Creating → Running → Stopped → Destroyed</span>
          </li>
        </ul>
      </section>

      <section className="space-y-4">
        <h2 className="flex flex-wrap items-center gap-2 text-xl font-semibold text-white">
          Instance Types <StatusBadge kind="live" />
        </h2>
        <DocTable
          headers={['Type', 'Description']}
          rows={[
            ['On-Demand', 'Pay the listed rate, no commitment, cancel anytime'],
            ['Reserved', 'Commit to a term for up to 40% discount'],
            ['Interruptible (Spot)', 'Bid your own price; workloads can be preempted'],
          ]}
        />
      </section>

      <section className="space-y-4">
        <h2 className="flex flex-wrap items-center gap-2 text-xl font-semibold text-white">
          GPU Slicing <StatusBadge kind="live" />
        </h2>
        <ul className="list-disc space-y-2 pl-5 leading-relaxed">
          <li>Hosts set <code className="rounded bg-black/40 px-1.5 py-0.5 font-mono text-sm">min_gpu</code> using powers of 2: 1, 2, 4, or 8.</li>
          <li>Multiple renters can share one physical machine.</li>
          <li>Each renter receives exclusive GPU indices (for example devices 0 and 1).</li>
        </ul>
      </section>

      <section className="space-y-4">
        <h2 className="flex flex-wrap items-center gap-2 text-xl font-semibold text-white">
          Deploying an Instance <StatusBadge kind="live" />
        </h2>
        <ul className="list-disc space-y-3 pl-5 leading-relaxed">
          <li>
            <span className="text-white">Web console:</span> select an offer → choose a template →
            set GPU count → deploy.
          </li>
          <li>
            <span className="text-white">CLI:</span>
          </li>
        </ul>
        <CodeBlock>
          {`velocity create-instance --offer ID --template pytorch --gpu-count 2`}
        </CodeBlock>
        <p className="text-sm text-gray-400">
          <span className="text-white">API:</span> <code className="font-mono text-primary/90">POST /api/console/rent</code>
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="flex flex-wrap items-center gap-2 text-xl font-semibold text-white">
          Connecting to Instances <StatusBadge kind="partial" />
        </h2>
        <ul className="list-disc space-y-2 pl-5 leading-relaxed">
          <li>
            SSH:{' '}
            <code className="rounded bg-black/40 px-1.5 py-0.5 font-mono text-sm text-primary/90">
              ssh root@&lt;public_ip&gt; -p &lt;port&gt;
            </code>{' '}
            when the host has a public IP.
          </li>
          <li>
            Jupyter: available on templates with <code className="font-mono text-sm">launch_mode</code>{' '}
            set to <code className="font-mono text-sm">&quot;jupyter&quot;</code>.
          </li>
        </ul>
        <WarningBox title="What’s missing today">
          <ul className="list-disc space-y-1 pl-5">
            <li>Web-based terminal (similar to Vast.ai)</li>
            <li>Reliable tunneling for hosts behind NAT</li>
            <li>VNC / full desktop support</li>
          </ul>
        </WarningBox>
      </section>

      <section className="space-y-4">
        <h2 className="flex flex-wrap items-center gap-2 text-xl font-semibold text-white">
          Storage <StatusBadge kind="partial" />
        </h2>
        <p className="leading-relaxed">
          Disk is allocated per instance, typically configurable from 10GB up to 100TB depending on
          offer and policy.
        </p>
        <WarningBox title="What’s missing today">
          <ul className="list-disc space-y-1 pl-5">
            <li>Persistent volumes that survive across instance replacements</li>
            <li>First-class cloud storage mounting</li>
            <li>Built-in large data transfer tooling</li>
          </ul>
        </WarningBox>
      </section>

      <section className="space-y-4">
        <h2 className="flex flex-wrap items-center gap-2 text-xl font-semibold text-white">
          Templates <StatusBadge kind="live" />
        </h2>
        <p className="leading-relaxed">
          Pre-built environments available on the platform include:
        </p>
        <ul className="grid gap-2 sm:grid-cols-2">
          {templates.map((t) => (
            <li
              key={t}
              className="rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2 text-sm text-gray-200"
            >
              {t}
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-4">
        <h2 className="flex flex-wrap items-center gap-2 text-xl font-semibold text-white">
          What&apos;s NOT Built Yet <StatusBadge kind="planned" />
        </h2>
        <InfoBox>
          <p className="font-medium text-primary">Roadmap honesty</p>
          <ul className="list-disc space-y-2 pl-5 text-gray-300">
            {notBuilt.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </InfoBox>
      </section>
    </article>
  );
}
