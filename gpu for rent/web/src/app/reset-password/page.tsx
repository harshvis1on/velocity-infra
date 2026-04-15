'use client';

import Link from 'next/link';
import { createClient } from '@/utils/supabase/client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setReady(true);
      }
    });

    const timeout = setTimeout(() => {
      if (!ready) {
        setError('The reset link may have expired. Please request a new one.');
        setReady(false);
      }
    }, 15000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error: err } = await supabase.auth.updateUser({ password });

    if (err) {
      setError(err.message);
      setLoading(false);
      return;
    }
    router.push('/console');
  };

  return (
    <div className="min-h-[100dvh] flex bg-[#060606]">
      {/* LEFT — Editorial panel */}
      <div className="hidden lg:flex lg:w-[45%] xl:w-[50%] relative flex-col justify-between p-12 xl:p-16 overflow-hidden">
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }} />
        <div className="relative z-10 anim-fadeUp">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center font-bold text-black text-sm">V</div>
            <span className="font-bold text-lg tracking-tight text-white">Velocity</span>
          </Link>
        </div>
        <div className="relative z-10 flex-1 flex flex-col justify-center max-w-lg">
          <h1 className="text-5xl xl:text-6xl font-extrabold text-white leading-[1.05] tracking-tight mb-6 anim-fadeUp anim-delay-1">
            Fresh start,<br /><span className="text-primary">stronger security.</span>
          </h1>
          <p className="text-gray-400 text-lg leading-relaxed anim-fadeUp anim-delay-2">
            Choose a strong password to keep your GPU instances and data protected.
          </p>
        </div>
        <div className="relative z-10" />
      </div>

      {/* RIGHT — New password form */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 sm:px-12 lg:border-l lg:border-white/[0.06]">
        <div className="lg:hidden mb-8 anim-fadeUp">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center font-bold text-black text-sm">V</div>
            <span className="font-bold text-lg tracking-tight text-white">Velocity</span>
          </Link>
        </div>

        <div className="w-full max-w-[400px]">
          <div className="mb-8 anim-fadeUp anim-delay-1">
            <h2 className="text-2xl font-bold text-white mb-1">Pick a new password</h2>
            <p className="text-gray-500 text-sm">Choose something strong. At least 8 characters.</p>
          </div>

          {error && (
            <div className="mb-5 p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-lg anim-fadeUp">
              {error}
            </div>
          )}

          {!ready ? (
            <div className="text-center py-8 anim-fadeUp anim-delay-2">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-sm text-gray-500 mb-4">Verifying reset token...</p>
              <Link href="/forgot-password" className="text-xs text-gray-600 hover:text-primary transition-colors">
                Request a new reset link
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4 anim-fadeUp anim-delay-2">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-gray-400 uppercase tracking-wider" htmlFor="password">New Password</label>
                <input
                  className="rounded-lg px-4 py-2.5 bg-white/[0.03] border border-white/[0.08] focus:border-primary/50 focus:ring-1 focus:ring-primary/20 focus:outline-none transition-all placeholder:text-gray-700 text-white"
                  type="password"
                  name="password"
                  placeholder="Min 8 characters"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  minLength={8}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-gray-400 uppercase tracking-wider" htmlFor="confirmPassword">Confirm Password</label>
                <input
                  className="rounded-lg px-4 py-2.5 bg-white/[0.03] border border-white/[0.08] focus:border-primary/50 focus:ring-1 focus:ring-primary/20 focus:outline-none transition-all placeholder:text-gray-700 text-white"
                  type="password"
                  name="confirmPassword"
                  placeholder="Re-enter password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  required
                  minLength={8}
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-primary hover:bg-primary/90 text-black font-bold rounded-lg px-4 py-2.5 transition-all disabled:opacity-50 active:scale-[0.98] mt-2"
              >
                {loading ? 'Updating...' : 'Update Password'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
