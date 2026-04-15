import React from 'react';
import Link from 'next/link';

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  );
}

export default function HostPage() {
  const verificationItems = [
    'CUDA version >= 12.0',
    'Reliability score >= 90%',
    'At least 3 open ports per GPU (100 recommended)',
    'Internet download speed >= 500 Mbps',
    'Internet upload speed >= 500 Mbps',
    'GPU VRAM >= 7 GB',
    'Pass the automated self-test',
  ];

  const tiers = [
    { name: 'Bronze', fee: '15%', xp: '0' },
    { name: 'Silver', fee: '12%', xp: '1,000' },
    { name: 'Gold', fee: '10%', xp: '5,000' },
    { name: 'Platinum', fee: '7%', xp: '15,000' },
    { name: 'Diamond', fee: '5%', xp: '50,000' },
  ];

  const hoursPerDay = 14;
  const daysPerMonth = 30;
  const monthlyHours = hoursPerDay * daysPerMonth;

  const earningsRows = [
    { gpu: 'NVIDIA RTX 4090', rate: 65, monthly: 65 * monthlyHours },
    { gpu: 'NVIDIA A100', rate: 150, monthly: 150 * monthlyHours },
    { gpu: 'NVIDIA H100', rate: 280, monthly: 280 * monthlyHours },
  ];

  const formatInr = (n: number) =>
    n.toLocaleString('en-IN', { maximumFractionDigits: 0, style: 'currency', currency: 'INR' });

  return (
    <main className="min-h-screen flex flex-col bg-[#050505] text-white">
      <section className="relative px-4 sm:px-6 lg:px-8 py-24 md:py-32 lg:py-40 flex flex-col items-center justify-center text-center overflow-hidden border-b border-white/[0.06]">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/10 rounded-full blur-[120px] -z-10 opacity-50" />
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-balance max-w-5xl leading-tight mb-6">
          Earn revenue{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-emerald-400">from your hardware.</span>
        </h1>
        <p className="mt-6 text-lg md:text-xl text-gray-400 max-w-2xl text-balance mx-auto mb-10">
          List GPUs on the Velocity marketplace. Set your own <span className="text-gray-300">per-GPU pricing</span>,
          earn with <span className="text-gray-300">per-second billing</span>, and serve multiple renters with{' '}
          <span className="text-gray-300">GPU slicing</span>. Gain <span className="text-primary font-medium">XP</span>{' '}
          for reliability and advance through tiers for lower platform fees.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/host/setup"
            className="bg-primary hover:bg-primary-dark text-black font-bold py-3 px-8 rounded-lg text-lg transition-all shadow-[0_0_20px_rgba(0,255,136,0.3)] hover:shadow-[0_0_30px_rgba(0,255,136,0.5)] text-center"
          >
            Start Providing
          </Link>
          <Link
            href="/host/datacenter-apply"
            className="bg-[#0a0a0a] hover:bg-white/[0.08] border border-white/[0.06] text-white font-medium py-3 px-8 rounded-lg text-lg transition-all text-center"
          >
            Apply for Enterprise
          </Link>
        </div>
      </section>

      <section className="py-24 bg-black border-y border-white/[0.06]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">How it works</h2>
            <p className="text-gray-400">
              From agent install to recurring revenue: verify your hardware, publish offers, and collect payouts while your tier tracks
              experience and fee reductions.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8 relative">
            <div className="hidden lg:block absolute top-12 left-[12.5%] right-[12.5%] h-0.5 bg-gradient-to-r from-primary/0 via-primary/40 to-primary/0 -z-10" />

            <div className="bg-[#0a0a0a] border border-white/[0.06] p-8 rounded-2xl shadow-2xl text-center relative">
              <div className="w-16 h-16 bg-primary/10 border border-primary/30 text-primary rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-6 shadow-[0_0_15px_rgba(0,255,136,0.2)]">
                1
              </div>
              <h3 className="text-xl font-bold mb-3 text-white">Install the agent</h3>
              <p className="text-gray-400 text-sm">
                Install supported drivers and the Velocity Infra agent on your host. Guided setup connects the machine to the marketplace
                and prepares it for health checks.
              </p>
            </div>

            <div className="bg-[#0a0a0a] border border-white/[0.06] p-8 rounded-2xl shadow-2xl text-center relative">
              <div className="w-16 h-16 bg-primary/10 border border-primary/30 text-primary rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-6 shadow-[0_0_15px_rgba(0,255,136,0.2)]">
                2
              </div>
              <h3 className="text-xl font-bold mb-3 text-white">Verify hardware</h3>
              <p className="text-gray-400 text-sm">
                Automated checks cover CUDA, network, PCIe, and port exposure. Meet the bar to earn a verified badge and unlock bookings
                with confidence.
              </p>
            </div>

            <div className="bg-[#0a0a0a] border border-white/[0.06] p-8 rounded-2xl shadow-2xl text-center relative">
              <div className="w-16 h-16 bg-primary/10 border border-primary/30 text-primary rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-6 shadow-[0_0_15px_rgba(0,255,136,0.2)]">
                3
              </div>
              <h3 className="text-xl font-bold mb-3 text-white">Set pricing</h3>
              <p className="text-gray-400 text-sm">
                Define per-GPU rates, minimum slice size, offer duration, and options such as reserved or interruptible pricing. Contracts
                reflect what you publish.
              </p>
            </div>

            <div className="bg-[#0a0a0a] border border-white/[0.06] p-8 rounded-2xl shadow-2xl text-center relative">
              <div className="w-16 h-16 bg-primary/10 border border-primary/30 text-primary rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-6 shadow-[0_0_15px_rgba(0,255,136,0.2)]">
                4
              </div>
              <h3 className="text-xl font-bold mb-3 text-white">Earn revenue and XP</h3>
              <p className="text-gray-400 text-sm">
                Per-second billing and multi-tenant slicing when enabled. Uptime and successful rentals accumulate XP toward higher tiers
                and lower platform fees.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-24 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Provider tiers</h2>
          <p className="text-gray-400 max-w-2xl mx-auto">
            Platform fees decrease as you earn XP. Tier thresholds reward consistent quality and availability.
          </p>
        </div>
        <div className="overflow-x-auto rounded-2xl border border-white/[0.06] bg-[#0a0a0a] shadow-2xl">
          <table className="w-full text-left text-sm md:text-base">
            <thead>
              <tr className="border-b border-white/[0.06] bg-white/[0.03]">
                <th className="py-4 px-6 font-semibold text-white">Tier</th>
                <th className="py-4 px-6 font-semibold text-white">Platform fee</th>
                <th className="py-4 px-6 font-semibold text-white">XP required</th>
              </tr>
            </thead>
            <tbody className="text-gray-300">
              {tiers.map((row) => (
                <tr key={row.name} className="border-b border-white/[0.06] last:border-0">
                  <td className="py-4 px-6 font-medium text-white">{row.name}</td>
                  <td className="py-4 px-6 text-primary font-semibold">{row.fee}</td>
                  <td className="py-4 px-6">{row.xp}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-6 text-center text-sm text-gray-500">
          XP is earned from completed rental time and reliability signals; exact rules appear in your provider dashboard.
        </p>
      </section>

      <section className="py-24 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Hardware requirements</h2>
          <p className="text-gray-400">Minimum specifications required before you publish an offer.</p>
        </div>
        <div className="overflow-x-auto rounded-2xl border border-white/[0.06] bg-[#0a0a0a] shadow-2xl">
          <table className="w-full text-left text-sm md:text-base">
            <thead>
              <tr className="border-b border-white/[0.06] bg-white/[0.03]">
                <th className="py-4 px-6 font-semibold text-white">Requirement</th>
                <th className="py-4 px-6 font-semibold text-white">Specification</th>
              </tr>
            </thead>
            <tbody className="text-gray-300">
              <tr className="border-b border-white/[0.06]">
                <td className="py-4 px-6 text-gray-400 whitespace-nowrap">Operating system</td>
                <td className="py-4 px-6">Ubuntu 18.04 or newer</td>
              </tr>
              <tr className="border-b border-white/[0.06]">
                <td className="py-4 px-6 text-gray-400 whitespace-nowrap">GPU</td>
                <td className="py-4 px-6">NVIDIA GPU (10-series or newer; RTX 2080 or newer recommended)</td>
              </tr>
              <tr className="border-b border-white/[0.06]">
                <td className="py-4 px-6 text-gray-400 whitespace-nowrap">CPU</td>
                <td className="py-4 px-6">At least one physical CPU core per GPU</td>
              </tr>
              <tr className="border-b border-white/[0.06]">
                <td className="py-4 px-6 text-gray-400 whitespace-nowrap">System RAM</td>
                <td className="py-4 px-6">At least 4 GB per GPU</td>
              </tr>
              <tr className="border-b border-white/[0.06]">
                <td className="py-4 px-6 text-gray-400 whitespace-nowrap">Storage</td>
                <td className="py-4 px-6">128 GB SSD per GPU</td>
              </tr>
              <tr className="border-b border-white/[0.06]">
                <td className="py-4 px-6 text-gray-400 whitespace-nowrap">Internet</td>
                <td className="py-4 px-6">At least 10 Mbps per machine</td>
              </tr>
              <tr>
                <td className="py-4 px-6 text-gray-400 whitespace-nowrap">Networking</td>
                <td className="py-4 px-6">Open port range mapped to each machine</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="py-24 bg-[#050505] border-y border-white/[0.06]">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Verification</h2>
            <p className="text-gray-400 text-balance">
              Satisfying the criteria below aligns your host with marketplace quality standards and improves visibility to renters.
            </p>
          </div>
          <ul className="space-y-4">
            {verificationItems.map((item) => (
              <li
                key={item}
                className="flex items-start gap-4 rounded-xl border border-white/[0.06] bg-[#0a0a0a] px-5 py-4 shadow-lg"
              >
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/40">
                  <CheckIcon className="h-4 w-4" />
                </span>
                <span className="text-gray-200 text-sm md:text-base leading-relaxed pt-0.5">{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="py-24 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">Illustrative earnings</h2>
          <p className="text-gray-400">
            Example list rates and gross monthly estimates at sustained utilization. Actual payouts depend on the rates you set, tier fees,
            and booked hours.
          </p>
        </div>

        <div className="bg-[#0a0a0a] border border-white/[0.06] rounded-2xl p-8 md:p-10 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 rounded-full blur-[50px] -z-10" />

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm md:text-base min-w-[520px]">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  <th className="py-3 pr-4 font-semibold text-white">GPU</th>
                  <th className="py-3 pr-4 font-semibold text-white">Example rate</th>
                  <th className="py-3 font-semibold text-white">Est. monthly gross</th>
                </tr>
              </thead>
              <tbody className="text-gray-300">
                {earningsRows.map((row) => (
                  <tr key={row.gpu} className="border-b border-white/[0.06] last:border-0">
                    <td className="py-4 pr-4 font-medium text-white">{row.gpu}</td>
                    <td className="py-4 pr-4">
                      <span className="text-primary font-bold">{formatInr(row.rate)}</span>
                      <span className="text-gray-500"> / hr</span>
                    </td>
                    <td className="py-4 font-mono text-white">{formatInr(row.monthly)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="mt-6 text-sm text-gray-500">
            Monthly estimate uses {hoursPerDay} hours of bookings per day for {daysPerMonth} days ({monthlyHours} hours). Platform fees follow
            your tier.
          </p>
        </div>
      </section>

      <section className="py-24 bg-[#050505] border-y border-white/[0.06]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Provider types</h2>
            <p className="text-gray-400">
              Individual hosts and enterprise fleets use the same marketplace primitives: verified listings, optional GPU slicing, and
              contract-backed rentals.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-[#0a0a0a] border border-white/[0.06] p-10 rounded-2xl shadow-2xl hover:border-primary/50 transition-colors">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center border border-blue-500/30">
                  <svg className="w-6 h-6 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                    />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-white">Individual providers</h3>
              </div>
              <p className="text-gray-400 mb-8 leading-relaxed">
                Offer workstations or small servers with dedicated GPUs. Install the agent, pass verification, and publish rates and
                availability. Pause or withdraw offers when you need the hardware locally.
              </p>
              <ul className="space-y-4 text-sm text-gray-300">
                <li className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/40">
                    <CheckIcon className="h-3 w-3" />
                  </span>
                  Streamlined agent installation
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/40">
                    <CheckIcon className="h-3 w-3" />
                  </span>
                  Workloads isolated from your host environment
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/40">
                    <CheckIcon className="h-3 w-3" />
                  </span>
                  Control when the machine is available for rent
                </li>
              </ul>
            </div>

            <div className="bg-[#0a0a0a] border border-white/[0.06] p-10 rounded-2xl shadow-2xl hover:border-primary/50 transition-colors">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center border border-purple-500/30">
                  <svg className="w-6 h-6 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01"
                    />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-white">Enterprise / datacenter</h3>
              </div>
              <p className="text-gray-400 mb-8 leading-relaxed">
                Deploy the worker stack on GPU clusters and co-located infrastructure. Register multi-GPU nodes, tune offers for duration and
                interruptible pricing, and serve multiple concurrent renters per machine with slicing where configured.
              </p>
              <ul className="space-y-4 text-sm text-gray-300">
                <li className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/40">
                    <CheckIcon className="h-3 w-3" />
                  </span>
                  Native Linux deployment paths
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/40">
                    <CheckIcon className="h-3 w-3" />
                  </span>
                  Multi-GPU topologies including PCIe and NVLink
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/40">
                    <CheckIcon className="h-3 w-3" />
                  </span>
                  SLA-oriented options for high-uptime fleets
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="py-24 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="text-3xl font-bold mb-6">Security and isolation</h2>
        <p className="text-gray-400 mb-12 max-w-2xl mx-auto">
          Renters receive only the resources and network scope defined in their contract. Isolation holds when multiple tenants share GPUs on
          the same host.
        </p>

        <div className="grid sm:grid-cols-3 gap-6 text-left">
          <div className="bg-[#0a0a0a] border border-white/[0.06] p-8 rounded-2xl shadow-xl hover:border-white/20 transition-colors">
            <h4 className="font-bold text-white mb-4 text-lg">Container isolation</h4>
            <p className="text-sm text-gray-400 leading-relaxed">
              Workloads run inside containers with GPU access via the NVIDIA Container Toolkit. Renters do not receive privileged access to
              the host operating system.
            </p>
          </div>
          <div className="bg-[#0a0a0a] border border-white/[0.06] p-8 rounded-2xl shadow-xl hover:border-white/20 transition-colors">
            <h4 className="font-bold text-white mb-4 text-lg">Secure connectivity</h4>
            <p className="text-sm text-gray-400 leading-relaxed">
              Session traffic uses managed secure tunnels so renters cannot browse or enumerate your local area network.
            </p>
          </div>
          <div className="bg-[#0a0a0a] border border-white/[0.06] p-8 rounded-2xl shadow-xl hover:border-white/20 transition-colors">
            <h4 className="font-bold text-white mb-4 text-lg">Scoped storage</h4>
            <p className="text-sm text-gray-400 leading-relaxed">
              Renter storage is limited to provisioned volumes. Host filesystems and unassigned volumes remain outside renter reach.
            </p>
          </div>
        </div>

        <div className="mt-16 flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/host/setup"
            className="bg-primary hover:bg-primary-dark text-black font-bold py-3 px-8 rounded-lg text-lg transition-all shadow-[0_0_20px_rgba(0,255,136,0.3)] hover:shadow-[0_0_30px_rgba(0,255,136,0.5)] text-center"
          >
            Start Providing
          </Link>
          <Link
            href="/host/datacenter-apply"
            className="bg-[#0a0a0a] hover:bg-white/[0.08] border border-white/[0.06] text-white font-medium py-3 px-8 rounded-lg text-lg transition-all text-center"
          >
            Apply for Enterprise
          </Link>
        </div>
      </section>

      {/* REFERRAL */}
      <section className="py-12 border-t border-white/[0.06]">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-gray-300 text-sm md:text-base">
            <span className="font-semibold text-white">Know other providers?</span>{' '}
            Refer them and earn bonus credits when they list hardware.{' '}
            <Link href="/invite" className="text-primary font-medium hover:underline">
              Get your referral link →
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
