'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { completeOnboarding } from './actions'

type Profile = {
  role?: string | null
  full_name?: string | null
  company_name?: string | null
}

export default function KYCOnboarding({ profile }: { profile: Profile }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState('')

  const [role, setRole] = useState<string>(profile.role || 'renter')
  const [fullName, setFullName] = useState(profile.full_name || '')
  const [companyName, setCompanyName] = useState(profile.company_name || '')

  function handleSubmit() {
    if (!fullName.trim()) {
      setError('Name is required.')
      return
    }

    startTransition(async () => {
      const result = await completeOnboarding({
        role,
        fullName: fullName.trim(),
        companyName: companyName.trim() || undefined,
      })
      if (result.error) {
        setError(result.error)
        setTimeout(() => setError(''), 5000)
      } else if (result.redirectPath) {
        router.push(result.redirectPath)
      }
    })
  }

  const inputCls = 'w-full rounded-xl px-4 py-3 bg-white/[0.03] border border-white/[0.08] focus:border-primary/50 focus:shadow-[0_0_0_3px_rgba(99,102,241,0.1)] focus:outline-none transition-all placeholder:text-[#475569] text-white text-sm'
  const labelCls = 'text-[11px] uppercase tracking-wider text-[#475569] font-semibold mb-1.5 block'

  return (
    <div className="flex-1 flex flex-col w-full items-center justify-center min-h-screen bg-[#0B0F19] relative overflow-hidden px-4">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/[0.04] rounded-full blur-[100px] -z-10 pointer-events-none" />

      <div className="w-full max-w-lg">
        <div className="flex flex-col items-center gap-1.5 mb-8">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-primary-dark to-primary flex items-center justify-center font-bold text-white text-lg shadow-glow">
            V
          </div>
          <h1 className="font-bold text-xl tracking-tight mt-2 text-white font-heading">Get started</h1>
          <p className="text-[#64748B] text-xs text-center">Tell us a bit about yourself. Takes 10 seconds.</p>
        </div>

        <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-6 shadow-2xl">
          {error && (
            <div className="mb-5 px-3.5 py-2.5 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm flex items-center gap-2">
              <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              {error}
            </div>
          )}

          <div className="flex flex-col gap-5 text-white">
            <div>
              <label className={labelCls}>Choose your role</label>
              <div className="grid grid-cols-2 gap-3">
                {([
                  {
                    key: 'renter',
                    num: '01',
                    title: 'Rent',
                    desc: 'Access high-performance GPU clusters for inference and training.',
                    icon: (
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 14.25h13.5m-13.5 0a3 3 0 01-3-3m3 3a3 3 0 100 6h13.5a3 3 0 100-6m-16.5-3a3 3 0 013-3h13.5a3 3 0 013 3m-19.5 0a4.5 4.5 0 01.9-2.7L5.737 5.1a3.375 3.375 0 012.7-1.35h7.126c1.062 0 2.062.5 2.7 1.35l2.587 3.45a4.5 4.5 0 01.9 2.7m0 0a3 3 0 01-3 3m0 3h.008v.008h-.008v-.008zm0-6h.008v.008h-.008v-.008zm-3 6h.008v.008h-.008v-.008zm0-6h.008v.008h-.008v-.008z" />
                      </svg>
                    ),
                  },
                  {
                    key: 'host',
                    num: '02',
                    title: 'Host',
                    desc: 'Monetize your dormant hardware on the Velocity compute network.',
                    icon: (
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8.288 15.038a5.25 5.25 0 017.424 0M5.106 11.856c3.807-3.808 9.98-3.808 13.788 0M1.924 8.674c5.565-5.565 14.587-5.565 20.152 0M12.53 18.22l-.53.53-.53-.53a.75.75 0 011.06 0z" />
                      </svg>
                    ),
                  },
                ] as const).map(opt => (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => setRole(opt.key)}
                    className={`group relative rounded-2xl border p-5 text-left transition-all duration-200 ${
                      role === opt.key
                        ? 'border-primary/40 bg-primary/[0.06] shadow-[0_0_20px_rgba(99,102,241,0.08)]'
                        : 'border-white/[0.06] bg-white/[0.02] hover:border-white/[0.12] hover:bg-white/[0.03]'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
                        role === opt.key
                          ? 'bg-primary/[0.12] text-primary'
                          : 'bg-white/[0.04] text-[#64748B] group-hover:text-[#94A3B8]'
                      }`}>
                        {opt.icon}
                      </div>
                      <span className={`text-[10px] font-mono tracking-wider transition-colors ${
                        role === opt.key ? 'text-primary/60' : 'text-[#334155]'
                      }`}>{opt.num}</span>
                    </div>
                    <div className="font-semibold text-[15px] mb-1.5 font-heading">{opt.title}</div>
                    <div className="text-[12px] leading-relaxed text-[#64748B]">{opt.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className={labelCls}>Full Name *</label>
              <input
                className={inputCls}
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                placeholder="Your name"
                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                autoFocus
              />
            </div>

            <div>
              <label className={labelCls}>Company <span className="text-[#475569]">(optional)</span></label>
              <input
                className={inputCls}
                value={companyName}
                onChange={e => setCompanyName(e.target.value)}
                placeholder="Your startup or studio"
                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              />
            </div>

            <button
              onClick={handleSubmit}
              disabled={isPending}
              className="w-full bg-gradient-to-r from-primary-dark to-primary text-white font-semibold rounded-xl px-4 py-3 mt-1 shadow-glow transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm flex items-center justify-center gap-2 hover:shadow-glow-lg hover:translate-y-[-1px]"
            >
              {isPending ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Setting up...
                </>
              ) : role === 'host' ? (
                'Start Hosting'
              ) : (
                'Start Renting'
              )}
            </button>
          </div>
        </div>

        <p className="text-center text-[10px] text-[#475569] mt-4">
          By continuing you agree to our Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  )
}
