import type { Metadata } from 'next';
import { StatusBadge, WarningBox } from '../shared';

export const metadata: Metadata = {
  title: 'Billing & GST | Velocity Docs',
  description:
    'Wallet billing, per-minute charges, revenue split, GST compliance, rental types, and gaps.',
};

export default function BillingDocsPage() {
  return (
    <article className="space-y-12 text-gray-300">
      <header className="space-y-3">
        <p className="text-sm font-medium uppercase tracking-widest text-primary/90">Platform</p>
        <h1 className="text-3xl font-bold tracking-tight text-white md:text-4xl">
          Billing &amp; GST
        </h1>
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge kind="live" />
          <p className="max-w-2xl text-lg leading-relaxed text-gray-400">
            INR wallet, Razorpay deposits, per-minute metering, and tax handling.
          </p>
        </div>
      </header>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-white">How billing works</h2>
        <ul className="list-disc space-y-3 pl-5 leading-relaxed">
          <li>
            <span className="text-white">Wallet-based system</span> — pre-fund via Razorpay (UPI,
            cards, net banking).
          </li>
          <li>
            <span className="text-white">Minimum deposit:</span> ₹100.
          </li>
          <li>
            <span className="text-white">Billing cadence:</span> every minute via{' '}
            <code className="text-primary/95">pg_cron</code>.
          </li>
          <li>
            <span className="text-white">Charges:</span> (GPU price × GPU count × minutes used) +
            (storage price × disk size).
          </li>
          <li>
            <span className="text-white">Auto-stop:</span> when wallet hits zero, instances stop
            automatically.
          </li>
        </ul>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-white">Revenue split</h2>
        <ul className="list-disc space-y-2 pl-5 leading-relaxed">
          <li>
            <span className="text-white">85%</span> to host wallet
          </li>
          <li>
            <span className="text-white">15%</span> platform fee
          </li>
        </ul>
      </section>

      <section className="space-y-4">
        <h2 className="flex flex-wrap items-center gap-2 text-xl font-semibold text-white">
          GST compliance <StatusBadge kind="live" />
        </h2>
        <ul className="list-disc space-y-3 pl-5 leading-relaxed">
          <li>
            <span className="text-white">18% GST</span> on all deposits.
          </li>
          <li>
            GST breakdown: IGST (inter-state) or CGST + SGST (intra-state).
          </li>
          <li>
            Each transaction stores{' '}
            <code className="text-primary/95">gst_amount</code>,{' '}
            <code className="text-primary/95">igst_amount</code>,{' '}
            <code className="text-primary/95">cgst_amount</code>,{' '}
            <code className="text-primary/95">sgst_amount</code>.
          </li>
          <li>Renters can claim 18% input tax credit where applicable.</li>
        </ul>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-white">Rental types &amp; pricing</h2>
        <ul className="list-disc space-y-3 pl-5 leading-relaxed">
          <li>
            <span className="text-white">On-Demand:</span> listed price per GPU per hour.
          </li>
          <li>
            <span className="text-white">Reserved:</span>{' '}
            <code className="text-primary/95">(1 - reserved_discount_factor) × listed price</code>
            .
          </li>
          <li>
            <span className="text-white">Interruptible:</span> bid price (must be ≥ host&apos;s
            minimum bid floor).
          </li>
        </ul>
      </section>

      <section className="space-y-4">
        <h2 className="flex flex-wrap items-center gap-2 text-xl font-semibold text-white">
          What&apos;s NOT built yet <StatusBadge kind="planned" />
        </h2>
        <WarningBox>
          <ul className="list-disc space-y-2 pl-5">
            <li>Invoice generation / PDF download</li>
            <li>GST return filing integration</li>
            <li>Payout to bank account (wallet-only today)</li>
            <li>Usage analytics / cost breakdown charts</li>
            <li>Budget alerts / spending limits</li>
            <li>Refund system</li>
            <li>Credit notes for interrupted instances</li>
          </ul>
        </WarningBox>
      </section>
    </article>
  );
}
