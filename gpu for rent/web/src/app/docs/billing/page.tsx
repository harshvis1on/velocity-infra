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
        <h2 className="text-xl font-semibold text-white">Revenue split (tier-based)</h2>
        <p className="leading-relaxed">
          Platform fees depend on the provider&apos;s tier. Higher tiers earn a larger share:
        </p>
        <ul className="list-disc space-y-2 pl-5 leading-relaxed">
          <li><span className="text-white">Bronze:</span> 85% host / 15% platform</li>
          <li><span className="text-white">Silver:</span> 88% host / 12% platform</li>
          <li><span className="text-white">Gold:</span> 90% host / 10% platform</li>
          <li><span className="text-white">Platinum:</span> 93% host / 7% platform</li>
          <li><span className="text-white">Diamond:</span> 95% host / 5% platform</li>
        </ul>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-white">Free credits</h2>
        <ul className="list-disc space-y-2 pl-5 leading-relaxed">
          <li>
            <span className="text-white">Signup credits:</span> Every new user receives ₹65 (~1
            hour RTX 4090) automatically.
          </li>
          <li>
            <span className="text-white">Referral credits:</span> When a referred user rents their
            first GPU, both the referrer and referee receive ₹65 in credits.
          </li>
        </ul>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-white">Auto-refunds</h2>
        <ul className="list-disc space-y-2 pl-5 leading-relaxed">
          <li>
            <span className="text-white">Stuck instance:</span> If an instance is stuck in
            &quot;creating&quot; for over 5 minutes, it is automatically failed and the renter
            receives a 1-hour compute credit refund.
          </li>
          <li>
            <span className="text-white">Provider failure:</span> If a provider machine goes offline
            or errors while instances are running, those instances are stopped and renters receive an
            automatic credit refund.
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
            <li>Invoice PDF download (HTML invoices exist)</li>
            <li>GST return filing integration</li>
            <li>Payout to bank account (wallet-only today)</li>
            <li>Usage analytics / cost breakdown charts</li>
            <li>Budget alerts / spending limits</li>
            <li>Credit notes for interrupted instances (auto-refunds exist but no formal credit notes)</li>
          </ul>
        </WarningBox>
      </section>
    </article>
  );
}
