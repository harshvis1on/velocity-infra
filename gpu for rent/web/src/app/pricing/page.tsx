'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { formatUSD } from '@/lib/currency';

const HOURS_PER_MONTH = 730;

function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, visible };
}

const GPU_DATA = [
  { model: 'H200 SXM', badge: 'H200', vram: '141 GB', tflops: '3,958', bestFor: 'Massive LLM Training', hourly: 4.50, gradient: 'from-indigo-400 to-violet-600', tier: 'flagship' },
  { model: 'H100 SXM5', badge: 'H100', vram: '80 GB', tflops: '1,979', bestFor: 'LLM Pre-training', hourly: 2.50, gradient: 'from-indigo-500 to-violet-700' },
  { model: 'A100 80GB', badge: 'A100', vram: '80 GB', tflops: '312', bestFor: 'Fine-tuning & Inference', hourly: 1.20, gradient: 'from-indigo-600 to-violet-800' },
  { model: 'RTX 6000 Ada', badge: '6000', vram: '48 GB', tflops: '91.1', bestFor: 'Pro Rendering', hourly: 0.95, gradient: 'from-slate-500 to-slate-700' },
  { model: 'L40S', badge: 'L40S', vram: '48 GB', tflops: '362', bestFor: 'Generative AI & 3D', hourly: 0.80, gradient: 'from-indigo-500 to-indigo-700' },
  { model: 'RTX 4090', badge: '4090', vram: '24 GB', tflops: '330', bestFor: 'Diffusion, Isaac Sim', hourly: 0.55, gradient: 'from-slate-600 to-slate-800', popular: true },
  { model: 'RTX 3090', badge: '3090', vram: '24 GB', tflops: '142', bestFor: 'Prototyping & LoRA', hourly: 0.35, gradient: 'from-slate-600 to-slate-800' },
  { model: 'L4', badge: 'L4', vram: '24 GB', tflops: '120', bestFor: 'Video & Audio AI', hourly: 0.30, gradient: 'from-indigo-600 to-indigo-800' },
];

const CPU_DATA = [
  { model: 'AMD EPYC 9654', badge: 'EPYC', cores: '96 / 192', ram: '768 GB', bestFor: 'Data Processing', hourly: 1.40, gradient: 'from-orange-500 to-red-700' },
  { model: 'Threadripper PRO', badge: 'TR', cores: '64 / 128', ram: '256 GB', bestFor: 'Compiling & Rendering', hourly: 0.75, gradient: 'from-orange-600 to-red-800' },
];

