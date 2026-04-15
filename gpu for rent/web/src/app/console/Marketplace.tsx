'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { stopInstance, destroyInstance } from './actions'
import ConnectButton from './ConnectButton'

type RentalTypeTab = 'on_demand' | 'reserved' | 'interruptible'

const OFFERS_SELECT =
  '*,machines(id,gpu_model,gpu_count,vram_gb,ram_gb,vcpu_count,storage_gb,location,machine_tier,reliability_score,gpu_allocated,inet_down_mbps,inet_up_mbps,public_ip,dlperf_score)'

const SORT_OPTIONS = [
  'price_asc',
  'price_desc',
  'dlperf_desc',
  'dlperf_value',
  'vram_desc',
  'rel_desc',
  'trust',
] as const

const RENTAL_TABS: RentalTypeTab[] = ['on_demand', 'reserved', 'interruptible']

function paramsEqual(a: string, b: string) {
  const pa = new URLSearchParams(a)
  const pb = new URLSearchParams(b)
  if (pa.toString() === pb.toString()) return true
  const sortEntries = (p: URLSearchParams) =>
    Array.from(p.entries()).sort((x, y) => x[0].localeCompare(y[0]) || String(x[1]).localeCompare(String(y[1])))
  const ea = sortEntries(pa)
  const eb = sortEntries(pb)
  if (ea.length !== eb.length) return false
  for (let i = 0; i < ea.length; i++) {
    if (ea[i][0] !== eb[i][0] || ea[i][1] !== eb[i][1]) return false
  }
  return true
}

function buildMarketplaceQueryString(state: {
  sortOrder: string
  selectedGpus: string[]
  priceRange: [number, number]
  vramRange: [number, number]
  ramRange: [number, number]
  networkRange: [number, number]
  verifiedOnly: boolean
  rentalTypeTab: RentalTypeTab
  viewMode: 'grid' | 'list'
  activeTab: 'machines' | 'templates'
}) {
  const p = new URLSearchParams()
  if (state.sortOrder !== 'price_asc') p.set('sort', state.sortOrder)
  if (state.selectedGpus.length > 0) p.set('gpu', state.selectedGpus.join(','))
  if (state.priceRange[0] !== 0 || state.priceRange[1] !== 500) {
    p.set('pmin', String(state.priceRange[0]))
    p.set('pmax', String(state.priceRange[1]))
  }
  if (state.vramRange[0] !== 0 || state.vramRange[1] !== 192) {
    p.set('vmin', String(state.vramRange[0]))
    p.set('vmax', String(state.vramRange[1]))
  }
  if (state.ramRange[0] !== 0 || state.ramRange[1] !== 512) {
    p.set('rmin', String(state.ramRange[0]))
    p.set('rmax', String(state.ramRange[1]))
  }
  if (state.networkRange[0] !== 0 || state.networkRange[1] !== 10000) {
    p.set('nmin', String(state.networkRange[0]))
    p.set('nmax', String(state.networkRange[1]))
  }
  if (state.verifiedOnly) p.set('verified', '1')
  if (state.rentalTypeTab !== 'on_demand') p.set('rental', state.rentalTypeTab)
  if (state.viewMode !== 'grid') p.set('view', state.viewMode)
  if (state.activeTab !== 'templates') p.set('tab', state.activeTab)
  return p.toString()
}

function parseMarketplaceSearchParams(sp: URLSearchParams) {
  const sortRaw = sp.get('sort')
  const sortOrder =
    sortRaw && SORT_OPTIONS.includes(sortRaw as (typeof SORT_OPTIONS)[number])
      ? sortRaw
      : 'price_asc'
  const gpuRaw = sp.get('gpu')
  const selectedGpus = gpuRaw
    ? gpuRaw
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    : []
  const pmin = sp.get('pmin')
  const pmax = sp.get('pmax')
  const priceRange: [number, number] = [
    pmin != null && !Number.isNaN(Number(pmin)) ? Number(pmin) : 0,
    pmax != null && !Number.isNaN(Number(pmax)) ? Number(pmax) : 500,
  ]
  const vmin = sp.get('vmin')
  const vmax = sp.get('vmax')
  const vramRange: [number, number] = [
    vmin != null && !Number.isNaN(Number(vmin)) ? Number(vmin) : 0,
    vmax != null && !Number.isNaN(Number(vmax)) ? Number(vmax) : 192,
  ]
  const rmin = sp.get('rmin')
  const rmax = sp.get('rmax')
  const ramRange: [number, number] = [
    rmin != null && !Number.isNaN(Number(rmin)) ? Number(rmin) : 0,
    rmax != null && !Number.isNaN(Number(rmax)) ? Number(rmax) : 512,
  ]
  const nmin = sp.get('nmin')
  const nmax = sp.get('nmax')
  const networkRange: [number, number] = [
    nmin != null && !Number.isNaN(Number(nmin)) ? Number(nmin) : 0,
    nmax != null && !Number.isNaN(Number(nmax)) ? Number(nmax) : 10000,
  ]
  const verifiedOnly = sp.get('verified') === '1' || sp.get('verified') === 'true'
  const rentalRaw = sp.get('rental')
  const rentalTypeTab: RentalTypeTab =
    rentalRaw && RENTAL_TABS.includes(rentalRaw as RentalTypeTab)
      ? (rentalRaw as RentalTypeTab)
      : 'on_demand'
  const viewRaw = sp.get('view')
  const viewMode: 'grid' | 'list' = viewRaw === 'list' ? 'list' : 'grid'
  const tabRaw = sp.get('tab')
  const activeTab: 'machines' | 'templates' =
    tabRaw === 'machines' || tabRaw === 'templates' ? tabRaw : 'templates'
  return {
    sortOrder,
    selectedGpus,
    priceRange,
    vramRange,
    ramRange,
    networkRange,
    verifiedOnly,
    rentalTypeTab,
    viewMode,
    activeTab,
  }
}

function machineFromOffer(offer: any) {
  return offer?.machines
}

function gpusAvailable(offer: any): number {
  const m = machineFromOffer(offer)
  if (!m) return 0
  return Math.max(0, (m.gpu_count || 0) - (m.gpu_allocated || 0))
}

function perGpuDisplayInr(offer: any, tab: RentalTypeTab): number {
  const base = Number(offer?.price_per_gpu_hr_inr) || 0
  if (tab === 'reserved') {
    const f = offer?.reserved_discount_factor != null ? Number(offer.reserved_discount_factor) : 0.4
    return base * (1 - f)
  }
  if (tab === 'interruptible') {
    const min = offer?.interruptible_min_price_inr
    return min != null ? Number(min) : base * 0.5
  }
  return base
}

function gpuCountChoices(minGpu: number, gpuAvailable: number, machineGpuCount: number): number[] {
  const s = new Set<number>()
  let p = minGpu
  while (p <= gpuAvailable && p > 0) {
    s.add(p)
    const n = p * 2
    if (n > gpuAvailable) break
    p = n
  }
  if (machineGpuCount >= minGpu && machineGpuCount <= gpuAvailable) {
    s.add(machineGpuCount)
  }
  return Array.from(s).sort((a, b) => a - b)
}

