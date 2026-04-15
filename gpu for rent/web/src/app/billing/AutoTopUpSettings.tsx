'use client'

import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'

export default function AutoTopUpSettings({
  initialEnabled,
  initialAmount,
  initialThreshold,
}: {
  initialEnabled: boolean
  initialAmount: number
  initialThreshold: number
}) {
  const [enabled, setEnabled] = useState(initialEnabled)
  const [amount, setAmount] = useState(initialAmount)
  const [threshold, setThreshold] = useState(initialThreshold)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const handleSave = async () => {
    setSaving(true)
    setSaved(false)
    setErrorMsg(null)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setErrorMsg('You must be signed in to save settings.')
        return
      }

      if (amount < 100) {
        setErrorMsg('Top-up amount must be at least ₹100.')
        return
      }
      if (threshold < 10) {
        setErrorMsg('Threshold must be at least ₹10.')
        return
      }

      const { data, error } = await supabase
        .from('users')
        .update({
          auto_topup_enabled: enabled,
          auto_topup_amount_inr: amount,
          auto_topup_threshold_inr: threshold,
        })
        .eq('id', user.id)
        .select('auto_topup_enabled, auto_topup_amount_inr, auto_topup_threshold_inr')
        .single()

      if (error || !data) {
        setErrorMsg(error?.message || 'Failed to save settings. Please try again.')
        return
      }

      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err: any) {
      setErrorMsg(err.message || 'Something went wrong. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-white/5 border border-white/10 p-6 rounded-xl">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-white font-medium">Auto Top-Up</h3>
        <button
          type="button"
          onClick={() => setEnabled(!enabled)}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            enabled ? 'bg-primary' : 'bg-white/20'
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              enabled ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </div>

      {enabled && (
        <div className="space-y-4">
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Top-up amount (INR)</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              min={100}
              step={100}
              className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-2 text-sm text-white font-mono focus:outline-none focus:border-primary"
            />
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Trigger when balance falls below (INR)</label>
            <input
              type="number"
              value={threshold}
              onChange={(e) => setThreshold(Number(e.target.value))}
              min={10}
              step={10}
              className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-2 text-sm text-white font-mono focus:outline-none focus:border-primary"
            />
          </div>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="w-full bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 text-sm font-bold py-2 rounded transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {saving && (
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            )}
            {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save Settings'}
          </button>

          {errorMsg && (
            <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-400">
              {errorMsg}
            </div>
          )}

          {saved && (
            <div className="rounded-lg border border-green-500/20 bg-green-500/10 px-3 py-2 text-xs text-green-400">
              Auto top-up settings saved successfully.
            </div>
          )}

          <p className="text-xs text-gray-500">
            When your balance drops below the threshold, you will be prompted to top up your wallet.
          </p>
        </div>
      )}

      {!enabled && (
        <p className="text-xs text-gray-500">
          Enable auto top-up to get notified and quickly refill when your balance is low.
        </p>
      )}
    </div>
  )
}
