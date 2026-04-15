'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import dynamic from 'next/dynamic';
const HeroTerminal = dynamic(() => import('./components/HeroTerminal'), { ssr: false, loading: () => <div className="h-[300px] bg-black/50 rounded-2xl border border-white/5 animate-pulse" /> });

const PRICE_TABLE = [
  { gpu: 'RTX 4090 24GB', velocity: '$0.55', aws: '—', gcp: '—', savings: '—' },
  { gpu: 'A100 80GB', velocity: '$1.20', aws: '$2.80', gcp: '$3.20', savings: '57%' },
  { gpu: 'H100 SXM5', velocity: '$2.50', aws: '$5.10', gcp: '$5.90', savings: '51%' },
  { gpu: 'L40S 48GB', velocity: '$0.80', aws: '$2.10', gcp: '—', savings: '62%' },
  { gpu: 'A6000 48GB', velocity: '$0.70', aws: '$1.85', gcp: '—', savings: '62%' },
];

const USE_CASES = [
  { title: 'Fine-tune an LLM', cmd: 'velocity deploy --gpu A100 --template transformers', time: '~2 hrs', cost: '$2.40' },
  { title: 'Generate images with FLUX', cmd: 'velocity deploy --gpu RTX4090 --template flux', time: '~40 min', cost: '$0.37' },
  { title: 'Run batch inference', cmd: 'velocity deploy --gpu H100 --template vllm', time: '~25 min', cost: '$1.05' },
  { title: 'Train a YOLO detector', cmd: 'velocity deploy --gpu A100 --template pytorch', time: '~3 hrs', cost: '$3.60' },
];

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] as const } }
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15
    }
  }
};

