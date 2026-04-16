'use client';

import Link from 'next/link';
import { createClient } from '@/utils/supabase/client';
import { useState } from 'react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (err) {
      setError(err.message);
      setLoading(false);
      return;
    }
    setSent(true);
    setLoading(false);
  };

  return (
    <div className="min-h-[100dvh] flex bg-[#0B0F19]">
      {/* LEFT — Editorial panel */}
      <div className="hidden lg:flex lg:w-[45%] xl:w-[50%] relative flex-col justify-between p-12 xl:p-16 overflow-hidden">
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }} />
        <div className="relative z-10 anim-fadeUp">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-primary-dark to-primary flex items-center justify-center font-bold text-white text-sm">V</div>
            <span className="font-bold text-lg tracking-tight text-white">Velocity</span>
          </Link>
        </div>
        <div className="relative z-10 flex-1 flex flex-col justify-center max-w-lg">
          <h1 className="text-5xl xl:text-6xl font-extrabold text-white leading-[1.05] tracking-tight mb-6 anim-fadeUp anim-delay-1 font-heading">
            We&apos;ve all<br /><span className="text-primary">been there.</span>
          </h1>
          <p className="text-[#94A3B8] text-lg leading-relaxed anim-fadeUp anim-delay-2">
            Reset your password and get back to deploying GPUs in seconds.
          </p>
        </div>
        <div className="relative z-10" />
      </div>

      {/* RIGHT — Reset form */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 sm:px-12 lg:border-l lg:border-white/[0.06]">
        <div className="lg:hidden mb-8 anim-fadeUp">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-primary-dark to-primary flex items-center justify-center font-bold text-white text-sm">V</div>
            <span className="font-bold text-lg tracking-tight text-white">Velocity</span>
          </Link>
        </div>

        <div className="w-full max-w-[400px]">
          <div className="mb-8 anim-fadeUp anim-delay-1">
            <h2 className="text-2xl font-bold text-white mb-1 font-heading">Forgot your password?</h2>
            <p className="text-[#64748B] text-sm">Enter your email and we&apos;ll send you a reset link.</p>
          </div>

          {error && (
            <div className="mb-5 p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-xl anim-fadeUp">
              {error}
            </div>
          )}

          {sent ? (
            <div className="anim-fadeUp">
              <div className="mb-6 p-4 bg-primary/5 border border-primary/10 rounded-xl">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <svg className="w-4 h-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                  </div>
                  <div className="text-sm font-medium text-white">Check your inbox</div>
                </div>
                <p className="text-xs text-[#94A3B8] leading-relaxed">
                  We sent a password reset link to <strong className="text-white">{email}</strong>. It may take a minute to arrive.
                </p>
              </div>
              <Link href="/login" className="text-sm text-[#64748B] hover:text-primary transition-colors">
                ← Back to Sign In
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4 anim-fadeUp anim-delay-2">
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-semibold text-[#475569] uppercase tracking-wider" htmlFor="email">Email Address</label>
                <input
                  className="rounded-xl px-4 py-2.5 bg-white/[0.03] border border-white/[0.08] focus:border-primary/50 focus:shadow-[0_0_0_3px_rgba(99,102,241,0.1)] focus:outline-none transition-all placeholder:text-[#475569] text-white"
                  name="email"
                  type="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-primary-dark to-primary text-white font-semibold rounded-lg px-4 py-2.5 shadow-glow transition-all disabled:opacity-50 active:scale-[0.98] mt-2 hover:shadow-glow-lg hover:translate-y-[-1px]"
              >
                {loading ? 'Sending...' : 'Send Reset Link'}
              </button>
              <Link href="/login" className="text-sm text-[#64748B] hover:text-primary transition-colors text-center mt-2">
                ← Back to Sign In
              </Link>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
