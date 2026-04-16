'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { stopInstance, destroyInstance } from './actions'
import ConnectButton from './ConnectButton'
import { formatUSD } from '@/lib/currency'

const OFFERS_SELECT =
  '*,machines(id,gpu_model,gpu_count,vram_gb,ram_gb,vcpu_count,storage_gb,location,machine_tier,reliability_score,gpu_allocated,inet_down_mbps,inet_up_mbps,public_ip,dlperf_score)'

interface CatalogEntry {
  model: string
  vramGb: number
  minPricePerGpuHr: number
  availableCount: number
  totalOffers: number
  offers: any[]
}

function formatUptime(createdAt: string): string {
  const ms = Date.now() - new Date(createdAt).getTime()
  const totalMinutes = Math.floor(ms / 60000)
  if (totalMinutes < 60) return `${totalMinutes}m`
  const h = Math.floor(totalMinutes / 60)
  const m = totalMinutes % 60
  if (h < 24) return `${h}h ${m}m`
  const d = Math.floor(h / 24)
  return `${d}d ${h % 24}h`
}

function gpuCountChoices(maxAvail: number): number[] {
  const choices: number[] = []
  for (const n of [1, 2, 4, 8]) {
    if (n <= maxAvail) choices.push(n)
  }
  return choices
}

