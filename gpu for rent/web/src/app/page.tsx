'use client';

import React from 'react';
import Link from 'next/link';
import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';
import dynamic from 'next/dynamic';
import { TemplateShowcase } from './components/TemplateShowcase';
import { PriceCalculator } from './components/PriceCalculator';
import { formatUSD } from '@/lib/currency';

const HeroTerminal = dynamic(() => import('./components/HeroTerminal'), {
  ssr: false,
  loading: () => <div className="h-[380px] bg-white/[0.02] rounded-2xl border border-white/[0.06] animate-pulse" />,
});

const PRICE_TABLE = [
  { gpu: 'RTX 4090', vram: '24 GB', velocityNum: 0.55, awsNum: 1.62, gcpNum: null as number | null, savings: '66%' },
  { gpu: 'A100 80GB', vram: '80 GB', velocityNum: 1.20, awsNum: 2.80, gcpNum: 3.20, savings: '57%' },
  { gpu: 'H100 SXM5', vram: '80 GB', velocityNum: 2.50, awsNum: 5.10, gcpNum: 5.90, savings: '51%' },
  { gpu: 'L40S', vram: '48 GB', velocityNum: 0.80, awsNum: 2.10, gcpNum: null as number | null, savings: '62%' },
];

const STEPS = [
  {
    num: '01',
    title: 'Pick a GPU',
    body: 'Real-time availability and pricing. Filter by model, VRAM, or price. Choose a template or bring your own Docker image.',
    code: 'velocity deploy --gpu A100 --template pytorch',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" /></svg>
    ),
  },
  {
    num: '02',
    title: 'Deploy in seconds',
    body: 'One click or one CLI command. SSH, Jupyter, and VS Code access are ready in under 30 seconds. Full root.',
    code: 'ssh root@gpu-7x2k.velocity.run',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5.25 14.25h13.5m-13.5 0a3 3 0 01-3-3m3 3a3 3 0 100 6h13.5a3 3 0 100-6m-16.5-3a3 3 0 013-3h13.5a3 3 0 013 3m-19.5 0a4.5 4.5 0 01.9-2.7L5.737 5.1a3.375 3.375 0 012.7-1.35h7.126c1.062 0 2.062.5 2.7 1.35l2.587 3.45a4.5 4.5 0 01.9 2.7m0 0a3 3 0 01-3 3m0 3h.008v.008h-.008v-.008zm0-6h.008v.008h-.008v-.008zm-3 6h.008v.008h-.008v-.008zm0-6h.008v.008h-.008v-.008z" /></svg>
    ),
  },
  {
    num: '03',
    title: 'Build and iterate',
    body: 'Pre-installed CUDA, PyTorch, TensorFlow. Billed per minute. Stop anytime. Your code and data persist across sessions.',
    code: 'python train.py --epochs 10 --lr 3e-4',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" /></svg>
    ),
  },
];

const TRUST_FEATURES = [
  { title: 'Isolated containers', desc: 'Sandboxed Docker with nvidia-container-toolkit. Zero host access.', icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" /></svg> },
  { title: 'Encrypted transfers', desc: 'TLS 1.3 end-to-end. Data stays private in transit and at rest.', icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" /></svg> },
  { title: 'Per-minute billing', desc: 'Stop anytime. Pay only for the minutes you actually use.', icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> },
  { title: 'Auto-refund guarantee', desc: 'If a provider goes offline, automatic refund and migration.', icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> },
];

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] as const } },
};
const stagger = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.12 } },
};

function Section({ children, className = '', id }: { children: React.ReactNode; className?: string; id?: string }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-80px' });
  return (
    <motion.section
      ref={ref}
      id={id}
      initial="hidden"
      animate={isInView ? 'visible' : 'hidden'}
      variants={stagger}
      className={className}
    >
      {children}
    </motion.section>
  );
}

