'use client';

import Link from 'next/link'
import { Suspense } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'
import { useState } from 'react'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(false)

  const errorMsg = searchParams.get('error')
  const message = searchParams.get('message')

  const signInWithPassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    const formData = new FormData(e.currentTarget)
    const email = formData.get('email') as string
    const password = formData.get('password') as string
    const supabase = createClient()

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      router.push('/login?error=' + encodeURIComponent(error.message))
      setLoading(false)
      return
    }
    router.push('/console')
  }

  const signInWithMagicLink = async () => {
    const emailInput = document.querySelector<HTMLInputElement>('input[name="email"]')
    const email = emailInput?.value
    if (!email) {
      router.push('/login?error=' + encodeURIComponent('Please enter your email first.'))
      return
    }
    setLoading(true)
    const supabase = createClient()

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    })

    if (error) {
      router.push('/login?error=' + encodeURIComponent(error.message))
      setLoading(false)
      return
    }
    setLoading(false)
    router.push('/login?message=Check your email for the magic link.')
  }

  const signInWithOAuth = async (provider: 'google' | 'github') => {
    setLoading(true)
    const supabase = createClient()
    
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })

    if (error) {
      router.push('/login?error=' + encodeURIComponent(error.message))
      setLoading(false)
    }
  }

  return (
    <div className="min-h-[100dvh] flex bg-[#0B0F19]">
      {/* LEFT — Editorial branding */}
      <div className="hidden lg:flex lg:w-[45%] xl:w-[50%] relative flex-col justify-between p-12 xl:p-16 overflow-hidden">
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }} />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-primary/[0.04] blur-[120px]" />

        <div className="relative z-10 anim-fadeUp">
          <Link href="/" className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-primary-dark to-primary flex items-center justify-center font-bold text-white text-sm">V</div>
            <span className="font-bold text-lg tracking-tight text-white">Velocity</span>
          </Link>
        </div>

        <div className="relative z-10 flex-1 flex flex-col justify-center max-w-lg">
          <h1 className="text-5xl xl:text-6xl font-extrabold text-white leading-[1.05] tracking-tight mb-6 anim-fadeUp anim-delay-1 font-heading">
            The fastest path<br />
            to <span className="text-primary">GPU compute</span>
          </h1>
          <p className="text-[#94A3B8] text-lg leading-relaxed mb-10 anim-fadeUp anim-delay-2">
            Deploy instances in seconds. Pay by the minute. 80% cheaper than cloud.
          </p>
          <div className="flex gap-8 anim-fadeUp anim-delay-3">
            <div>
              <div className="text-2xl font-bold text-white font-mono">12,000+</div>
              <div className="text-xs text-[#64748B] mt-1">GPUs available</div>
            </div>
            <div className="w-px bg-white/10" />
            <div>
              <div className="text-2xl font-bold text-white font-mono">80%</div>
              <div className="text-xs text-[#64748B] mt-1">cheaper than AWS</div>
            </div>
            <div className="w-px bg-white/10" />
            <div>
              <div className="text-2xl font-bold text-white font-mono">&lt;30s</div>
              <div className="text-xs text-[#64748B] mt-1">deploy time</div>
            </div>
          </div>
        </div>

        <div className="relative z-10 anim-fadeUp anim-delay-4">
          <div className="flex items-center gap-3 text-xs text-[#475569]">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
            Enterprise-grade encryption &middot; SOC 2 compliant &middot; Protected by Cloudflare
          </div>
        </div>
      </div>

      {/* RIGHT — Auth form */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 sm:px-12 lg:border-l lg:border-white/[0.06] relative">
        <div className="lg:hidden mb-8 anim-fadeUp">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-primary-dark to-primary flex items-center justify-center font-bold text-white text-sm">V</div>
            <span className="font-bold text-lg tracking-tight text-white">Velocity</span>
          </Link>
        </div>

        <div className="w-full max-w-[400px]">
          <div className="mb-8 anim-fadeUp anim-delay-1">
            <h2 className="text-2xl font-bold text-white mb-1 font-heading">Welcome back</h2>
            <p className="text-[#64748B] text-sm">Sign in to access your GPUs.</p>
          </div>

          {errorMsg && (
            <div className="mb-6 p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-xl anim-fadeUp">
              {errorMsg}
            </div>
          )}

          {message && (
            <div className="mb-6 p-3 bg-primary/10 border border-primary/20 text-primary text-sm rounded-xl anim-fadeUp">
              {message}
            </div>
          )}

          <div className="flex flex-col gap-3 mb-6 anim-fadeUp anim-delay-2">
            <button 
              type="button"
              disabled={loading}
              onClick={() => signInWithOAuth('github')}
              className="w-full flex items-center justify-center gap-3 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-white font-medium py-2.5 px-4 rounded-lg transition-all disabled:opacity-50 hover:border-primary/30"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
              </svg>
              Continue with GitHub
            </button>
            <button 
              type="button"
              disabled={loading}
              onClick={() => signInWithOAuth('google')}
              className="w-full flex items-center justify-center gap-3 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-white font-medium py-2.5 px-4 rounded-lg transition-all disabled:opacity-50 hover:border-primary/30"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              Continue with Google
            </button>
          </div>

          <div className="flex items-center gap-4 mb-6 anim-fadeUp anim-delay-3">
            <div className="h-px bg-white/[0.06] flex-1" />
            <span className="text-[11px] text-[#475569] uppercase tracking-widest">or email</span>
            <div className="h-px bg-white/[0.06] flex-1" />
          </div>

          <form onSubmit={signInWithPassword} className="flex flex-col gap-4 anim-fadeUp anim-delay-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold text-[#475569] uppercase tracking-wider" htmlFor="email">Email</label>
              <input
                className="rounded-xl px-4 py-2.5 bg-white/[0.03] border border-white/[0.08] focus:border-primary/50 focus:shadow-[0_0_0_3px_rgba(99,102,241,0.1)] focus:outline-none transition-all placeholder:text-[#475569] text-white"
                name="email"
                type="email"
                placeholder="you@company.com"
                required
              />
            </div>
            
            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between items-center">
                <label className="text-[11px] font-semibold text-[#475569] uppercase tracking-wider" htmlFor="password">Password</label>
                <Link href="/forgot-password" className="text-xs text-[#64748B] hover:text-primary transition-colors">Forgot?</Link>
              </div>
              <input
                className="rounded-xl px-4 py-2.5 bg-white/[0.03] border border-white/[0.08] focus:border-primary/50 focus:shadow-[0_0_0_3px_rgba(99,102,241,0.1)] focus:outline-none transition-all placeholder:text-[#475569] text-white"
                type="password"
                name="password"
                placeholder="••••••••"
              />
            </div>

            <div className="flex flex-col gap-2.5 mt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-primary-dark to-primary text-white font-semibold rounded-lg px-4 py-2.5 shadow-glow transition-all disabled:opacity-50 active:scale-[0.98] hover:shadow-glow-lg hover:translate-y-[-1px]"
              >
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={signInWithMagicLink}
                className="w-full bg-white/[0.04] border border-white/[0.08] text-[#94A3B8] font-medium rounded-lg px-4 py-2.5 transition-all text-sm disabled:opacity-50 hover:border-primary/30 hover:text-white"
              >
                Send Magic Link
              </button>
            </div>
          </form>

          <div className="mt-8 text-center text-sm text-[#64748B] anim-fadeUp anim-delay-4">
            Don&apos;t have an account?{' '}
            <Link href="/signup" className="text-white hover:text-primary font-medium transition-colors">
              Sign up free
            </Link>
          </div>

          <div className="mt-10 flex items-center justify-center gap-6 text-[11px] text-[#475569] anim-fadeUp anim-delay-5">
            <Link href="/terms" className="hover:text-white transition-colors">Terms</Link>
            <Link href="/privacy" className="hover:text-white transition-colors">Privacy</Link>
            <Link href="/docs/security" className="hover:text-white transition-colors">Security</Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="flex-1 flex items-center justify-center min-h-[100dvh] bg-[#0B0F19]">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <LoginForm />
    </Suspense>
  )
}
