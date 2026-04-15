'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

declare global {
  interface Window {
    Razorpay: any
  }
}

export default function AddFundsButton({ userEmail, userPhone }: { userEmail?: string, userPhone?: string }) {
  const [loading, setLoading] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [amount, setAmount] = useState('500')
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const presets = [100, 500, 1000, 2500]

  async function handleAddFunds() {
    const numAmount = parseFloat(amount)
    if (isNaN(numAmount) || numAmount < 100) {
      setError('Minimum amount is ₹100')
      return
    }

    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/billing/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amountInr: numAmount })
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
          description: 'Wallet Top-up',
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
            color: '#00ff88'
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
        Add Funds (UPI)
      </button>

      {showModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#0a0a0a] border border-white/10 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl">
            <div className="p-5 border-b border-white/10 flex justify-between items-center">
              <h3 className="font-bold text-lg">Add Funds</h3>
              <button
                onClick={() => { setShowModal(false); setError(null) }}
                className="text-gray-400 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors"
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
                <label className="text-sm text-gray-400 mb-2 block">Amount (₹)</label>
                <div className="flex gap-2 mb-3">
                  {presets.map((p) => (
                    <button
                      key={p}
                      onClick={() => { setAmount(String(p)); setError(null) }}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                        amount === String(p) 
                          ? 'bg-primary/10 border-primary/30 text-primary' 
                          : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'
                      }`}
                    >
                      ₹{p}
                    </button>
                  ))}
                </div>
                <input
                  type="number"
                  min="100"
                  step="100"
                  value={amount}
                  onChange={(e) => { setAmount(e.target.value); setError(null) }}
                  className="w-full bg-black border border-white/10 rounded-lg px-4 py-2.5 text-white font-mono focus:outline-none focus:border-primary"
                  placeholder="Enter amount"
                />
                <p className="text-xs text-gray-600 mt-1.5">Minimum ₹100</p>
              </div>

              <button
                onClick={handleAddFunds}
                disabled={loading}
                className="w-full bg-primary hover:bg-primary-dark text-black font-bold py-3 rounded-lg transition-colors disabled:opacity-50"
              >
                {loading ? 'Processing...' : `Add ₹${amount || '0'} via UPI`}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