function getRentalContract(inst: any) {
  const r = inst?.rental_contracts
  if (Array.isArray(r)) return r[0]
  return r
}

function tierBadge(machine: any) {
  const t = machine?.machine_tier
  if (t === 'secure_cloud') {
    return (
      <span className="flex items-center gap-1 text-xs font-bold text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-full">
        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z" clipRule="evenodd" /></svg>
        Secure cloud
      </span>
    )
  }
  if (t === 'verified') {
    return (
      <span className="flex items-center gap-1 text-xs font-bold text-blue-400 bg-blue-400/10 border border-blue-400/20 px-2 py-0.5 rounded-full">
        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
        Verified
      </span>
    )
  }
  return (
    <span className="text-xs text-yellow-500 bg-yellow-500/10 border border-yellow-500/20 px-2 py-0.5 rounded-full font-medium">
      Unverified
    </span>
  )
}

function reliabilityColor(score: number) {
  if (score >= 90) return { bar: 'bg-green-500', text: 'text-green-400' }
  if (score >= 70) return { bar: 'bg-yellow-500', text: 'text-yellow-400' }
  return { bar: 'bg-red-500', text: 'text-red-400' }
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
  const [offers, setOffers] = useState(initialOffers)

  const [activeTab, setActiveTab] = useState<'machines' | 'templates'>('templates')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)

  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [selectedGpus, setSelectedGpus] = useState<string[]>([])
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 500])
  const [vramRange, setVramRange] = useState<[number, number]>([0, 192])
  const [ramRange, setRamRange] = useState<[number, number]>([0, 512])
  const [networkRange, setNetworkRange] = useState<[number, number]>([0, 10000])

  const [sortOrder, setSortOrder] = useState('price_asc')
  const [rentalTypeTab, setRentalTypeTab] = useState<RentalTypeTab>('on_demand')
  const [verifiedOnly, setVerifiedOnly] = useState(false)

  const [selectedOffer, setSelectedOffer] = useState<any | null>(null)
  const [selectedTemplate, setSelectedTemplate] = useState<any | null>(null)
  const [gpuCount, setGpuCount] = useState(1)
  const [diskSize, setDiskSize] = useState(50)
  const [launchMode, setLaunchMode] = useState('ssh')
  const [selectedSshKey, setSelectedSshKey] = useState<string>('')
  const [newSshKey, setNewSshKey] = useState<string>('')
  const [bidPriceInr, setBidPriceInr] = useState<string>('')
  const [isDeploying, setIsDeploying] = useState(false)
  const [deployError, setDeployError] = useState<string | null>(null)
  const [recentlyDeployedId, setRecentlyDeployedId] = useState<string | null>(null)
  const [realtimeToast, setRealtimeToast] = useState<string | null>(null)

  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const urlSyncingFromParams = useRef(false)

  useEffect(() => {
    urlSyncingFromParams.current = true
    const parsed = parseMarketplaceSearchParams(searchParams)
    setSortOrder(parsed.sortOrder)
    setSelectedGpus(parsed.selectedGpus)
    setPriceRange(parsed.priceRange)
    setVramRange(parsed.vramRange)
    setRamRange(parsed.ramRange)
    setNetworkRange(parsed.networkRange)
    setVerifiedOnly(parsed.verifiedOnly)
    setRentalTypeTab(parsed.rentalTypeTab)
    setViewMode(parsed.viewMode)
    setActiveTab(parsed.activeTab)
    queueMicrotask(() => {
      urlSyncingFromParams.current = false
    })
  }, [searchParams])

  useEffect(() => {
    if (urlSyncingFromParams.current) return
    const qs = buildMarketplaceQueryString({
      sortOrder,
      selectedGpus,
      priceRange,
      vramRange,
      ramRange,
      networkRange,
      verifiedOnly,
      rentalTypeTab,
      viewMode,
      activeTab,
    })
    if (paramsEqual(qs, searchParams.toString())) return
    const nextUrl = qs ? `${pathname}?${qs}` : pathname
    router.replace(nextUrl, { scroll: false })
  }, [
    pathname,
    router,
    searchParams,
    sortOrder,
    selectedGpus,
    priceRange,
    vramRange,
    ramRange,
    networkRange,
    verifiedOnly,
    rentalTypeTab,
    viewMode,
    activeTab,
  ])

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel('instances_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'instances' },
        (payload: any) => {
          const newStatus = payload.new?.status
          const oldStatus = payload.old?.status
          if (newStatus && newStatus !== oldStatus) {
            if (newStatus === 'running') {
              setRealtimeToast('Instance is now running')
              if (recentlyDeployedId === payload.new?.id) setRecentlyDeployedId(null)
            } else if (newStatus === 'stopped') {
              setRealtimeToast('Instance stopped')
            } else if (newStatus === 'destroyed') {
              setRealtimeToast('Instance destroyed')
            }
            setTimeout(() => setRealtimeToast(null), 4000)
          }
          router.refresh()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [router, recentlyDeployedId])

  useEffect(() => {
    const supabase = createClient()
    ;(async () => {
      const { data, error } = await supabase
        .from('offers')
        .select(OFFERS_SELECT)
        .eq('status', 'active')
        .order('price_per_gpu_hr_inr', { ascending: true })
      if (!error && data) setOffers(data)
    })()
  }, [])

  useEffect(() => {
    const creatingInstances = activeInstances.filter(i => i.status === 'creating')
    if (creatingInstances.length === 0) return
    const interval = setInterval(() => router.refresh(), 10000)
    return () => clearInterval(interval)
  }, [activeInstances, router])

  const availableGpus = useMemo(
    () => Array.from(new Set(offers.map((o) => machineFromOffer(o)?.gpu_model).filter(Boolean))),
    [offers]
  )

  const toggleGpu = (gpu: string) => {
    setSelectedGpus((prev) => (prev.includes(gpu) ? prev.filter((g) => g !== gpu) : [...prev, gpu]))
  }

  const filteredOffers = offers
    .filter((o) => machineFromOffer(o))
    .filter((o) => {
      const m = machineFromOffer(o)
      return !verifiedOnly || m.machine_tier === 'verified' || m.machine_tier === 'secure_cloud'
    })
    .filter((o) => {
      const m = machineFromOffer(o)
      return selectedGpus.length === 0 || selectedGpus.includes(m.gpu_model)
    })
    .filter((o) => {
      const price = perGpuDisplayInr(o, rentalTypeTab)
      return price >= priceRange[0] && price <= priceRange[1]
    })
    .filter((o) => {
      const m = machineFromOffer(o)
      const totalVram = m.vram_gb * m.gpu_count
      return totalVram >= vramRange[0] && totalVram <= vramRange[1]
    })
    .filter((o) => {
      const m = machineFromOffer(o)
      return m.ram_gb >= ramRange[0] && m.ram_gb <= ramRange[1]
    })
    .filter((o) => {
      const m = machineFromOffer(o)
      const netSpeed = Math.max(m.inet_down_mbps || 0, m.inet_up_mbps || 0)
      return netSpeed >= networkRange[0] && netSpeed <= networkRange[1]
    })
    .sort((a, b) => {
      const pa = perGpuDisplayInr(a, rentalTypeTab)
      const pb = perGpuDisplayInr(b, rentalTypeTab)
      const ma = machineFromOffer(a)
      const mb = machineFromOffer(b)
      if (sortOrder === 'price_asc') return pa - pb
      if (sortOrder === 'price_desc') return pb - pa
      if (sortOrder === 'dlperf_desc') return (mb.dlperf_score || 0) - (ma.dlperf_score || 0)
      if (sortOrder === 'dlperf_value') {
        const va = pa > 0 ? (ma.dlperf_score || 0) / pa : 0
        const vb = pb > 0 ? (mb.dlperf_score || 0) / pb : 0
        return vb - va
      }
      if (sortOrder === 'vram_desc') return mb.vram_gb * mb.gpu_count - ma.vram_gb * ma.gpu_count
      if (sortOrder === 'rel_desc') return (mb.reliability_score || 0) - (ma.reliability_score || 0)
      if (sortOrder === 'trust') {
        const tierOrder: Record<string, number> = { secure_cloud: 3, verified: 2, unverified: 1 }
        return (tierOrder[mb.machine_tier] || 0) - (tierOrder[ma.machine_tier] || 0)
      }
      return 0
    })

  /** Matches /api/console/rent wallet check (GPU compute only; storage billed separately). */
  const serverWalletCheckHourly = useMemo(() => {
    if (!selectedOffer) return 0
    const base = Number(selectedOffer.price_per_gpu_hr_inr) || 0
    const perGpu =
      rentalTypeTab === 'interruptible'
        ? Math.max(0, parseFloat(bidPriceInr) || 0)
        : base
    return perGpu * gpuCount
  }, [selectedOffer, rentalTypeTab, bidPriceInr, gpuCount])

  const estimatedHourlyForModal = useMemo(() => {
    if (!selectedOffer || !machineFromOffer(selectedOffer)) return 0
    const storageHr =
      (Number(selectedOffer.storage_price_per_gb_month_inr || 0) * diskSize) / (30 * 24)
    return serverWalletCheckHourly + storageHr
  }, [selectedOffer, diskSize, serverWalletCheckHourly])

  const handleDeploy = async () => {
    if (!selectedOffer || !selectedTemplate) return
    setIsDeploying(true)
    setDeployError(null)

    const rentalType = rentalTypeTab
    const bid =
      rentalType === 'interruptible' ? parseFloat(bidPriceInr) : undefined
    if (rentalType === 'interruptible' && (!bid || Number.isNaN(bid))) {
      setDeployError('Enter a valid bid price (₹/GPU/hr) for interruptible.')
      setIsDeploying(false)
      return
    }

    try {
      const res = await fetch('/api/console/rent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          offerId: selectedOffer.id,
          gpuCount,
          templateId: selectedTemplate.id,
          diskSize,
          launchMode,
          rentalType,
          bidPriceInr: rentalType === 'interruptible' ? bid : undefined,
          sshKeyId: selectedSshKey || undefined,
          newSshKey: newSshKey || undefined,
        }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(body.error || 'Failed to start rental')
      }
      const newId = body.instance?.id || body.instanceId
      if (newId) setRecentlyDeployedId(newId)
      setSelectedOffer(null)
      router.refresh()
    } catch (err: any) {
      setDeployError(err.message || 'Failed to deploy')
    } finally {
      setIsDeploying(false)
    }
  }

  const filteredTemplates =
    selectedCategory === 'all' ? templates : templates.filter((t) => t.category === selectedCategory)

  const handleStopInstance = async (id: string) => {
    if (
      !confirm(
        'Are you sure you want to stop this instance? GPU will be released but storage billing continues.'
      )
    )
      return
    try {
      await stopInstance(id)
    } catch (err: any) {
      alert(err.message || 'Failed to stop instance')
    }
  }

  const handleDestroyInstance = async (id: string) => {
    if (!confirm('Are you sure you want to destroy this instance? All data will be permanently deleted.'))
      return
    try {
      await destroyInstance(id)
    } catch (err: any) {
      alert(err.message || 'Failed to destroy instance')
    }
  }

  const openRentModal = (offer: any) => {
    const m = machineFromOffer(offer)
    if (!m) return
    const avail = gpusAvailable(offer)
    const minG = Math.max(1, offer.min_gpu || 1)
    const choices = gpuCountChoices(minG, avail, m.gpu_count)
    setDiskSize(Math.min(50, m.storage_gb || 50))
    setGpuCount(choices[0] ?? minG)
    setBidPriceInr(
      offer.interruptible_min_price_inr != null
        ? String(offer.interruptible_min_price_inr)
        : String(perGpuDisplayInr(offer, 'interruptible'))
    )
    setSelectedOffer(offer)
  }

  return (
    <div className="p-8 max-w-[1600px] mx-auto w-full">
      {realtimeToast && (
        <div className="fixed top-4 right-4 z-[60] animate-in fade-in slide-in-from-top-2 bg-primary/15 border border-primary/30 text-primary px-4 py-3 rounded-lg text-sm font-medium shadow-xl backdrop-blur-sm flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          {realtimeToast}
        </div>
      )}

      {recentlyDeployedId && !activeInstances.some(i => i.id === recentlyDeployedId) && (
        <div className="mb-6 p-4 bg-primary/5 border border-primary/20 rounded-xl flex items-center gap-4 animate-pulse">
          <div className="w-10 h-10 bg-primary/20 rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5 text-primary animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          </div>
          <div>
            <div className="text-sm font-bold text-primary">Instance Deploying...</div>
            <div className="text-xs text-gray-400 font-mono">ID: {recentlyDeployedId.substring(0, 8)} — Waiting for host agent to pick up the job</div>
          </div>
        </div>
      )}

      <div className="flex gap-8 border-b border-white/10 mb-8">
        <button
          onClick={() => setActiveTab('templates')}
          className={`text-xl font-bold pb-3 border-b-2 transition-colors ${activeTab === 'templates' ? 'text-white border-primary' : 'text-gray-500 border-transparent hover:text-gray-300'}`}
        >
          Templates
        </button>
        <button
          onClick={() => setActiveTab('machines')}
          className={`text-xl font-bold pb-3 border-b-2 transition-colors ${activeTab === 'machines' ? 'text-white border-primary' : 'text-gray-500 border-transparent hover:text-gray-300'}`}
        >
          GPU Marketplace
        </button>
      </div>

      <div className="flex gap-8">
        <div
          className={`transition-all duration-300 ease-in-out overflow-hidden flex-shrink-0 ${isSidebarOpen ? 'w-72 opacity-100' : 'w-0 opacity-0'}`}
        >
          <div className="bg-[#0a0a0a] border border-white/10 rounded-xl p-5 sticky top-8 w-72">
            {activeTab === 'machines' ? (
              <>
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-bold text-lg">Machine Filters</h3>
                  <button
                    onClick={() => {
                      setSelectedGpus([])
                      setPriceRange([0, 500])
                      setVramRange([0, 192])
                      setRamRange([0, 512])
                      setNetworkRange([0, 10000])
                    }}
                    className="text-xs text-primary hover:underline"
                  >
                    Reset
                  </button>
                </div>

                <div className="mb-6">
                  <h4 className="text-sm font-semibold text-gray-400 mb-3">GPU Model</h4>
                  <div className="space-y-2 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                    {availableGpus.map((gpu) => (
                      <label key={gpu} className="flex items-center gap-2 cursor-pointer group">
                        <input
                          type="checkbox"
                          checked={selectedGpus.includes(gpu)}
                          onChange={() => toggleGpu(gpu)}
                          className="rounded border-white/20 bg-black/50 text-primary focus:ring-primary/20 focus:ring-offset-0"
                        />
                        <span className="text-sm text-gray-300 group-hover:text-white transition-colors">{gpu}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="mb-6">
                  <div className="flex justify-between text-sm mb-2">
                    <h4 className="font-semibold text-gray-400">Per-GPU price (₹/hr)</h4>
                    <span className="text-primary font-mono">
                      ₹{priceRange[0]} - ₹{priceRange[1]}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="500"
                    step="5"
                    value={priceRange[1]}
                    onChange={(e) => setPriceRange([priceRange[0], parseInt(e.target.value)])}
                    className="w-full accent-primary"
                  />
                </div>

                <div className="mb-6">
                  <div className="flex justify-between text-sm mb-2">
                    <h4 className="font-semibold text-gray-400">VRAM (GB)</h4>
                    <span className="text-primary font-mono">
                      {vramRange[0]} - {vramRange[1]}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="192"
                    step="8"
                    value={vramRange[1]}
                    onChange={(e) => setVramRange([vramRange[0], parseInt(e.target.value)])}
                    className="w-full accent-primary"
                  />
                </div>

                <div className="mb-6">
                  <div className="flex justify-between text-sm mb-2">
                    <h4 className="font-semibold text-gray-400">System RAM (GB)</h4>
                    <span className="text-primary font-mono">
                      {ramRange[0]} - {ramRange[1]}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="512"
                    step="16"
                    value={ramRange[1]}
                    onChange={(e) => setRamRange([ramRange[0], parseInt(e.target.value)])}
                    className="w-full accent-primary"
                  />
                </div>

                <div className="mb-6">
                  <div className="flex justify-between text-sm mb-2">
                    <h4 className="font-semibold text-gray-400">Network (Mbps)</h4>
                    <span className="text-primary font-mono">
                      {networkRange[0]} - {networkRange[1]}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="10000"
                    step="100"
                    value={networkRange[1]}
                    onChange={(e) => setNetworkRange([networkRange[0], parseInt(e.target.value)])}
                    className="w-full accent-primary"
                  />
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-bold text-lg">Categories</h3>
                  <button
                    onClick={() => setSelectedCategory('all')}
                    className="text-xs text-primary hover:underline"
                  >
                    Reset
                  </button>
                </div>
                <div className="space-y-2">
                  {[
                    { id: 'all', label: 'All Templates', icon: '📦' },
                    { id: 'llm', label: 'LLM & Text', icon: '🧠' },
                    { id: 'diffusion', label: 'Image Generation', icon: '🎨' },
                    { id: 'video', label: 'Video Generation', icon: '🎬' },
                    { id: 'ml', label: 'Machine Learning', icon: '🔥' },
                    { id: 'robotics', label: 'Robotics & Sim', icon: '🤖' },
                    { id: 'base', label: 'Base OS', icon: '🐧' },
                  ].map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => setSelectedCategory(cat.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${selectedCategory === cat.id ? 'bg-primary/10 text-primary font-bold border border-primary/20' : 'text-gray-400 hover:text-white hover:bg-white/5 border border-transparent'}`}
                    >
                      <span>{cat.icon}</span>
                      {cat.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        <div className="flex-1 min-w-0">
          {activeInstances.length > 0 && (
            <div className="mb-12">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-8 rounded-full bg-green-500/20 text-green-500 flex items-center justify-center font-bold text-sm">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                </div>
                <h2 className="text-2xl font-bold">Active Pods</h2>
              </div>

              <div className="grid gap-4">
                {activeInstances.map((inst) => {
                  const rc = getRentalContract(inst)
                  const m = inst.machines
                  const disk = inst.disk_size_gb || 0
                  const gpus = inst.gpu_count || 1
                  let hourly = 0
                  if (rc?.price_per_gpu_hr_inr != null) {
                    const gpuHr =
                      inst.rental_type === 'interruptible' && inst.bid_price_inr != null
                        ? Number(inst.bid_price_inr) * gpus
                        : Number(rc.price_per_gpu_hr_inr) * gpus
                    const storageHr =
                      (Number(rc.storage_price_per_gb_month_inr || 0) * disk) / (30 * 24)
                    hourly = gpuHr + storageHr
                  } else {
                    hourly =
                      (m?.price_per_hour_inr || 0) + (m?.storage_price_per_gb_hr || 0) * disk
                  }
                  const idx = rc?.gpu_indices
                  const idxStr = Array.isArray(idx) ? idx.join(', ') : idx != null ? String(idx) : '—'
                  const endStr = rc?.rental_end_date
                    ? new Date(rc.rental_end_date).toLocaleString()
                    : '—'
                  const rtype = inst.rental_type || rc?.rental_type || '—'

                  return (
                    <div key={inst.id} className="relative z-10">
                      <div className="bg-white/5 border border-primary/30 p-5 rounded-xl flex items-center justify-between relative z-20">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                            <span className="text-primary font-bold text-xl">⚡</span>
                          </div>
                          <div>
                            <h3 className="font-bold text-lg mb-1 flex items-center gap-2">
                              {m?.gpu_count > 0 ? `${gpus}x ${m?.gpu_model}` : m?.gpu_model}
                              {inst.provider_instance_id && (
                                <span className="text-[10px] font-medium text-gray-500 bg-white/5 border border-white/10 px-1.5 py-0.5 rounded-full">
                                  Cloud
                                </span>
                              )}
                            </h3>
                            <p className="text-xs text-gray-400 font-mono">
                              ID: {inst.id.substring(0, 8)} • Started:{' '}
                              {new Date(inst.created_at).toLocaleString()}
                            </p>
                            {rc && (
                              <p className="text-[11px] text-gray-500 mt-1 font-mono">
                                GPUs [{idxStr}] • {String(rtype).replace(/_/g, ' ')} • contract ends{' '}
                                {endStr}
                              </p>
                            )}
                          </div>
                        </div>
                          <div className="flex items-center gap-4">
                          <div className="text-right">
                            <div className="font-mono text-primary font-bold">
                              ₹{hourly.toFixed(2)}/hr
                            </div>
                            <div className="text-xs text-gray-500 capitalize flex items-center gap-1">
                              {(inst.status === 'failed' || inst.status === 'error') ? (
                                <span className="inline-flex items-center gap-0.5 text-red-400 bg-red-400/10 border border-red-400/20 px-1.5 py-0.5 rounded text-[10px] font-bold normal-case">
                                  {inst.status === 'failed' ? 'Failed' : 'Error'}
                                </span>
                              ) : inst.status}
                              {inst.low_balance_alert && (
                                <span className="inline-flex items-center gap-0.5 text-orange-400 bg-orange-400/10 border border-orange-400/20 px-1.5 py-0.5 rounded text-[10px] font-bold normal-case">
                                  Low Balance
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            {inst.status === 'running' && (
                              <ConnectButton
                                instanceId={inst.id}
                                publicIp={m?.public_ip}
                                hostPort={inst.host_port}
                                launchMode={inst.launch_mode}
                                tunnelUrl={inst.tunnel_url}
                                sshPassword={inst.ssh_password}
                              />
                            )}
                            {inst.status === 'running' && (
                              <button
                                onClick={() => handleStopInstance(inst.id)}
                                className="bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-500 border border-yellow-500/20 px-4 py-2 rounded text-sm font-medium transition-colors"
                              >
                                Stop
                              </button>
                            )}
                            <button
                              onClick={() => handleDestroyInstance(inst.id)}
                              className="bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 px-4 py-2 rounded text-sm font-medium transition-colors"
                            >
                              {(inst.status === 'failed' || inst.status === 'error') ? 'Delete' : 'Destroy'}
                            </button>
                          </div>
                        </div>
                      </div>

                      {inst.status === 'running' && (
                        <div className="bg-black/80 border border-white/10 rounded-b-xl p-4 text-xs font-mono text-gray-400 -mt-6 pt-8 relative z-10">
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-green-400">● Instance Ready</span>
                            <span className="text-gray-500">
                              {inst.launch_mode === 'both'
                                ? 'JupyterLab & SSH'
                                : inst.launch_mode === 'jupyter'
                                  ? 'JupyterLab'
                                  : 'SSH'}
                            </span>
                          </div>
                          <div className="bg-black p-3 rounded border border-white/5 space-y-2">
                            {(() => {
                              const sshIp = inst.provider_instance_id
                                ? (m?.public_ip || 'pending')
                                : (m?.public_ip || 'pending')
                              const sshPort = inst.host_port || 'pending'
                              return (
                                <div className="flex justify-between">
                                  <span>SSH Command:</span>
                                  <span className="text-white select-all">
                                    {inst.tunnel_url
                                      ? `ssh root@${inst.tunnel_url.replace('https://', '')} -p 443`
                                      : `ssh root@${sshIp} -p ${sshPort}`}
                                  </span>
                                </div>
                              )
                            })()}
                            {(inst.launch_mode === 'jupyter' || inst.launch_mode === 'both') &&
                              m?.public_ip &&
                              inst.host_port && (
                                <div className="flex justify-between">
                                  <span>JupyterLab URL:</span>
                                  <a
                                    href={`http://${m.public_ip}:${inst.host_port + 1}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-primary hover:underline"
                                  >
                                    http://{m.public_ip}:{inst.host_port + 1}
                                  </a>
                                </div>
                              )}
                          </div>
                        </div>
                      )}
                      {inst.status === 'creating' && (
                        <div className="bg-black/80 border border-white/10 rounded-b-xl p-4 text-xs font-mono text-gray-400 -mt-6 pt-8 relative z-10">
                          <div className="flex justify-between items-center">
                            <span className="text-yellow-400 animate-pulse">
                              ● Waiting for Host Agent to pick up job...
                            </span>
                          </div>
                        </div>
                      )}
                      {inst.status === 'loading' && (
                        <div className="bg-black/80 border border-white/10 rounded-b-xl p-4 text-xs font-mono text-gray-400 -mt-6 pt-8 relative z-10">
                          <div className="flex justify-between items-center">
                            <span className="text-blue-400 animate-pulse">● Pulling Docker image...</span>
                          </div>
                        </div>
                      )}
                      {(inst.status === 'failed' || inst.status === 'error') && (
                        <div className="bg-black/80 border border-red-500/20 rounded-b-xl p-4 text-xs font-mono text-gray-400 -mt-6 pt-8 relative z-10">
                          <div className="flex justify-between items-center">
                            <span className="text-red-400">
                              ● Provisioning failed{inst.error_message ? `: ${inst.error_message}` : ''}
                            </span>
                            <button
                              onClick={() => handleDestroyInstance(inst.id)}
                              className="text-red-400 hover:text-red-300 underline underline-offset-2 transition-colors"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          <div className="mb-12">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                    className="p-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-gray-400 hover:text-white transition-colors"
                    title="Toggle Filters"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 6h16M4 12h16M4 18h7"
                      />
                    </svg>
                  </button>
                </div>
              </div>

              {activeTab === 'machines' && (
                <div className="flex flex-wrap gap-3 items-center">
                  {selectedTemplate && (
                    <div className="flex items-center gap-2 bg-primary/10 border border-primary/30 text-primary px-3 py-1.5 rounded-lg text-sm font-medium">
                      <span className="text-xs uppercase tracking-wider text-primary/70">Template:</span>
                      {selectedTemplate.label}
                      <button
                        onClick={() => setSelectedTemplate(null)}
                        className="ml-1 hover:text-white transition-colors"
                        title="Clear Template"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                      </button>
                    </div>
                  )}
                  <div className="bg-[#0a0a0a] border border-white/10 rounded-lg p-1 flex text-sm mr-2">
                    <button
                      onClick={() => setViewMode('grid')}
                      className={`p-1.5 rounded-md transition-colors ${viewMode === 'grid' ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white'}`}
                      title="Grid View"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
                        />
                      </svg>
                    </button>
                    <button
                      onClick={() => setViewMode('list')}
                      className={`p-1.5 rounded-md transition-colors ${viewMode === 'list' ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white'}`}
                      title="List View"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4 6h16M4 10h16M4 14h16M4 18h16"
                        />
                      </svg>
                    </button>
                  </div>

                  <button
                    onClick={() => setVerifiedOnly(!verifiedOnly)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                      verifiedOnly
                        ? 'bg-blue-500/10 border-blue-500/30 text-blue-400'
                        : 'bg-[#0a0a0a] border-white/10 text-gray-400 hover:text-white'
                    }`}
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z"
                        clipRule="evenodd"
                      />
                    </svg>
                    Verified Only
                  </button>

                  <select
                    value={sortOrder}
                    onChange={(e) => setSortOrder(e.target.value)}
                    className="bg-[#0a0a0a] border border-white/10 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-primary text-white"
                  >
                    <option value="price_asc">Price: Low to High</option>
                    <option value="price_desc">Price: High to Low</option>
                    <option value="dlperf_desc">DLPerf: Highest</option>
                    <option value="dlperf_value">Best Value (DLPerf/₹)</option>
                    <option value="vram_desc">VRAM: Highest</option>
                    <option value="rel_desc">Reliability: Highest</option>
                    <option value="trust">Trust: Highest</option>
                  </select>
                </div>
              )}
            </div>

            {activeTab === 'machines' && (
              <div className="flex gap-2 mb-6 p-1 bg-[#0a0a0a] border border-white/10 rounded-xl w-full max-w-xl">
                {(
                  [
                    { id: 'on_demand' as const, label: 'On-Demand' },
                    { id: 'reserved' as const, label: 'Reserved' },
                    { id: 'interruptible' as const, label: 'Interruptible' },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setRentalTypeTab(tab.id)}
                    className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      rentalTypeTab === tab.id
                        ? 'bg-white/10 text-white shadow-sm'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            )}

            {activeTab === 'templates' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
                {filteredTemplates.map((template) => (
                  <div
                    key={template.id}
                    className="bg-[#0a0a0a] border border-white/10 hover:border-primary/50 transition-colors rounded-xl p-5 flex flex-col relative group"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center text-blue-500 text-2xl">
                        {template.category === 'ml'
                          ? '🔥'
                          : template.category === 'llm'
                            ? '🧠'
                            : template.category === 'video'
                              ? '🎬'
                              : template.category === 'diffusion'
                                ? '🎨'
                                : template.category === 'robotics'
                                  ? '🤖'
                                  : '🐧'}
                      </div>
                      {template.is_recommended && (
                        <span className="bg-primary/10 text-primary text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider">
                          Recommended
                        </span>
                      )}
                    </div>
                    <h3 className="text-lg font-bold text-white mb-1">{template.label}</h3>
                    <p className="text-sm text-gray-400 mb-4 flex-1 line-clamp-2">{template.description}</p>

                    <div className="flex flex-wrap gap-2 mb-4">
                      <span
                        className="bg-white/5 border border-white/10 text-gray-300 text-xs px-2 py-1 rounded font-mono truncate max-w-full"
                        title={template.docker_image}
                      >
                        {template.docker_image.split(':')[0]}
                      </span>
                      <span className="bg-white/5 border border-white/10 text-gray-300 text-xs px-2 py-1 rounded capitalize">
                        {template.launch_mode}
                      </span>
                    </div>

                    <button
                      onClick={() => {
                        setSelectedTemplate(template)
                        setLaunchMode(template.launch_mode || 'ssh')
                        setActiveTab('machines')
                      }}
                      className="w-full bg-white/5 hover:bg-white/10 border border-white/10 text-white text-sm font-bold py-2 rounded transition-all flex items-center justify-center gap-2"
                    >
                      Select Template
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M14 5l7 7m0 0l-7 7m7-7H3"
                        />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            ) : filteredOffers.length === 0 ? (
              <div className="py-12 text-center text-gray-500 bg-[#0a0a0a] border border-white/10 rounded-xl">
                <div className="flex flex-col items-center justify-center">
                  <svg
                    className="w-12 h-12 mb-4 text-gray-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1}
                      d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                    />
                  </svg>
                  <p>No offers match your filters.</p>
                  <p className="text-xs mt-1">Try adjusting your search or check back later.</p>
                </div>
              </div>
            ) : viewMode === 'grid' ? (
              <div className="grid grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3 gap-4">
                {filteredOffers.map((offer) => {
                  const machine = machineFromOffer(offer)
                  const avail = gpusAvailable(offer)
                  const perGpu = perGpuDisplayInr(offer, rentalTypeTab)
                  const score = Number(machine.reliability_score ?? 60)
                  const rel = reliabilityColor(score)
                  const storageMo = Number(offer.storage_price_per_gb_month_inr ?? 0)
                  const endDate = offer.offer_end_date
                    ? new Date(offer.offer_end_date).toLocaleDateString()
                    : '—'
                  const down = machine.inet_down_mbps
                  const up = machine.inet_up_mbps
                  const hasNet = (down != null && down > 0) || (up != null && up > 0)

                  return (
                    <div
                      key={offer.id}
                      className="bg-[#0a0a0a] border border-white/10 hover:border-primary/50 transition-colors rounded-xl overflow-hidden flex flex-col group relative"
                    >
                      <div className="p-4 border-b border-white/10 flex justify-between items-start bg-white/5">
                        <div>
                          <div className="font-bold text-lg text-white mb-1 flex items-center gap-2 flex-wrap">
                            <div
                              className={`w-2 h-2 rounded-full ${machine.gpu_count > 0 ? 'bg-primary shadow-[0_0_8px_rgba(0,255,136,0.8)]' : 'bg-blue-500'}`}
                            ></div>
                            {machine.gpu_count > 0
                              ? `${machine.gpu_count}x ${machine.gpu_model}`
                              : machine.gpu_model}
                            {offer.interruptible_min_price_inr != null && (
                              <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-500/15 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded">
                                Spot
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-gray-400 flex-wrap">
                            <span className="font-mono bg-black px-1.5 py-0.5 rounded border border-white/10">
                              {String(machine.id).substring(0, 8)}
                            </span>
                            <span className="flex items-center gap-1">
                              <svg
                                className="w-3 h-3 text-gray-500"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                                />
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                                />
                              </svg>
                              India
                            </span>
                          </div>
                          <p className="text-[11px] text-gray-500 mt-2">
                            Offer ends <span className="text-gray-300">{endDate}</span>
                          </p>
                        </div>
                        <div className="text-right relative group/prices">
                          <div className="font-mono text-primary font-bold text-xl leading-none cursor-help">
                            ₹{perGpu.toFixed(2)}
                          </div>
                          <div className="text-[10px] text-gray-500 mt-1">/ GPU / hr</div>
                          <div
                            className="pointer-events-none absolute right-0 top-full mt-1 w-64 rounded-lg border border-white/10 bg-[#111] p-3 text-left text-[11px] text-gray-300 shadow-xl opacity-0 transition-opacity duration-150 z-20 group-hover/prices:pointer-events-auto group-hover/prices:opacity-100"
                            role="tooltip"
                          >
                            <div className="font-semibold text-white mb-2 border-b border-white/10 pb-1">
                              Price breakdown
                            </div>
                            <div className="space-y-1.5">
                              <div className="flex justify-between gap-3">
                                <span className="text-gray-500">On-demand list</span>
                                <span className="font-mono text-gray-200 shrink-0">
                                  ₹{(Number(offer.price_per_gpu_hr_inr) || 0).toFixed(2)}/GPU/hr
                                </span>
                              </div>
                              {rentalTypeTab === 'reserved' && (
                                <div className="flex justify-between gap-3">
                                  <span className="text-gray-500">Reserved (after discount)</span>
                                  <span className="font-mono text-cyan-300/90 shrink-0">
                                    ₹{perGpu.toFixed(2)}/GPU/hr
                                  </span>
                                </div>
                              )}
                              {rentalTypeTab === 'interruptible' && (
                                <div className="flex justify-between gap-3">
                                  <span className="text-gray-500">Interruptible floor</span>
                                  <span className="font-mono text-amber-300/90 shrink-0">
                                    ₹{perGpu.toFixed(2)}/GPU/hr
                                  </span>
                                </div>
                              )}
                              <div className="flex justify-between gap-3 pt-1 border-t border-white/10">
                                <span className="text-gray-500">Storage (disk)</span>
                                <span className="font-mono text-gray-200 shrink-0">
                                  ₹{storageMo.toFixed(2)}/GB/mo
                                </span>
                              </div>
                              <p className="text-[10px] text-gray-600 pt-1 leading-snug">
                                GPU compute and disk storage are billed separately.
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="p-4 flex-1 grid grid-cols-2 gap-y-3 gap-x-2 text-sm relative">
                        <div className="col-span-2 text-xs text-gray-400">
                          Available:{' '}
                          <span className="text-white font-medium">
                            {avail} of {machine.gpu_count}
                          </span>
                        </div>

                        <div>
                          <div className="text-xs text-gray-500 mb-0.5">Storage</div>
                          <div className="font-medium text-gray-200">
                            ₹{storageMo.toFixed(2)}/GB/mo
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-500 mb-0.5">VRAM</div>
                          <div className="font-medium text-gray-200">
                            {machine.gpu_count > 0 ? `${machine.vram_gb * machine.gpu_count} GB` : '—'}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-500 mb-0.5">System RAM</div>
                          <div className="font-medium text-gray-200">{machine.ram_gb} GB</div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-500 mb-0.5">vCPUs</div>
                          <div className="font-medium text-gray-200">{machine.vcpu_count} Cores</div>
                        </div>
                        {hasNet && (
                          <div className="col-span-2">
                            <div className="text-xs text-gray-500 mb-0.5">Network</div>
                            <div className="font-medium text-gray-200 flex items-center gap-2 flex-wrap">
                              <span className="text-blue-400">⚡</span>
                              <span>
                                ↓{down ?? 0} / ↑{up ?? 0} Mbps
                              </span>
                            </div>
                          </div>
                        )}
                        {(machine.dlperf_score || 0) > 0 && (
                          <div>
                            <div className="text-xs text-gray-500 mb-0.5">DLPerf</div>
                            <div className="font-medium text-cyan-400 font-mono">
                              {Number(machine.dlperf_score).toFixed(1)} TFLOPS
                            </div>
                          </div>
                        )}
                        <div>
                          <div className="text-xs text-gray-500 mb-0.5">Reliability</div>
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${rel.bar}`}
                                style={{ width: `${Math.min(score, 100)}%` }}
                              ></div>
                            </div>
                            <span className={`font-mono text-xs font-medium ${rel.text}`}>
                              {score.toFixed(1)}%
                            </span>
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-500 mb-0.5">Verification</div>
                          <div className="flex items-center gap-1.5">{tierBadge(machine)}</div>
                        </div>
                      </div>

                      <div className="p-4 pt-2">
                        <button
                          onClick={() => openRentModal(offer)}
                          disabled={avail < (offer.min_gpu || 1)}
                          className="w-full bg-white/10 hover:bg-primary hover:text-black text-white text-sm font-bold py-2.5 rounded transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          Rent
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="bg-[#0a0a0a] border border-white/10 rounded-xl overflow-x-auto">
                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead className="bg-white/5 border-b border-white/10 text-gray-400 uppercase text-xs tracking-wider">
                    <tr>
                      <th className="px-4 py-3">GPU</th>
                      <th className="px-4 py-3">Avail</th>
                      <th className="px-4 py-3">VRAM</th>
                      <th className="px-4 py-3">RAM</th>
                      <th className="px-4 py-3">vCPUs</th>
                      <th className="px-4 py-3">Net (D/U)</th>
                      <th className="px-4 py-3">Tier</th>
                      <th className="px-4 py-3">₹/GPU/hr</th>
                      <th className="px-4 py-3">Storage</th>
                      <th className="px-4 py-3">Ends</th>
                      <th className="px-4 py-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filteredOffers.map((offer) => {
                      const machine = machineFromOffer(offer)
                      const avail = gpusAvailable(offer)
                      const perGpu = perGpuDisplayInr(offer, rentalTypeTab)
                      const storageMo = Number(offer.storage_price_per_gb_month_inr ?? 0)
                      const endDate = offer.offer_end_date
                        ? new Date(offer.offer_end_date).toLocaleDateString()
                        : '—'
                      return (
                        <tr key={offer.id} className="hover:bg-white/5 transition-colors">
                          <td className="px-4 py-3 font-medium text-white">
                            <div className="flex items-center gap-2">
                              <div
                                className={`w-1.5 h-1.5 rounded-full ${machine.gpu_count > 0 ? 'bg-primary' : 'bg-blue-500'}`}
                              ></div>
                              {machine.gpu_count > 0
                                ? `${machine.gpu_count}x ${machine.gpu_model}`
                                : machine.gpu_model}
                            </div>
                          </td>
                          <td className="px-4 py-3 font-mono">
                            {avail}/{machine.gpu_count}
                          </td>
                          <td className="px-4 py-3 font-mono">
                            {machine.vram_gb * machine.gpu_count} GB
                          </td>
                          <td className="px-4 py-3 font-mono">{machine.ram_gb} GB</td>
                          <td className="px-4 py-3 font-mono">{machine.vcpu_count}</td>
                          <td className="px-4 py-3 font-mono">
                            <span className="text-green-400">↓{machine.inet_down_mbps || 0}</span> /{' '}
                            <span className="text-blue-400">↑{machine.inet_up_mbps || 0}</span>
                          </td>
                          <td className="px-4 py-3">{tierBadge(machine)}</td>
                          <td className="px-4 py-3 font-mono font-bold text-primary">
                            ₹{perGpu.toFixed(2)}
                          </td>
                          <td className="px-4 py-3 font-mono">₹{storageMo.toFixed(2)}/GB/mo</td>
                          <td className="px-4 py-3 text-gray-400">{endDate}</td>
                          <td className="px-4 py-3 text-right">
                            <button
                              onClick={() => openRentModal(offer)}
                              disabled={avail < (offer.min_gpu || 1)}
                              className="bg-white/10 hover:bg-primary hover:text-black text-white text-xs font-bold px-4 py-1.5 rounded transition-all disabled:opacity-40"
                            >
                              Rent
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {selectedOffer && machineFromOffer(selectedOffer) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#0a0a0a] border border-white/10 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-white/10 flex justify-between items-center bg-black/50">
              <div>
                <h2 className="text-xl font-bold text-white">Configure Deployment</h2>
                <p className="text-sm text-gray-400 mt-1">
                  {(() => {
                    const m = machineFromOffer(selectedOffer)
                    const per = perGpuDisplayInr(selectedOffer, rentalTypeTab)
                    return (
                      <>
                        {m.gpu_count}x {m.gpu_model} • ₹{per.toFixed(2)}/GPU/hr (
                        {rentalTypeTab.replace(/_/g, ' ')})
                      </>
                    )
                  })()}
                </p>
              </div>
              <button
                onClick={() => setSelectedOffer(null)}
                className="text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 p-2 rounded-full transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1">
              {deployError && (
                <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 text-red-500 text-sm rounded-lg flex items-start gap-3">
                  <svg
                    className="w-5 h-5 shrink-0 mt-0.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <div>
                    <div className="font-bold mb-1">Deployment Failed</div>
                    {deployError}
                  </div>
                </div>
              )}

              <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">
                1. Select Template
              </h3>
              <div className="grid sm:grid-cols-2 gap-4 mb-8">
                {templates.map((template) => (
                  <div
                    key={template.id}
                    onClick={() => {
                      setSelectedTemplate(template)
                      setLaunchMode(template.launch_mode || 'ssh')
                    }}
                    className={`border p-4 rounded-xl cursor-pointer transition-all ${selectedTemplate?.id === template.id ? 'border-primary bg-primary/5' : 'border-white/10 bg-white/5 hover:border-white/30'}`}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-8 h-8 bg-blue-500/20 rounded flex items-center justify-center text-blue-500">
                        {template.category === 'ml'
                          ? '🔥'
                          : template.category === 'llm'
                            ? '🧠'
                            : template.category === 'video'
                              ? '🎬'
                              : template.category === 'diffusion'
                                ? '🎨'
                                : template.category === 'robotics'
                                  ? '🤖'
                                  : '🐧'}
                      </div>
                      <h4 className="font-bold text-white">{template.label}</h4>
                    </div>
                    <p className="text-xs text-gray-400">{template.description}</p>
                  </div>
                ))}
              </div>

              <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">
                2. Launch Mode
              </h3>
              <div className="flex gap-4 mb-8 flex-wrap">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="launch_mode"
                    value="ssh"
                    checked={launchMode === 'ssh'}
                    onChange={() => setLaunchMode('ssh')}
                    className="accent-primary"
                  />
                  <span className="text-sm text-gray-300">SSH Only</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="launch_mode"
                    value="jupyter"
                    checked={launchMode === 'jupyter'}
                    onChange={() => setLaunchMode('jupyter')}
                    className="accent-primary"
                  />
                  <span className="text-sm text-gray-300">JupyterLab</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="launch_mode"
                    value="both"
                    checked={launchMode === 'both'}
                    onChange={() => setLaunchMode('both')}
                    className="accent-primary"
                  />
                  <span className="text-sm text-gray-300">SSH + Jupyter</span>
                </label>
              </div>

              <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">3. SSH Key</h3>
              <div className="bg-white/5 border border-white/10 rounded-xl p-4 mb-8">
                {sshKeys.length > 0 ? (
                  <select
                    value={selectedSshKey}
                    onChange={(e) => setSelectedSshKey(e.target.value)}
                    className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-primary text-white mb-3"
                  >
                    <option value="">Select an SSH Key</option>
                    {sshKeys.map((key) => (
                      <option key={key.id} value={key.id}>
                        {key.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="text-sm text-gray-400 mb-3">No saved SSH keys found.</div>
                )}

                <div className="text-xs text-gray-400 mb-1">Or paste a new public key (ssh-rsa ...):</div>
                <textarea
                  value={newSshKey}
                  onChange={(e) => setNewSshKey(e.target.value)}
                  placeholder="ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQC..."
                  className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-primary text-white h-20 font-mono"
                />
              </div>

              {rentalTypeTab === 'interruptible' && (
                <>
                  <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">
                    Bid (₹ / GPU / hr)
                  </h3>
                  <div className="bg-white/5 border border-white/10 rounded-xl p-4 mb-8">
                    <input
                      type="number"
                      min={0}
                      step={0.01}
                      value={bidPriceInr}
                      onChange={(e) => setBidPriceInr(e.target.value)}
                      className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-2 text-sm text-white font-mono"
                    />
                    <p className="text-[11px] text-gray-500 mt-2">
                      Minimum bid for this offer: ₹
                      {selectedOffer.interruptible_min_price_inr != null
                        ? Number(selectedOffer.interruptible_min_price_inr).toFixed(2)
                        : '—'}
                      /GPU/hr
                    </p>
                  </div>
                </>
              )}

              <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">
                4. Resource Configuration
              </h3>
              <div className="bg-white/5 border border-white/10 rounded-xl p-4 mb-8 space-y-6">
                {(() => {
                  const m = machineFromOffer(selectedOffer)
                  const avail = gpusAvailable(selectedOffer)
                  const minG = Math.max(1, selectedOffer.min_gpu || 1)
                  const choices = gpuCountChoices(minG, avail, m.gpu_count)
                  if (choices.length === 0) return null
                  return (
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <label className="text-sm text-white font-medium">GPU Count</label>
                        <span className="text-xs text-gray-400">
                          Up to {avail} available (min {minG})
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {choices.map((n) => (
                          <button
                            key={n}
                            type="button"
                            onClick={() => setGpuCount(n)}
                            className={`px-4 py-2 rounded-lg text-sm font-mono border transition-colors ${
                              gpuCount === n
                                ? 'bg-primary text-black border-primary'
                                : 'bg-black/40 border-white/10 text-gray-200 hover:border-primary/50'
                            }`}
                          >
                            {n}
                          </button>
                        ))}
                      </div>
                    </div>
                  )
                })()}

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-sm text-white font-medium">Disk Space (GB)</label>
                    <span className="text-xs text-gray-400">
                      Max: {machineFromOffer(selectedOffer).storage_gb} GB
                    </span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max={machineFromOffer(selectedOffer).storage_gb}
                    value={diskSize}
                    onChange={(e) => setDiskSize(parseInt(e.target.value))}
                    className="w-full accent-primary"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-2">
                    <span>10 GB</span>
                    <span className="text-primary font-bold">{diskSize} GB Selected</span>
                    <span>{machineFromOffer(selectedOffer).storage_gb} GB</span>
                  </div>
                </div>
              </div>
            </div>

            {machineFromOffer(selectedOffer).machine_tier !== 'secure_cloud' && (
              <div className="mx-6 mb-0 p-3 bg-yellow-500/5 border border-yellow-500/10 rounded-lg flex items-start gap-2">
                <svg
                  className="w-4 h-4 text-yellow-500 shrink-0 mt-0.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
                <div className="text-[11px] text-yellow-500/80">
                  <span className="font-bold">Community Host:</span> This machine is hosted by a
                  KYC-verified individual. Do not upload proprietary code, credentials, or sensitive
                  datasets. For enterprise workloads, use <span className="font-bold">Velocity Enterprise</span>{' '}
                  tier machines.
                </div>
              </div>
            )}
            <div className="p-6 border-t border-white/10 bg-black/50 flex items-center justify-between flex-wrap gap-4">
              <div className="text-sm">
                <div className="text-gray-400 mb-1">Estimated Cost:</div>
                <div className="font-mono font-bold text-white text-lg">
                  ₹{estimatedHourlyForModal.toFixed(3)}
                  <span className="text-xs text-gray-500 font-sans font-normal">/hr</span>
                </div>
                <div
                  className={`text-xs mt-1 ${walletBalance < serverWalletCheckHourly ? 'text-red-500' : 'text-gray-500'}`}
                >
                  Wallet: ₹{walletBalance.toFixed(2)}
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setSelectedOffer(null)}
                  className="px-6 py-2 text-sm font-medium text-gray-300 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeploy}
                  disabled={isDeploying || walletBalance < serverWalletCheckHourly}
                  className="bg-primary hover:bg-primary-dark text-black text-sm font-bold py-2 px-8 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isDeploying ? (
                    <>
                      <svg
                        className="animate-spin -ml-1 mr-2 h-4 w-4 text-black"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      Deploying...
                    </>
                  ) : (
                    'Deploy Now'
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
