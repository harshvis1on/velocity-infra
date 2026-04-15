'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';

const YIELD_DATA = [
  { gpu: 'RTX 4090', hwCost: '$1,599', rate: 0.55, monthly: 231, breakEven: '7 months', roi: '173%' },
  { gpu: 'A100 80GB', hwCost: '$15,000', rate: 1.20, monthly: 504, breakEven: '30 months', roi: '40%' },
  { gpu: 'H100 SXM5', hwCost: '$30,000', rate: 2.50, monthly: 1050, breakEven: '29 months', roi: '42%' },
  { gpu: 'L40S 48GB', hwCost: '$7,000', rate: 0.80, monthly: 336, breakEven: '21 months', roi: '58%' },
  { gpu: 'A6000 48GB', hwCost: '$4,500', rate: 0.70, monthly: 294, breakEven: '16 months', roi: '78%' },
];

const TIERS = [
  { name: 'Bronze', fee: '15%', xp: '0' },
  { name: 'Silver', fee: '12%', xp: '1K' },
  { name: 'Gold', fee: '10%', xp: '5K' },
  { name: 'Platinum', fee: '7%', xp: '15K' },
  { name: 'Diamond', fee: '5%', xp: '50K' },
];

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

function CountUp({ target, suffix = '' }: { target: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  const { ref, visible } = useInView();
  useEffect(() => {
    if (!visible) return;
    let start = 0;
    const duration = 1200;
    const step = (ts: number) => {
      if (!start) start = ts;
      const progress = Math.min((ts - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(eased * target));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [visible, target]);
  return <span ref={ref as any}>{count}{suffix}</span>;
}

export default function HostPage() {
  const heroSection = useInView(0.1);
  const yieldSection = useInView(0.1);
  const thesisSection1 = useInView(0.15);
  const thesisSection2 = useInView(0.15);
  const stepsSection = useInView(0.1);
  const tiersSection = useInView(0.1);
  const ctaSection = useInView(0.1);

  return (
    <main className="flex flex-col bg-[#060606] text-white overflow-hidden" style={{ fontFamily: 'var(--font-sans, Outfit, sans-serif)' }}>
      <style jsx global>{`

        @keyframes fadeUp { from { opacity: 0; transform: translateY(32px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes fadeRight { from { opacity: 0; transform: translateX(-32px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes fadeLeft { from { opacity: 0; transform: translateX(32px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes sweepRight { from { transform: scaleX(0); transform-origin: left; } to { transform: scaleX(1); } }
        @keyframes breathe { 0%, 100% { opacity: 0.4; transform: translateX(-50%) scale(1); } 50% { opacity: 0.7; transform: translateX(-50%) scale(1.1); } }
        @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }

        .anim-fadeUp { opacity: 0; }
        .anim-fadeUp.visible { animation: fadeUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .anim-fadeRight { opacity: 0; }
        .anim-fadeRight.visible { animation: fadeRight 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .anim-fadeLeft { opacity: 0; }
        .anim-fadeLeft.visible { animation: fadeLeft 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .anim-fadeIn { opacity: 0; }
        .anim-fadeIn.visible { animation: fadeIn 1s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .delay-1 { animation-delay: 0.1s !important; }
        .delay-2 { animation-delay: 0.2s !important; }
        .delay-3 { animation-delay: 0.3s !important; }
        .delay-4 { animation-delay: 0.4s !important; }
        .delay-5 { animation-delay: 0.5s !important; }
        .delay-6 { animation-delay: 0.6s !important; }
        .delay-7 { animation-delay: 0.7s !important; }
      `}</style>

      {/* ═══════ HERO — SPLIT SCREEN ═══════ */}
      <section ref={heroSection.ref} className="min-h-[100dvh] grid grid-cols-1 lg:grid-cols-2 relative">
        <div className="absolute top-[30%] left-1/2 -translate-x-1/2 w-[900px] h-[600px] pointer-events-none -z-10" style={{ background: 'radial-gradient(ellipse, rgba(0,230,122,0.05) 0%, transparent 70%)', animation: 'breathe 8s ease-in-out infinite' }} />

        <div className="flex flex-col justify-center px-6 sm:px-10 lg:px-16 xl:px-20 py-24 lg:py-0 relative z-10">
          <div className={`text-[11px] tracking-[3px] uppercase text-[#444] font-semibold mb-8 anim-fadeUp ${heroSection.visible ? 'visible' : ''}`}>
            For Providers & Investors
          </div>
          <h1 className={`text-[clamp(40px,5.5vw,84px)] font-extrabold leading-[1.05] tracking-tight mb-7 anim-fadeUp delay-1 ${heroSection.visible ? 'visible' : ''}`}>
            Own the infrastructure<br className="hidden sm:block" /> of the <span className="text-[#00e67a] relative">AI era
              <span className="absolute bottom-1 left-0 right-0 h-[2px] bg-gradient-to-r from-[#00e67a] to-transparent" style={{ animation: heroSection.visible ? 'sweepRight 1.2s 0.8s cubic-bezier(0.16,1,0.3,1) both' : 'none' }} />
            </span>
          </h1>
          <p className={`text-[17px] font-light text-[#777] leading-[1.7] max-w-[440px] mb-10 anim-fadeUp delay-2 ${heroSection.visible ? 'visible' : ''}`}>
            In every technology revolution, the biggest returns go to those who own the infrastructure. In AI, that infrastructure is GPU compute. Your hardware generates yield while powering the next wave of intelligence.
          </p>
          <div className={`flex gap-10 mb-12 anim-fadeUp delay-3 ${heroSection.visible ? 'visible' : ''}`}>
            <div>
              <div className="text-[32px] font-bold tracking-[-0.02em]"><CountUp target={300} suffix="%" /></div>
              <div className="text-[11px] text-[#444] uppercase tracking-[1px] font-medium mt-1">Annual ROI</div>
            </div>
            <div>
              <div className="text-[32px] font-bold tracking-[-0.02em]">4<span className="text-[#00e67a] font-extrabold">mo</span></div>
              <div className="text-[11px] text-[#444] uppercase tracking-[1px] font-medium mt-1">Break-even</div>
            </div>
            <div>
              <div className="text-[32px] font-bold tracking-[-0.02em]">$2.1<span className="text-[#00e67a] font-extrabold">B</span></div>
              <div className="text-[11px] text-[#444] uppercase tracking-[1px] font-medium mt-1">Market demand</div>
            </div>
          </div>
          <div className={`anim-fadeUp delay-4 ${heroSection.visible ? 'visible' : ''}`}>
            <Link href="/host/setup" className="inline-flex items-center gap-2.5 bg-[#00e67a] text-black font-bold text-[14px] py-3.5 px-8 rounded-[10px] transition-all hover:-translate-y-0.5 hover:shadow-[0_16px_40px_rgba(0,230,122,0.15)] active:scale-[0.98]">
              Start Generating Yield
              <span className="transition-transform group-hover:translate-x-1">&rarr;</span>
            </Link>
          </div>
        </div>

        <div className="relative hidden lg:block border-l border-white/[0.05]">
          <div className={`absolute inset-0 anim-fadeIn delay-3 ${heroSection.visible ? 'visible' : ''}`}>
            <Image
              src="/images/host/host-hero.png"
              alt="GPU chip as monumental architecture"
              fill
              className="object-cover object-center"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-l from-transparent via-transparent to-[#060606]/80" />
          </div>
        </div>
      </section>

      {/* ═══════ YIELD — HORIZONTAL SCROLL TRACK ═══════ */}
      <section ref={yieldSection.ref} className="py-24 lg:py-32 border-t border-white/[0.05]">
        <div className="pl-6 sm:pl-10 lg:pl-16 xl:pl-20 mb-12">
          <h2 className={`text-[clamp(28px,4vw,48px)] font-bold leading-[1.15] tracking-tight mb-4 anim-fadeUp ${yieldSection.visible ? 'visible' : ''}`}>
            Your hardware, generating <span className="text-[#00e67a]">yield</span>.
          </h2>
          <p className={`text-[15px] text-[#777] font-light leading-[1.6] max-w-[480px] anim-fadeUp delay-1 ${yieldSection.visible ? 'visible' : ''}`}>
            Market rates from the Velocity marketplace. Projected yield assumes 14 hours of daily utilization.
          </p>
        </div>

        <div className={`flex gap-5 overflow-x-auto pl-6 sm:pl-10 lg:pl-16 xl:pl-20 pr-10 pb-4 snap-x snap-mandatory scrollbar-hide anim-fadeUp delay-2 ${yieldSection.visible ? 'visible' : ''}`} style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          {YIELD_DATA.map((card, i) => (
            <div
              key={card.gpu}
              className="flex-none w-[272px] snap-start bg-[#0c0c0c] border border-white/[0.05] rounded-[20px] p-7 transition-all hover:border-[#00e67a]/15 hover:-translate-y-1"
              style={{ animationDelay: `${0.1 * i}s` }}
            >
              <div className="w-full h-24 rounded-xl bg-gradient-to-br from-[#00e67a]/[0.06] to-[#00e67a]/[0.02] border border-[#00e67a]/[0.08] mb-5 flex items-center justify-center overflow-hidden relative">
                <Image
                  src="/images/host/host-gpus-composite.png"
                  alt={card.gpu}
                  fill
                  className="object-cover opacity-40"
                  loading="lazy"
                />
              </div>
              <div className="text-[12px] font-semibold text-[#777] tracking-[0.5px] mb-1">{card.gpu}</div>
              <div className="text-[11px] text-[#444] mb-5">Hardware cost ~{card.hwCost}</div>
              <div className="text-[36px] font-extrabold tracking-[-0.03em] leading-none">
                ${card.rate.toFixed(2)}<span className="text-[14px] font-normal text-[#444]">/hr</span>
              </div>
              <div className="h-px bg-white/[0.05] my-5" />
              <div className="flex justify-between items-baseline mb-3">
                <span className="text-[11px] text-[#444] uppercase tracking-[1px] font-medium">Monthly</span>
                <span className="text-[22px] font-bold text-[#00e67a] tracking-[-0.02em]">${card.monthly}</span>
              </div>
              <div className="flex justify-between text-[12px] mb-1.5">
                <span className="text-[#444]">Break-even</span>
                <span className="text-white font-semibold">{card.breakEven}</span>
              </div>
              <div className="flex justify-between text-[12px]">
                <span className="text-[#444]">Annual ROI</span>
                <span className="text-white font-semibold">{card.roi}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ═══════ THESIS — EDITORIAL ZIGZAG ═══════ */}
      <section className="border-t border-white/[0.05]">
        {/* Row 1 */}
        <div ref={thesisSection1.ref} className="max-w-[1100px] mx-auto px-6 sm:px-10 lg:px-16 py-24 lg:py-32">
          <div className="grid grid-cols-1 lg:grid-cols-[3fr_2fr] gap-12 lg:gap-20 items-center">
            <div>
              <h2 className={`text-[clamp(28px,4vw,48px)] font-bold leading-[1.2] tracking-tight mb-5 anim-fadeRight ${thesisSection1.visible ? 'visible' : ''}`}>
                The scarcest resource in technology.
              </h2>
              <p className={`text-[16px] font-light text-[#777] leading-[1.7] max-w-[480px] mb-8 anim-fadeRight delay-1 ${thesisSection1.visible ? 'visible' : ''}`}>
                AI model complexity doubles every six months. Enterprise inference costs now exceed training costs. GPU supply cannot keep pace with demand. Every idle card is yield left uncollected.
              </p>
              <div className={`flex gap-4 anim-fadeRight delay-2 ${thesisSection1.visible ? 'visible' : ''}`}>
                <div className="px-4 py-3 border border-white/[0.05] rounded-xl bg-white/[0.02]">
                  <div className="text-[20px] font-bold tracking-[-0.02em]">10<span className="text-[#00e67a]">x</span></div>
                  <div className="text-[10px] text-[#444] uppercase tracking-[0.5px] font-medium mt-1">Demand growth / yr</div>
                </div>
                <div className="px-4 py-3 border border-white/[0.05] rounded-xl bg-white/[0.02]">
                  <div className="text-[20px] font-bold tracking-[-0.02em]">$500<span className="text-[#00e67a]">B</span></div>
                  <div className="text-[10px] text-[#444] uppercase tracking-[0.5px] font-medium mt-1">AI infra spend by 2028</div>
                </div>
              </div>
            </div>
            <div className={`relative aspect-[4/3] rounded-[24px] overflow-hidden border border-white/[0.05] bg-[#0c0c0c] anim-fadeLeft delay-2 ${thesisSection1.visible ? 'visible' : ''}`}>
              <Image
                src="/images/host/host-thesis-demand.png"
                alt="AI compute demand growth curve"
                fill
                className="object-cover"
                loading="lazy"
              />
            </div>
          </div>
        </div>

        {/* Row 2 — reversed */}
        <div ref={thesisSection2.ref} className="max-w-[1100px] mx-auto px-6 sm:px-10 lg:px-16 pb-24 lg:pb-32">
          <div className="grid grid-cols-1 lg:grid-cols-[2fr_3fr] gap-12 lg:gap-20 items-center">
            <div className={`relative aspect-[4/3] rounded-[24px] overflow-hidden border border-white/[0.05] bg-[#0c0c0c] order-2 lg:order-1 anim-fadeRight delay-1 ${thesisSection2.visible ? 'visible' : ''}`}>
              <Image
                src="/images/host/host-thesis-racks.png"
                alt="Server racks with one activated GPU"
                fill
                className="object-cover"
                loading="lazy"
              />
            </div>
            <div className="order-1 lg:order-2">
              <h2 className={`text-[clamp(28px,4vw,48px)] font-bold leading-[1.2] tracking-tight mb-5 anim-fadeLeft ${thesisSection2.visible ? 'visible' : ''}`}>
                85% of GPUs sit idle right now.
              </h2>
              <p className={`text-[16px] font-light text-[#777] leading-[1.7] max-w-[480px] mb-8 anim-fadeLeft delay-1 ${thesisSection2.visible ? 'visible' : ''}`}>
                Data centers, gaming rigs, workstations. Billions of dollars in hardware generating zero return. Velocity turns idle silicon into a revenue-generating asset.
              </p>
              <div className={`flex gap-4 anim-fadeLeft delay-2 ${thesisSection2.visible ? 'visible' : ''}`}>
                <div className="px-4 py-3 border border-white/[0.05] rounded-xl bg-white/[0.02]">
                  <div className="text-[20px] font-bold tracking-[-0.02em]">85<span className="text-[#00e67a]">%</span></div>
                  <div className="text-[10px] text-[#444] uppercase tracking-[0.5px] font-medium mt-1">GPUs idle globally</div>
                </div>
                <div className="px-4 py-3 border border-white/[0.05] rounded-xl bg-white/[0.02]">
                  <div className="text-[20px] font-bold tracking-[-0.02em]">2<span className="text-[#00e67a]">x</span></div>
                  <div className="text-[10px] text-[#444] uppercase tracking-[0.5px] font-medium mt-1">AI budgets / year</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════ STEPS — NUMBERED LIST ═══════ */}
      <section ref={stepsSection.ref} className="border-t border-white/[0.05] py-24 lg:py-32">
        <div className="max-w-[860px] mx-auto px-6 sm:px-10 lg:px-16">
          <h2 className={`text-[clamp(28px,4vw,48px)] font-bold leading-[1.2] tracking-tight mb-16 anim-fadeUp ${stepsSection.visible ? 'visible' : ''}`}>
            From idle to earning in five minutes.
          </h2>

          {[
            { title: 'Install the agent', body: 'One command. Auto-detects your GPU model, CUDA version, and network topology. No Docker config needed.', code: <span>$ curl -sSL <span className="text-[#00e67a] font-semibold">velocity.cloud/install</span> | bash</span> },
            { title: 'Set your price, or let us', body: 'Auto-pricing sets the optimal market rate to maximize utilization. Override anytime with your own rate.', code: <span>Market rate: <span className="text-[#00e67a] font-semibold">$0.55</span>/GPU/hr &middot; Auto-pricing ON</span> },
            { title: 'Earn yield', body: 'Per-second billing. Automated payouts. Track everything from your dashboard. Level up for lower fees.', code: <span>Monthly projected: <span className="text-[#00e67a] font-semibold">$231</span> &middot; Tier: Bronze (15%)</span> },
          ].map((step, i) => (
            <div
              key={step.title}
              className={`grid grid-cols-1 md:grid-cols-[60px_1fr_1fr] gap-6 items-start py-8 border-t border-white/[0.05] anim-fadeUp ${stepsSection.visible ? 'visible' : ''}`}
              style={{ animationDelay: `${0.15 * (i + 1)}s` }}
            >
              <div className="text-[32px] font-extrabold text-[#00e67a]/20 leading-none pt-1">
                {String(i + 1).padStart(2, '0')}
              </div>
              <div>
                <h3 className="text-[20px] font-semibold mb-2">{step.title}</h3>
                <p className="text-[14px] font-light text-[#777] leading-[1.6]">{step.body}</p>
              </div>
              <div className="text-[12px] text-[#444] bg-white/[0.02] border border-white/[0.05] rounded-lg px-4 py-3 self-center">
                {step.code}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ═══════ TIERS — HORIZONTAL BAR ═══════ */}
      <section ref={tiersSection.ref} className="border-t border-white/[0.05] py-24 lg:py-32">
        <div className="max-w-[960px] mx-auto px-6 sm:px-10 lg:px-16">
          <h2 className={`text-[clamp(28px,4vw,48px)] font-bold leading-[1.2] tracking-tight mb-3 anim-fadeUp ${tiersSection.visible ? 'visible' : ''}`}>
            Compound your returns.
          </h2>
          <p className={`text-[15px] text-[#777] font-light max-w-[500px] mb-12 anim-fadeUp delay-1 ${tiersSection.visible ? 'visible' : ''}`}>
            Your effective yield increases as you earn XP. Platform fees drop from 15% to 5% as you level up.
          </p>

          <div className={`flex rounded-2xl overflow-hidden border border-white/[0.05] bg-[#0c0c0c] anim-fadeUp delay-2 ${tiersSection.visible ? 'visible' : ''}`}>
            {TIERS.map((tier, i) => (
              <div
                key={tier.name}
                className={`flex-1 py-6 px-4 text-center transition-colors hover:bg-[#00e67a]/[0.03] ${i < TIERS.length - 1 ? 'border-r border-white/[0.05]' : ''}`}
              >
                <div className="text-[12px] font-semibold text-white mb-1.5">{tier.name}</div>
                <div className="text-[28px] font-extrabold text-[#00e67a] leading-none tracking-[-0.03em]">{tier.fee}</div>
                <div className="text-[10px] text-[#444] mt-1 font-medium">platform fee</div>
                <div className="text-[11px] text-[#444] mt-2.5 font-medium">{tier.xp} XP</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════ FINAL CTA ═══════ */}
      <section ref={ctaSection.ref} className="min-h-[70dvh] flex flex-col items-center justify-center text-center px-6 border-t border-white/[0.05] relative overflow-hidden">
        <div className="absolute bottom-[-100px] left-1/2 -translate-x-1/2 w-[700px] h-[350px] pointer-events-none" style={{ background: 'radial-gradient(ellipse, rgba(0,230,122,0.05) 0%, transparent 70%)' }} />

        <h2 className={`text-[clamp(36px,6vw,72px)] font-extrabold leading-[1.1] tracking-tight max-w-[600px] mb-5 relative z-10 anim-fadeUp ${ctaSection.visible ? 'visible' : ''}`}>
          Every idle hour is <span className="text-[#00e67a]">yield forgone.</span>
        </h2>
        <p className={`text-[16px] text-[#777] font-light max-w-[400px] leading-[1.6] mb-9 relative z-10 anim-fadeUp delay-1 ${ctaSection.visible ? 'visible' : ''}`}>
          Plug in your GPU. Start earning in five minutes. Join the infrastructure layer of the AI economy.
        </p>
        <div className={`flex gap-4 relative z-10 anim-fadeUp delay-2 ${ctaSection.visible ? 'visible' : ''}`}>
          <Link href="/host/setup" className="inline-flex items-center gap-2.5 bg-[#00e67a] text-black font-bold text-[14px] py-3.5 px-8 rounded-[10px] transition-all hover:-translate-y-0.5 hover:shadow-[0_16px_40px_rgba(0,230,122,0.15)] active:scale-[0.98]">
            Start Generating Yield &rarr;
          </Link>
          <Link href="/host/datacenter-apply" className="inline-flex items-center gap-2 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] text-gray-300 hover:text-white font-medium text-[14px] py-3.5 px-8 rounded-[10px] transition-all hover:-translate-y-0.5">
            Enterprise Fleets
          </Link>
        </div>
      </section>
    </main>
  );
}
