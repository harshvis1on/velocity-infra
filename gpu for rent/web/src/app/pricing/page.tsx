'use client';

import React, { useState } from 'react';
import Link from 'next/link';

const HOURS_PER_MONTH = 730;

export default function PricingPage() {
  const [billing, setBilling] = useState<'hourly' | 'monthly'>('hourly');

  const formatGpuPrice = (hourlyInr: number) => {
    if (billing === 'hourly') {
      return (
        <>
          ₹{hourlyInr.toFixed(2)} <span className="text-xs text-gray-500 font-sans font-normal">/hr</span>
        </>
      );
    }
    const monthly = hourlyInr * HOURS_PER_MONTH;
    return (
      <>
        ₹{monthly.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{' '}
        <span className="text-xs text-gray-500 font-sans font-normal">/mo</span>
      </>
    );
  };

  return (
    <main className="min-h-screen flex flex-col">
      {/* HERO */}
      <section className="px-4 sm:px-6 lg:px-8 py-24 text-center border-b border-white/[0.06] bg-[#050505]">
        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-6">
          80% cheaper than AWS. <span className="text-primary">Seriously.</span>
        </h1>
        <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-8">
          Same GPUs, fraction of the price. Billed per minute — stop anytime.
        </p>
        <div className="flex flex-wrap justify-center gap-4 text-sm font-medium">
          <div className="bg-white/5 border border-white/[0.06] rounded-full px-4 py-1.5 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-primary"></div> Pay per minute
          </div>
          <div className="bg-white/5 border border-white/[0.06] rounded-full px-4 py-1.5 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-primary"></div> No hidden fees
          </div>
        </div>
      </section>

      {/* GPU PRICING TABLE */}
      <section className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-6 mb-8">
          <div>
            <h2 className="text-2xl font-bold">GPUs on demand</h2>
            <p className="text-gray-400 mt-2">
              Marketplace-driven rates in INR. Toggle hourly or an estimated monthly total (730 hours).
            </p>
          </div>
          <div className="flex bg-white/5 rounded-lg p-1 border border-white/[0.06] shrink-0" role="group" aria-label="Billing period">
            <button
              type="button"
              onClick={() => setBilling('hourly')}
              className={`px-4 py-1.5 rounded text-sm font-medium transition-colors ${
                billing === 'hourly' ? 'bg-white/10 shadow-sm text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              Hourly
            </button>
            <button
              type="button"
              onClick={() => setBilling('monthly')}
              className={`px-4 py-1.5 rounded text-sm font-medium transition-colors ${
                billing === 'monthly' ? 'bg-white/10 shadow-sm text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              Monthly
            </button>
          </div>
        </div>

        <div className="bg-[#0a0a0a] border border-white/[0.06] rounded-xl overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white/5 border-b border-white/[0.06] text-sm text-gray-400">
                <th className="py-4 pl-6 font-medium">GPU Model</th>
                <th className="py-4 font-medium">VRAM</th>
                <th className="py-4 font-medium">Max TFLOPS (FP16)</th>
                <th className="py-4 font-medium">Best For</th>
                <th className="py-4 font-medium text-right pr-6">
                  {billing === 'hourly' ? 'Price (INR / hr)' : 'Est. monthly (INR)'}
                </th>
              </tr>
            </thead>
            <tbody className="text-sm divide-y divide-white/[0.06]">
              {/* H200 */}
              <tr className="hover:bg-white/5 transition-colors">
                <td className="py-5 pl-6 font-bold flex items-center gap-3">
                  <div className="w-8 h-8 rounded bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center text-xs text-black">H200</div>
                  NVIDIA H200 SXM
                </td>
                <td className="py-5 text-gray-300">141 GB</td>
                <td className="py-5 text-gray-300">3,958</td>
                <td className="py-5 text-gray-300">Massive LLM Training, Enterprise AI</td>
                <td className="py-5 text-right pr-6 font-mono text-primary font-bold text-lg">{formatGpuPrice(350)}</td>
              </tr>
              {/* H100 */}
              <tr className="hover:bg-white/5 transition-colors">
                <td className="py-5 pl-6 font-bold flex items-center gap-3">
                  <div className="w-8 h-8 rounded bg-gradient-to-br from-green-500 to-emerald-700 flex items-center justify-center text-xs">H100</div>
                  NVIDIA H100 SXM5
                </td>
                <td className="py-5 text-gray-300">80 GB</td>
                <td className="py-5 text-gray-300">1,979</td>
                <td className="py-5 text-gray-300">LLM Pre-training, Batch Inference</td>
                <td className="py-5 text-right pr-6 font-mono text-primary font-bold text-lg">{formatGpuPrice(220)}</td>
              </tr>
              {/* A100 80GB */}
              <tr className="hover:bg-white/5 transition-colors">
                <td className="py-5 pl-6 font-bold flex items-center gap-3">
                  <div className="w-8 h-8 rounded bg-gradient-to-br from-green-600 to-emerald-800 flex items-center justify-center text-xs">A100</div>
                  NVIDIA A100 PCIe
                </td>
                <td className="py-5 text-gray-300">80 GB</td>
                <td className="py-5 text-gray-300">312</td>
                <td className="py-5 text-gray-300">LLM Fine-tuning, Heavy Inference</td>
                <td className="py-5 text-right pr-6 font-mono text-primary font-bold text-lg">{formatGpuPrice(110)}</td>
              </tr>
              {/* RTX 6000 Ada */}
              <tr className="hover:bg-white/5 transition-colors">
                <td className="py-5 pl-6 font-bold flex items-center gap-3">
                  <div className="w-8 h-8 rounded bg-gradient-to-br from-gray-600 to-gray-800 flex items-center justify-center text-[10px]">6000</div>
                  NVIDIA RTX 6000 Ada
                </td>
                <td className="py-5 text-gray-300">48 GB</td>
                <td className="py-5 text-gray-300">91.1</td>
                <td className="py-5 text-gray-300">Professional Rendering, Large Models</td>
                <td className="py-5 text-right pr-6 font-mono text-primary font-bold text-lg">{formatGpuPrice(85)}</td>
              </tr>
              {/* L40S */}
              <tr className="hover:bg-white/5 transition-colors">
                <td className="py-5 pl-6 font-bold flex items-center gap-3">
                  <div className="w-8 h-8 rounded bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center text-[10px]">L40S</div>
                  NVIDIA L40S
                </td>
                <td className="py-5 text-gray-300">48 GB</td>
                <td className="py-5 text-gray-300">362</td>
                <td className="py-5 text-gray-300">Omniverse, Generative AI, 3D</td>
                <td className="py-5 text-right pr-6 font-mono text-primary font-bold text-lg">{formatGpuPrice(95)}</td>
              </tr>
              {/* RTX 4090 */}
              <tr className="hover:bg-white/5 transition-colors bg-primary/5 relative">
                <td className="py-5 pl-6 font-bold flex items-center gap-3">
                  <div className="w-8 h-8 rounded bg-gradient-to-br from-gray-700 to-gray-900 border border-primary/30 flex items-center justify-center text-xs text-primary">4090</div>
                  NVIDIA RTX 4090
                  <span className="ml-2 px-2 py-0.5 text-[10px] bg-primary text-black font-bold rounded uppercase tracking-wider">Popular</span>
                </td>
                <td className="py-5 text-gray-300">24 GB</td>
                <td className="py-5 text-gray-300">330</td>
                <td className="py-5 text-gray-300">Physical AI, Isaac Sim, Diffusion</td>
                <td className="py-5 text-right pr-6 font-mono text-primary font-bold text-lg">{formatGpuPrice(35)}</td>
              </tr>
              {/* RTX 3090 */}
              <tr className="hover:bg-white/5 transition-colors">
                <td className="py-5 pl-6 font-bold flex items-center gap-3">
                  <div className="w-8 h-8 rounded bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center text-xs">3090</div>
                  NVIDIA RTX 3090
                </td>
                <td className="py-5 text-gray-300">24 GB</td>
                <td className="py-5 text-gray-300">142</td>
                <td className="py-5 text-gray-300">Prototyping, LoRA Training</td>
                <td className="py-5 text-right pr-6 font-mono text-primary font-bold text-lg">{formatGpuPrice(22)}</td>
              </tr>
              {/* L4 */}
              <tr className="hover:bg-white/5 transition-colors">
                <td className="py-5 pl-6 font-bold flex items-center gap-3">
                  <div className="w-8 h-8 rounded bg-gradient-to-br from-blue-700 to-blue-900 flex items-center justify-center text-xs">L4</div>
                  NVIDIA L4
                </td>
                <td className="py-5 text-gray-300">24 GB</td>
                <td className="py-5 text-gray-300">120</td>
                <td className="py-5 text-gray-300">Video Processing, Audio-to-Text</td>
                <td className="py-5 text-right pr-6 font-mono text-primary font-bold text-lg">{formatGpuPrice(25)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="mt-16 mb-8 flex flex-col md:flex-row gap-8">
          <div className="flex-1">
            <h2 className="text-2xl font-bold mb-4">Serverless</h2>
            <div className="bg-[#0a0a0a] border border-white/[0.06] rounded-xl p-6">
              <p className="text-gray-400 text-sm mb-4">
                Pay for compute while your code runs — no idle charges. Metered per GB-second so you only pay for active work.
              </p>
              <div className="flex justify-between items-center py-3 border-b border-white/[0.06]">
                <span className="font-medium">Active Compute</span>
                <span className="font-mono text-primary font-bold">₹0.00002 <span className="text-xs text-gray-500 font-sans font-normal">/ GB-s</span></span>
              </div>
              <div className="flex justify-between items-center py-3">
                <span className="font-medium">Cold Start Penalty</span>
                <span className="font-mono text-gray-400 font-bold">Free</span>
              </div>
            </div>
          </div>

          <div className="flex-1">
            <h2 className="text-2xl font-bold mb-4">Storage &amp; network</h2>
            <div className="bg-[#0a0a0a] border border-white/[0.06] rounded-xl p-6">
              <p className="text-gray-400 text-sm mb-4">
                Keep data on fast NVMe when instances are paused. Ingress is included; egress is covered on standard plans.
              </p>
              <div className="flex justify-between items-center py-3 border-b border-white/[0.06]">
                <span className="font-medium">Instance Storage</span>
                <span className="font-mono text-primary font-bold">₹1.50 <span className="text-xs text-gray-500 font-sans font-normal">/ GB / month</span></span>
              </div>
              <div className="flex justify-between items-center py-3">
                <span className="font-medium">Network Egress</span>
                <span className="font-mono text-primary font-bold">Free <span className="text-xs text-gray-500 font-sans font-normal">unlimited</span></span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-16 mb-8">
          <h2 className="text-2xl font-bold">CPU when you need it</h2>
          <p className="text-gray-400 mt-2">
            Heavy compile jobs, data prep, and workloads that need cores without a GPU attached.
          </p>
        </div>

        <div className="bg-[#0a0a0a] border border-white/[0.06] rounded-xl overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white/5 border-b border-white/[0.06] text-sm text-gray-400">
                <th className="py-4 pl-6 font-medium">CPU Model</th>
                <th className="py-4 font-medium">Cores / Threads</th>
                <th className="py-4 font-medium">System RAM</th>
                <th className="py-4 font-medium">Best For</th>
                <th className="py-4 font-medium text-right pr-6">
                  {billing === 'hourly' ? 'Price (INR / hr)' : 'Est. monthly (INR)'}
                </th>
              </tr>
            </thead>
            <tbody className="text-sm divide-y divide-white/[0.06]">
              <tr className="hover:bg-white/5 transition-colors">
                <td className="py-5 pl-6 font-bold flex items-center gap-3">
                  <div className="w-8 h-8 rounded bg-gradient-to-br from-orange-500 to-red-700 flex items-center justify-center text-[10px]">EPYC</div>
                  AMD EPYC™ 9654
                </td>
                <td className="py-5 text-gray-300">96 / 192</td>
                <td className="py-5 text-gray-300">768 GB</td>
                <td className="py-5 text-gray-300">Massive Data Processing, Batch Jobs</td>
                <td className="py-5 text-right pr-6 font-mono text-primary font-bold text-lg">{formatGpuPrice(120)}</td>
              </tr>
              <tr className="hover:bg-white/5 transition-colors">
                <td className="py-5 pl-6 font-bold flex items-center gap-3">
                  <div className="w-8 h-8 rounded bg-gradient-to-br from-orange-600 to-red-800 flex items-center justify-center text-[10px]">TR</div>
                  AMD Threadripper™ PRO
                </td>
                <td className="py-5 text-gray-300">64 / 128</td>
                <td className="py-5 text-gray-300">256 GB</td>
                <td className="py-5 text-gray-300">Compiling, CPU Rendering</td>
                <td className="py-5 text-right pr-6 font-mono text-primary font-bold text-lg">{formatGpuPrice(65)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* COST COMPARISON */}
      <section className="py-20 bg-[#050505] border-y border-white/[0.06]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold mb-4">Marketplace pricing vs cloud pricing</h2>
          <p className="text-gray-400 text-sm max-w-2xl mx-auto mb-12">
            Illustrative hourly rates for a comparable GPU class (RTX 4090 tier). Cloud list prices and egress vary by region and commitment.
          </p>

          <div className="grid md:grid-cols-3 gap-6">
            {/* AWS */}
            <div className="bg-[#0a0a0a] border border-white/[0.06] p-6 rounded-xl flex flex-col items-center">
              <div className="text-gray-400 font-medium mb-4">AWS (g5.4xlarge)</div>
              <div className="text-3xl font-mono text-white mb-2">₹135<span className="text-lg text-gray-500">/hr</span></div>
              <div className="text-sm text-red-400 mb-6">+ Egress &amp; add-ons</div>
              <ul className="text-sm text-gray-400 space-y-3 text-left w-full">
                <li className="flex items-center gap-2"><span className="text-red-500">✕</span> Higher list pricing</li>
                <li className="flex items-center gap-2"><span className="text-red-500">✕</span> Bandwidth billed separately</li>
                <li className="flex items-center gap-2"><span className="text-red-500">✕</span> Console &amp; IAM overhead</li>
              </ul>
            </div>

            {/* GCP */}
            <div className="bg-[#0a0a0a] border border-white/[0.06] p-6 rounded-xl flex flex-col items-center">
              <div className="text-gray-400 font-medium mb-4">GCP (A2, L4-class)</div>
              <div className="text-3xl font-mono text-white mb-2">₹45<span className="text-lg text-gray-500">/hr</span></div>
              <div className="text-sm text-red-400 mb-6">+ Egress &amp; sustained-use rules</div>
              <ul className="text-sm text-gray-400 space-y-3 text-left w-full">
                <li className="flex items-center gap-2"><span className="text-red-500">✕</span> Project &amp; quota complexity</li>
                <li className="flex items-center gap-2"><span className="text-red-500">✕</span> Egress &amp; cross-region fees</li>
                <li className="flex items-center gap-2"><span className="text-red-500">✕</span> FX when paying in USD</li>
              </ul>
            </div>

            {/* Velocity */}
            <div className="bg-primary/10 border border-primary p-6 rounded-xl flex flex-col items-center relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-primary"></div>
              <div className="text-primary font-bold mb-4">Velocity (RTX 4090)</div>
              <div className="text-4xl font-mono text-white font-bold mb-2">₹35<span className="text-lg text-gray-400">/hr</span></div>
              <div className="text-sm text-primary mb-6">Pay in INR, USD, or crypto — UPI &amp; cards supported</div>
              <ul className="text-sm text-gray-300 space-y-3 text-left w-full">
                <li className="flex items-center gap-2"><span className="text-primary">✓</span> Simple usage-based billing</li>
                <li className="flex items-center gap-2"><span className="text-primary">✓</span> Low-latency edge regions</li>
                <li className="flex items-center gap-2"><span className="text-primary">✓</span> Tax invoices on request</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* REFERRAL */}
      <section className="py-12 bg-[#050505] border-b border-white/[0.06]">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-gradient-to-r from-primary/[0.06] to-yellow-400/[0.04] border border-primary/20 rounded-xl p-6 flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
            <span className="text-3xl shrink-0">🎁</span>
            <div className="flex-1">
              <p className="text-white font-bold text-sm mb-0.5">Invite friends and earn free GPU hours</p>
              <p className="text-gray-400 text-xs">Share your link — when they sign up and rent, you both get 1 hour of free compute.</p>
            </div>
            <Link href="/invite" className="shrink-0 bg-primary hover:bg-primary-dark text-black font-bold py-2 px-5 rounded-lg text-sm transition-all whitespace-nowrap">
              Get Your Link →
            </Link>
          </div>
        </div>
      </section>

      {/* PROVIDER EARNINGS */}
      <section className="py-12 bg-[#050505] border-b border-white/[0.06]">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-gray-300 text-sm md:text-base">
            <span className="font-semibold text-white">Have GPUs? Earn revenue.</span>{' '}
            Providers earn ₹28K–₹1.8L/month depending on hardware. Level up from Bronze to Diamond for lower fees.{' '}
            <Link href="/host" className="text-primary font-medium hover:underline">
              Start earning →
            </Link>
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-24 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl font-bold mb-10 text-center">Questions, answered</h2>
        <div className="space-y-6">
          <div className="bg-[#0a0a0a] border border-white/[0.06] p-6 rounded-xl">
            <h3 className="text-lg font-bold mb-2">How am I billed?</h3>
            <p className="text-gray-400 text-sm">
              You pay by the minute for what runs. Top up your Velocity wallet and usage debits as your workloads run — we support UPI, cards, bank wire, and crypto (availability varies by region).
            </p>
          </div>
          <div className="bg-[#0a0a0a] border border-white/[0.06] p-6 rounded-xl">
            <h3 className="text-lg font-bold mb-2">How do tax invoices work?</h3>
            <p className="text-gray-400 text-sm">
              Add your company details in billing settings. We issue tax-compliant invoices (including GST where applicable) for wallet top-ups and usage so your finance team can reconcile and reclaim credits per local rules.
            </p>
          </div>
          <div className="bg-[#0a0a0a] border border-white/[0.06] p-6 rounded-xl">
            <h3 className="text-lg font-bold mb-2">What happens when I pause my instance?</h3>
            <p className="text-gray-400 text-sm">
              Pausing frees the GPU back to the pool, so the GPU hourly rate stops. A small storage fee (about ₹0.05/GB/day) keeps your disk around until you resume.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
