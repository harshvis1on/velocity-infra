'use client'

import { useState } from 'react'
import {
  createOffer,
  unlistOffer,
  unlistMachine,
  scheduleMaintenance,
  cancelMaintenance,
} from './actions'
import { createClient } from '@/utils/supabase/client'

function getActiveOffer(machine: any) {
  return machine.offers?.find((o: any) => o.status === 'active') ?? null
}

function statusColor(status: string) {
  if (status === 'rented') return 'bg-green-500'
  if (status === 'available') return 'bg-blue-500'
  return 'bg-gray-500'
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
  const [expanded, setExpanded] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [selectedMachines, setSelectedMachines] = useState<Set<string>>(new Set())
  const [bulkPrice, setBulkPrice] = useState('')
  const [selfTestRequested, setSelfTestRequested] = useState<Record<string, boolean>>({})

  const toggleExpand = (id: string) => setExpanded(prev => prev === id ? null : id)
  const toggleSelect = (id: string) => {
    setSelectedMachines(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }
  const selectAll = () => {
    if (selectedMachines.size === machines.length) {
      setSelectedMachines(new Set())
    } else {
      setSelectedMachines(new Set(machines.map(m => m.id)))
    }
  }

  const handleBulkPrice = async () => {
    if (!bulkPrice || selectedMachines.size === 0) return
    setLoading(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      for (const mid of Array.from(selectedMachines)) {
        const machine = machines.find(m => m.id === mid)
        const hasOffer = getActiveOffer(machine)
        if (hasOffer) continue

        const endDate = new Date()
        endDate.setDate(endDate.getDate() + 30)

        await supabase.from('offers').insert({
          machine_id: mid,
          host_id: user.id,
          price_per_gpu_hr_inr: parseFloat(bulkPrice),
          storage_price_per_gb_month_inr: 4.5,
          min_gpu: 1,
          offer_end_date: endDate.toISOString(),
          reserved_discount_factor: 0.4,
          status: 'active',
        })
        await supabase.from('machines').update({ listed: true, price_per_hour_inr: parseFloat(bulkPrice) }).eq('id', mid)
      }
      window.location.reload()
    } catch (err: any) {
      alert(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleUnlistOffer = async (offerId: string) => {
    if (!confirm('Unlist this offer? New bookings will stop.')) return
    setLoading(true)
    try { await unlistOffer(offerId) } catch (err: any) { alert(err.message) } finally { setLoading(false) }
  }

  const handleUnlistMachine = async (id: string) => {
    if (!confirm('Take this machine offline?')) return
    setLoading(true)
    try { await unlistMachine(id) } catch (err: any) { alert(err.message) } finally { setLoading(false) }
  }

  const handleRequestSelfTest = async (machineId: string) => {
    setSelfTestRequested(prev => ({ ...prev, [machineId]: true }))
    try {
      const supabase = createClient()
      await supabase.from('machines').update({ self_test_requested: true }).eq('id', machineId)
    } catch (err: any) {
      alert('Failed: ' + err.message)
      setSelfTestRequested(prev => ({ ...prev, [machineId]: false }))
    }
  }

  const handleScheduleMaintenance = async (e: React.FormEvent<HTMLFormElement>, machineId: string) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const start = fd.get('maint_start') as string
    const hrs = parseFloat(fd.get('maint_hrs') as string)
    if (!start || !hrs) return alert('Enter start time and duration')
    setLoading(true)
    try { await scheduleMaintenance(machineId, start, hrs); e.currentTarget.reset() } catch (err: any) { alert(err.message) } finally { setLoading(false) }
  }

  if (machines.length === 0) {
    return (
      <div className="bg-white/5 border border-white/10 rounded-xl p-8 text-center text-gray-500">
        No machines registered yet. Click <span className="text-primary font-bold">+ List Machine</span> to get started.
      </div>
    )
  }

  const unlistedCount = machines.filter(m => !getActiveOffer(m)).length

  return (
    <div className="space-y-4">
      {/* Bulk actions bar */}
      {selectedMachines.size > 0 && (
        <div className="flex items-center gap-3 p-3 bg-primary/5 border border-primary/20 rounded-xl">
          <span className="text-sm text-primary font-medium">{selectedMachines.size} selected</span>
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-xs text-gray-400">Set price for all:</span>
            <div className="relative">
              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500 text-xs">₹</span>
              <input
                type="number" step="0.50" min="1"
                value={bulkPrice}
                onChange={e => setBulkPrice(e.target.value)}
                placeholder="35"
                className="w-24 rounded pl-5 pr-2 py-1.5 bg-black/50 border border-white/10 text-xs text-white font-mono focus:border-primary focus:outline-none"
              />
            </div>
            <span className="text-xs text-gray-500">/GPU/hr</span>
            <button
              onClick={handleBulkPrice}
              disabled={loading || !bulkPrice}
              className="bg-primary hover:bg-primary-dark text-black text-xs font-bold py-1.5 px-4 rounded-lg transition-colors disabled:opacity-50"
            >
              List All
            </button>
            <button onClick={() => setSelectedMachines(new Set())} className="text-xs text-gray-400 hover:text-white ml-1">Clear</button>
          </div>
        </div>
      )}

      {/* Table header */}
      <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
        <div className="grid grid-cols-[40px_1fr_100px_120px_100px_80px_60px] items-center px-4 py-2.5 border-b border-white/10 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
          <div>
            <input
              type="checkbox"
              checked={selectedMachines.size === machines.length}
              onChange={selectAll}
              className="rounded border-white/20 bg-black/50 accent-primary w-3.5 h-3.5"
            />
          </div>
          <div>Machine</div>
          <div>Status</div>
          <div>Price</div>
          <div>Utilization</div>
          <div>Earned</div>
          <div></div>
        </div>

        {/* Machine rows */}
        {machines.map(machine => {
          const offer = getActiveOffer(machine)
          const isExpanded = expanded === machine.id
          const gpuAlloc = machine.gpu_count > 0 ? Math.round((machine.gpu_allocated || 0) / machine.gpu_count * 100) : 0
          const totalEarned = machine.instances?.reduce((acc: number, i: any) => acc + (i.total_cost_inr || 0), 0) || 0
          const badge = tierBadge(machine.machine_tier)
          const contracts = (machine.rental_contracts ?? []).filter((c: any) => c.status === 'active')
          const maintenanceRows = (machine.maintenance_windows ?? []).filter((w: any) => w.status === 'scheduled' || w.status === 'active')

          return (
            <div key={machine.id} className={`border-b border-white/5 last:border-b-0 ${isExpanded ? 'bg-white/[0.02]' : ''}`}>
              {/* Compact row */}
              <div
                className="grid grid-cols-[40px_1fr_100px_120px_100px_80px_60px] items-center px-4 py-3 cursor-pointer hover:bg-white/[0.03] transition-colors"
                onClick={() => toggleExpand(machine.id)}
              >
                <div onClick={e => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={selectedMachines.has(machine.id)}
                    onChange={() => toggleSelect(machine.id)}
                    className="rounded border-white/20 bg-black/50 accent-primary w-3.5 h-3.5"
                  />
                </div>
                <div className="flex items-center gap-3 min-w-0">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm text-white truncate">
                        {machine.gpu_count}x {machine.gpu_model}
                      </span>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${badge.cls}`}>{badge.label}</span>
                    </div>
                    <div className="text-[11px] text-gray-500 truncate">
                      {machine.vram_gb}GB VRAM · {machine.ram_gb}GB RAM · {machine.id.substring(0, 8)}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className={`w-1.5 h-1.5 rounded-full ${statusColor(machine.status)}`} />
                  <span className="text-xs text-gray-300 capitalize">{machine.status}</span>
                </div>
                <div>
                  {offer ? (
                    <span className="font-mono text-sm text-white">₹{Number(offer.price_per_gpu_hr_inr).toFixed(0)}<span className="text-gray-500 text-[10px]">/GPU/hr</span></span>
                  ) : (
                    <span className="text-xs text-gray-500 italic">Not listed</span>
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden">
                      <div className="h-full rounded-full bg-gradient-to-r from-blue-500 to-green-500" style={{ width: `${gpuAlloc}%` }} />
                    </div>
                    <span className="text-[10px] font-mono text-gray-400 w-8 text-right">{gpuAlloc}%</span>
                  </div>
                </div>
                <div className="font-mono text-xs text-primary">₹{totalEarned.toFixed(0)}</div>
                <div className="flex justify-end">
                  <svg className={`w-4 h-4 text-gray-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>

              {/* Expanded details */}
              {isExpanded && (
                <div className="px-4 pb-4 pt-1 grid md:grid-cols-3 gap-4">
                  {/* Offer & Pricing */}
                  <div className="bg-black/30 border border-white/5 rounded-lg p-4">
                    <h5 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-3">Listing</h5>
                    {offer ? (
                      <div className="space-y-2 text-xs">
                        <div className="flex justify-between"><span className="text-gray-400">On-Demand</span><span className="font-mono text-white">₹{Number(offer.price_per_gpu_hr_inr).toFixed(0)}/GPU/hr</span></div>
                        <div className="flex justify-between"><span className="text-gray-400">Reserved</span><span className="font-mono text-green-400">₹{(Number(offer.price_per_gpu_hr_inr) * (1 - Number(offer.reserved_discount_factor || 0.4))).toFixed(0)}/GPU/hr</span></div>
                        {offer.interruptible_min_price_inr != null && (
                          <div className="flex justify-between"><span className="text-gray-400">Interruptible</span><span className="font-mono text-yellow-400">₹{Number(offer.interruptible_min_price_inr).toFixed(0)}/GPU/hr</span></div>
                        )}
                        <div className="flex justify-between"><span className="text-gray-400">Storage</span><span className="font-mono">₹{Number(offer.storage_price_per_gb_month_inr).toFixed(1)}/GB/mo</span></div>
                        <div className="flex justify-between"><span className="text-gray-400">Min GPUs</span><span className="font-mono">{offer.min_gpu}</span></div>
                        <div className="flex justify-between"><span className="text-gray-400">Expires</span><span className="text-gray-300">{offer.offer_end_date ? new Date(offer.offer_end_date).toLocaleDateString() : '—'}</span></div>
                        <button onClick={() => handleUnlistOffer(offer.id)} disabled={loading} className="w-full mt-2 text-center text-[11px] font-bold py-1.5 rounded border border-red-500/20 text-red-400 hover:bg-red-500/10 disabled:opacity-50">Unlist</button>
                      </div>
                    ) : (
                      <p className="text-xs text-gray-500">Not listed. Use "Create Offer" to publish.</p>
                    )}
                  </div>

                  {/* Health & Metrics */}
                  <div className="bg-black/30 border border-white/5 rounded-lg p-4">
                    <h5 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-3">Health</h5>
                    <div className="space-y-1.5 text-xs">
                      <div className="flex justify-between"><span className="text-gray-400">Reliability</span><span className={`font-mono ${(machine.reliability_score || 0) >= 85 ? 'text-green-400' : 'text-red-400'}`}>{Number(machine.reliability_score || 0).toFixed(1)}%</span></div>
                      <div className="flex justify-between"><span className="text-gray-400">Heartbeat</span><span className="font-mono text-gray-300">{relativeTime(machine.last_heartbeat)}</span></div>
                      <div className="flex justify-between"><span className="text-gray-400">GPU Temp</span><span className={`font-mono ${(machine.gpu_temp || 0) >= 90 ? 'text-red-400' : 'text-green-400'}`}>{machine.gpu_temp || 0}°C</span></div>
                      <div className="flex justify-between"><span className="text-gray-400">CUDA</span><span className="font-mono text-gray-300">{machine.cuda_version || '—'}</span></div>
                      <div className="flex justify-between"><span className="text-gray-400">Self-Test</span><span className={machine.self_test_passed ? 'text-green-400' : 'text-yellow-400'}>{machine.self_test_passed ? 'Passed' : 'Pending'}</span></div>
                      <div className="flex justify-between"><span className="text-gray-400">Public IP</span><span className="font-mono text-gray-300 text-[10px]">{machine.public_ip || '—'}</span></div>
                      <button
                        onClick={() => handleRequestSelfTest(machine.id)}
                        disabled={selfTestRequested[machine.id]}
                        className="w-full mt-2 text-[11px] font-bold py-1.5 rounded border border-blue-500/20 text-blue-400 bg-blue-500/5 hover:bg-blue-500/10 disabled:opacity-50"
                      >
                        {selfTestRequested[machine.id] ? 'Requested...' : 'Run Self-Test'}
                      </button>
                    </div>
                  </div>

                  {/* Contracts & Actions */}
                  <div className="bg-black/30 border border-white/5 rounded-lg p-4 space-y-4">
                    <div>
                      <h5 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Rentals ({contracts.length})</h5>
                      {contracts.length === 0 ? (
                        <p className="text-xs text-gray-500 italic">No active rentals</p>
                      ) : (
                        <div className="space-y-1.5">
                          {contracts.map((c: any) => (
                            <div key={c.id} className="flex items-center justify-between text-[11px] bg-black/30 rounded px-2 py-1.5 border border-white/5">
                              <span className="font-mono text-gray-400">{c.gpu_count} GPU</span>
                              <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                                c.rental_type === 'reserved' ? 'bg-green-500/10 text-green-400' :
                                c.rental_type === 'interruptible' ? 'bg-yellow-500/10 text-yellow-400' :
                                'bg-blue-500/10 text-blue-400'
                              }`}>{(c.rental_type || 'on_demand').replace('_', ' ')}</span>
                              <span className="font-mono text-primary">₹{Number(c.price_per_gpu_hr_inr).toFixed(0)}/hr</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Maintenance */}
                    <div>
                      <h5 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Maintenance</h5>
                      {maintenanceRows.length > 0 && (
                        <div className="space-y-1 mb-2">
                          {maintenanceRows.map((w: any) => (
                            <div key={w.id} className="text-[11px] text-yellow-400 bg-yellow-500/5 rounded px-2 py-1 border border-yellow-500/10">
                              {w.start_date ? new Date(w.start_date).toLocaleDateString() : '—'} · {w.duration_hrs}h
                            </div>
                          ))}
                        </div>
                      )}
                      <form onSubmit={e => handleScheduleMaintenance(e, machine.id)} className="flex gap-1.5">
                        <input name="maint_start" type="datetime-local" className="flex-1 bg-black/50 border border-white/10 rounded px-2 py-1 text-[10px] text-white focus:border-primary focus:outline-none" />
                        <input name="maint_hrs" type="number" step="0.5" min="0.5" defaultValue={2} className="w-12 bg-black/50 border border-white/10 rounded px-1.5 py-1 text-[10px] text-white focus:border-primary focus:outline-none" />
                        <button type="submit" disabled={loading} className="text-[10px] font-bold px-2 py-1 rounded bg-white/5 border border-white/10 hover:bg-white/10 disabled:opacity-50">Set</button>
                      </form>
                    </div>

                    <button
                      onClick={() => handleUnlistMachine(machine.id)}
                      disabled={loading}
                      className="text-[11px] text-red-400 hover:text-red-300"
                    >
                      Take machine offline
                    </button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Summary */}
      <div className="text-xs text-gray-500 text-center">
        {machines.length} machine{machines.length !== 1 ? 's' : ''} · {unlistedCount > 0 ? `${unlistedCount} not listed` : 'All listed'}
      </div>
    </div>
  )
}
