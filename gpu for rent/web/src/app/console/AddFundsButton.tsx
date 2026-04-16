'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { formatUSD, USD_TO_INR } from '@/lib/currency'

declare global {
  interface Window {
    Razorpay: any
  }
}

export default function AddFundsButton({ userEmail, userPhone }: { userEmail?: string, userPhone?: string }) {
  const [loading, setLoading] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [amount, setAmount] = useState('10')
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const presets = [5, 10, 25, 50]
  const numAmount = parseFloat(amount) || 0
  const inrEquivalent = numAmount * USD_TO_INR

  async function handleAddFunds() {
    if (isNaN(numAmount) || numAmount < 1) {
      setError('Minimum amount is $1')
      return
    }

    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/billing/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amountUsd: numAmount })
      })
      const data = await res.json()
      
      if (!res.ok) throw new Error(data.error)

      if (data.testMode) {
        setShowModal(false)
        router.refresh()
        return
      }

      const razorpayKeyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID
      if (!razorpayKeyId) {
        throw new Error('Payment gateway is not configured. Contact support.')
      }

      if (typeof window !== 'undefined' && window.Razorpay) {
        const options = {
          key: razorpayKeyId,
          amount: data.order.amount,
          currency: data.order.currency,
          name: 'Velocity Infra',
          description: `Wallet Top-up: ${formatUSD(numAmount)}`,
          order_id: data.order.id,
          handler: async function () {
            setShowModal(false)
            setTimeout(() => router.refresh(), 2000)
          },
          prefill: {
            email: userEmail || '',
            contact: userPhone || '',
          },
          theme: {
            color: '#818CF8'
          }
        }
        const rzp = new window.Razorpay(options)
        rzp.open()
        setShowModal(false)
      } else {
        throw new Error('Payment gateway failed to load. Please refresh and try again.')
      }
    } catch (err: any) {
      setError(err.message || 'Failed to initialize payment')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <button 
        onClick={() => setShowModal(true)}
        className="w-full bg-primary/20 hover:bg-primary/30 text-primary text-xs font-bold py-1.5 rounded transition-colors border border-primary/20"
      >
        Add Funds
      </button>

      {showModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#0B0F19] border border-white/[0.06] rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl">
            <div className="p-5 border-b border-white/[0.06] flex justify-between items-center">
              <h3 className="font-heading font-bold text-lg text-white">Add Funds</h3>
              <button
                onClick={() => { setShowModal(false); setError(null) }}
                className="text-[#64748B] hover:text-white p-1 rounded-lg hover:bg-white/[0.06] transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="p-5 space-y-4">
              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-lg">
                  {error}
                </div>
              )}

              <div>
                <label className="text-sm text-[#94A3B8] mb-2 block">Amount (USD)</label>
                <div className="flex gap-2 mb-3">
                  {presets.map((p) => (
                    <button
                      key={p}
                      onClick={() => { setAmount(String(p)); setError(null) }}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                        amount === String(p) 
                          ? 'bg-primary/[0.15] border-primary/30 text-primary' 
                          : 'bg-white/[0.04] border-white/[0.08] text-[#94A3B8] hover:text-white hover:border-primary/30'
                      }`}
                    >
                      ${p}
                    </button>
                  ))}
                </div>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#64748B] font-mono text-sm">$</span>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={amount}
                    onChange={(e) => { setAmount(e.target.value); setError(null) }}
                    className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl pl-8 pr-4 py-2.5 text-white font-mono focus:outline-none focus:border-primary/50"
                    placeholder="Enter amount"
                  />
                </div>
                <div className="flex justify-between items-center mt-1.5">
                  <p className="text-xs text-[#475569]">Minimum $1</p>
                  {numAmount > 0 && (
                    <p className="text-xs text-[#475569]">≈ ₹{inrEquivalent.toFixed(0)} via Razorpay</p>
                  )}
                </div>
              </div>

              <div className="bg-white/[0.02] border border-white/[0.04] rounded-lg px-3 py-2">
                <p className="text-[11px] text-[#475569] leading-relaxed">
                  Payment processed in INR via Razorpay (UPI, cards, net banking). Your wallet is credited in USD at 1 USD = ₹{USD_TO_INR}.
                </p>
              </div>

              <button
                onClick={handleAddFunds}
                disabled={loading}
                className="w-full bg-gradient-to-r from-primary-dark to-primary hover:shadow-glow text-white font-semibold py-3 rounded-lg transition-colors disabled:opacity-50"
              >
                {loading ? 'Processing...' : `Add ${formatUSD(numAmount)}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
