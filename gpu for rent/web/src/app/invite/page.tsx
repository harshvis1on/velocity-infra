'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/client';

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

export default function InvitePage() {
  const [referralCode, setReferralCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [stats, setStats] = useState({ invited: 0, creditsEarned: 0 });
  const [loading, setLoading] = useState(true);

  const hero = useInView(0.1);
  const howSection = useInView(0.1);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      const { data: profile } = await supabase
        .from('users')
        .select('referral_code, referral_credits_earned_usd')
        .eq('id', user.id)
        .single();

      const code = profile?.referral_code || user.id.slice(0, 8).toUpperCase();
      setReferralCode(code);

      const { count } = await supabase
        .from('referrals')
        .select('id', { count: 'exact', head: true })
        .eq('referrer_id', user.id);

      setStats({
        invited: count || 0,
        creditsEarned: Number(profile?.referral_credits_earned_usd || 0),
      });

      setLoading(false);
    }
    load();
  }, []);

  const referralLink = typeof window !== 'undefined'
    ? `${window.location.origin}/signup?ref=${referralCode}`
    : '';

  const copyLink = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareText = `I'm using Velocity to rent GPUs at 80% off cloud pricing. Sign up with my link and we both get free GPU hours: ${referralLink}`;
  const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`;
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
  const linkedinUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(referralLink)}`;

  if (loading) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-[#0B0F19]">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!referralCode) {
    return (
      <div className="min-h-[100dvh] flex bg-[#0B0F19]">
        <div className="hidden lg:flex lg:w-[45%] relative flex-col justify-center p-16 overflow-hidden">
          <div className="absolute inset-0 opacity-[0.03]" style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }} />
          <div className="relative z-10 max-w-md">
            <h1 className="text-5xl font-extrabold text-white leading-[1.05] tracking-tight mb-6 anim-fadeUp font-heading">
              Share compute.<br /><span className="text-primary">Earn compute.</span>
            </h1>
            <p className="text-[#94A3B8] text-lg leading-relaxed anim-fadeUp anim-delay-1">
              Invite friends to Velocity. When they rent their first GPU, you both earn 1 hour of free compute.
            </p>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center px-6 lg:border-l lg:border-white/[0.06]">
          <div className="text-center max-w-sm">
            <div className="w-12 h-12 rounded-xl bg-yellow-400/10 flex items-center justify-center text-2xl mx-auto mb-6 anim-fadeUp">🎁</div>
            <h2 className="text-2xl font-bold mb-3 anim-fadeUp anim-delay-1 font-heading">Sign in to get your invite link</h2>
            <p className="text-[#64748B] text-sm mb-8 anim-fadeUp anim-delay-2">Create an account or sign in to start earning free GPU hours through referrals.</p>
            <Link href="/login" className="inline-block bg-gradient-to-r from-primary-dark to-primary text-white font-semibold py-3 px-8 rounded-lg text-sm shadow-glow transition-all active:scale-[0.97] anim-fadeUp anim-delay-3 hover:shadow-glow-lg hover:translate-y-[-1px]">
              Sign In to Continue
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-[100dvh] bg-[#0B0F19] text-white">
      {/* HERO */}
      <section ref={hero.ref} className={`pt-32 pb-20 relative ${hero.visible ? '' : 'opacity-0'}`}>
        <div className="absolute inset-0 opacity-[0.02]" style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
          backgroundSize: '80px 80px',
        }} />

        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className={`text-center mb-14 ${hero.visible ? 'anim-fadeUp' : ''}`}>
            <div className="text-[11px] uppercase tracking-[0.3em] text-[#475569] font-semibold mb-4">Referral Program</div>
            <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight leading-[1.05] mb-4 font-heading">
              Invite friends.<br /><span className="text-primary">Both earn free GPUs.</span>
            </h1>
            <p className="text-[#64748B] max-w-md mx-auto">
              Share your referral link. When someone rents their first GPU, you both receive 1 hour of free RTX 4090 compute.
            </p>
          </div>

          {/* Referral link card */}
          <div className={`bg-white/[0.03] border border-white/[0.06] rounded-2xl p-6 mb-6 ${hero.visible ? 'anim-fadeUp anim-delay-1' : 'opacity-0'}`}>
            <div className="text-[11px] text-[#475569] uppercase tracking-[0.15em] mb-3 font-semibold">Your Referral Link</div>
            <div className="flex items-center gap-3">
              <div className="flex-1 bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 py-3 text-sm text-[#94A3B8] overflow-x-auto scrollbar-hide font-mono tabular-nums">
                {referralLink || '...'}
              </div>
              <button
                onClick={copyLink}
                className={`shrink-0 font-semibold py-3 px-6 rounded-lg text-sm transition-all active:scale-[0.97] ${
                  copied
                    ? 'bg-primary/10 text-primary border border-primary/20'
                    : 'bg-gradient-to-r from-primary-dark to-primary text-white shadow-glow hover:shadow-glow-lg hover:translate-y-[-1px]'
                }`}
              >
                {copied ? 'Copied!' : 'Copy Link'}
              </button>
            </div>
          </div>

          {/* Share buttons */}
          <div className={`grid grid-cols-3 gap-3 mb-10 ${hero.visible ? 'anim-fadeUp anim-delay-2' : 'opacity-0'}`}>
            {[
              { href: twitterUrl, icon: '𝕏', label: 'Twitter' },
              { href: whatsappUrl, icon: '💬', label: 'WhatsApp' },
              { href: linkedinUrl, icon: 'in', label: 'LinkedIn' },
            ].map(item => (
              <a
                key={item.label}
                href={item.href}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 text-center hover:border-primary/30 transition-all group"
              >
                <div className="text-xl mb-1 group-hover:scale-110 transition-transform">{item.icon}</div>
                <div className="text-[11px] text-[#475569]">{item.label}</div>
              </a>
            ))}
          </div>

          {/* Stats */}
          <div className={`grid grid-cols-2 gap-4 ${hero.visible ? 'anim-fadeUp anim-delay-3' : 'opacity-0'}`}>
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-6 text-center">
              <div className="text-3xl font-bold text-white mb-1 font-mono tabular-nums">{stats.invited}</div>
              <div className="text-[11px] text-[#475569] uppercase tracking-wider font-semibold">Friends Invited</div>
            </div>
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-6 text-center">
              <div className="text-3xl font-bold text-primary mb-1 font-mono tabular-nums">${stats.creditsEarned}</div>
              <div className="text-[11px] text-[#475569] uppercase tracking-wider font-semibold">Credits Earned</div>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section ref={howSection.ref} className={`py-20 border-t border-white/[0.04] ${howSection.visible ? '' : 'opacity-0'}`}>
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className={`text-3xl font-bold mb-10 font-heading ${howSection.visible ? 'anim-fadeUp' : ''}`}>
            How it <span className="text-primary">works</span>
          </h2>
          <div className="space-y-6">
            {[
              { step: '01', text: 'Share your unique referral link with friends or on social media' },
              { step: '02', text: 'They sign up and get bonus credits added to their account' },
              { step: '03', text: 'When they rent their first GPU, you both earn 1 free GPU hour' },
              { step: '04', text: 'Invite as many people as you want. Unlimited.' },
            ].map((item, i) => (
              <div
                key={item.step}
                className="flex items-start gap-5 group"
                style={howSection.visible ? { animation: `fadeUp 0.5s ${0.1 + i * 0.1}s cubic-bezier(0.16,1,0.3,1) both` } : { opacity: 0 }}
              >
                <div className="text-xs font-bold text-[#475569] font-mono tabular-nums pt-0.5 shrink-0">{item.step}</div>
                <div className="flex-1 pb-6 border-b border-white/[0.04] group-last:border-0">
                  <p className="text-sm text-[#94A3B8]">{item.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