export default function Home() {
  return (
    <main className="flex flex-col bg-[#050505] text-white overflow-hidden">

      {/* HERO — renter-first */}
      <section className="relative min-h-[100svh] flex flex-col justify-center px-4 sm:px-6 lg:px-8 py-20 overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] md:w-[1200px] h-[500px] md:h-[700px] bg-primary/[0.04] rounded-full blur-[120px] md:blur-[180px] -z-10 animate-pulse" style={{ animationDuration: '8s' }} />

        <motion.div 
          className="max-w-6xl mx-auto w-full"
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
        >
          <motion.div variants={fadeUp} className="flex justify-center mb-8">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/[0.08] bg-white/[0.03] text-[12px] md:text-[13px] text-gray-400 backdrop-blur-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              Trusted by 2,400+ AI developers and researchers
            </div>
          </motion.div>

          <motion.h1 variants={fadeUp} className="text-center text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-extrabold tracking-tight leading-[1.05] max-w-5xl mx-auto">
            GPUs at 80% off
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-emerald-400 to-cyan-400">cloud pricing.</span>
          </motion.h1>

          <motion.p variants={fadeUp} className="mt-6 text-center text-base sm:text-lg md:text-xl text-gray-400 max-w-2xl mx-auto leading-relaxed">
            Deploy A100s, H100s, and RTX 4090s in seconds.
            Pick a GPU, hit deploy, and start building. Free credits on signup.
          </motion.p>

          <motion.div variants={fadeUp} className="mt-10 flex justify-center gap-4 flex-col sm:flex-row items-center">
            <Link href="/signup" className="w-full sm:w-auto text-center bg-primary hover:bg-primary-dark text-black font-bold py-4 px-8 rounded-lg text-sm transition-all shadow-[0_0_24px_rgba(0,255,136,0.15)] hover:shadow-[0_0_40px_rgba(0,255,136,0.3)] hover:-translate-y-0.5">
              Get Started Free
            </Link>
            <Link href="/console" className="w-full sm:w-auto text-center bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-gray-300 hover:text-white font-medium py-4 px-8 rounded-lg text-sm transition-all hover:-translate-y-0.5">
              See Available GPUs
            </Link>
          </motion.div>

          <motion.div variants={fadeUp} className="mt-16 md:mt-24 max-w-3xl mx-auto relative">
            <div className="absolute -inset-4 bg-gradient-to-b from-primary/10 to-transparent opacity-50 blur-2xl -z-10" />
            <HeroTerminal />
          </motion.div>
        </motion.div>
      </section>

      {/* PRICE COMPARISON — the hook */}
      <section className="min-h-[80svh] flex flex-col justify-center py-24 border-y border-white/[0.04] relative">
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/[0.02] rounded-full blur-[150px] -z-10" />
        <motion.div 
          className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 w-full"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={staggerContainer}
        >
          <motion.h2 variants={fadeUp} className="text-center text-3xl md:text-5xl font-bold mb-4">
            Same GPUs. Fraction of the price.
          </motion.h2>
          <motion.p variants={fadeUp} className="text-center text-gray-400 max-w-2xl mx-auto mb-12 md:text-lg">
            Our marketplace connects you directly to GPU providers. Skip the data center markup and cloud tax entirely.
          </motion.p>

          <motion.div variants={fadeUp} className="bg-[#0a0a0a] border border-white/[0.06] rounded-2xl overflow-x-auto shadow-2xl">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead>
                <tr className="border-b border-white/[0.06] text-xs text-gray-500 uppercase tracking-wider bg-white/[0.02]">
                  <th className="py-5 pl-6 font-medium">GPU</th>
                  <th className="py-5 font-medium"><span className="text-primary">Velocity</span></th>
                  <th className="py-5 font-medium">AWS</th>
                  <th className="py-5 font-medium">Google Cloud</th>
                  <th className="py-5 pr-6 font-medium">You Save</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {PRICE_TABLE.map((row) => (
                  <tr key={row.gpu} className="hover:bg-white/[0.03] transition-colors group">
                    <td className="py-5 pl-6 font-medium text-white group-hover:text-primary transition-colors">{row.gpu}</td>
                    <td className="py-5 font-mono font-bold text-primary text-base">{row.velocity}/hr</td>
                    <td className="py-5 font-mono text-gray-500">{row.aws === '—' ? '—' : `${row.aws}/hr`}</td>
                    <td className="py-5 font-mono text-gray-500">{row.gcp === '—' ? '—' : `${row.gcp}/hr`}</td>
                    <td className="py-5 pr-6">
                      {row.savings !== '—' ? (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-primary/10 text-primary border border-primary/20">{row.savings}</span>
                      ) : (
                        <span className="text-gray-600 text-xs">Exclusive</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="px-6 py-4 border-t border-white/[0.04] text-xs text-gray-500 bg-white/[0.01]">
              Marketplace prices in USD. Billed per minute. Pay with cards, UPI, wire, or crypto.
            </div>
          </motion.div>
        </motion.div>
      </section>

      {/* HOW IT WORKS — 3 steps */}
      <section className="min-h-[80svh] flex flex-col justify-center py-24">
        <motion.div 
          className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 w-full"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={staggerContainer}
        >
          <motion.h2 variants={fadeUp} className="text-center text-3xl md:text-5xl font-bold mb-4">Deploy a GPU in 30 seconds.</motion.h2>
          <motion.p variants={fadeUp} className="text-center text-gray-400 mb-16 max-w-xl mx-auto md:text-lg">Skip the Docker files, SSH configs, and cloud consoles. Just deploy.</motion.p>

          <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
            {[
              { step: '01', title: 'Pick a GPU', desc: 'Browse real-time availability and pricing. Filter by GPU model, VRAM, or price. Choose a pre-built template or bring your own.', code: 'Browse → A100 80GB at $1.20/hr' },
              { step: '02', title: 'Deploy', desc: 'One click or one command. Your instance is live in under 30 seconds with SSH, Jupyter, and VS Code access.', code: 'velocity deploy --gpu A100' },
              { step: '03', title: 'Build', desc: 'Full root access. Pre-installed CUDA, PyTorch, TensorFlow. Stop anytime, billed per minute.', code: 'ssh root@gpu-7x2k.velocity.run' },
            ].map((item, i) => (
              <motion.div 
                key={item.step} 
                variants={fadeUp}
                whileHover={{ y: -5 }}
                className="bg-[#0a0a0a] border border-white/[0.06] rounded-2xl p-6 lg:p-8 hover:border-primary/30 transition-colors group relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -z-10 group-hover:bg-primary/10 transition-colors" />
                <div className="text-primary/40 font-mono text-sm font-bold mb-5">{item.step}</div>
                <h3 className="text-xl font-bold mb-3 text-white">{item.title}</h3>
                <p className="text-sm text-gray-400 leading-relaxed mb-6 flex-1">{item.desc}</p>
                <div className="bg-black/80 border border-white/5 rounded-lg px-4 py-3 font-mono text-[11px] text-gray-400 overflow-x-auto mt-auto">
                  {item.code}
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* REFERRAL BANNER */}
      <section className="py-12 border-y border-white/[0.04]">
        <motion.div 
          className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeUp}
        >
          <div className="bg-gradient-to-r from-primary/[0.08] to-yellow-400/[0.05] border border-primary/20 rounded-2xl p-8 md:p-10 flex flex-col md:flex-row items-center gap-6 md:gap-8 relative overflow-hidden">
            <div className="absolute -right-10 -top-10 w-40 h-40 bg-yellow-400/10 blur-3xl rounded-full pointer-events-none" />
            <div className="text-5xl shrink-0 drop-shadow-lg">🎁</div>
            <div className="flex-1 text-center md:text-left z-10">
              <h3 className="text-2xl font-bold mb-2 text-white">Invite a friend. Both get 1 free GPU hour.</h3>
              <p className="text-gray-400">Share your referral link. When they sign up and rent their first GPU, you both get free compute credits.</p>
            </div>
            <Link href="/invite" className="shrink-0 bg-primary hover:bg-primary-dark text-black font-bold py-3 px-8 rounded-lg text-sm transition-all whitespace-nowrap shadow-[0_0_20px_rgba(0,255,136,0.2)] hover:-translate-y-0.5 z-10">
              Get Your Link →
            </Link>
          </div>
        </motion.div>
      </section>

      {/* USE CASES */}
      <section className="min-h-[80svh] flex flex-col justify-center py-24 relative">
        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-500/[0.02] rounded-full blur-[150px] -z-10" />
        <motion.div 
          className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 w-full"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={staggerContainer}
        >
          <motion.h2 variants={fadeUp} className="text-center text-3xl md:text-5xl font-bold mb-4">
            Works for any GPU workload.
          </motion.h2>
          <motion.p variants={fadeUp} className="text-center text-gray-400 mb-16 md:text-lg">
            If it runs on a GPU, it runs on Velocity. See how much you save.
          </motion.p>

          <div className="space-y-4">
            {USE_CASES.map((example) => (
              <motion.div 
                key={example.title} 
                variants={fadeUp}
                whileHover={{ scale: 1.01 }}
                className="bg-[#0a0a0a] border border-white/[0.06] rounded-xl p-5 md:p-6 flex flex-col md:flex-row md:items-center gap-4 hover:border-white/10 transition-colors cursor-default"
              >
                <div className="flex-1">
                  <div className="text-base font-medium text-white mb-2">{example.title}</div>
                  <div className="font-mono text-xs text-gray-400 bg-black/60 border border-white/5 rounded-lg px-3 py-2.5 overflow-x-auto">
                    <span className="text-primary/50">$ </span>{example.cmd}
                  </div>
                </div>
                <div className="flex gap-8 shrink-0 bg-white/[0.02] rounded-lg p-3 border border-white/[0.02]">
                  <div className="text-center">
                    <div className="text-[11px] text-gray-500 uppercase tracking-wider mb-1 font-semibold">Time</div>
                    <div className="text-sm font-mono text-gray-300">{example.time}</div>
                  </div>
                  <div className="w-px bg-white/10" />
                  <div className="text-center">
                    <div className="text-[11px] text-gray-500 uppercase tracking-wider mb-1 font-semibold">Cost</div>
                    <div className="text-sm font-mono font-bold text-primary">{example.cost}</div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* TRUST — brief */}
      <section className="py-24 border-y border-white/[0.04] bg-black/50">
        <motion.div 
          className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={staggerContainer}
        >
          <motion.h2 variants={fadeUp} className="text-center text-3xl md:text-4xl font-bold mb-4">Secure by default.</motion.h2>
          <motion.p variants={fadeUp} className="text-center text-gray-400 max-w-2xl mx-auto mb-16 md:text-lg">
            Every instance runs in an isolated container. Your code, data, and model weights are yours alone.
          </motion.p>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            {[
              { title: 'Isolated containers', desc: 'Sandboxed Docker with nvidia-container-toolkit. Zero host access.' },
              { title: 'Encrypted transfers', desc: 'TLS 1.3 end-to-end. Your data stays private in transit.' },
              { title: 'Per-minute billing', desc: 'Stop anytime. Pay only for the minutes you actually use.' },
              { title: 'Auto-refund', desc: 'If a provider goes offline, automatic refund + migration.' },
            ].map((f) => (
              <motion.div 
                key={f.title} 
                variants={fadeUp}
                className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-6 hover:border-primary/30 transition-colors group"
              >
                <div className="w-10 h-10 rounded-lg bg-white/[0.04] group-hover:bg-primary/10 group-hover:text-primary flex items-center justify-center text-gray-400 mb-4 transition-colors">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                </div>
                <h3 className="font-bold text-white text-base mb-2">{f.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* FOR PROVIDERS — compact teaser */}
      <section className="py-24">
        <motion.div 
          className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeUp}
        >
          <div className="text-center mb-12">
            <div className="text-[11px] tracking-[3px] uppercase text-gray-600 font-semibold mb-4">THE NEW ASSET CLASS</div>
            <h2 className="text-3xl md:text-5xl font-bold mb-4 text-white">Compute generates yield.</h2>
            <p className="text-gray-400 max-w-lg mx-auto md:text-lg">
              Your GPU earns revenue 24/7 on the Velocity marketplace. Top providers net $800+/mo per card.
            </p>
          </div>

          <div className="flex justify-center gap-4 mb-10 overflow-x-auto pb-2">
            {[
              { gpu: 'RTX 4090', rate: '$0.55/hr', yield: '$231/mo' },
              { gpu: 'A100 80GB', rate: '$1.20/hr', yield: '$504/mo' },
              { gpu: 'H100 SXM5', rate: '$2.50/hr', yield: '$1,050/mo' },
            ].map((item) => (
              <div key={item.gpu} className="flex-none bg-[#0a0a0a] border border-white/[0.06] rounded-xl p-5 text-center hover:border-primary/30 transition-colors min-w-[160px]">
                <div className="text-[11px] text-gray-500 mb-1.5 font-medium">{item.gpu}</div>
                <div className="text-lg font-bold text-primary">{item.rate}</div>
                <div className="text-[10px] text-gray-600 mt-1">{item.yield} yield</div>
              </div>
            ))}
          </div>

          <div className="text-center">
            <Link href="/host" className="inline-flex items-center gap-2 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-gray-300 hover:text-white font-semibold py-3.5 px-8 rounded-lg text-sm transition-all hover:-translate-y-0.5">
              See the Full Investment Case &rarr;
            </Link>
          </div>
        </motion.div>
      </section>

      {/* FINAL CTA */}
      <section className="min-h-[60svh] flex flex-col justify-center py-24 border-t border-white/[0.04] relative overflow-hidden">
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-primary/[0.03] rounded-full blur-[150px] -z-10" />
        <motion.div 
          className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center w-full"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={staggerContainer}
        >
          <motion.h2 variants={fadeUp} className="text-4xl md:text-6xl font-extrabold mb-6 leading-tight">
            Stop overpaying for GPUs.
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-emerald-400 to-cyan-400">Start for free.</span>
          </motion.h2>
          <motion.p variants={fadeUp} className="text-gray-400 mb-10 text-lg md:text-xl max-w-2xl mx-auto leading-relaxed">
            Free credits on signup. Deploy your first GPU in under a minute.
          </motion.p>

          <motion.div variants={fadeUp} className="flex flex-col sm:flex-row justify-center gap-4 mb-8">
            <Link href="/signup" className="bg-primary hover:bg-primary-dark text-black font-bold py-4 px-10 rounded-lg text-base transition-all shadow-[0_0_30px_rgba(0,255,136,0.15)] hover:shadow-[0_0_50px_rgba(0,255,136,0.3)] hover:-translate-y-0.5">
              Get Started Free
            </Link>
            <Link href="/console" className="bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-gray-300 hover:text-white font-medium py-4 px-10 rounded-lg text-base transition-all hover:-translate-y-0.5">
              Browse GPUs
            </Link>
          </motion.div>

          <motion.p variants={fadeUp} className="text-sm text-gray-600 font-medium">
            Pay with cards, UPI, wire, or crypto · Per-minute billing · Cancel anytime
          </motion.p>
        </motion.div>
      </section>

    </main>
  );
}
