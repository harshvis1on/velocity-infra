'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  pauseMachine,
  resumeMachine,
  unlistOffer,
  removeMachine,
} from './actions'
import { createClient } from '@/utils/supabase/client'
import { formatUSD } from '@/lib/currency'

function getActiveOffer(machine: any) {
  return machine.offers?.find((o: any) => o.status === 'active') ?? null
}

function statusInfo(machine: any) {
  const offer = getActiveOffer(machine)
  if (machine.status === 'rented') return { color: 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]', label: 'Rented' }
  if (machine.status === 'paused') return { color: 'bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.5)]', label: 'Paused' }
  if (machine.status === 'offline') return { color: 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]', label: 'Offline' }
  if (machine.status === 'available' && offer) return { color: 'bg-primary shadow-[0_0_8px_rgba(129,140,248,0.5)]', label: 'Available' }
  return { color: 'bg-[#64748B]', label: 'Unlisted' }
}

function tierBadge(tier: string) {
  if (tier === 'secure_cloud') return { label: 'Enterprise', cls: 'bg-primary/10 text-primary border-primary/20' }
  if (tier === 'verified') return { label: 'Verified', cls: 'bg-blue-400/10 text-blue-400 border-blue-400/20' }
  return { label: 'Community', cls: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' }
}

function relativeTime(iso: string | null): string {
  if (!iso) return 'Never'
  const diff = Date.now() - new Date(iso).getTime()
  if (diff < 60_000) return 'Just now'
  if (diff < 3600_000) return `${Math.floor(diff / 60_000)}m ago`
  if (diff < 86400_000) return `${Math.floor(diff / 3600_000)}h ago`
  return `${Math.floor(diff / 86400_000)}d ago`
}

export default function MachineList({ machines }: { machines: any[] }) {
  const router = useRouter()
  const [loadingAction, setLoadingAction] = useState<Record<string, string>>({})
  const [editingPrice, setEditingPrice] = useState<string | null>(null)
  const [priceInput, setPriceInput] = useState('')
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const withAction = async (machineId: string, action: string, fn: () => Promise<void>) => {
    setLoadingAction(prev => ({ ...prev, [machineId]: action }))
    try {
      await fn()
      router.refresh()
    } catch (err: any) {
      alert(err.message)
    } finally {
      setLoadingAction(prev => {
        const next = { ...prev }
        delete next[machineId]
        return next
      })
    }
  }

  const handleCopyId = (id: string) => {
    navigator.clipboard.writeText(id)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 1500)
  }

  const handleSavePrice = async (machine: any) => {
    const offer = getActiveOffer(machine)
    const price = parseFloat(priceInput)
    if (!price || price <= 0) return alert('Enter a valid price')

    if (offer) {
      await withAction(machine.id, 'price', async () => {
        const supabase = createClient()
        await supabase.from('offers').update({ price_per_gpu_hr_usd: price }).eq('id', offer.id)
        await supabase.from('machines').update({ price_per_hour_usd: price }).eq('id', machine.id)
        setEditingPrice(null)
        setPriceInput('')
      })
    } else {
      await withAction(machine.id, 'list', async () => {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error('Not authenticated')
        const endDate = new Date()
        endDate.setDate(endDate.getDate() + 30)
        await supabase.from('offers').insert({
          machine_id: machine.id,
          host_id: user.id,
          price_per_gpu_hr_usd: price,
          storage_price_per_gb_month_usd: 4.5,
          min_gpu: 1,
          offer_end_date: endDate.toISOString(),
          reserved_discount_factor: 0.4,
          status: 'active',
        })
        await supabase.from('machines').update({ listed: true, price_per_hour_usd: price }).eq('id', machine.id)
        setEditingPrice(null)
        setPriceInput('')
      })
    }
  }

  if (machines.length === 0) {
    return (
      <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-10 text-center">
        <p className="text-[#94A3B8] text-sm">No machines registered yet.</p>
        <p className="text-[#64748B] text-xs mt-1">
          Click <span className="text-primary font-bold">+ List Machine</span> above to get started.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-bold text-[#94A3B8] uppercase tracking-[0.15em]">
          Your Machines <span className="text-[#64748B]">({machines.length})</span>
        </h2>
      </div>

      <div className="space-y-3">
        {machines.map(machine => {
          const offer = getActiveOffer(machine)
          const status = statusInfo(machine)
          const badge = tierBadge(machine.machine_tier)
          const gpuAlloc = machine.gpu_count > 0
            ? Math.round((machine.gpu_allocated || 0) / machine.gpu_count * 100)
            : 0
          const totalEarned = machine.instances?.reduce(
            (acc: number, i: any) => acc + (i.total_cost_usd || 0), 0
          ) || 0
          const contracts = (machine.rental_contracts ?? []).filter((c: any) => c.status === 'active')
          const allocatedGpus = contracts.reduce((acc: number, c: any) => acc + (c.gpu_count || 0), 0)
          const isRented = machine.status === 'rented' || contracts.length > 0
          const isPaused = machine.status === 'paused'
          const isOffline = machine.status === 'offline'
          const isListed = !!offer
          const isEditingThis = editingPrice === machine.id
          const currentAction = loadingAction[machine.id]
          const heartbeat = relativeTime(machine.last_heartbeat)

          return (
            <div
              key={machine.id}
              className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-5 transition-colors hover:border-white/[0.1]"
            >
              {/* Row 1: status + GPU specs + meta */}
              <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 mb-1">
                <span className="flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${status.color}`} />
                  <span className="text-xs font-medium text-[#94A3B8]">{status.label}</span>
                </span>
                <span className="text-sm font-semibold text-[#E2E8F0]">
                  {machine.gpu_count}x {machine.gpu_model}
                </span>
                <span className="text-xs text-[#94A3B8]">{machine.vram_gb}GB VRAM</span>
                <span className="text-xs text-[#64748B]">{machine.ram_gb}GB RAM</span>
              </div>

              {/* Row 2: tier, heartbeat, ID */}
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mb-3 text-[11px] text-[#64748B]">
                <span className={`px-1.5 py-0.5 rounded border text-[10px] font-bold ${badge.cls}`}>
                  {badge.label}
                </span>
                <span className="text-[#475569]">│</span>
                <span>
                  Last heartbeat:{' '}
                  <span className={isOffline ? 'text-red-400' : 'text-[#94A3B8]'}>{heartbeat}</span>
                </span>
                <span className="text-[#475569]">│</span>
                <button
                  onClick={() => handleCopyId(machine.id)}
                  className="font-mono text-[#94A3B8] hover:text-[#E2E8F0] transition-colors cursor-pointer"
                  title="Click to copy full ID"
                >
                  {copiedId === machine.id ? 'Copied!' : `ID: ${machine.id.substring(0, 8)}…`}
                </button>
              </div>

              {/* Row 3: price, utilization, earnings */}
              <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mb-3">
                <div className="flex items-center gap-1.5 text-sm">
                  <span className="text-xs text-[#94A3B8]">Price:</span>
                  {offer ? (
                    <span className="font-mono text-[#E2E8F0]">
                      {formatUSD(Number(offer.price_per_gpu_hr_usd), { suffix: '/GPU/hr' })}
                      {offer.auto_price && (
                        <span className="text-primary text-[10px] ml-1">(auto)</span>
                      )}
                    </span>
                  ) : (
                    <span className="text-xs text-[#64748B] italic">Not listed</span>
                  )}
                </div>
                <span className="text-[#475569] hidden sm:inline">│</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[#94A3B8]">Utilization:</span>
                  <div className="w-20 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary transition-all duration-300"
                      style={{ width: `${gpuAlloc}%` }}
                    />
                  </div>
                  <span className="font-mono text-xs text-[#94A3B8]">{gpuAlloc}%</span>
                </div>
                <span className="text-[#475569] hidden sm:inline">│</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-[#94A3B8]">Earned:</span>
                  <span className="font-mono text-xs text-primary">
                    {formatUSD(totalEarned)}
                  </span>
                </div>
              </div>

              {/* Row 4: active rentals */}
              <div className="text-xs text-[#94A3B8] mb-4">
                Active rentals: {contracts.length}/{machine.gpu_count} GPUs allocated
                {contracts.length > 0 && (
                  <span className="text-[#64748B] ml-2">
                    ({contracts
                      .map((c: any) =>
                        `${c.gpu_count} GPU ${(c.rental_type || 'on_demand').replace('_', ' ')}`
                      )
                      .join(', ')})
                  </span>
                )}
              </div>

              {/* Inline price editor */}
              {isEditingThis && (
                <div className="flex items-center gap-2 mb-4 p-3 bg-white/[0.03] rounded-lg border border-white/[0.06]">
                  <span className="text-xs text-[#94A3B8]">
                    {isListed ? 'New price:' : 'Set price to list:'}
                  </span>
                  <div className="relative">
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[#94A3B8] text-xs">$</span>
                    <input
                      type="number"
                      step="0.50"
                      min="1"
                      value={priceInput}
                      onChange={e => setPriceInput(e.target.value)}
                      placeholder={offer ? String(Number(offer.price_per_gpu_hr_usd).toFixed(0)) : '35'}
                      autoFocus
                      onKeyDown={e => {
                        if (e.key === 'Enter') handleSavePrice(machine)
                        if (e.key === 'Escape') { setEditingPrice(null); setPriceInput('') }
                      }}
                      className="w-28 rounded-lg pl-5 pr-2 py-1.5 bg-white/[0.03] border border-white/[0.08] text-xs text-[#E2E8F0] font-mono focus:border-primary focus:outline-none"
                    />
                  </div>
                  <span className="text-[10px] text-[#64748B]">/GPU/hr</span>
                  <button
                    onClick={() => handleSavePrice(machine)}
                    disabled={!!currentAction}
                    className="bg-gradient-to-r from-primary-dark to-primary text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {currentAction === 'price' || currentAction === 'list' ? 'Saving…' : 'Save'}
                  </button>
                  <button
                    onClick={() => { setEditingPrice(null); setPriceInput('') }}
                    className="text-xs text-[#94A3B8] hover:text-[#E2E8F0] transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              )}

              {/* Offline warning */}
              {isOffline && (
                <div className="flex items-center gap-1.5 mb-4 text-xs text-red-400">
                  <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                  Last seen: {heartbeat}
                </div>
              )}

              {/* Action buttons */}
              <div className="flex items-center gap-2 flex-wrap">
                {isListed && !isEditingThis && (
                  <button
                    onClick={() => {
                      setEditingPrice(machine.id)
                      setPriceInput(String(Number(offer.price_per_gpu_hr_usd).toFixed(0)))
                    }}
                    disabled={!!currentAction}
                    className="bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] text-xs text-[#94A3B8] px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                  >
                    Edit Price
                  </button>
                )}

                {!isListed && !isEditingThis && !isOffline && (
                  <button
                    onClick={() => {
                      setEditingPrice(machine.id)
                      setPriceInput(
                        machine.price_per_hour_usd
                          ? String(Number(machine.price_per_hour_usd).toFixed(0))
                          : ''
                      )
                    }}
                    disabled={!!currentAction}
                    className="bg-gradient-to-r from-primary-dark to-primary text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                  >
                    List
                  </button>
                )}

                {isListed && !isRented && (
                  <button
                    onClick={() => {
                      if (!confirm('Unlist this machine? New bookings will stop.')) return
                      withAction(machine.id, 'unlist', () => unlistOffer(offer.id))
                    }}
                    disabled={!!currentAction}
                    className="bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] text-xs text-[#94A3B8] px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {currentAction === 'unlist' ? 'Unlisting…' : 'Unlist'}
                  </button>
                )}

                {!isPaused && !isOffline && (
                  <button
                    onClick={() => {
                      if (!confirm('Pause this machine? No new rentals will be accepted.')) return
                      withAction(machine.id, 'pause', () => pauseMachine(machine.id))
                    }}
                    disabled={!!currentAction}
                    className="bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] text-xs text-yellow-400 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {currentAction === 'pause' ? 'Pausing…' : 'Pause'}
                  </button>
                )}

                {(isPaused || isOffline) && (
                  <button
                    onClick={() => withAction(machine.id, 'resume', () => resumeMachine(machine.id))}
                    disabled={!!currentAction}
                    className="bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] text-xs text-primary px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {currentAction === 'resume' ? 'Resuming…' : 'Resume'}
                  </button>
                )}

                {!isRented ? (
                  <button
                    onClick={() => {
                      if (!confirm('Permanently remove this machine? This cannot be undone.')) return
                      withAction(machine.id, 'remove', () => removeMachine(machine.id))
                    }}
                    disabled={!!currentAction}
                    className="text-red-400 hover:bg-red-500/10 text-xs px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {currentAction === 'remove' ? 'Removing…' : 'Remove'}
                  </button>
                ) : (
                  <span className="text-xs text-blue-400 px-3 py-1.5">
                    ● {allocatedGpus}/{machine.gpu_count} GPUs in use
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