function statusBadge(status: string) {
  const map: Record<string, { dot: string; bg: string; text: string; label: string }> = {
    running: { dot: 'bg-primary', bg: 'bg-primary/[0.15]', text: 'text-primary', label: 'Running' },
    creating: { dot: 'bg-amber-500', bg: 'bg-amber-500/[0.15]', text: 'text-amber-400', label: 'Creating' },
    loading: { dot: 'bg-blue-500', bg: 'bg-blue-500/[0.15]', text: 'text-blue-400', label: 'Loading' },
    stopped: { dot: 'bg-[#EF4444]', bg: 'bg-red-500/[0.15]', text: 'text-red-400', label: 'Stopped' },
    failed: { dot: 'bg-red-500', bg: 'bg-red-500/[0.15]', text: 'text-red-400', label: 'Failed' },
    error: { dot: 'bg-red-500', bg: 'bg-red-500/[0.15]', text: 'text-red-400', label: 'Error' },
    destroyed: { dot: 'bg-[#64748B]', bg: 'bg-[#64748B]/[0.15]', text: 'text-[#64748B]', label: 'Destroyed' },
  }
  const s = map[status] || map.stopped
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg ${s.bg} ${s.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot} ${status === 'creating' || status === 'loading' ? 'animate-pulse' : ''}`} />
      {s.label}
    </span>
  )
}

export default function Marketplace({
  initialOffers,
  activeInstances,
  walletBalance,
  templates,
  sshKeys,
}: {
  initialOffers: any[]
  activeInstances: any[]
  walletBalance: number
  templates: any[]
  sshKeys: any[]
}) {
  const router = useRouter()

  const [offers, setOffers] = useState(initialOffers)
  const [tab, setTab] = useState<'gpus' | 'pods'>('gpus')

  // Deploy modal state
  const [deployGpu, setDeployGpu] = useState<CatalogEntry | null>(null)
  const [gpuCount, setGpuCount] = useState(1)
  const [selectedTemplate, setSelectedTemplate] = useState<any | null>(null)
  const [containerImage, setContainerImage] = useState('')
  const [diskSize, setDiskSize] = useState(20)
  const [selectedSshKey, setSelectedSshKey] = useState('')
  const [newSshKey, setNewSshKey] = useState('')
  const [launchMode, setLaunchMode] = useState('ssh')
  const [isDeploying, setIsDeploying] = useState(false)
  const [deployError, setDeployError] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  // Refresh offers on mount
  useEffect(() => {
    const supabase = createClient()
    ;(async () => {
      const { data, error } = await supabase
        .from('offers')
        .select(OFFERS_SELECT)
        .eq('status', 'active')
        .order('price_per_gpu_hr_usd', { ascending: true })
      if (!error && data) setOffers(data)
    })()
  }, [])

  // Realtime instance updates
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel('instances_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'instances' }, (payload: any) => {
        const newStatus = payload.new?.status
        const oldStatus = payload.old?.status
        if (newStatus && newStatus !== oldStatus) {
          const msgs: Record<string, string> = {
            running: 'Pod is now running',
            stopped: 'Pod stopped',
            destroyed: 'Pod destroyed',
          }
          if (msgs[newStatus]) {
            setToast(msgs[newStatus])
            setTimeout(() => setToast(null), 4000)
          }
        }
        router.refresh()
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [router])

  // Poll for creating instances
  useEffect(() => {
    if (!activeInstances.some(i => i.status === 'creating' || i.status === 'loading')) return
    const interval = setInterval(() => router.refresh(), 10000)
    return () => clearInterval(interval)
  }, [activeInstances, router])

  // Aggregate offers into GPU catalog
  const gpuCatalog = useMemo(() => {
    const catalog: Record<string, CatalogEntry> = {}
    for (const offer of offers) {
      const m = offer.machines
      if (!m) continue
      const key = m.gpu_model
      if (!catalog[key]) {
        catalog[key] = {
          model: m.gpu_model,
          vramGb: m.vram_gb,
          minPricePerGpuHr: offer.price_per_gpu_hr_usd,
          availableCount: 0,
          totalOffers: 0,
          offers: [],
        }
      }
      const avail = Math.max(0, (m.gpu_count || 0) - (m.gpu_allocated || 0))
      catalog[key].availableCount += avail
      catalog[key].totalOffers += 1
      catalog[key].minPricePerGpuHr = Math.min(catalog[key].minPricePerGpuHr, offer.price_per_gpu_hr_usd)
      catalog[key].offers.push(offer)
    }
    return Object.values(catalog).sort((a, b) => a.minPricePerGpuHr - b.minPricePerGpuHr)
  }, [offers])

  // Pick the best offer for a GPU model + gpu count
  function pickBestOffer(entry: CatalogEntry, count: number) {
    return entry.offers
      .filter(o => {
        const m = o.machines
        if (!m) return false
        const avail = Math.max(0, (m.gpu_count || 0) - (m.gpu_allocated || 0))
        return avail >= count
      })
      .sort((a: any, b: any) => a.price_per_gpu_hr_usd - b.price_per_gpu_hr_usd)[0] || null
  }

  // Estimated cost
  const estimatedCost = useMemo(() => {
    if (!deployGpu) return 0
    const bestOffer = pickBestOffer(deployGpu, gpuCount)
    if (!bestOffer) return 0
    const gpuCost = bestOffer.price_per_gpu_hr_usd * gpuCount
    const storageCost = (Number(bestOffer.storage_price_per_gb_month_usd || 0) * diskSize) / (30 * 24)
    return gpuCost + storageCost
  }, [deployGpu, gpuCount, diskSize])

  const serverWalletCheck = useMemo(() => {
    if (!deployGpu) return 0
    const bestOffer = pickBestOffer(deployGpu, gpuCount)
    if (!bestOffer) return 0
    return bestOffer.price_per_gpu_hr_usd * gpuCount
  }, [deployGpu, gpuCount])

  function openDeployModal(entry: CatalogEntry) {
    setDeployGpu(entry)
    setGpuCount(1)
    setSelectedTemplate(templates[0] || null)
    setContainerImage(templates[0]?.docker_image || '')
    setLaunchMode(templates[0]?.launch_mode || 'ssh')
    setDiskSize(20)
    setSelectedSshKey(sshKeys[0]?.id || '')
    setNewSshKey('')
    setDeployError(null)
  }

  async function handleDeploy() {
    if (!deployGpu || !selectedTemplate) return
    const bestOffer = pickBestOffer(deployGpu, gpuCount)
    if (!bestOffer) {
      setDeployError('No offer available for this configuration.')
      return
    }

    setIsDeploying(true)
    setDeployError(null)

    try {
      const res = await fetch('/api/console/rent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          offerId: bestOffer.id,
          gpuCount,
          templateId: selectedTemplate.id,
          diskSize,
          launchMode,
          rentalType: 'on_demand',
          sshKeyId: selectedSshKey || undefined,
          newSshKey: newSshKey || undefined,
        }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.error || 'Failed to deploy')
      setDeployGpu(null)
      setToast('Pod deploying...')
      setTimeout(() => setToast(null), 4000)
      router.refresh()
    } catch (err: any) {
      setDeployError(err.message || 'Failed to deploy')
    } finally {
      setIsDeploying(false)
    }
  }

  async function handleStop(id: string) {
    if (!confirm('Stop this pod? GPU will be released but storage billing continues.')) return
    try {
      await stopInstance(id)
    } catch (err: any) {
      alert(err.message || 'Failed to stop')
    }
  }

  async function handleDestroy(id: string) {
    if (!confirm('Destroy this pod? All data will be permanently deleted.')) return
    try {
      await destroyInstance(id)
    } catch (err: any) {
      alert(err.message || 'Failed to destroy')
    }
  }

  return (
    <div className="p-6 md:p-8 max-w-[1200px] mx-auto w-full">
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-[60] animate-in fade-in slide-in-from-top-2 bg-primary/15 border border-primary/30 text-primary px-4 py-3 rounded-lg text-sm font-medium shadow-xl backdrop-blur-sm flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          {toast}
        </div>
      )}

      {/* Tab bar */}
      <div className="flex gap-1 p-1 bg-white/[0.02] border border-white/[0.06] rounded-xl w-fit mb-8">
        {(['gpus', 'pods'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${
              tab === t
                ? 'bg-primary/[0.15] text-primary shadow-sm'
                : 'text-[#64748B] hover:text-[#94A3B8]'
            }`}
          >
            {t === 'gpus' ? 'GPUs' : 'My Pods'}
            {t === 'pods' && activeInstances.length > 0 && (
              <span className="ml-2 bg-primary/20 text-primary text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                {activeInstances.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* =================== GPUs Tab =================== */}
      {tab === 'gpus' && (
        <div>
          <div className="mb-6">
            <h2 className="text-2xl font-heading font-bold text-white mb-1">GPU Catalog</h2>
            <p className="text-sm text-[#94A3B8]">Choose a GPU type to deploy. Prices shown are the lowest available.</p>
          </div>

          {gpuCatalog.length === 0 ? (
            <div className="py-16 text-center text-[#64748B] bg-white/[0.03] border border-white/[0.06] rounded-2xl">
              <p className="text-lg font-medium mb-1">No GPUs available</p>
              <p className="text-sm">Check back later for new inventory.</p>
            </div>
          ) : (
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl overflow-hidden">
              {/* Table header */}
              <div className="grid grid-cols-[1fr_80px_100px_120px_100px] gap-4 px-5 py-3 border-b border-white/[0.06]">
                <span className="text-[10px] uppercase tracking-wider text-[#475569] font-semibold">GPU Model</span>
                <span className="text-[10px] uppercase tracking-wider text-[#475569] font-semibold">VRAM</span>
                <span className="text-[10px] uppercase tracking-wider text-[#475569] font-semibold">Available</span>
                <span className="text-[10px] uppercase tracking-wider text-[#475569] font-semibold">From</span>
                <span className="text-[10px] uppercase tracking-wider text-[#475569] font-semibold text-right">Action</span>
              </div>

              {/* Table rows */}
              {gpuCatalog.map(entry => (
                <div
                  key={entry.model}
                  className="grid grid-cols-[1fr_80px_100px_120px_100px] gap-4 px-5 py-4 border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors items-center"
                >
                  <div>
                    <span className="font-bold text-white">{entry.model}</span>
                    <span className="ml-2 text-xs text-[#475569]">{entry.totalOffers} offer{entry.totalOffers !== 1 ? 's' : ''}</span>
                  </div>
                  <span className="text-sm text-[#94A3B8] font-mono">{entry.vramGb} GB</span>
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${entry.availableCount > 0 ? 'bg-primary shadow-[0_0_6px_rgba(129,140,248,0.5)]' : 'bg-[#64748B]'}`} />
                    <span className={`text-sm font-mono ${entry.availableCount > 0 ? 'text-[#E2E8F0]' : 'text-[#64748B]'}`}>
                      {entry.availableCount} GPU{entry.availableCount !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <span className="text-sm text-primary font-mono font-semibold">
                    {formatUSD(entry.minPricePerGpuHr, { suffix: '/hr' })}
                  </span>
                  <div className="text-right">
                    <button
                      onClick={() => openDeployModal(entry)}
                      disabled={entry.availableCount === 0}
                      className="bg-gradient-to-r from-primary-dark to-primary hover:shadow-glow text-white text-xs font-bold px-4 py-1.5 rounded-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      Deploy
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* =================== My Pods Tab =================== */}
      {tab === 'pods' && (
        <div>
          <div className="mb-6">
            <h2 className="text-2xl font-heading font-bold text-white mb-1">My Pods</h2>
            <p className="text-sm text-[#94A3B8]">Manage your running GPU instances.</p>
          </div>

          {activeInstances.length === 0 ? (
            <div className="py-16 text-center text-[#64748B] bg-white/[0.03] border border-white/[0.06] rounded-2xl">
              <p className="text-lg font-medium mb-1">No active pods</p>
              <p className="text-sm mb-4">Deploy a GPU to get started.</p>
              <button
                onClick={() => setTab('gpus')}
                className="bg-gradient-to-r from-primary-dark to-primary hover:shadow-glow text-white text-sm font-bold px-6 py-2 rounded-lg transition-all"
              >
                Browse GPUs
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {activeInstances.map(inst => {
                const m = inst.machines
                const rc = Array.isArray(inst.rental_contracts) ? inst.rental_contracts[0] : inst.rental_contracts
                const gpus = inst.gpu_count || 1
                const disk = inst.disk_size_gb || 0

                let hourly = 0
                if (rc?.price_per_gpu_hr_usd != null) {
                  const gpuHr = Number(rc.price_per_gpu_hr_usd) * gpus
                  const storageHr = (Number(rc.storage_price_per_gb_month_usd || 0) * disk) / (30 * 24)
                  hourly = gpuHr + storageHr
                }

                const podName = `pod-${inst.id.substring(0, 4)}`
                const isActive = inst.status === 'running'
                const isProvisioning = inst.status === 'creating' || inst.status === 'loading'
                const isFailed = inst.status === 'failed' || inst.status === 'error'

                const sshIp = m?.public_ip || 'pending'
                const sshPort = inst.host_port || 'pending'
                const sshCmd = inst.tunnel_url
                  ? `ssh root@${inst.tunnel_url.replace('https://', '')} -p 443`
                  : `ssh root@${sshIp} -p ${sshPort}`

                const jupyterUrl = (inst.launch_mode === 'jupyter' || inst.launch_mode === 'both') && m?.public_ip && inst.host_port
                  ? (inst.tunnel_url || `http://${m.public_ip}:${inst.host_port + 1}`)
                  : null

                return (
                  <div key={inst.id} className="bg-white/[0.03] border border-white/[0.06] rounded-2xl overflow-hidden">
                    {/* Card header */}
                    <div className="p-5">
                      <div className="flex items-start justify-between gap-4 mb-4">
                        <div className="flex items-center gap-3 min-w-0">
                          {statusBadge(inst.status)}
                          <span className="font-bold text-white text-lg truncate">{podName}</span>
                          <span className="text-sm text-[#94A3B8]">
                            {m?.gpu_model ? `${gpus}x ${m.gpu_model}` : '—'}
                          </span>
                          {isActive && (
                            <span className="text-xs text-[#64748B] font-mono">
                              {formatUptime(inst.created_at)}
                            </span>
                          )}
                        </div>
                        <div className="text-right shrink-0">
                          <div className="font-mono text-primary font-bold">{formatUSD(hourly, { suffix: '/hr' })}</div>
                        </div>
                      </div>

                      {/* Info row */}
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#64748B] mb-4">
                        {inst.template_label && <span>{inst.template_label}</span>}
                        {disk > 0 && <span>{disk} GB disk</span>}
                        <span className="font-mono text-[#475569]">ID: {inst.id.substring(0, 8)}</span>
                      </div>

                      {/* Provisioning spinner */}
                      {isProvisioning && (
                        <div className="flex items-center gap-2 text-sm text-amber-400 mb-4">
                          <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          {inst.status === 'loading' ? 'Pulling Docker image...' : 'Provisioning...'}
                        </div>
                      )}

                      {/* Error message */}
                      {isFailed && inst.error_message && (
                        <div className="text-sm text-red-400 bg-red-500/5 border border-red-500/10 rounded-lg px-3 py-2 mb-4">
                          {inst.error_message}
                        </div>
                      )}

                      {/* Connection info for running pods */}
                      {isActive && (
                        <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-3 mb-4">
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <code className="text-xs text-[#94A3B8] font-mono truncate flex-1">{sshCmd}</code>
                            <div className="flex gap-2 shrink-0">
                              <button
                                onClick={() => {
                                  navigator.clipboard.writeText(sshCmd)
                                  setToast('SSH command copied')
                                  setTimeout(() => setToast(null), 2000)
                                }}
                                className="text-[10px] font-semibold text-[#94A3B8] hover:text-white bg-white/[0.04] hover:bg-white/[0.08] px-2.5 py-1 rounded-lg transition-colors"
                              >
                                Copy
                              </button>
                              {jupyterUrl && (
                                <a
                                  href={jupyterUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-[10px] font-semibold text-primary bg-primary/10 hover:bg-primary/20 px-2.5 py-1 rounded transition-colors"
                                >
                                  Jupyter
                                </a>
                              )}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex items-center gap-2">
                        {isActive && (
                          <ConnectButton
                            instanceId={inst.id}
                            publicIp={m?.public_ip}
                            hostPort={inst.host_port}
                            launchMode={inst.launch_mode}
                            tunnelUrl={inst.tunnel_url}
                            sshPassword={inst.ssh_password}
                          />
                        )}
                        {isActive && (
                          <button
                            onClick={() => handleStop(inst.id)}
                            className="text-xs font-semibold text-amber-400 bg-amber-500/[0.15] hover:bg-amber-500/[0.25] border border-amber-500/20 px-3 py-1.5 rounded-lg transition-colors"
                          >
                            Stop
                          </button>
                        )}
                        <button
                          onClick={() => handleDestroy(inst.id)}
                          className="text-xs font-semibold text-red-500 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 px-3 py-1.5 rounded-lg transition-colors"
                        >
                          {isFailed ? 'Delete' : 'Destroy'}
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* =================== Deploy Modal =================== */}
      {deployGpu && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#0B0F19] border border-white/[0.06] rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            {/* Modal header */}
            <div className="p-5 border-b border-white/[0.06] flex justify-between items-center">
              <div>
                <h2 className="text-lg font-heading font-bold text-white">Deploy {deployGpu.model}</h2>
                <p className="text-xs text-[#64748B] mt-0.5">
                  {deployGpu.vramGb} GB VRAM &middot; from {formatUSD(deployGpu.minPricePerGpuHr, { suffix: '/GPU/hr' })}
                </p>
              </div>
              <button
                onClick={() => setDeployGpu(null)}
                className="text-[#64748B] hover:text-white p-1.5 rounded-lg hover:bg-white/[0.06] transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal body */}
            <div className="p-5 overflow-y-auto flex-1 space-y-5">
              {deployError && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-lg">
                  {deployError}
                </div>
              )}

              {/* GPU Count */}
              <div>
                <label className="text-[10px] uppercase tracking-wider text-[#475569] font-semibold mb-2 block">
                  GPU Count
                </label>
                <div className="flex gap-2">
                  {gpuCountChoices(deployGpu.availableCount).map(n => (
                    <button
                      key={n}
                      onClick={() => setGpuCount(n)}
                      className={`px-4 py-2 rounded-lg text-sm font-mono font-semibold border transition-colors ${
                        gpuCount === n
                          ? 'bg-gradient-to-r from-primary-dark to-primary text-white border-primary'
                          : 'bg-white/[0.03] border-white/[0.08] text-[#94A3B8] hover:border-primary/30'
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>

              {/* Template */}
              <div>
                <label className="text-[10px] uppercase tracking-wider text-[#475569] font-semibold mb-2 block">
                  Template
                </label>
                <select
                  value={selectedTemplate?.id || ''}
                  onChange={e => {
                    const t = templates.find((t: any) => t.id === e.target.value)
                    setSelectedTemplate(t || null)
                    if (t) {
                      setContainerImage(t.docker_image || '')
                      setLaunchMode(t.launch_mode || 'ssh')
                    }
                  }}
                  className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-primary/50"
                >
                  {templates.map((t: any) => (
                    <option key={t.id} value={t.id}>{t.label}</option>
                  ))}
                </select>
              </div>

              {/* Container Image */}
              <div>
                <label className="text-[10px] uppercase tracking-wider text-[#475569] font-semibold mb-2 block">
                  Container Image
                </label>
                <input
                  type="text"
                  value={containerImage}
                  onChange={e => setContainerImage(e.target.value)}
                  className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-primary/50"
                  placeholder="pytorch/pytorch:latest"
                />
              </div>

              {/* Disk Size */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-[10px] uppercase tracking-wider text-[#475569] font-semibold">
                    Disk Size
                  </label>
                  <span className="text-xs text-primary font-mono font-semibold">{diskSize} GB</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="200"
                  step="10"
                  value={diskSize}
                  onChange={e => setDiskSize(parseInt(e.target.value))}
                  className="w-full accent-primary"
                />
                <div className="flex justify-between text-[10px] text-[#475569] mt-1">
                  <span>10 GB</span>
                  <span>200 GB</span>
                </div>
              </div>

              {/* SSH Key */}
              <div>
                <label className="text-[10px] uppercase tracking-wider text-[#475569] font-semibold mb-2 block">
                  SSH Key
                </label>
                {sshKeys.length > 0 ? (
                  <select
                    value={selectedSshKey}
                    onChange={e => setSelectedSshKey(e.target.value)}
                    className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-primary/50 mb-2"
                  >
                    <option value="">Select a key...</option>
                    {sshKeys.map((k: any) => (
                      <option key={k.id} value={k.id}>{k.name}</option>
                    ))}
                  </select>
                ) : (
                  <p className="text-xs text-[#64748B] mb-2">No saved keys.</p>
                )}
                <textarea
                  value={newSshKey}
                  onChange={e => setNewSshKey(e.target.value)}
                  placeholder="Or paste a new public key (ssh-rsa ...)"
                  rows={2}
                  className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-primary/50 resize-none"
                />
              </div>
            </div>

            {/* Modal footer */}
            <div className="p-5 border-t border-white/[0.06] flex items-center justify-between">
              <div>
                <div className="text-[10px] uppercase tracking-wider text-[#475569] font-semibold">Estimated Cost</div>
                <div className="font-mono font-bold text-white text-lg mt-0.5">
                  {formatUSD(estimatedCost, { suffix: '/hr' })}
                </div>
                <div className={`text-[10px] mt-0.5 ${walletBalance < serverWalletCheck ? 'text-red-400' : 'text-[#475569]'}`}>
                  Wallet: {formatUSD(walletBalance)}
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeployGpu(null)}
                  className="px-4 py-2 text-sm text-[#94A3B8] hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeploy}
                  disabled={isDeploying || !selectedTemplate || walletBalance < serverWalletCheck}
                  className="bg-gradient-to-r from-primary-dark to-primary hover:shadow-glow text-white text-sm font-bold py-2 px-6 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isDeploying ? (
                    <>
                      <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Deploying...
                    </>
                  ) : (
                    'Deploy'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
