'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';

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
  { model: 'H200 SXM', badge: 'H200', vram: '141 GB', tflops: '3,958', bestFor: 'Massive LLM Training', hourly: 4.50, gradient: 'from-emerald-400 to-green-600', tier: 'flagship' },
  { model: 'H100 SXM5', badge: 'H100', vram: '80 GB', tflops: '1,979', bestFor: 'LLM Pre-training', hourly: 2.50, gradient: 'from-emerald-500 to-green-700' },
  { model: 'A100 80GB', badge: 'A100', vram: '80 GB', tflops: '312', bestFor: 'Fine-tuning & Inference', hourly: 1.20, gradient: 'from-green-600 to-emerald-800' },
  { model: 'RTX 6000 Ada', badge: '6000', vram: '48 GB', tflops: '91.1', bestFor: 'Pro Rendering', hourly: 0.95, gradient: 'from-gray-500 to-gray-700' },
  { model: 'L40S', badge: 'L40S', vram: '48 GB', tflops: '362', bestFor: 'Generative AI & 3D', hourly: 0.80, gradient: 'from-blue-500 to-blue-700' },
  { model: 'RTX 4090', badge: '4090', vram: '24 GB', tflops: '330', bestFor: 'Diffusion, Isaac Sim', hourly: 0.55, gradient: 'from-gray-600 to-gray-800', popular: true },
  { model: 'RTX 3090', badge: '3090', vram: '24 GB', tflops: '142', bestFor: 'Prototyping & LoRA', hourly: 0.35, gradient: 'from-gray-600 to-gray-800' },
  { model: 'L4', badge: 'L4', vram: '24 GB', tflops: '120', bestFor: 'Video & Audio AI', hourly: 0.30, gradient: 'from-blue-600 to-blue-800' },
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

  const formatPrice = (hourly: number) => {
    if (billing === 'hourly') return `$${hourly.toFixed(2)}`;
    return `$${(hourly * HOURS_PER_MONTH).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  };

  return (
    <main className="flex flex-col bg-[#060606] text-white overflow-hidden" style={{ fontFamily: 'var(--font-sans, Outfit, sans-serif)' }}>

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
          <div className={`text-xs uppercase tracking-[0.3em] text-gray-500 mb-6 ${hero.visible ? 'anim-fadeUp' : ''}`}>
            Transparent Pricing
          </div>
          <h1 className={`text-5xl md:text-7xl font-extrabold tracking-tight leading-[1.05] mb-6 ${hero.visible ? 'anim-fadeUp anim-delay-1' : ''}`}>
            80% cheaper than AWS.<br /><span className="text-primary">Seriously.</span>
          </h1>
          <p className={`text-xl text-gray-400 max-w-2xl mx-auto mb-10 ${hero.visible ? 'anim-fadeUp anim-delay-2' : ''}`}>
            Same GPUs, fraction of the price. Billed per minute. Stop anytime.
          </p>
          <div className={`flex flex-wrap justify-center gap-6 ${hero.visible ? 'anim-fadeUp anim-delay-3' : ''}`}>
            {[
              { label: 'Pay per minute', icon: '⚡' },
              { label: 'No hidden fees', icon: '🔍' },
              { label: 'Free egress', icon: '🌐' },
            ].map(item => (
              <div key={item.label} className="flex items-center gap-2 text-sm text-gray-400">
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
            <h2 className="text-3xl md:text-4xl font-bold mb-2">GPUs on demand</h2>
            <p className="text-gray-500 text-sm">
              Marketplace-driven rates in USD. Toggle hourly or estimated monthly (730 hrs).
            </p>
          </div>
          <div className="flex bg-white/[0.04] rounded-lg p-1 border border-white/[0.06] shrink-0">
            {(['hourly', 'monthly'] as const).map(period => (
              <button
                key={period}
                type="button"
                onClick={() => setBilling(period)}
                className={`px-5 py-1.5 rounded-md text-sm font-medium transition-all capitalize ${
                  billing === period ? 'bg-white/10 text-white shadow-sm' : 'text-gray-500 hover:text-white'
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
              <tr className="border-b border-white/[0.06] text-[11px] text-gray-500 uppercase tracking-wider">
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
                    <div className={`w-8 h-8 rounded bg-gradient-to-br ${gpu.gradient} flex items-center justify-center text-[10px] font-bold ${gpu.tier === 'flagship' ? 'text-black' : 'text-white'}`}>
                      {gpu.badge}
                    </div>
                    <span className="text-white">NVIDIA {gpu.model}</span>
                    {gpu.popular && (
                      <span className="ml-1 px-2 py-0.5 text-[9px] bg-primary text-black font-bold rounded uppercase tracking-wider">Popular</span>
                    )}
                  </td>
                  <td className="py-4 text-gray-400 hidden md:table-cell">{gpu.vram}</td>
                  <td className="py-4 text-gray-400 hidden lg:table-cell">{gpu.tflops}</td>
                  <td className="py-4 text-gray-400 hidden sm:table-cell">{gpu.bestFor}</td>
                  <td className="py-4 text-right pr-6 font-bold text-primary tabular-nums text-lg">
                    {formatPrice(gpu.hourly)}
                    <span className="text-xs text-gray-600 font-normal ml-1">/{billing === 'hourly' ? 'hr' : 'mo'}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* CPU TABLE */}
        <div className={`mt-16 ${gpuTable.visible ? 'anim-fadeUp anim-delay-3' : 'opacity-0'}`}>
          <h3 className="text-2xl font-bold mb-2">CPU instances</h3>
          <p className="text-gray-500 text-sm mb-6">Compile jobs, data prep, and workloads that need cores without a GPU.</p>
          <div className="border border-white/[0.06] rounded-xl overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/[0.06] text-[11px] text-gray-500 uppercase tracking-wider">
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
                      <span className="text-white">{cpu.model}</span>
                    </td>
                    <td className="py-4 text-gray-400 hidden sm:table-cell">{cpu.cores}</td>
                    <td className="py-4 text-gray-400 hidden md:table-cell">{cpu.ram}</td>
                    <td className="py-4 text-gray-400 hidden sm:table-cell">{cpu.bestFor}</td>
                    <td className="py-4 text-right pr-6 font-bold text-primary tabular-nums text-lg">
                      {formatPrice(cpu.hourly)}
                      <span className="text-xs text-gray-600 font-normal ml-1">/{billing === 'hourly' ? 'hr' : 'mo'}</span>
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
              <div className="text-xs uppercase tracking-[0.2em] text-gray-500 mb-4">Serverless</div>
              <h3 className="text-2xl font-bold mb-3">Pay only when code runs</h3>
              <p className="text-gray-500 text-sm mb-6">No idle charges. Metered per GB-second.</p>
              <div className="space-y-4">
                <div className="flex justify-between items-center py-3 border-b border-white/[0.04]">
                  <span className="text-sm text-gray-300">Active Compute</span>
                  <span className="font-bold text-primary tabular-nums">$0.000024 <span className="text-xs text-gray-600 font-normal">/GB-s</span></span>
                </div>
                <div className="flex justify-between items-center py-3">
                  <span className="text-sm text-gray-300">Cold Start Penalty</span>
                  <span className="font-bold text-gray-400">Free</span>
                </div>
              </div>
            </div>

            <div className="border border-white/[0.06] rounded-xl p-8">
              <div className="text-xs uppercase tracking-[0.2em] text-gray-500 mb-4">Storage & Network</div>
              <h3 className="text-2xl font-bold mb-3">Keep data on fast NVMe</h3>
              <p className="text-gray-500 text-sm mb-6">Ingress included. Egress free on all plans.</p>
              <div className="space-y-4">
                <div className="flex justify-between items-center py-3 border-b border-white/[0.04]">
                  <span className="text-sm text-gray-300">Instance Storage</span>
                  <span className="font-bold text-primary tabular-nums">$0.02 <span className="text-xs text-gray-600 font-normal">/GB/mo</span></span>
                </div>
                <div className="flex justify-between items-center py-3">
                  <span className="text-sm text-gray-300">Network Egress</span>
                  <span className="font-bold text-primary">Free <span className="text-xs text-gray-600 font-normal">unlimited</span></span>
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
            <div className="text-xs uppercase tracking-[0.3em] text-gray-500 mb-4">The Math</div>
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Marketplace vs. <span className="text-primary">cloud pricing</span>
            </h2>
            <p className="text-gray-500 text-sm max-w-xl mx-auto">
              Comparable GPU class (RTX 4090 tier). Cloud prices are list rates and vary by region.
            </p>
          </div>

          <div className={`grid md:grid-cols-3 gap-6 ${comparison.visible ? 'anim-fadeUp anim-delay-2' : ''}`}>
            {/* AWS */}
            <div className="border border-white/[0.06] rounded-xl p-8 relative">
              <div className="text-gray-500 font-medium text-sm mb-6">AWS (g5.4xlarge)</div>
              <div className="text-4xl font-bold text-white mb-1 tabular-nums">$1.62<span className="text-lg text-gray-600">/hr</span></div>
              <div className="text-xs text-red-400/70 mb-8">+ egress & add-ons</div>
              <div className="space-y-3">
                {['Higher list pricing', 'Bandwidth billed separately', 'Console & IAM overhead'].map(item => (
                  <div key={item} className="flex items-center gap-2 text-sm text-gray-500">
                    <span className="text-red-500/60 text-xs">✕</span> {item}
                  </div>
                ))}
              </div>
            </div>

            {/* GCP */}
            <div className="border border-white/[0.06] rounded-xl p-8 relative">
              <div className="text-gray-500 font-medium text-sm mb-6">GCP (A2 / L4-class)</div>
              <div className="text-4xl font-bold text-white mb-1 tabular-nums">$0.80<span className="text-lg text-gray-600">/hr</span></div>
              <div className="text-xs text-red-400/70 mb-8">+ egress & sustained-use rules</div>
              <div className="space-y-3">
                {['Quota & project complexity', 'Cross-region fees', 'Sustained-use fine print'].map(item => (
                  <div key={item} className="flex items-center gap-2 text-sm text-gray-500">
                    <span className="text-red-500/60 text-xs">✕</span> {item}
                  </div>
                ))}
              </div>
            </div>

            {/* Velocity */}
            <div className="border border-primary/30 rounded-xl p-8 relative bg-primary/[0.03]">
              <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-primary to-transparent" />
              <div className="text-primary font-bold text-sm mb-6">Velocity (RTX 4090)</div>
              <div className="text-4xl font-bold text-white mb-1 tabular-nums">$0.55<span className="text-lg text-gray-400">/hr</span></div>
              <div className="text-xs text-primary/70 mb-8">All-in. Cards, UPI, wire, crypto.</div>
              <div className="space-y-3">
                {['Simple usage-based billing', 'Low-latency edge regions', 'Tax invoices on request'].map(item => (
                  <div key={item} className="flex items-center gap-2 text-sm text-gray-300">
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
          <Link href="/invite" className="flex-1 border border-white/[0.06] rounded-xl p-6 hover:border-primary/20 transition-all group">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-full bg-yellow-400/10 flex items-center justify-center text-sm">🎁</div>
              <span className="text-sm font-bold text-white">Invite friends, earn free GPU hours</span>
            </div>
            <p className="text-xs text-gray-500">Share your link. Both get 1 hour of free compute when they rent.</p>
          </Link>
          <Link href="/host" className="flex-1 border border-white/[0.06] rounded-xl p-6 hover:border-primary/20 transition-all group">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm">💰</div>
              <span className="text-sm font-bold text-white">Have GPUs? Earn yield.</span>
            </div>
            <p className="text-xs text-gray-500">Providers earn $200–$1,050/month per GPU. Level up from Bronze to Diamond.</p>
          </Link>
        </div>
      </section>

      {/* FAQ */}
      <section ref={faq.ref} className={`py-24 ${faq.visible ? '' : 'opacity-0'}`}>
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className={`text-4xl font-bold text-center mb-14 ${faq.visible ? 'anim-fadeUp' : ''}`}>
            Questions, <span className="text-primary">answered</span>
          </h2>
          <div className="space-y-4">
            {[
              {
                q: 'How am I billed?',
                a: 'By the minute for active instances. Top up your Velocity wallet and usage debits as workloads run. We support cards, UPI, bank wire, and crypto (availability varies by region).',
              },
              {
                q: 'How do tax invoices work?',
                a: 'Add your company details in billing settings. We issue tax-compliant invoices (including GST where applicable) for wallet top-ups so your finance team can reconcile.',
              },
              {
                q: 'What happens when I pause an instance?',
                a: 'Pausing frees the GPU back to the pool and the hourly rate stops. A small storage fee (~$0.02/GB/month) keeps your disk around until you resume.',
              },
            ].map((item, i) => (
              <div
                key={item.q}
                className="border border-white/[0.06] rounded-xl p-6 hover:border-white/[0.1] transition-all"
                style={faq.visible ? { animation: `fadeUp 0.5s ${0.1 + i * 0.1}s cubic-bezier(0.16,1,0.3,1) both` } : { opacity: 0 }}
              >
                <h3 className="font-bold text-white mb-2">{item.q}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{item.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