export default function Home() {
  const STATS = [
    { value: '2,400+', label: 'GPUs online', accent: true },
    { value: '<12s', label: 'Avg deploy time' },
    { value: formatUSD(0.45), label: 'Starting /GPU/hr' },
    { value: '80%', label: 'Cheaper than AWS', accent: true },
  ];

  return (
    <main className="flex flex-col bg-[#0B0F19] text-[#E2E8F0] overflow-hidden">

      {/* ━━━ HERO ━━━ */}
      <section className="relative min-h-[100svh] flex flex-col justify-center px-4 sm:px-6 lg:px-8 pt-24 pb-16 overflow-hidden">
        <div className="absolute top-[20%] left-1/2 -translate-x-1/2 w-[900px] h-[600px] bg-primary/[0.07] rounded-full blur-[160px] -z-10 animate-pulse" style={{ animationDuration: '8s' }} />
        <div className="absolute bottom-[10%] right-[5%] w-[400px] h-[400px] bg-violet-600/[0.05] rounded-full blur-[120px] -z-10" />

        <motion.div className="max-w-6xl mx-auto w-full" variants={stagger} initial="hidden" animate="visible">
          <motion.div variants={fadeUp} className="flex justify-center mb-6">
            <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full border border-white/[0.08] bg-white/[0.03] text-[13px] text-[#94A3B8] backdrop-blur-sm">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
              </span>
              Trusted by 2,400+ AI developers across India
            </div>
          </motion.div>

          <motion.h1 variants={fadeUp} className="text-center text-[clamp(2.5rem,6vw,5.5rem)] font-extrabold tracking-[-0.03em] leading-[1.06] max-w-[900px] mx-auto font-heading">
            The fastest way to
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-violet-400 to-blue-400">deploy GPU compute.</span>
          </motion.h1>

          <motion.p variants={fadeUp} className="mt-6 text-center text-lg md:text-xl text-[#94A3B8] max-w-[600px] mx-auto leading-relaxed">
            A100s, H100s, and RTX 4090s on demand. Up to 80% cheaper than AWS. Billed per minute. Free credits on signup.
          </motion.p>

          <motion.div variants={fadeUp} className="mt-10 flex justify-center gap-4 flex-col sm:flex-row items-center">
            <Link href="/signup" className="w-full sm:w-auto text-center bg-gradient-to-r from-primary-dark to-primary text-white font-semibold py-3.5 px-8 rounded-xl text-[15px] transition-all shadow-glow hover:shadow-glow-lg hover:-translate-y-0.5 active:scale-[0.98]">
              Get Started Free
            </Link>
            <Link href="/console" className="w-full sm:w-auto text-center bg-white/[0.04] hover:bg-white/[0.06] border border-white/[0.08] text-[#94A3B8] hover:text-white font-medium py-3.5 px-8 rounded-xl text-[15px] transition-all hover:-translate-y-0.5">
              Browse Available GPUs
            </Link>
          </motion.div>

          {/* Stats ribbon */}
          <motion.div variants={fadeUp} className="mt-14 grid grid-cols-2 md:grid-cols-4 gap-3 max-w-3xl mx-auto">
            {STATS.map((s) => (
              <div key={s.label} className="text-center px-4 py-4 rounded-xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm">
                <div className={`text-2xl font-bold font-mono tracking-tight ${s.accent ? 'text-primary' : 'text-white'}`}>{s.value}</div>
                <div className="text-[11px] text-[#64748B] uppercase tracking-wider mt-1 font-medium">{s.label}</div>
              </div>
            ))}
          </motion.div>

          {/* Terminal */}
          <motion.div variants={fadeUp} className="mt-16 max-w-3xl mx-auto relative">
            <div className="absolute -inset-6 bg-gradient-to-b from-primary/8 to-transparent blur-2xl -z-10 opacity-60" />
            <HeroTerminal />
          </motion.div>
        </motion.div>
      </section>

      {/* ━━━ PRICE TABLE ━━━ */}
      <Section className="py-24 lg:py-32 border-t border-white/[0.04] relative">
        <div className="absolute left-0 top-1/3 w-[500px] h-[500px] bg-primary/[0.03] rounded-full blur-[150px] -z-10" />
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
          <motion.div variants={fadeUp} className="text-center mb-14">
            <div className="text-[11px] uppercase tracking-[0.25em] text-[#64748B] font-semibold mb-4">Transparent Pricing</div>
            <h2 className="text-3xl md:text-5xl font-bold font-heading mb-4">Same GPUs. Fraction of the price.</h2>
            <p className="text-[#94A3B8] max-w-xl mx-auto text-lg">Our marketplace connects you directly to providers. Skip the data center markup entirely.</p>
          </motion.div>

          <motion.div variants={fadeUp} className="bg-white/[0.02] border border-white/[0.06] rounded-2xl overflow-hidden backdrop-blur-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-white/[0.06] text-[11px] text-[#475569] uppercase tracking-wider">
                    <th className="py-4 pl-6 pr-4 font-medium">GPU</th>
                    <th className="py-4 px-4 font-medium">VRAM</th>
                    <th className="py-4 px-4 font-medium"><span className="text-primary">Velocity</span></th>
                    <th className="py-4 px-4 font-medium">AWS</th>
                    <th className="py-4 px-4 font-medium">GCP</th>
                    <th className="py-4 pl-4 pr-6 font-medium text-right">You Save</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {PRICE_TABLE.map((row) => (
                    <tr key={row.gpu} className="hover:bg-primary/[0.02] transition-colors group">
                      <td className="py-5 pl-6 pr-4">
                        <span className="font-semibold text-white group-hover:text-primary transition-colors">NVIDIA {row.gpu}</span>
                      </td>
                      <td className="py-5 px-4 text-[#94A3B8] font-mono text-xs">{row.vram}</td>
                      <td className="py-5 px-4 font-mono font-bold text-primary text-base">{formatUSD(row.velocityNum, { decimals: 2 })}<span className="text-xs font-normal text-[#475569]">/hr</span></td>
                      <td className="py-5 px-4 font-mono text-[#64748B]">{row.awsNum != null ? `${formatUSD(row.awsNum, { decimals: 2 })}/hr` : '—'}</td>
                      <td className="py-5 px-4 font-mono text-[#64748B]">{row.gcpNum != null ? `${formatUSD(row.gcpNum, { decimals: 2 })}/hr` : '—'}</td>
                      <td className="py-5 pl-4 pr-6 text-right">
                        {row.savings !== '—' ? (
                          <span className="inline-flex items-center px-3 py-1 rounded-lg text-xs font-bold bg-primary/[0.12] text-primary">{row.savings}</span>
                        ) : (
                          <span className="text-[#475569] text-xs">Exclusive</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-6 py-3.5 border-t border-white/[0.04] text-xs text-[#64748B] flex items-center justify-between">
              <span>Billed per minute. Marketplace rates in USD.</span>
              <Link href="/pricing" className="text-primary hover:text-primary-light transition-colors font-medium">See full pricing →</Link>
            </div>
          </motion.div>
        </div>
      </Section>

      {/* ━━━ HOW IT WORKS ━━━ */}
      <Section className="py-24 lg:py-32">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
          <motion.div variants={fadeUp} className="text-center mb-16">
            <div className="text-[11px] uppercase tracking-[0.25em] text-[#64748B] font-semibold mb-4">How It Works</div>
            <h2 className="text-3xl md:text-5xl font-bold font-heading mb-4">Deploy a GPU in 30 seconds.</h2>
            <p className="text-[#94A3B8] max-w-lg mx-auto text-lg">Skip the Docker files, SSH configs, and cloud consoles.</p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-5">
            {STEPS.map((step) => (
              <motion.div
                key={step.num}
                variants={fadeUp}
                whileHover={{ y: -4, borderColor: 'rgba(99,102,241,0.3)' }}
                className="bg-white/[0.025] border border-white/[0.06] rounded-2xl p-7 relative overflow-hidden group transition-all"
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/[0.03] rounded-full blur-3xl -z-10 group-hover:bg-primary/[0.06] transition-colors" />
                <div className="w-10 h-10 rounded-xl bg-primary/[0.08] flex items-center justify-center text-primary mb-5 group-hover:bg-primary/[0.15] transition-colors">
                  {step.icon}
                </div>
                <div className="text-[11px] font-mono text-primary/40 font-bold mb-2 uppercase tracking-wider">Step {step.num}</div>
                <h3 className="text-lg font-bold text-white mb-2">{step.title}</h3>
                <p className="text-sm text-[#94A3B8] leading-relaxed mb-5">{step.body}</p>
                <div className="bg-[#080D16] border border-white/[0.06] rounded-lg px-4 py-2.5 font-mono text-[11px] text-[#64748B] overflow-x-auto">
                  <span className="text-primary/40">$ </span>{step.code}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </Section>

      {/* ━━━ TEMPLATE SHOWCASE ━━━ */}
      <Section className="py-24 lg:py-32 border-t border-white/[0.04]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div variants={fadeUp} className="text-center mb-14">
            <div className="text-[11px] uppercase tracking-[0.25em] text-[#64748B] font-semibold mb-4">One-Click Templates</div>
            <h2 className="text-3xl md:text-5xl font-bold font-heading mb-4">Deploy popular AI stacks instantly.</h2>
            <p className="text-[#94A3B8] max-w-lg mx-auto text-lg">Pre-configured templates for the most popular frameworks. Boot in under 30 seconds.</p>
          </motion.div>
          <motion.div variants={fadeUp}>
            <TemplateShowcase />
          </motion.div>
        </div>
      </Section>

      {/* ━━━ PRICE CALCULATOR ━━━ */}
      <Section className="py-24 lg:py-32 border-t border-white/[0.04] relative">
        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-violet-500/[0.03] rounded-full blur-[150px] -z-10" />
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div variants={fadeUp} className="text-center mb-14">
            <div className="text-[11px] uppercase tracking-[0.25em] text-[#64748B] font-semibold mb-4">Cost Comparison</div>
            <h2 className="text-3xl md:text-5xl font-bold font-heading mb-4">See how much you save.</h2>
            <p className="text-[#94A3B8] max-w-lg mx-auto text-lg">Interactive pricing comparison against AWS, GCP, and Azure.</p>
          </motion.div>
          <motion.div variants={fadeUp}>
            <PriceCalculator />
          </motion.div>
        </div>
      </Section>

      {/* ━━━ TRUST ━━━ */}
      <Section className="py-24 lg:py-32 border-t border-white/[0.04] bg-[#080D16]/40">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div variants={fadeUp} className="text-center mb-14">
            <div className="text-[11px] uppercase tracking-[0.25em] text-[#64748B] font-semibold mb-4">Enterprise Ready</div>
            <h2 className="text-3xl md:text-4xl font-bold font-heading mb-4">Secure by default.</h2>
            <p className="text-[#94A3B8] max-w-xl mx-auto text-lg">Every instance runs in an isolated container. Your code, data, and model weights are yours alone.</p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {TRUST_FEATURES.map((f) => (
              <motion.div
                key={f.title}
                variants={fadeUp}
                whileHover={{ borderColor: 'rgba(99,102,241,0.25)' }}
                className="bg-white/[0.025] border border-white/[0.06] rounded-2xl p-6 group transition-all"
              >
                <div className="w-10 h-10 rounded-xl bg-white/[0.04] group-hover:bg-primary/[0.1] group-hover:text-primary flex items-center justify-center text-[#64748B] mb-4 transition-colors">
                  {f.icon}
                </div>
                <h3 className="font-bold text-white text-[15px] mb-2">{f.title}</h3>
                <p className="text-sm text-[#64748B] leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </Section>

      {/* ━━━ REFERRAL ━━━ */}
      <Section className="py-14 border-t border-white/[0.04]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div variants={fadeUp}>
            <div className="bg-gradient-to-r from-primary/[0.06] via-violet-500/[0.04] to-amber-400/[0.04] border border-primary/15 rounded-2xl p-8 md:p-10 flex flex-col md:flex-row items-center gap-6 md:gap-10 relative overflow-hidden">
              <div className="absolute -right-10 -top-10 w-40 h-40 bg-amber-400/8 blur-3xl rounded-full pointer-events-none" />
              <div className="text-5xl shrink-0">🎁</div>
              <div className="flex-1 text-center md:text-left z-10">
                <h3 className="text-xl md:text-2xl font-bold mb-2 text-white font-heading">Invite a friend. Both get 1 free GPU hour.</h3>
                <p className="text-[#94A3B8] text-sm md:text-base">Share your referral link. When they sign up and rent their first GPU, you both get free compute credits.</p>
              </div>
              <Link href="/invite" className="shrink-0 bg-gradient-to-r from-primary-dark to-primary text-white font-semibold py-3 px-7 rounded-xl text-sm transition-all shadow-glow hover:shadow-glow-lg hover:-translate-y-0.5 z-10 whitespace-nowrap">
                Get Your Link →
              </Link>
            </div>
          </motion.div>
        </div>
      </Section>

      {/* ━━━ FOR PROVIDERS ━━━ */}
      <Section className="py-24 lg:py-32 border-t border-white/[0.04]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div variants={fadeUp} className="text-center mb-14">
            <div className="text-[11px] uppercase tracking-[0.25em] text-[#64748B] font-semibold mb-4">For GPU Owners</div>
            <h2 className="text-3xl md:text-5xl font-bold font-heading mb-4 text-white">Your hardware generates yield.</h2>
            <p className="text-[#94A3B8] max-w-lg mx-auto text-lg">GPU owners earn revenue 24/7 on the Velocity marketplace. Top providers net {formatUSD(800, { decimals: 0, compact: true })}+/month per card.</p>
          </motion.div>

          <motion.div variants={fadeUp} className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
            {[
              { gpu: 'RTX 4090', rateNum: 0.55, monthlyNum: 231, roi: '173%' },
              { gpu: 'A100 80GB', rateNum: 1.20, monthlyNum: 504, roi: '40%' },
              { gpu: 'H100 SXM5', rateNum: 2.50, monthlyNum: 1050, roi: '42%' },
            ].map((item) => (
              <div key={item.gpu} className="bg-white/[0.025] border border-white/[0.06] rounded-2xl p-6 text-center hover:border-primary/25 transition-all group">
                <div className="text-[11px] text-[#64748B] uppercase tracking-wider font-medium mb-1">{item.gpu}</div>
                <div className="text-2xl font-bold text-primary font-mono mb-1">{formatUSD(item.rateNum, { decimals: 2, suffix: '/hr' })}</div>
                <div className="text-sm text-white font-semibold">{formatUSD(item.monthlyNum, { decimals: 0, suffix: '/mo' })}</div>
                <div className="text-[11px] text-[#475569] mt-2">Annual ROI: {item.roi}</div>
              </div>
            ))}
          </motion.div>

          <motion.div variants={fadeUp} className="text-center">
            <Link href="/host" className="inline-flex items-center gap-2 bg-white/[0.04] hover:bg-white/[0.06] border border-white/[0.08] text-[#94A3B8] hover:text-white font-semibold py-3.5 px-8 rounded-xl text-sm transition-all hover:-translate-y-0.5">
              See the Full Investment Case →
            </Link>
          </motion.div>
        </div>
      </Section>

      {/* ━━━ FINAL CTA ━━━ */}
      <section className="min-h-[60svh] flex flex-col justify-center py-24 lg:py-32 border-t border-white/[0.04] relative overflow-hidden">
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-primary/[0.05] rounded-full blur-[150px] -z-10" />
        <div className="absolute top-[15%] left-[15%] w-[300px] h-[300px] bg-violet-600/[0.04] rounded-full blur-[100px] -z-10" />

        <motion.div
          className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center w-full"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={stagger}
        >
          <motion.h2 variants={fadeUp} className="text-4xl md:text-6xl font-extrabold mb-6 leading-[1.08] font-heading tracking-tight">
            Stop overpaying
            <br />
            for GPUs.
          </motion.h2>
          <motion.p variants={fadeUp} className="text-[#94A3B8] mb-10 text-lg md:text-xl max-w-xl mx-auto leading-relaxed">
            Free credits on signup. Deploy your first GPU in under a minute. Pay only for what you use.
          </motion.p>

          <motion.div variants={fadeUp} className="flex flex-col sm:flex-row justify-center gap-4 mb-8">
            <Link href="/signup" className="bg-gradient-to-r from-primary-dark to-primary text-white font-bold py-4 px-10 rounded-xl text-base transition-all shadow-glow hover:shadow-glow-lg hover:-translate-y-0.5 active:scale-[0.98]">
              Get Started Free
            </Link>
            <Link href="/console" className="bg-white/[0.04] hover:bg-white/[0.06] border border-white/[0.08] text-[#94A3B8] hover:text-white font-medium py-4 px-10 rounded-xl text-base transition-all hover:-translate-y-0.5">
              Browse GPUs
            </Link>
          </motion.div>

          <motion.div variants={fadeUp} className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-[#475569]">
            <span className="flex items-center gap-1.5"><span className="w-1 h-1 rounded-full bg-primary/50" />Cards, UPI, wire, crypto</span>
            <span className="flex items-center gap-1.5"><span className="w-1 h-1 rounded-full bg-primary/50" />Per-minute billing</span>
            <span className="flex items-center gap-1.5"><span className="w-1 h-1 rounded-full bg-primary/50" />Cancel anytime</span>
          </motion.div>
        </motion.div>
      </section>

    </main>
  );
}
