import type { Metadata } from 'next';
import { CodeBlock, DocTable, InfoBox, StatusBadge, WarningBox } from '../shared';

export const metadata: Metadata = {
  title: 'CLI Reference | Velocity Docs',
  description:
    'velocity CLI (v3.0.0): install, auth, renter and host commands, and known gaps.',
};

export default function CliDocsPage() {
  return (
    <article className="space-y-12 text-gray-300">
      <header className="space-y-3">
        <p className="text-sm font-medium uppercase tracking-widest text-primary/90">Tools</p>
        <h1 className="text-3xl font-bold tracking-tight text-white md:text-4xl">CLI Reference</h1>
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge kind="live" />
          <span className="text-lg leading-relaxed text-gray-400">
            Node.js Commander app <code className="text-primary/95">velocity</code> (v3.0.0), entry
            at <code className="text-primary/95">/cli/index.js</code>.
          </span>
        </div>
      </header>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-white">Installation</h2>
        <CodeBlock>
          {`npm install -g velocity-infra  # or install from source
cd cli && npm link`}
        </CodeBlock>
        <InfoBox>
          <p>
            The npm package is not published yet—install from the repository and use{' '}
            <code className="rounded bg-black/40 px-1 font-mono text-[13px] text-primary/95">
              npm link
            </code>{' '}
            for local development.
          </p>
        </InfoBox>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-white">Authentication</h2>
        <CodeBlock>
          {`velocity login --api-key vi_live_your_api_key
# Stores in ~/.velocity/credentials.json`}
        </CodeBlock>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-white">Renter commands</h2>
        <DocTable
          headers={['Command', 'Description', 'Status']}
          rows={[
            [
              '`velocity search-offers`',
              'Search marketplace (--gpu, --max-price, --min-gpu, --verified)',
              '✅',
            ],
            [
              '`velocity create-instance`',
              'Rent from offer (--offer, --template, --gpu-count, --rental-type)',
              '✅',
            ],
            ['`velocity list`', 'List your instances', '✅'],
            ['`velocity ssh <id>`', 'SSH into instance (uses tunnel_url or public_ip)', '✅'],
          ]}
        />
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-white">Host commands</h2>
        <DocTable
          headers={['Command', 'Description', 'Status']}
          rows={[
            ['`velocity show-machines`', 'List your machines', '✅'],
            ['`velocity list-machine`', 'Create offer & list on marketplace', '✅'],
            ['`velocity unlist-machine`', 'Take machine offline', '✅'],
            ['`velocity set-min-bid`', 'Set spot pricing floor', '✅'],
            ['`velocity schedule-maint`', 'Schedule maintenance window', '✅'],
            ['`velocity cancel-maint`', 'Cancel maintenance', '✅'],
            ['`velocity self-test`', 'View self-test results', '✅'],
            ['`velocity cleanup-machine`', 'Reconcile GPU allocation', '✅'],
            ['`velocity show-earnings`', 'View wallet + payouts', '✅'],
          ]}
        />
      </section>

      <section className="space-y-4">
        <h2 className="flex flex-wrap items-center gap-2 text-xl font-semibold text-white">
          What&apos;s missing <StatusBadge kind="planned" />
        </h2>
        <WarningBox title="Roadmap gaps">
          <ul className="list-disc space-y-2 pl-5">
            <li>
              <code className="text-primary/95">velocity stop &lt;id&gt;</code> /{' '}
              <code className="text-primary/95">velocity destroy &lt;id&gt;</code> — not in CLI yet
              (web console only).
            </li>
            <li>
              <code className="text-primary/95">velocity logs &lt;id&gt;</code> — no log streaming.
            </li>
            <li>
              <code className="text-primary/95">velocity scp</code> — no file transfer command.
            </li>
            <li>
              <code className="text-primary/95">velocity run &lt;script&gt;</code> — no managed
              runs yet.
            </li>
            <li>npm package not published (install from source only).</li>
          </ul>
        </WarningBox>
      </section>
    </article>
  );
}
