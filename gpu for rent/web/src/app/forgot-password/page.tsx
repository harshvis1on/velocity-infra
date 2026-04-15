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
    <div className="flex-1 flex flex-col w-full items-center justify-center min-h-screen bg-[#050505] relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/5 rounded-full blur-[120px] -z-10 pointer-events-none" />

      <Link
        href="/login"
        className="absolute left-8 top-8 py-2 px-4 rounded-md no-underline text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 flex items-center group text-sm transition-all"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2 h-4 w-4 transition-transform group-hover:-translate-x-1">
          <polyline points="15 18 9 12 15 6" />
        </svg>
        Back to Login
      </Link>

      <div className="w-full max-w-md p-8 bg-[#0a0a0a] border border-white/10 rounded-2xl shadow-2xl relative z-10">
        <div className="flex flex-col items-center gap-2 mb-8">
          <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center font-bold text-black text-xl shadow-[0_0_15px_rgba(0,255,136,0.3)]">V</div>
          <h1 className="font-bold text-2xl tracking-tight mt-2 text-white">Forgot your password?</h1>
          <p className="text-gray-400 text-sm text-center">No worries — enter your email and we'll send you a reset link.</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 text-red-500 text-sm rounded-lg text-center">
            {error}
          </div>
        )}

        {sent ? (
          <div className="text-center">
            <div className="mb-6 p-4 bg-primary/10 border border-primary/20 text-primary text-sm rounded-lg">
              Check your email for the password reset link. It may take a minute to arrive.
            </div>
            <Link href="/login" className="text-primary hover:text-primary-dark font-medium text-sm transition-colors">
              Back to Sign In
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-300" htmlFor="email">Email Address</label>
              <input
                className="rounded-lg px-4 py-2.5 bg-black/50 border border-white/10 focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all placeholder:text-gray-600"
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
              className="w-full bg-primary hover:bg-primary-dark text-black font-bold rounded-lg px-4 py-2.5 transition-colors disabled:opacity-50 mt-2"
            >
              {loading ? 'Sending...' : 'Send Reset Link'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
