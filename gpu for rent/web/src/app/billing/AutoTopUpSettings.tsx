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

  const handleSave = async () => {
    setSaving(true)
    setSaved(false)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      await supabase
        .from('users')
        .update({
          auto_topup_enabled: enabled,
          auto_topup_amount_inr: amount,
          auto_topup_threshold_inr: threshold,
        })
        .eq('id', user.id)

      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
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
            className="w-full bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 text-sm font-bold py-2 rounded transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Settings'}
          </button>
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
