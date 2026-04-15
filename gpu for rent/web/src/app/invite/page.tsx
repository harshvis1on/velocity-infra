'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/client';

export default function InvitePage() {
  const [referralCode, setReferralCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [stats, setStats] = useState({ invited: 0, creditsEarned: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const code = user.id.slice(0, 8).toUpperCase();
        setReferralCode(code);
      }
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
      <div className="min-h-screen flex items-center justify-center bg-[#050505]">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  if (!referralCode) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#050505] px-4">
        <div className="text-center max-w-md">
          <div className="text-4xl mb-4">🎁</div>
          <h1 className="text-2xl font-bold mb-3">Invite friends. Get free GPU hours.</h1>
          <p className="text-gray-400 text-sm mb-6">Sign in to get your unique referral link and start earning free compute credits.</p>
          <Link href="/login" className="bg-primary hover:bg-primary-dark text-black font-bold py-3 px-8 rounded-lg text-sm transition-all">
            Sign In to Continue
          </Link>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#050505] text-white">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
        <div className="text-center mb-12">
          <div className="text-5xl mb-4">🎁</div>
          <h1 className="text-3xl md:text-4xl font-bold mb-3">
            Invite friends. Both get free GPU hours.
          </h1>
          <p className="text-gray-400 max-w-lg mx-auto">
            Share your referral link. When someone signs up and rents their first GPU,
            you both receive 1 hour of free RTX 4090 compute.
          </p>
        </div>

        {/* Referral link */}
        <div className="bg-[#0a0a0a] border border-white/[0.08] rounded-2xl p-6 mb-6">
          <div className="text-xs text-gray-500 uppercase tracking-wider mb-3 font-bold">Your referral link</div>
          <div className="flex items-center gap-3">
            <div className="flex-1 bg-black/50 border border-white/[0.06] rounded-lg px-4 py-3 font-mono text-sm text-gray-300 overflow-x-auto">
              {referralLink || '...'}
            </div>
            <button
              onClick={copyLink}
              className={`shrink-0 font-bold py-3 px-6 rounded-lg text-sm transition-all ${
                copied
                  ? 'bg-primary/20 text-primary border border-primary/30'
                  : 'bg-primary hover:bg-primary-dark text-black'
              }`}
            >
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
        </div>

        {/* Share buttons */}
        <div className="grid grid-cols-3 gap-3 mb-8">
          <a
            href={twitterUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] rounded-xl p-4 text-center transition-colors"
          >
            <div className="text-xl mb-1">𝕏</div>
            <div className="text-xs text-gray-500">Twitter</div>
          </a>
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] rounded-xl p-4 text-center transition-colors"
          >
            <div className="text-xl mb-1">💬</div>
            <div className="text-xs text-gray-500">WhatsApp</div>
          </a>
          <a
            href={linkedinUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] rounded-xl p-4 text-center transition-colors"
          >
            <div className="text-xl mb-1">in</div>
            <div className="text-xs text-gray-500">LinkedIn</div>
          </a>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 mb-12">
          <div className="bg-[#0a0a0a] border border-white/[0.06] rounded-xl p-5 text-center">
            <div className="text-3xl font-bold font-mono text-white mb-1">{stats.invited}</div>
            <div className="text-xs text-gray-500">Friends Invited</div>
          </div>
          <div className="bg-[#0a0a0a] border border-white/[0.06] rounded-xl p-5 text-center">
            <div className="text-3xl font-bold font-mono text-primary mb-1">₹{stats.creditsEarned}</div>
            <div className="text-xs text-gray-500">Credits Earned</div>
          </div>
        </div>

        {/* How it works */}
        <div className="bg-[#0a0a0a] border border-white/[0.06] rounded-2xl p-6">
          <h3 className="font-bold text-sm mb-4">How it works</h3>
          <div className="space-y-4">
            {[
              { step: '1', text: 'Share your unique referral link with friends or on social media' },
              { step: '2', text: 'They sign up and get bonus credits on their account' },
              { step: '3', text: 'When they rent their first GPU, you both earn 1 free GPU hour' },
              { step: '4', text: 'No limits — invite as many people as you want' },
            ].map((item) => (
              <div key={item.step} className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-[10px] font-bold text-primary shrink-0 mt-0.5">
                  {item.step}
                </div>
                <p className="text-sm text-gray-400">{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