export default function PricingPage() {
  const [billing, setBilling] = useState<'hourly' | 'monthly'>('hourly');

  const hero = useInView(0.1);
  const gpuTable = useInView(0.1);
  const extras = useInView(0.1);
  const comparison = useInView(0.1);
  const faq = useInView(0.1);

  const formatPrice = (hourly: number) => ({
    hourly: formatUSD(hourly, { suffix: '/hr' }),
    monthly: formatUSD(hourly * HOURS_PER_MONTH, { decimals: 0 }),
  });

  return (
    <main className="flex flex-col bg-[#0B0F19] text-[#E2E8F0] overflow-hidden">

      {/* HERO */}
      <section
        ref={hero.ref}
        className={`px-4 sm:px-6 lg:px-8 pt-32 pb-20 text-center relative ${hero.visible ? '' : 'opacity-0'}`}
      >
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
          backgroundSize: '80px 80px',
        }} />
        <div className="relative z-10 max-w-4xl mx-auto">
          <div className={`text-xs uppercase tracking-[0.3em] text-[#64748B] mb-6 ${hero.visible ? 'anim-fadeUp' : ''}`}>
            Transparent Pricing
          </div>
          <h1 className={`text-5xl md:text-7xl font-heading font-extrabold tracking-tight leading-[1.05] mb-6 ${hero.visible ? 'anim-fadeUp anim-delay-1' : ''}`}>
            80% cheaper than AWS.<br /><span className="text-primary">Seriously.</span>
          </h1>
          <p className={`text-xl text-[#94A3B8] max-w-2xl mx-auto mb-10 ${hero.visible ? 'anim-fadeUp anim-delay-2' : ''}`}>
            Same GPUs, fraction of the price. Billed per minute. Stop anytime.
          </p>
          <div className={`flex flex-wrap justify-center gap-6 ${hero.visible ? 'anim-fadeUp anim-delay-3' : ''}`}>
            {[
              { label: 'Pay per minute', icon: '⚡' },
              { label: 'No hidden fees', icon: '🔍' },
              { label: 'Free egress', icon: '🌐' },
            ].map(item => (
              <div key={item.label} className="flex items-center gap-2 text-sm text-[#94A3B8]">
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* GPU TABLE */}
      <section ref={gpuTable.ref} className={`py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full ${gpuTable.visible ? '' : 'opacity-0'}`}>
        <div className={`flex flex-col sm:flex-row sm:justify-between sm:items-end gap-6 mb-10 ${gpuTable.visible ? 'anim-fadeUp' : ''}`}>
          <div>
            <h2 className="text-3xl md:text-4xl font-heading font-bold text-[#E2E8F0] mb-2">GPUs on demand</h2>
            <p className="text-[#64748B] text-sm">
              Marketplace-driven rates in USD. Toggle hourly or estimated monthly (730 hrs).
            </p>
          </div>
          <div className="flex bg-white/[0.03] rounded-xl p-1 border border-white/[0.06] shrink-0">
            {(['hourly', 'monthly'] as const).map(period => (
              <button
                key={period}
                type="button"
                onClick={() => setBilling(period)}
                className={`px-5 py-1.5 rounded-lg text-sm font-medium transition-all capitalize ${
                  billing === period ? 'bg-gradient-to-r from-primary-dark to-primary text-white shadow-sm' : 'text-[#64748B] hover:text-[#E2E8F0]'
                }`}
              >
                {period}
              </button>
            ))}
          </div>
        </div>

        <div className={`border border-white/[0.06] rounded-xl overflow-hidden ${gpuTable.visible ? 'anim-fadeUp anim-delay-1' : ''}`}>
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/[0.06] text-[11px] text-[#64748B] uppercase tracking-wider">
                <th className="py-4 pl-6 font-medium">GPU Model</th>
                <th className="py-4 font-medium hidden md:table-cell">VRAM</th>
                <th className="py-4 font-medium hidden lg:table-cell">FP16 TFLOPS</th>
                <th className="py-4 font-medium hidden sm:table-cell">Best For</th>
                <th className="py-4 font-medium text-right pr-6">
                  {billing === 'hourly' ? 'USD / hr' : 'Est. Monthly'}
                </th>
              </tr>
            </thead>
            <tbody className="text-sm divide-y divide-white/[0.04]">
              {GPU_DATA.map((gpu, i) => (
                <tr key={gpu.model} className={`transition-colors ${gpu.popular ? 'bg-primary/[0.03]' : 'hover:bg-white/[0.02]'}`}
                    style={gpuTable.visible ? { animation: `fadeUp 0.5s ${0.1 + i * 0.05}s cubic-bezier(0.16,1,0.3,1) both` } : { opacity: 0 }}>
                  <td className="py-4 pl-6 font-medium flex items-center gap-3">
                    <div className={`w-8 h-8 rounded bg-gradient-to-br ${gpu.gradient} flex items-center justify-center text-[10px] font-bold ${'text-white'}`}>
                      {gpu.badge}
                    </div>
                    <span className="text-[#E2E8F0]">NVIDIA {gpu.model}</span>
                    {gpu.popular && (
                      <span className="ml-1 px-2 py-0.5 text-[9px] bg-gradient-to-r from-primary-dark to-primary text-white font-bold rounded uppercase tracking-wider">Popular</span>
                    )}
                  </td>
                  <td className="py-4 text-[#94A3B8] hidden md:table-cell">{gpu.vram}</td>
                  <td className="py-4 text-[#94A3B8] hidden lg:table-cell">{gpu.tflops}</td>
                  <td className="py-4 text-[#94A3B8] hidden sm:table-cell">{gpu.bestFor}</td>
                  <td className="py-4 text-right pr-6 font-bold font-mono text-primary tabular-nums text-lg">
                    {billing === 'hourly' ? formatPrice(gpu.hourly).hourly : formatPrice(gpu.hourly).monthly}
                    {billing === 'monthly' && <span className="text-xs text-[#475569] font-normal ml-1">/mo</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* CPU TABLE */}
        <div className={`mt-16 ${gpuTable.visible ? 'anim-fadeUp anim-delay-3' : 'opacity-0'}`}>
          <h3 className="text-2xl font-heading font-bold text-[#E2E8F0] mb-2">CPU instances</h3>
          <p className="text-[#64748B] text-sm mb-6">Compile jobs, data prep, and workloads that need cores without a GPU.</p>
          <div className="border border-white/[0.06] rounded-xl overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/[0.06] text-[11px] text-[#64748B] uppercase tracking-wider">
                  <th className="py-3 pl-6 font-medium">CPU Model</th>
                  <th className="py-3 font-medium hidden sm:table-cell">Cores / Threads</th>
                  <th className="py-3 font-medium hidden md:table-cell">RAM</th>
                  <th className="py-3 font-medium hidden sm:table-cell">Best For</th>
                  <th className="py-3 font-medium text-right pr-6">{billing === 'hourly' ? 'USD / hr' : 'Est. Monthly'}</th>
                </tr>
              </thead>
              <tbody className="text-sm divide-y divide-white/[0.04]">
                {CPU_DATA.map(cpu => (
                  <tr key={cpu.model} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-4 pl-6 font-medium flex items-center gap-3">
                      <div className={`w-8 h-8 rounded bg-gradient-to-br ${cpu.gradient} flex items-center justify-center text-[10px] font-bold`}>
                        {cpu.badge}
                      </div>
                      <span className="text-[#E2E8F0]">{cpu.model}</span>
                    </td>
                    <td className="py-4 text-[#94A3B8] hidden sm:table-cell">{cpu.cores}</td>
                    <td className="py-4 text-[#94A3B8] hidden md:table-cell">{cpu.ram}</td>
                    <td className="py-4 text-[#94A3B8] hidden sm:table-cell">{cpu.bestFor}</td>
                    <td className="py-4 text-right pr-6 font-bold font-mono text-primary tabular-nums text-lg">
                      {billing === 'hourly' ? formatPrice(cpu.hourly).hourly : formatPrice(cpu.hourly).monthly}
                      {billing === 'monthly' && <span className="text-xs text-[#475569] font-normal ml-1">/mo</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* SERVERLESS + STORAGE */}
      <section ref={extras.ref} className={`py-20 border-y border-white/[0.04] ${extras.visible ? '' : 'opacity-0'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className={`grid md:grid-cols-2 gap-8 ${extras.visible ? 'anim-fadeUp' : ''}`}>
            <div className="border border-white/[0.06] rounded-xl p-8">
              <div className="text-xs uppercase tracking-[0.2em] text-[#64748B] mb-4">Serverless</div>
              <h3 className="text-2xl font-heading font-bold text-[#E2E8F0] mb-3">Pay only when code runs</h3>
              <p className="text-[#64748B] text-sm mb-6">No idle charges. Metered per GB-second.</p>
              <div className="space-y-4">
                <div className="flex justify-between items-center py-3 border-b border-white/[0.04]">
                  <span className="text-sm text-[#94A3B8]">Active Compute</span>
                  <span className="font-bold font-mono text-primary tabular-nums">{formatUSD(0.000024, { suffix: '/GB-s', decimals: 6 })}</span>
                </div>
                <div className="flex justify-between items-center py-3">
                  <span className="text-sm text-[#94A3B8]">Cold Start Penalty</span>
                  <span className="font-bold text-[#94A3B8]">Free</span>
                </div>
              </div>
            </div>

            <div className="border border-white/[0.06] rounded-xl p-8">
              <div className="text-xs uppercase tracking-[0.2em] text-[#64748B] mb-4">Storage & Network</div>
              <h3 className="text-2xl font-heading font-bold text-[#E2E8F0] mb-3">Keep data on fast NVMe</h3>
              <p className="text-[#64748B] text-sm mb-6">Ingress included. Egress free on all plans.</p>
              <div className="space-y-4">
                <div className="flex justify-between items-center py-3 border-b border-white/[0.04]">
                  <span className="text-sm text-[#94A3B8]">Instance Storage</span>
                  <span className="font-bold font-mono text-primary tabular-nums">{formatUSD(0.02, { suffix: '/GB/mo' })}</span>
                </div>
                <div className="flex justify-between items-center py-3">
                  <span className="text-sm text-[#94A3B8]">Network Egress</span>
                  <span className="font-bold font-mono text-primary">Free <span className="text-xs text-[#475569] font-normal">unlimited</span></span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* COMPARISON */}
      <section ref={comparison.ref} className={`py-24 ${comparison.visible ? '' : 'opacity-0'}`}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className={`text-center mb-16 ${comparison.visible ? 'anim-fadeUp' : ''}`}>
            <div className="text-xs uppercase tracking-[0.3em] text-[#64748B] mb-4">The Math</div>
            <h2 className="text-4xl md:text-5xl font-heading font-bold text-[#E2E8F0] mb-4">
              Marketplace vs. <span className="text-primary">cloud pricing</span>
            </h2>
            <p className="text-[#64748B] text-sm max-w-xl mx-auto">
              Comparable GPU class (RTX 4090 tier). Cloud prices are list rates and vary by region.
            </p>
          </div>

          <div className={`grid md:grid-cols-3 gap-6 ${comparison.visible ? 'anim-fadeUp anim-delay-2' : ''}`}>
            {/* AWS */}
            <div className="border border-white/[0.06] rounded-xl p-8 relative bg-white/[0.03]">
              <div className="text-[#64748B] font-medium text-sm mb-6">AWS (g5.4xlarge)</div>
              <div className="text-4xl font-bold font-mono text-[#E2E8F0] mb-1 tabular-nums">{formatUSD(1.62, { suffix: '/hr' })}</div>
              <div className="text-xs text-red-400/70 mb-8">+ egress & add-ons</div>
              <div className="space-y-3">
                {['Higher list pricing', 'Bandwidth billed separately', 'Console & IAM overhead'].map(item => (
                  <div key={item} className="flex items-center gap-2 text-sm text-[#64748B]">
                    <span className="text-red-500/60 text-xs">✕</span> {item}
                  </div>
                ))}
              </div>
            </div>

            {/* GCP */}
            <div className="border border-white/[0.06] rounded-xl p-8 relative bg-white/[0.03]">
              <div className="text-[#64748B] font-medium text-sm mb-6">GCP (A2 / L4-class)</div>
              <div className="text-4xl font-bold font-mono text-[#E2E8F0] mb-1 tabular-nums">{formatUSD(0.80, { suffix: '/hr' })}</div>
              <div className="text-xs text-red-400/70 mb-8">+ egress & sustained-use rules</div>
              <div className="space-y-3">
                {['Quota & project complexity', 'Cross-region fees', 'Sustained-use fine print'].map(item => (
                  <div key={item} className="flex items-center gap-2 text-sm text-[#64748B]">
                    <span className="text-red-500/60 text-xs">✕</span> {item}
                  </div>
                ))}
              </div>
            </div>

            {/* Velocity */}
            <div className="border border-primary/30 rounded-xl p-8 relative bg-primary/[0.03]">
              <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-primary to-transparent" />
              <div className="text-primary font-bold text-sm mb-6">Velocity (RTX 4090)</div>
              <div className="text-4xl font-bold font-mono text-[#E2E8F0] mb-1 tabular-nums">{formatUSD(0.55, { suffix: '/hr' })}</div>
              <div className="text-xs text-primary/70 mb-8">All-in. Cards, UPI, wire, crypto.</div>
              <div className="space-y-3">
                {['Simple usage-based billing', 'Low-latency edge regions', 'Tax invoices on request'].map(item => (
                  <div key={item} className="flex items-center gap-2 text-sm text-[#E2E8F0]">
                    <span className="text-primary text-xs">✓</span> {item}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* REFERRAL + PROVIDER CTA */}
      <section className="py-12 border-t border-white/[0.04]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row gap-6">
          <Link href="/invite" className="flex-1 border border-white/[0.06] rounded-xl p-6 hover:border-primary/20 transition-all group bg-white/[0.03]">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm">🎁</div>
              <span className="text-sm font-bold text-[#E2E8F0]">Invite friends, earn free GPU hours</span>
            </div>
            <p className="text-xs text-[#64748B]">Share your link. Both get 1 hour of free compute when they rent.</p>
          </Link>
          <Link href="/host" className="flex-1 border border-white/[0.06] rounded-xl p-6 hover:border-primary/20 transition-all group bg-white/[0.03]">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm">💰</div>
              <span className="text-sm font-bold text-[#E2E8F0]">Have GPUs? Earn yield.</span>
            </div>
            <p className="text-xs text-[#64748B]">Providers earn {formatUSD(200, { decimals: 0 })}–{formatUSD(1050, { decimals: 0 })}/month per GPU.</p>
          </Link>
        </div>
      </section>

      {/* FAQ */}
      <section ref={faq.ref} className={`py-24 ${faq.visible ? '' : 'opacity-0'}`}>
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className={`text-4xl font-heading font-bold text-[#E2E8F0] text-center mb-14 ${faq.visible ? 'anim-fadeUp' : ''}`}>
            Questions, <span className="text-primary">answered</span>
          </h2>
          <div className="space-y-4">
            {[
              {
                q: 'How does billing work?',
                a: 'You fund your Velocity wallet via UPI, cards, or net banking. When you deploy a GPU instance, usage is deducted per minute from your wallet balance. Stop anytime and billing stops immediately.',
              },
              {
                q: 'What payment methods do you accept?',
                a: 'We accept UPI, credit/debit cards, and net banking through Razorpay. All transactions are in INR. GST at 18% is included where applicable.',
              },
              {
                q: 'Can I get a tax invoice?',
                a: 'Yes. Add your company details and GSTIN in your billing settings. We generate GST-compliant invoices for all wallet top-ups that your finance team can use for input tax credit.',
              },
              {
                q: "What happens if a GPU goes offline while I'm using it?",
                a: 'If a provider goes offline during your rental, we automatically stop billing and issue a refund for the interrupted period. You can redeploy on another available GPU instantly.',
              },
              {
                q: 'Is there a minimum commitment?',
                a: 'No. Billing is per-minute with no minimum commitment. Deploy for 5 minutes or 5 months. You only pay for what you use.',
              },
              {
                q: 'How do I become a GPU provider?',
                a: "Sign up, choose 'Host' during onboarding, and install our lightweight agent on your machine. The agent handles container management, monitoring, and security. You set your own price and start earning when renters deploy on your hardware.",
              },
              {
                q: 'What GPUs are available?',
                a: 'Our marketplace typically has RTX 4090s, A100s (40GB and 80GB), H100s, and RTX 3090s available. Actual availability depends on what providers have listed. Check the marketplace for real-time pricing and availability.',
              },
              {
                q: 'Do you offer reserved instances or discounts for longer commitments?',
                a: 'Yes. Reserved rentals are available at a discount compared to on-demand pricing. Contact us for volume pricing if you need multiple GPUs for extended periods.',
              },
            ].map((item, i) => (
              <div
                key={item.q}
                className="border border-white/[0.06] rounded-xl p-6 hover:border-white/[0.1] transition-all"
                style={faq.visible ? { animation: `fadeUp 0.5s ${0.1 + i * 0.1}s cubic-bezier(0.16,1,0.3,1) both` } : { opacity: 0 }}
              >
                <h3 className="font-bold text-[#E2E8F0] mb-2">{item.q}</h3>
                <p className="text-sm text-[#64748B] leading-relaxed">{item.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
