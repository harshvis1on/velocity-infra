import React from 'react';
import Link from 'next/link';
import HeroTerminal from './components/HeroTerminal';

const PRICE_TABLE = [
  { gpu: 'RTX 4090 24GB', velocity: '₹65', aws: '—', gcp: '—', savings: '—' },
  { gpu: 'A100 80GB', velocity: '₹150', aws: '₹330', gcp: '₹380', savings: '55%' },
  { gpu: 'H100 SXM5', velocity: '₹280', aws: '₹600', gcp: '₹700', savings: '53%' },
  { gpu: 'L40S 48GB', velocity: '₹95', aws: '₹250', gcp: '—', savings: '62%' },
  { gpu: 'A6000 48GB', velocity: '₹90', aws: '₹220', gcp: '—', savings: '59%' },
];

const USE_CASES = [
  { title: 'Fine-tune an LLM', cmd: 'velocity deploy --gpu A100 --template transformers', time: '~2 hrs', cost: '₹300' },
  { title: 'Generate images with FLUX', cmd: 'velocity deploy --gpu RTX4090 --template flux', time: '~40 min', cost: '₹40' },
  { title: 'Run batch inference', cmd: 'velocity deploy --gpu H100 --template vllm', time: '~25 min', cost: '₹120' },
  { title: 'Train a YOLO detector', cmd: 'velocity deploy --gpu A100 --template pytorch', time: '~3 hrs', cost: '₹450' },
];

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col bg-[#050505] text-white">

      {/* HERO — renter-first */}
      <section className="relative px-4 sm:px-6 lg:px-8 pt-16 pb-24 md:pt-24 md:pb-32 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1200px] h-[700px] bg-primary/[0.03] rounded-full blur-[180px] -z-10" />

        <div className="max-w-6xl mx-auto">
          <div className="flex justify-center mb-8">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/[0.08] bg-white/[0.03] text-[13px] text-gray-400">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              Trusted by 2,400+ AI developers and researchers
            </div>
          </div>

          <h1 className="text-center text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.08] max-w-5xl mx-auto">
            GPUs at 80% off
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-emerald-400 to-cyan-400">cloud pricing.</span>
          </h1>

          <p className="mt-6 text-center text-lg md:text-xl text-gray-400 max-w-2xl mx-auto leading-relaxed">
            Deploy A100s, H100s, and RTX 4090s in seconds. No setup, no DevOps, no surprise bills.
            Start with free credits — no credit card required.
          </p>

          <div className="mt-10 flex justify-center gap-3 flex-wrap">
            <Link href="/signup" className="bg-primary hover:bg-primary-dark text-black font-bold py-3.5 px-8 rounded-lg text-sm transition-all shadow-[0_0_24px_rgba(0,255,136,0.15)] hover:shadow-[0_0_40px_rgba(0,255,136,0.3)]">
              Get Started Free
            </Link>
            <Link href="/console" className="bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-gray-300 hover:text-white font-medium py-3.5 px-8 rounded-lg text-sm transition-all">
              See Available GPUs
            </Link>
          </div>

          <div className="mt-16 max-w-3xl mx-auto">
            <HeroTerminal />
          </div>
        </div>
      </section>

      {/* PRICE COMPARISON — the hook */}
      <section className="py-24 border-y border-white/[0.04]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-center text-3xl md:text-4xl font-bold mb-4">
            Same GPUs. Fraction of the price.
          </h2>
          <p className="text-center text-gray-500 max-w-2xl mx-auto mb-12">
            Our marketplace connects you directly to GPU providers — no data centre markup, no cloud tax.
          </p>

          <div className="bg-[#0a0a0a] border border-white/[0.06] rounded-2xl overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-white/[0.06] text-xs text-gray-600 uppercase tracking-wider">
                  <th className="py-4 pl-6 font-medium">GPU</th>
                  <th className="py-4 font-medium"><span className="text-primary">Velocity</span></th>
                  <th className="py-4 font-medium">AWS</th>
                  <th className="py-4 font-medium">Google Cloud</th>
                  <th className="py-4 pr-6 font-medium">You Save</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {PRICE_TABLE.map((row) => (
                  <tr key={row.gpu} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-4 pl-6 font-medium text-white">{row.gpu}</td>
                    <td className="py-4 font-mono font-bold text-primary">{row.velocity}/hr</td>
                    <td className="py-4 font-mono text-gray-500">{row.aws === '—' ? '—' : `${row.aws}/hr`}</td>
                    <td className="py-4 font-mono text-gray-500">{row.gcp === '—' ? '—' : `${row.gcp}/hr`}</td>
                    <td className="py-4 pr-6">
                      {row.savings !== '—' ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-primary/10 text-primary">{row.savings}</span>
                      ) : (
                        <span className="text-gray-600 text-xs">Exclusive</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="px-6 py-3 border-t border-white/[0.04] text-xs text-gray-600">
              Marketplace prices. Billed per minute. Pay with UPI, cards, wire, or crypto.
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS — 3 steps */}
      <section className="py-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-center text-3xl md:text-4xl font-bold mb-4">Deploy a GPU in 30 seconds.</h2>
          <p className="text-center text-gray-500 mb-16 max-w-lg mx-auto">No Docker. No SSH config. No cloud console. No instance management.</p>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              { step: '01', title: 'Pick a GPU', desc: 'Browse real-time availability and pricing. Filter by GPU model, VRAM, or price. Choose a pre-built template or bring your own.', code: 'Browse → A100 80GB at ₹150/hr' },
              { step: '02', title: 'Deploy', desc: 'One click or one command. Your instance is live in under 30 seconds with SSH, Jupyter, and VS Code access.', code: 'velocity deploy --gpu A100' },
              { step: '03', title: 'Build', desc: 'Full root access. Pre-installed CUDA, PyTorch, TensorFlow. Stop anytime — billed per minute.', code: 'ssh root@gpu-7x2k.velocity.run' },
            ].map((item) => (
              <div key={item.step} className="bg-[#0a0a0a] border border-white/[0.06] rounded-2xl p-6">
                <div className="text-primary/30 font-mono text-xs font-bold mb-4">{item.step}</div>
                <h3 className="text-lg font-bold mb-3">{item.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed mb-4">{item.desc}</p>
                <div className="bg-black/60 rounded-lg px-3 py-2 font-mono text-[11px] text-gray-400 overflow-x-auto">
                  {item.code}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* REFERRAL BANNER */}
      <section className="py-12 border-y border-white/[0.04]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-gradient-to-r from-primary/[0.06] to-yellow-400/[0.04] border border-primary/20 rounded-2xl p-8 flex flex-col md:flex-row items-center gap-6">
            <div className="text-4xl shrink-0">🎁</div>
            <div className="flex-1 text-center md:text-left">
              <h3 className="text-xl font-bold mb-1">Invite a friend. Both get 1 free GPU hour.</h3>
              <p className="text-sm text-gray-400">Share your referral link. When they sign up and rent their first GPU, you both get free compute credits.</p>
            </div>
            <Link href="/invite" className="shrink-0 bg-primary hover:bg-primary-dark text-black font-bold py-2.5 px-6 rounded-lg text-sm transition-all whitespace-nowrap">
              Get Your Link →
            </Link>
          </div>
        </div>
      </section>

      {/* USE CASES */}
      <section className="py-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-center text-3xl md:text-4xl font-bold mb-4">
            Works for any GPU workload.
          </h2>
          <p className="text-center text-gray-500 mb-16">
            If it runs on a GPU, it runs on Velocity. See how much you save.
          </p>

          <div className="space-y-4">
            {USE_CASES.map((example) => (
              <div key={example.title} className="bg-[#0a0a0a] border border-white/[0.06] rounded-xl p-5 flex flex-col md:flex-row md:items-center gap-4">
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-300 mb-2">{example.title}</div>
                  <div className="font-mono text-xs text-gray-500 bg-black/40 rounded-lg px-3 py-2 overflow-x-auto">
                    <span className="text-primary/50">$ </span>{example.cmd}
                  </div>
                </div>
                <div className="flex gap-6 md:gap-8 shrink-0">
                  <div className="text-center">
                    <div className="text-xs text-gray-600 mb-1">Time</div>
                    <div className="text-sm font-mono text-gray-300">{example.time}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-gray-600 mb-1">Cost</div>
                    <div className="text-sm font-mono font-bold text-primary">{example.cost}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TRUST — brief */}
      <section className="py-24 border-y border-white/[0.04]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-center text-3xl md:text-4xl font-bold mb-4">Secure by default.</h2>
          <p className="text-center text-gray-500 max-w-2xl mx-auto mb-16">
            Every instance runs in an isolated container. Your code, data, and model weights are yours alone.
          </p>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { title: 'Isolated containers', desc: 'Sandboxed Docker with nvidia-container-toolkit. Zero host access.' },
              { title: 'Encrypted transfers', desc: 'TLS 1.3 end-to-end. Your data stays private in transit.' },
              { title: 'Per-minute billing', desc: 'Stop anytime. No lock-in, no surprise bills, no minimums.' },
              { title: 'Auto-refund', desc: 'If a provider goes offline, automatic refund + migration.' },
            ].map((f) => (
              <div key={f.title} className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-5 hover:border-primary/20 transition-colors">
                <div className="w-8 h-8 rounded-lg bg-white/[0.04] flex items-center justify-center text-gray-400 mb-3">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                </div>
                <h3 className="font-bold text-white text-sm mb-1">{f.title}</h3>
                <p className="text-[11px] text-gray-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FOR PROVIDERS — secondary */}
      <section className="py-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-[#0a0a0a] border border-white/[0.06] rounded-2xl p-8 md:p-12 flex flex-col md:flex-row gap-8 items-center relative overflow-hidden">
            <div className="absolute top-0 right-0 w-60 h-60 bg-primary/[0.03] rounded-full blur-[100px]" />
            <div className="relative flex-1">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/[0.08] bg-white/[0.03] text-[11px] text-gray-500 mb-5">
                FOR PROVIDERS
              </div>
              <h2 className="text-2xl md:text-3xl font-bold mb-3">
                Have GPUs? Earn revenue.
              </h2>
              <p className="text-gray-400 text-sm leading-relaxed mb-4">
                List your hardware on the Velocity marketplace and earn automatically.
                Level up through Bronze to Diamond tier for lower platform fees and higher earnings.
                Workstations, servers, and datacentres welcome.
              </p>
              <div className="flex items-center gap-3 text-xs text-gray-500 mb-6">
                <span className="flex items-center gap-1">🥉 15% fee</span>
                <span className="text-white/10">→</span>
                <span className="flex items-center gap-1">🥈 12%</span>
                <span className="text-white/10">→</span>
                <span className="flex items-center gap-1">🥇 10%</span>
                <span className="text-white/10">→</span>
                <span className="flex items-center gap-1">💎 7%</span>
                <span className="text-white/10">→</span>
                <span className="flex items-center gap-1">👑 5%</span>
              </div>
              <Link href="/host" className="inline-flex bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.1] text-white font-bold py-2.5 px-6 rounded-lg text-sm transition-all">
                Start Earning →
              </Link>
            </div>
            <div className="shrink-0 grid grid-cols-2 gap-3">
              {[
                { label: 'RTX 4090', earn: '₹28K+/mo' },
                { label: 'A100 80GB', earn: '₹65K+/mo' },
                { label: 'H100 SXM5', earn: '₹1.2L+/mo' },
                { label: 'A6000 48GB', earn: '₹39K+/mo' },
              ].map((item) => (
                <div key={item.label} className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-3 text-center">
                  <div className="text-[10px] text-gray-600 mb-0.5">{item.label}</div>
                  <div className="text-sm font-mono font-bold text-primary">{item.earn}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="py-32 border-t border-white/[0.04]">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-5xl font-bold mb-6 leading-tight">
            Stop overpaying for GPUs.
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-emerald-400 to-cyan-400">Start for free.</span>
          </h2>
          <p className="text-gray-400 mb-10 text-lg max-w-2xl mx-auto leading-relaxed">
            Free credits on signup. No credit card. Deploy your first GPU in under a minute.
          </p>

          <div className="flex flex-col sm:flex-row justify-center gap-3 mb-6">
            <Link href="/signup" className="bg-primary hover:bg-primary-dark text-black font-bold py-4 px-10 rounded-lg text-base transition-all shadow-[0_0_30px_rgba(0,255,136,0.15)] hover:shadow-[0_0_50px_rgba(0,255,136,0.3)]">
              Get Started Free
            </Link>
            <Link href="/console" className="bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-gray-300 hover:text-white font-medium py-4 px-10 rounded-lg text-base transition-all">
              Browse GPUs
            </Link>
          </div>

          <p className="text-xs text-gray-700">
            Pay with UPI, cards, wire, or crypto · Per-minute billing · No lock-in
          </p>
        </div>
      </section>

    </main>
  );
}
