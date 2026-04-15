'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  saveBasicInfo,
  sendPhoneOTP,
  verifyPhoneOTP,
  verifyPAN,
  completeOnboarding,
} from './actions'

type Profile = {
  role?: string | null
  full_name?: string | null
  company_name?: string | null
  gstin?: string | null
  phone?: string | null
  phone_verified?: boolean | null
  pan_number?: string | null
  pan_verified?: boolean | null
  kyc_status?: string | null
  kyc_tier?: string | null
}

const STEPS_RENTER = ['Basic Info', 'Phone Verification', 'Complete']
const STEPS_HOST = ['Basic Info', 'Phone Verification', 'Identity Verification', 'Complete']

function getInitialStep(profile: Profile): number {
  if (profile.kyc_status === 'completed') return 3
  if (profile.role === 'host' && profile.phone_verified && profile.pan_verified) return 3
  if (profile.role === 'renter' && profile.phone_verified) return 2
  if (profile.phone_verified) return 2
  if (profile.role && profile.full_name) return 1
  return 0
}

export default function KYCOnboarding({ profile }: { profile: Profile }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const [step, setStep] = useState(getInitialStep(profile))
  const [error, setError] = useState('')

  // Step 1 state
  const [role, setRole] = useState<string>(profile.role || 'renter')
  const [fullName, setFullName] = useState(profile.full_name || '')
  const [companyName, setCompanyName] = useState(profile.company_name || '')
  const [gstin, setGstin] = useState(profile.gstin || '')

  // Step 2 state
  const [phone, setPhone] = useState(profile.phone || '')
  const [otpSent, setOtpSent] = useState(false)
  const [otp, setOtp] = useState('')
  const [phoneVerified, setPhoneVerified] = useState(profile.phone_verified || false)

  // Step 3 state (host only)
  const [panNumber, setPanNumber] = useState(profile.pan_number || '')
  const [panVerified, setPanVerified] = useState(profile.pan_verified || false)

  // Derived
  const isHost = role === 'host'
  const steps = isHost ? STEPS_HOST : STEPS_RENTER
  const totalSteps = steps.length
  const finalStep = totalSteps - 1

  function handleError(msg: string) {
    setError(msg)
    setTimeout(() => setError(''), 5000)
  }

  function handleStep1Submit() {
    if (!fullName.trim()) {
      handleError('Full name is required.')
      return
    }

    startTransition(async () => {
      const result = await saveBasicInfo({
        role,
        fullName: fullName.trim(),
        companyName: companyName.trim() || undefined,
        gstin: gstin.trim().toUpperCase() || undefined,
      })

      if (result.error) {
        handleError(result.error)
      } else {
        setStep(1)
        setError('')
      }
    })
  }

  function handleSendOTP() {
    if (!/^[6-9]\d{9}$/.test(phone)) {
      handleError('Enter a valid 10-digit Indian mobile number.')
      return
    }

    startTransition(async () => {
      const result = await sendPhoneOTP(phone)
      if (result.error) {
        handleError(result.error)
      } else {
        setOtpSent(true)
        setError('')
      }
    })
  }

  function handleVerifyOTP() {
    if (otp.length !== 6) {
      handleError('Enter the 6-digit OTP.')
      return
    }

    startTransition(async () => {
      const result = await verifyPhoneOTP(phone, otp)
      if (result.error) {
        handleError(result.error)
      } else {
        setPhoneVerified(true)
        setError('')
        if (isHost) {
          setStep(2)
        } else {
          setStep(finalStep)
        }
      }
    })
  }

  function handleVerifyPAN() {
    const panUpper = panNumber.toUpperCase()
    if (!/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(panUpper)) {
      handleError('Invalid PAN format. Expected: ABCDE1234F')
      return
    }

    startTransition(async () => {
      const result = await verifyPAN(panUpper)
      if (result.error) {
        handleError(result.error)
      } else {
        setPanVerified(true)
        setPanNumber(panUpper)
        setError('')
        setStep(finalStep)
      }
    })
  }

  function handleComplete() {
    startTransition(async () => {
      const result = await completeOnboarding()
      if (result.error) {
        handleError(result.error)
      } else if (result.redirectPath) {
        router.push(result.redirectPath)
      }
    })
  }

  // Determine current tier for display
  function getTierInfo() {
    if (isHost && panVerified && phoneVerified) {
      return {
        tier: 'id_verified',
        label: 'ID Verified',
        color: 'text-emerald-400',
        description: 'You can list machines on the marketplace. Renters will see a verified badge on your listings.',
      }
    }
    if (phoneVerified) {
      return {
        tier: 'phone_verified',
        label: 'Phone Verified',
        color: 'text-green-400',
        description: isHost
          ? 'Phone verified. Complete PAN verification to list machines with a trusted badge.'
          : 'You can rent GPUs and deploy instances. Your wallet limit is ₹50,000.',
      }
    }
    return {
      tier: 'unverified',
      label: 'Unverified',
      color: 'text-gray-400',
      description: 'Complete verification to access the platform.',
    }
  }

  const tierInfo = getTierInfo()

  return (
    <div className="flex-1 flex flex-col w-full items-center justify-center min-h-screen bg-[#050505] relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/5 rounded-full blur-[120px] -z-10 pointer-events-none" />

      <div className="w-full max-w-lg p-8 bg-[#0a0a0a] border border-white/10 rounded-2xl shadow-2xl relative z-10">
        {/* Header */}
        <div className="flex flex-col items-center gap-2 mb-6 transition-all duration-300">
          <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center font-bold text-black text-xl shadow-[0_0_15px_rgba(0,255,136,0.3)]">
            V
          </div>
          <h1 className="font-bold text-2xl tracking-tight mt-2 text-white">
            Complete your profile
          </h1>
          <p className="text-gray-400 text-sm text-center max-w-sm">
            {step === finalStep 
              ? 'You\'re all set!'
              : role === 'host'
                ? 'Verified Payouts & Tax Compliance.'
                : 'Instant Access & Secure Billing.'}
          </p>
        </div>

        {/* Stepper UI */}
        <div className="mb-8">
          <div className="flex items-center justify-between relative">
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-0.5 bg-white/10 -z-10"></div>
            <div 
              className="absolute left-0 top-1/2 -translate-y-1/2 h-0.5 bg-primary transition-all duration-500 ease-out -z-10"
              style={{ width: `${(step / finalStep) * 100}%` }}
            ></div>
            
            {steps.map((label, i) => {
              const isActive = i === step;
              const isCompleted = i < step;
              return (
                <div key={label} className="flex flex-col items-center gap-2 bg-[#0a0a0a] px-2">
                  <div 
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 ${
                      isActive 
                        ? 'bg-primary text-black shadow-[0_0_10px_rgba(0,255,136,0.3)]' 
                        : isCompleted 
                          ? 'bg-primary/20 text-primary border border-primary/30' 
                          : 'bg-white/5 text-gray-500 border border-white/10'
                    }`}
                  >
                    {isCompleted ? '✓' : i + 1}
                  </div>
                  <span className={`text-xs font-medium transition-colors ${
                    isActive ? 'text-primary' : isCompleted ? 'text-gray-300' : 'text-gray-600'
                  }`}>
                    {label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="mb-4 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Content Container with Transition */}
        <div className="relative overflow-hidden min-h-[400px]">
          <div className="transition-all duration-500 ease-in-out">
            {/* Step 1: Basic Info */}
            {step === 0 && (
              <div className="flex flex-col gap-5 text-white animate-in fade-in slide-in-from-right-4 duration-500">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-gray-300">I want to...</label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setRole('renter')}
                  className={`rounded-lg border p-4 text-center transition-all ${
                    role === 'renter'
                      ? 'border-primary bg-primary/10'
                      : 'border-white/10 bg-black/50 hover:bg-white/5'
                  }`}
                >
                  <div className="font-bold mb-1">Rent GPUs</div>
                  <div className="text-xs text-gray-400">Deploy AI workloads</div>
                </button>
                <button
                  type="button"
                  onClick={() => setRole('host')}
                  className={`rounded-lg border p-4 text-center transition-all ${
                    role === 'host'
                      ? 'border-primary bg-primary/10'
                      : 'border-white/10 bg-black/50 hover:bg-white/5'
                  }`}
                >
                  <div className="font-bold mb-1">Host GPUs</div>
                  <div className="text-xs text-gray-400">Earn passive income</div>
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-300">Full Name *</label>
              <input
                className="rounded-lg px-4 py-2.5 bg-black/50 border border-white/10 focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all placeholder:text-gray-600 text-white"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                placeholder="Your full legal name"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-300">Company Name (Optional)</label>
              <input
                className="rounded-lg px-4 py-2.5 bg-black/50 border border-white/10 focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all placeholder:text-gray-600 text-white"
                value={companyName}
                onChange={e => setCompanyName(e.target.value)}
                placeholder="Your Startup / Studio"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-300">GSTIN (Optional)</label>
              <p className="text-xs text-gray-500 mb-1">
                Required to claim 18% Input Tax Credit on your rentals.
              </p>
              <input
                className="rounded-lg px-4 py-2.5 bg-black/50 border border-white/10 focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all placeholder:text-gray-600 uppercase text-white"
                value={gstin}
                onChange={e => setGstin(e.target.value.toUpperCase())}
                placeholder="27XXXXX1234X1ZX"
              />
            </div>

            <button
              onClick={handleStep1Submit}
              disabled={isPending}
              className="w-full bg-primary hover:bg-primary-dark text-black font-bold rounded-lg px-4 py-3 mt-2 transition-colors shadow-[0_0_15px_rgba(0,255,136,0.2)] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isPending ? 'Saving...' : 'Continue'}
            </button>
          </div>
        )}

            {/* Step 2: Phone Verification */}
            {step === 1 && (
              <div className="flex flex-col gap-5 text-white animate-in fade-in slide-in-from-right-4 duration-500">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-gray-300">Mobile Number</label>
                    <div className="group relative flex items-center">
                      <svg className="w-4 h-4 text-gray-500 hover:text-primary transition-colors cursor-help" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div className="absolute right-0 bottom-full mb-2 w-48 p-2 bg-black/90 border border-white/10 rounded-lg text-xs text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20">
                        {role === 'host' 
                          ? 'Required for host communication and secure payouts.' 
                          : 'Required by RBI guidelines for wallet transactions.'}
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mb-1">
                    We&apos;ll send a 6-digit OTP to verify your number.
                  </p>
              <div className="flex gap-2">
                <div className="flex items-center px-3 py-2.5 bg-black/50 border border-white/10 rounded-lg text-gray-400 text-sm shrink-0">
                  +91
                </div>
                <input
                  className="flex-1 rounded-lg px-4 py-2.5 bg-black/50 border border-white/10 focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all placeholder:text-gray-600 text-white"
                  value={phone}
                  onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  placeholder="9876543210"
                  maxLength={10}
                  disabled={phoneVerified}
                />
                {!phoneVerified && (
                  <button
                    onClick={handleSendOTP}
                    disabled={isPending || phone.length !== 10}
                    className="shrink-0 px-4 py-2.5 bg-white/10 hover:bg-white/15 border border-white/10 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isPending && !otpSent ? 'Sending...' : otpSent ? 'Resend' : 'Send OTP'}
                  </button>
                )}
              </div>
            </div>

            {otpSent && !phoneVerified && (
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-300">Enter OTP</label>
                <p className="text-xs text-gray-500 mb-1">
                  Check your SMS. For testing, use 123456.
                </p>
                <div className="flex gap-2">
                  <input
                    className="flex-1 rounded-lg px-4 py-2.5 bg-black/50 border border-white/10 focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all placeholder:text-gray-600 text-white tracking-[0.3em] text-center text-lg font-mono"
                    value={otp}
                    onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="000000"
                    maxLength={6}
                  />
                  <button
                    onClick={handleVerifyOTP}
                    disabled={isPending || otp.length !== 6}
                    className="shrink-0 px-6 py-2.5 bg-primary hover:bg-primary-dark text-black font-bold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isPending ? 'Verifying...' : 'Verify'}
                  </button>
                </div>
              </div>
            )}

            {phoneVerified && (
              <div className="flex items-center gap-3 px-4 py-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                <svg className="w-5 h-5 text-green-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-green-400 text-sm font-medium">
                  Phone +91 {phone} verified successfully
                </span>
              </div>
            )}

            {phoneVerified && (
              <button
                onClick={() => {
                  if (isHost) {
                    setStep(2)
                  } else {
                    setStep(finalStep)
                  }
                }}
                className="w-full bg-primary hover:bg-primary-dark text-black font-bold rounded-lg px-4 py-3 mt-2 transition-colors shadow-[0_0_15px_rgba(0,255,136,0.2)]"
              >
                Continue
              </button>
            )}
          </div>
        )}

            {/* Step 3: Identity Verification (Hosts Only) */}
            {step === 2 && isHost && (
              <div className="flex flex-col gap-5 text-white animate-in fade-in slide-in-from-right-4 duration-500">
                <div className="px-4 py-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                  <p className="text-amber-400 text-sm">
                    As a host, identity verification is required to list machines on the marketplace.
                  </p>
                </div>

                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-gray-300">PAN Card Number</label>
                    <div className="group relative flex items-center">
                      <svg className="w-4 h-4 text-gray-500 hover:text-primary transition-colors cursor-help" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div className="absolute right-0 bottom-full mb-2 w-48 p-2 bg-black/90 border border-white/10 rounded-lg text-xs text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20">
                        Required for TDS deduction on host payouts as per Indian tax laws.
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mb-1">
                    Permanent Account Number issued by the Income Tax Department.
                  </p>
              <input
                className="rounded-lg px-4 py-2.5 bg-black/50 border border-white/10 focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all placeholder:text-gray-600 uppercase text-white tracking-wider font-mono"
                value={panNumber}
                onChange={e => setPanNumber(e.target.value.toUpperCase().slice(0, 10))}
                placeholder="ABCDE1234F"
                maxLength={10}
                disabled={panVerified}
              />
            </div>

            {panVerified && (
              <div className="flex items-center gap-3 px-4 py-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                <svg className="w-5 h-5 text-green-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-green-400 text-sm font-medium">
                  PAN {panNumber} verified successfully
                </span>
              </div>
            )}

            {!panVerified && (
              <button
                onClick={handleVerifyPAN}
                disabled={isPending || panNumber.length !== 10}
                className="w-full bg-primary hover:bg-primary-dark text-black font-bold rounded-lg px-4 py-3 transition-colors shadow-[0_0_15px_rgba(0,255,136,0.2)] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isPending ? 'Verifying...' : 'Verify PAN'}
              </button>
            )}

            <div className="px-4 py-3 bg-white/5 border border-white/10 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-sm font-medium text-gray-400">Aadhaar via DigiLocker</span>
              </div>
              <p className="text-xs text-gray-500">
                Coming soon. Aadhaar verification via DigiLocker will unlock the &quot;Secure Cloud&quot; trust tier with higher payouts.
              </p>
            </div>

            {panVerified && (
              <button
                onClick={() => setStep(finalStep)}
                className="w-full bg-primary hover:bg-primary-dark text-black font-bold rounded-lg px-4 py-3 mt-2 transition-colors shadow-[0_0_15px_rgba(0,255,136,0.2)]"
              >
                Continue
              </button>
            )}
          </div>
        )}

                {/* Final Step: Trust Tier Assignment */}
            {step === finalStep && (
              <div className="flex flex-col gap-5 text-white animate-in fade-in zoom-in-95 duration-500">
                <div className="text-center relative">
                  <div className="absolute inset-0 bg-primary/20 blur-[50px] rounded-full z-0 animate-pulse"></div>
                  <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 border-2 border-primary/30 mb-6 relative z-10 shadow-[0_0_30px_rgba(0,255,136,0.4)] animate-[bounce_2s_infinite]">
                    <svg className="w-10 h-10 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  </div>
                  <h2 className="text-2xl font-bold mb-2 bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">Verification Complete!</h2>
                  <p className="text-gray-400 text-sm">Your trust tier has been assigned.</p>
                </div>

            <div className="px-5 py-4 bg-white/5 border border-white/10 rounded-xl">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-gray-400">Trust Tier</span>
                <span className={`text-sm font-bold ${tierInfo.color}`}>
                  {tierInfo.label}
                </span>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  {phoneVerified ? (
                    <svg className="w-4 h-4 text-green-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4 text-gray-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  )}
                  <span className={`text-sm ${phoneVerified ? 'text-gray-300' : 'text-gray-600'}`}>
                    Phone verified
                  </span>
                </div>

                {isHost && (
                  <div className="flex items-center gap-2">
                    {panVerified ? (
                      <svg className="w-4 h-4 text-green-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4 text-gray-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    )}
                    <span className={`text-sm ${panVerified ? 'text-gray-300' : 'text-gray-600'}`}>
                      PAN verified
                    </span>
                  </div>
                )}
              </div>
            </div>

            <p className="text-sm text-gray-400 text-center px-4">
              {tierInfo.description}
            </p>

            {isHost && (
              <div className="px-4 py-3 bg-white/5 border border-white/10 rounded-lg">
                <p className="text-xs text-gray-500">
                  <span className="text-gray-400 font-medium">Disclaimer:</span> Machine listings
                  are subject to platform review. Payouts are processed to the bank account linked
                  to the verified PAN. GST invoices will be auto-generated for each payout.
                </p>
              </div>
            )}

            {!isHost && (
              <div className="px-4 py-3 bg-white/5 border border-white/10 rounded-lg">
                <p className="text-xs text-gray-500">
                  <span className="text-gray-400 font-medium">Disclaimer:</span> Wallet deposits
                  are non-refundable and can only be used for GPU rentals on this platform. All
                  charges include 18% GST.
                </p>
              </div>
            )}

            <button
              onClick={handleComplete}
              disabled={isPending}
              className="w-full bg-primary hover:bg-primary-dark text-black font-bold rounded-lg px-4 py-3 mt-2 transition-colors shadow-[0_0_15px_rgba(0,255,136,0.2)] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isPending ? 'Finishing...' : isHost ? 'Go to Host Dashboard' : 'Go to Console'}
            </button>
          </div>
        )}
          </div>
        </div>
      </div>
    </div>
  )
}
