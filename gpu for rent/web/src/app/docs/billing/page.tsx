import type { Metadata } from 'next';
import { StatusBadge, WarningBox } from '../shared';

export const metadata: Metadata = {
  title: 'Billing & Invoicing | Velocity Docs',
  description:
    'Wallet billing, per-minute charges, USD pricing, revenue split, tax-compliant invoicing, and rental types.',
};

export default function BillingDocsPage() {
  return (
    <article className="space-y-12 text-[#E2E8F0]">
      <header className="space-y-3">
        <p className="text-sm font-medium uppercase tracking-widest text-primary/90">Platform</p>
        <h1 className="text-3xl font-bold font-heading tracking-tight text-white md:text-4xl">
          Billing &amp; Invoicing
        </h1>
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge kind="live" />
          <p className="max-w-2xl text-lg leading-relaxed text-[#94A3B8]">
            USD wallet, Razorpay deposits, per-minute metering, and jurisdiction-aware invoicing.
          </p>
        </div>
      </header>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold font-heading text-white">How billing works</h2>
        <ul className="list-disc space-y-3 pl-5 leading-relaxed">
          <li>
            <span className="text-white">Wallet-based system</span> — all balances and pricing are in
            USD. Deposits are processed via Razorpay (UPI, cards, net banking) and converted at checkout.
          </li>
          <li>
            <span className="text-white">Minimum deposit:</span> <span className="font-mono">$10</span>.
          </li>
          <li>
            <span className="text-white">Billing cadence:</span> every minute via{' '}
            <code className="text-primary/95 font-mono">pg_cron</code>.
          </li>
          <li>
            <span className="text-white">Charges:</span> (GPU price x GPU count x minutes used) +
            (storage price x disk size).
          </li>
          <li>
            <span className="text-white">Auto-stop:</span> when wallet hits zero, instances stop
            automatically.
          </li>
        </ul>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold font-heading text-white">Currency and payments</h2>
        <ul className="list-disc space-y-3 pl-5 leading-relaxed">
          <li>
            <span className="text-white">Source of truth:</span> USD. All wallet balances, pricing,
            and billing are in US dollars.
          </li>
          <li>
            <span className="text-white">Payment gateway:</span> Razorpay processes payments in INR.
            USD amounts are converted at a fixed rate at checkout time.
          </li>
          <li>
            <span className="text-white">Wallet credit:</span> After payment, your wallet is credited
            in USD based on the amount you selected, not the INR conversion.
          </li>
        </ul>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold font-heading text-white">Revenue split (tier-based)</h2>
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
        <h2 className="text-xl font-semibold font-heading text-white">Free credits</h2>
        <ul className="list-disc space-y-2 pl-5 leading-relaxed">
          <li>
            <span className="text-white">Signup credits:</span> Every new user receives{' '}
            <span className="font-mono">$1.00</span> (~1 hour RTX 4090) automatically.
          </li>
          <li>
            <span className="text-white">Referral credits:</span> When a referred user rents their
            first GPU, both the referrer and referee receive <span className="font-mono">$1.00</span> in credits.
          </li>
        </ul>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold font-heading text-white">Auto-refunds</h2>
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
        <h2 className="flex flex-wrap items-center gap-2 text-xl font-semibold font-heading text-white">
          Invoicing <StatusBadge kind="live" />
        </h2>
        <ul className="list-disc space-y-3 pl-5 leading-relaxed">
          <li>
            <span className="text-white">India (billing country = IN):</span> Full GST tax invoice
            with 18% GST (CGST 9% + SGST 9%), SAC code, seller/buyer GSTIN, and ITC eligibility.
            Amounts shown in both USD and INR.
          </li>
          <li>
            <span className="text-white">International:</span> Standard commercial invoice in USD
            with no tax breakdown. Issued by Velocity Cloud Infrastructure Pvt. Ltd. (India).
          </li>
          <li>
            Set your billing country in <strong>Settings &gt; Profile</strong> to receive the correct invoice format.
          </li>
        </ul>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold font-heading text-white">Rental types &amp; pricing</h2>
        <ul className="list-disc space-y-3 pl-5 leading-relaxed">
          <li>
            <span className="text-white">On-Demand:</span> listed price per GPU per hour.
          </li>
          <li>
            <span className="text-white">Reserved:</span>{' '}
            <code className="text-primary/95 font-mono">(1 - reserved_discount_factor) x listed price</code>
            .
          </li>
          <li>
            <span className="text-white">Interruptible:</span> bid price (must be above host&apos;s
            minimum bid floor).
          </li>
        </ul>
      </section>

      <section className="space-y-4">
        <h2 className="flex flex-wrap items-center gap-2 text-xl font-semibold font-heading text-white">
          Coming soon <StatusBadge kind="planned" />
        </h2>
        <WarningBox>
          <ul className="list-disc space-y-2 pl-5">
            <li>Invoice PDF download (HTML invoices exist today)</li>
            <li>Payout to bank account (wallet-only for now)</li>
            <li>Usage analytics and cost breakdown charts</li>
            <li>Budget alerts and spending limits</li>
            <li>Credit notes for interrupted instances</li>
          </ul>
        </WarningBox>
      </section>
    </article>
  );
}
