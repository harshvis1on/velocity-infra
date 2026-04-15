import type { Metadata } from 'next';
import { CodeBlock, DocTable, InfoBox, StatusBadge, WarningBox } from '../shared';

export const metadata: Metadata = {
  title: 'Serverless Inference | Velocity Docs',
  description:
    'Auto-scaling ML endpoints, worker groups, routing, autoscaler state, Python SDK, and limitations.',
};

const notProduction = [
  'Autoscaler needs real load testing',
  'No request queuing / batching',
  'No GPU memory management across workers',
  'No A/B testing / traffic splitting',
  'No model caching / pre-loading',
  'No usage metrics / dashboards',
  'No rate limiting per endpoint',
  'No custom handler support (only /generate endpoint)',
];

export default function ServerlessPage() {
  return (
    <article className="space-y-12 text-gray-300">
      <header className="space-y-3">
        <p className="text-sm font-medium uppercase tracking-widest text-primary/90">Serverless</p>
        <h1 className="text-3xl font-bold tracking-tight text-white md:text-4xl">
          Serverless Inference
        </h1>
        <p className="max-w-2xl text-lg leading-relaxed text-gray-400">
          Deploy models as API endpoints with routing and scaling—where the product is solid and
          where it is still maturing.
        </p>
      </header>

      <section className="space-y-4">
        <h2 className="flex flex-wrap items-center gap-2 text-xl font-semibold text-white">
          Overview <StatusBadge kind="partial" />
        </h2>
        <p className="leading-relaxed">
          Serverless inference exposes ML models as auto-scaling HTTP endpoints. The architecture
          chains: <span className="text-white">Endpoint → Worker Groups → Workers → PyWorker sidecar</span>.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-white">How It Works (Partial)</h2>
        <DocTable
          headers={['Step', 'Status']}
          rows={[
            ['Create an endpoint (name, scaling parameters)', '✅ Live'],
            ['Create worker groups (template, GPU requirements)', '✅ Live'],
            ['Send requests; router selects a worker', '✅ Live'],
            ['Auto-scaling adjusts worker count', '🔧 Partial'],
          ]}
        />
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-white">Current State</h2>
        <ul className="space-y-3 leading-relaxed">
          <li className="flex flex-wrap items-start gap-2">
            <StatusBadge kind="live" />
            <span>
              <span className="text-white">Endpoint CRUD</span> — working.
            </span>
          </li>
          <li className="flex flex-wrap items-start gap-2">
            <StatusBadge kind="live" />
            <span>
              <span className="text-white">Worker group management</span> — working.
            </span>
          </li>
          <li className="flex flex-wrap items-start gap-2">
            <StatusBadge kind="live" />
            <span>
              <span className="text-white">Request routing</span> — basic load balancing works.
            </span>
          </li>
          <li className="flex flex-wrap items-start gap-2">
            <StatusBadge kind="partial" />
            <span>
              <span className="text-white">Autoscaler</span> — basic, cron-based, not
              battle-tested.
            </span>
          </li>
          <li className="flex flex-wrap items-start gap-2">
            <StatusBadge kind="partial" />
            <span>
              <span className="text-white">PyWorker sidecar</span> — present in the agent; limited
              testing.
            </span>
          </li>
          <li className="flex flex-wrap items-start gap-2">
            <StatusBadge kind="planned" />
            <span>
              <span className="text-white">Cold starts</span> — not optimized; no pre-warming.
            </span>
          </li>
          <li className="flex flex-wrap items-start gap-2">
            <StatusBadge kind="planned" />
            <span>
              <span className="text-white">Scale to zero</span> — planned; not production-ready.
            </span>
          </li>
        </ul>
      </section>

      <section className="space-y-4">
        <h2 className="flex flex-wrap items-center gap-2 text-xl font-semibold text-white">
          Python SDK <StatusBadge kind="live" />
        </h2>
        <CodeBlock>
          {`from velocity import VelocityClient

client = VelocityClient(api_key="your-key")
result = client.generate(
    endpoint_id="your-endpoint",
    payload={"prompt": "Hello", "max_tokens": 100}
)`}
        </CodeBlock>
      </section>

      <section className="space-y-4">
        <h2 className="flex flex-wrap items-center gap-2 text-xl font-semibold text-white">
          What&apos;s NOT Production-Ready <StatusBadge kind="planned" />
        </h2>
        <WarningBox title="Operate with caution">
          <ul className="list-disc space-y-2 pl-5 text-amber-100/90">
            {notProduction.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </WarningBox>
        <InfoBox>
          <p className="text-gray-300">
            Use serverless inference for experiments and internal pilots until load testing,
            observability, and rate controls meet your production bar.
          </p>
        </InfoBox>
      </section>
    </article>
  );
}
