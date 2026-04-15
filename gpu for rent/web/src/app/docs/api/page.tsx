import type { Metadata } from 'next';
import { DocTable, InfoBox, StatusBadge, WarningBox } from '../shared';

export const metadata: Metadata = {
  title: 'API Reference | Velocity Docs',
  description:
    'Supabase REST + custom routes: auth, renter, host, serverless endpoints and known gaps.',
};

export default function ApiDocsPage() {
  return (
    <article className="space-y-12 text-gray-300">
      <header className="space-y-3">
        <p className="text-sm font-medium uppercase tracking-widest text-primary/90">Tools</p>
        <h1 className="text-3xl font-bold tracking-tight text-white md:text-4xl">API Reference</h1>
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge kind="live" />
          <p className="max-w-2xl text-lg leading-relaxed text-gray-400">
            Live via Supabase REST and custom Next.js routes.
          </p>
        </div>
      </header>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-white">Authentication</h2>
        <p className="leading-relaxed">All API requests require one of:</p>
        <ul className="list-disc space-y-2 pl-5 leading-relaxed">
          <li>Supabase session cookie (web console)</li>
          <li>
            Supabase API key in <code className="text-primary/95">Authorization</code> header (CLI /
            SDK)
          </li>
          <li>Service role key for admin operations</li>
        </ul>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-white">Renter APIs</h2>
        <div className="overflow-x-auto rounded-lg border border-white/10">
          <table className="w-full min-w-[720px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-white/10 bg-white/[0.03]">
                {['Method', 'Endpoint', 'Body', 'Response', 'Status'].map((h) => (
                  <th key={h} className="px-3 py-3 font-semibold text-white">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-white/5">
                <td className="px-3 py-3 font-mono text-primary/95">POST</td>
                <td className="px-3 py-3 font-mono text-xs text-gray-200">/api/console/rent</td>
                <td className="px-3 py-3 text-xs">
                  offerId, gpuCount, templateId, diskSize, launchMode, rentalType, bidPriceInr?,
                  sshKeyId?
                </td>
                <td className="px-3 py-3">instance object</td>
                <td className="px-3 py-3">✅</td>
              </tr>
              <tr className="border-b border-white/5">
                <td className="px-3 py-3 font-mono text-primary/95">POST</td>
                <td className="px-3 py-3 font-mono text-xs text-gray-200">
                  /api/billing/create-order
                </td>
                <td className="px-3 py-3 text-xs">{`{ amount }`}</td>
                <td className="px-3 py-3">order_id</td>
                <td className="px-3 py-3">✅</td>
              </tr>
              <tr className="border-b border-white/5 last:border-0">
                <td className="px-3 py-3 font-mono text-primary/95">POST</td>
                <td className="px-3 py-3 font-mono text-xs text-gray-200">/api/billing/webhook</td>
                <td className="px-3 py-3 text-xs">Razorpay signature payload</td>
                <td className="px-3 py-3">Credits wallet</td>
                <td className="px-3 py-3">✅</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-white">Host APIs</h2>
        <DocTable
          headers={['Method', 'Endpoint', 'Body', 'Response', 'Status']}
          rows={[
            ['GET', '/api/host/offers', '—', 'offer[]', '✅'],
            ['POST', '/api/host/offers', '{ machineId, pricePerGpuHrInr, ... }', 'offer', '✅'],
            ['GET', '/api/host/offers/:id', '—', 'offer', '✅'],
            ['PATCH', '/api/host/offers/:id', 'Partial offer fields', 'offer', '✅'],
            ['DELETE', '/api/host/offers/:id', '—', '200', '✅'],
            ['GET', '/api/host/machines/:id/maintenance', '—', 'window[]', '✅'],
            [
              'POST',
              '/api/host/machines/:id/maintenance',
              '{ startDate, durationHrs }',
              'window',
              '✅',
            ],
            ['DELETE', '/api/host/machines/:id/maintenance', '—', '200', '✅'],
            ['POST', '/api/host/machines/:id/self-test', '—', 'results', '✅'],
          ]}
        />
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-white">Serverless APIs</h2>
        <DocTable
          headers={['Method', 'Endpoint', 'Body', 'Response', 'Status']}
          rows={[
            ['GET', '/api/serverless/endpoints', '—', 'endpoint[]', '✅'],
            ['POST', '/api/serverless/endpoints', '{ name, ... }', 'endpoint', '✅'],
            ['GET|PATCH|DELETE', '/api/serverless/endpoints/:id', '—', '—', '✅'],
            [
              'POST',
              '/api/serverless/endpoints/:id/route',
              '{ payload }',
              '{ worker_url, auth_data }',
              '✅',
            ],
            ['GET|POST', '/api/serverless/endpoints/:id/workergroups', '—', '—', '✅'],
          ]}
        />
      </section>

      <section className="space-y-4">
        <h2 className="flex flex-wrap items-center gap-2 text-xl font-semibold text-white">
          What&apos;s missing from the API <StatusBadge kind="planned" />
        </h2>
        <WarningBox>
          <ul className="list-disc space-y-2 pl-5">
            <li>No public REST API with standalone API key auth (Supabase session / JWT today)</li>
            <li>No rate limiting enforced</li>
            <li>No API versioning (v1 / v2)</li>
            <li>No OpenAPI / Swagger spec</li>
            <li>No webhooks for instance events</li>
            <li>No bulk operations</li>
            <li>No pagination on list endpoints</li>
          </ul>
        </WarningBox>
        <InfoBox>
          <p>
            For most flows, combine Supabase client access with the documented route handlers above.
            Treat this page as a map—not a formal spec.
          </p>
        </InfoBox>
      </section>
    </article>
  );
}
