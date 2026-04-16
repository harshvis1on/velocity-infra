'use client';

import { useState, useEffect } from 'react';
import { formatUSD } from '@/lib/currency'

interface Machine {
  id: string;
  gpu_model: string;
  gpu_count: number;
  vram_gb: number;
  offers?: any[];
}

interface MarketPrice {
  suggested: number;
  min: number;
  max: number;
}

const FALLBACK_PRICES: Record<string, number> = {
  'RTX 4090': 40, 'RTX 3090': 25, 'RTX 3080': 20, 'RTX 3070': 15,
  'RTX 4080': 35, 'RTX 4070': 28, 'A100': 95, 'A10': 45, 'A6000': 55,
  'H100': 180, 'L40S': 60, 'L40': 55, 'L4': 25, 'T4': 12, 'V100': 18,
};

function fallbackPrice(gpuModel: string): number {
  const upper = gpuModel.toUpperCase();
  for (const [key, price] of Object.entries(FALLBACK_PRICES)) {
    if (upper.includes(key.toUpperCase())) return price;
  }
  return 30;
}

export default function CreateOfferModal({ machines }: { machines: Machine[] }) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);

  const [machineId, setMachineId] = useState('');
  const [pricePerGpuHr, setPricePerGpuHr] = useState('');
  const [durationDays, setDurationDays] = useState('30');
  const [autoPrice, setAutoPrice] = useState(true);

  const [storagePriceMonth, setStoragePriceMonth] = useState('4.50');
  const [minGpu, setMinGpu] = useState('1');
  const [interruptiblePrice, setInterruptiblePrice] = useState('');
  const [reservedDiscount, setReservedDiscount] = useState('40');

  const [marketPrices, setMarketPrices] = useState<Record<string, MarketPrice>>({});

  useEffect(() => {
    fetch('/api/market-prices')
      .then(r => r.json())
      .then(d => { if (d.prices) setMarketPrices(d.prices); })
      .catch(() => {});
  }, []);

  const eligibleMachines = machines.filter(m => {
    const activeOffers = m.offers?.filter((o: any) => o.status === 'active') || [];
    return activeOffers.length === 0;
  });

  const selectedMachine = eligibleMachines.find(m => m.id === machineId);

  function getSuggested(gpuModel: string): MarketPrice {
    const upper = gpuModel.toUpperCase();
    for (const [key, mp] of Object.entries(marketPrices)) {
      if (upper.includes(key.toUpperCase())) return mp;
    }
    const fb = fallbackPrice(gpuModel);
    return { suggested: fb, min: fb * 0.5, max: fb * 2 };
  }

  const mp = selectedMachine ? getSuggested(selectedMachine.gpu_model) : null;
  const suggested = mp?.suggested || 0;

  const price = parseFloat(pricePerGpuHr) || 0;
  const reservedPrice = price * (1 - parseInt(reservedDiscount) / 100);
  const interruptPrice = interruptiblePrice ? parseFloat(interruptiblePrice) : price * 0.5;

  const handleMachineSelect = (id: string) => {
    setMachineId(id);
    const m = eligibleMachines.find(x => x.id === id);
    if (m) {
      const s = getSuggested(m.gpu_model).suggested;
      setPricePerGpuHr(String(s));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    setSuccess(false);

    try {
      const offerEndDate = new Date();
      offerEndDate.setDate(offerEndDate.getDate() + parseInt(durationDays));

      const res = await fetch('/api/host/offers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          machineId,
          pricePerGpuHrInr: price,
          storagePricePerGbMonthInr: parseFloat(storagePriceMonth),
          minGpu: parseInt(minGpu),
          offerEndDate: offerEndDate.toISOString(),
          interruptibleMinPriceInr: interruptiblePrice ? parseFloat(interruptiblePrice) : undefined,
          reservedDiscountFactor: parseInt(reservedDiscount) / 100,
          autoPrice,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create offer');
      }

      setSuccess(true);
      setTimeout(() => {
        setOpen(false);
        setSuccess(false);
        window.location.reload();
      }, 1200);
    } catch (err: any) {
      setError(err.message || 'Failed to create offer');
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="bg-gradient-to-r from-primary-dark to-primary text-white font-semibold py-2 px-4 rounded-lg text-sm transition-colors"
      >
        Create Offer
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-[#0B0F19] border border-white/[0.06] rounded-2xl w-full max-w-md mx-4 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-white/[0.06]">
          <h2 className="text-lg font-bold font-heading text-[#E2E8F0]">List Machine on Marketplace</h2>
          <button onClick={() => setOpen(false)} className="text-[#94A3B8] hover:text-[#E2E8F0] text-xl">&times;</button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Machine selector */}
          <div>
            <label className="text-xs text-[#94A3B8] mb-1 block">Select Machine</label>
            <select
              value={machineId}
              onChange={e => handleMachineSelect(e.target.value)}
              required
              className="w-full rounded-xl px-3 py-2.5 bg-white/[0.03] border border-white/[0.08] text-sm text-[#E2E8F0] focus:border-primary focus:outline-none"
            >
              <option value="">Choose a machine...</option>
              {eligibleMachines.map(m => (
                <option key={m.id} value={m.id}>
                  {m.gpu_count}x {m.gpu_model} ({m.vram_gb}GB)
                </option>
              ))}
            </select>
            {eligibleMachines.length === 0 && (
              <p className="text-xs text-yellow-400 mt-1">All machines already have active offers.</p>
            )}
          </div>

          {/* Auto-price toggle */}
          {machineId && (
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <div className="text-sm font-medium text-[#E2E8F0]">Auto-pricing</div>
                  <div className="text-[11px] text-[#64748B]">Let Velocity set the optimal market price</div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const next = !autoPrice;
                    setAutoPrice(next);
                    if (next && suggested) setPricePerGpuHr(String(suggested));
                  }}
                  className={`relative w-10 h-5 rounded-full transition-colors ${autoPrice ? 'bg-primary' : 'bg-white/10'}`}
                >
                  <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${autoPrice ? 'translate-x-5' : 'translate-x-0.5'}`} />
                </button>
              </div>

              {autoPrice && mp && (
                <div className="text-xs text-[#94A3B8]">
                  Market rate: <span className="text-primary font-mono font-bold">{formatUSD(suggested, { suffix: '/GPU/hr' })}</span>
                  <span className="text-[#64748B] ml-2">(range {formatUSD(mp.min)}–{formatUSD(mp.max)})</span>
                </div>
              )}
            </div>
          )}

          {/* Price — manual override */}
          {machineId && (
            <div>
              <label className="text-xs text-[#94A3B8] mb-1 block">
                {autoPrice ? 'Current price (auto-managed)' : 'Price per GPU/hr ($)'}
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8] text-sm">$</span>
                <input
                  type="number"
                  step="0.50"
                  min="1"
                  value={pricePerGpuHr}
                  onChange={e => {
                    setPricePerGpuHr(e.target.value);
                    if (autoPrice) setAutoPrice(false);
                  }}
                  required
                  className={`w-full rounded-xl pl-7 pr-3 py-2.5 bg-white/[0.03] border text-sm text-[#E2E8F0] focus:outline-none font-mono text-lg transition-colors ${
                    autoPrice ? 'border-primary/30 focus:border-primary' : 'border-white/[0.08] focus:border-primary'
                  }`}
                />
              </div>
              {!autoPrice && suggested > 0 && price !== suggested && (
                <div className="flex items-center gap-2 mt-1.5">
                  <span className="text-xs text-[#64748B]">Market rate: {formatUSD(suggested, { suffix: '/hr' })}</span>
                  <button
                    type="button"
                    onClick={() => { setPricePerGpuHr(String(suggested)); setAutoPrice(true); }}
                    className="text-xs text-primary hover:underline"
                  >
                    Use market rate
                  </button>
                </div>
              )}

              {/* Price preview */}
              {price > 0 && (
                <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                  <div className="bg-primary/5 border border-primary/20 rounded-lg p-2">
                    <div className="text-[10px] text-primary uppercase font-bold">On-Demand</div>
                    <div className="font-mono text-sm text-[#E2E8F0]">{formatUSD(price, { decimals: 0, suffix: '/hr' })}</div>
                  </div>
                  <div className="bg-violet-500/5 border border-violet-500/20 rounded-lg p-2">
                    <div className="text-[10px] text-violet-400 uppercase font-bold">Reserved</div>
                    <div className="font-mono text-sm text-[#E2E8F0]">{formatUSD(reservedPrice, { decimals: 0, suffix: '/hr' })}</div>
                    <div className="text-[9px] text-[#64748B]">-{reservedDiscount}%</div>
                  </div>
                  <div className="bg-indigo-500/5 border border-indigo-500/20 rounded-lg p-2">
                    <div className="text-[10px] text-indigo-300 uppercase font-bold">Interruptible</div>
                    <div className="font-mono text-sm text-[#E2E8F0]">{formatUSD(interruptPrice, { decimals: 0, suffix: '/hr' })}</div>
                    <div className="text-[9px] text-[#64748B]">min floor</div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Duration */}
          {machineId && (
            <div>
              <label className="text-xs text-[#94A3B8] mb-1 block">Listing Duration</label>
              <div className="flex gap-2">
                {[
                  { v: '7', l: '1 week' },
                  { v: '30', l: '1 month' },
                  { v: '90', l: '3 months' },
                  { v: '365', l: '1 year' },
                ].map(opt => (
                  <button
                    key={opt.v}
                    type="button"
                    onClick={() => setDurationDays(opt.v)}
                    className={`flex-1 py-2 rounded-lg text-xs font-medium border transition-colors ${
                      durationDays === opt.v
                        ? 'bg-primary/10 border-primary/40 text-primary'
                        : 'bg-white/[0.03] border-white/[0.08] text-[#94A3B8] hover:border-white/[0.15]'
                    }`}
                  >
                    {opt.l}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Advanced toggle */}
          {machineId && price > 0 && (
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="text-xs text-[#64748B] hover:text-[#94A3B8] flex items-center gap-1"
            >
              <svg className={`w-3 h-3 transition-transform ${showAdvanced ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
              Advanced pricing options
            </button>
          )}

          {showAdvanced && (
            <div className="space-y-3 pl-2 border-l-2 border-white/[0.06]">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-[#64748B] mb-1 block">Storage ($/GB/mo)</label>
                  <input
                    type="number" step="0.01" min="0"
                    value={storagePriceMonth}
                    onChange={e => setStoragePriceMonth(e.target.value)}
                    className="w-full rounded-xl px-2.5 py-1.5 bg-white/[0.03] border border-white/[0.08] text-xs text-[#E2E8F0] focus:border-primary focus:outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-[#64748B] mb-1 block">Min GPUs per rental</label>
                  <select
                    value={minGpu}
                    onChange={e => setMinGpu(e.target.value)}
                    className="w-full rounded-xl px-2.5 py-1.5 bg-white/[0.03] border border-white/[0.08] text-xs text-[#E2E8F0] focus:border-primary focus:outline-none"
                  >
                    {[1, 2, 4, 8].filter(n => !selectedMachine || n <= selectedMachine.gpu_count).map(n => (
                      <option key={n} value={n}>{n} GPU{n > 1 ? 's' : ''}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-[#64748B] mb-1 block">Interruptible floor ($/hr)</label>
                  <input
                    type="number" step="0.50" min="0"
                    value={interruptiblePrice}
                    onChange={e => setInterruptiblePrice(e.target.value)}
                    placeholder={`${(price * 0.5).toFixed(0)} (auto)`}
                    className="w-full rounded-xl px-2.5 py-1.5 bg-white/[0.03] border border-white/[0.08] text-xs text-[#E2E8F0] focus:border-primary focus:outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-[#64748B] mb-1 block">Reserved discount</label>
                  <select
                    value={reservedDiscount}
                    onChange={e => setReservedDiscount(e.target.value)}
                    className="w-full rounded-xl px-2.5 py-1.5 bg-white/[0.03] border border-white/[0.08] text-xs text-[#E2E8F0] focus:border-primary focus:outline-none"
                  >
                    {[10, 20, 30, 40, 50].map(n => (
                      <option key={n} value={n}>{n}% off</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {error && <div className="p-2.5 bg-red-500/10 border border-red-500/20 rounded-lg text-xs text-red-400">{error}</div>}
          {success && <div className="p-2.5 bg-primary/10 border border-primary/20 rounded-lg text-xs text-primary">Listed! Your machine is now on the marketplace.</div>}

          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              disabled={submitting || !machineId || !price}
              className="flex-1 bg-gradient-to-r from-primary-dark to-primary text-white font-semibold py-2.5 rounded-lg transition-colors disabled:opacity-50 text-sm"
            >
              {submitting ? 'Publishing...' : 'Publish Listing'}
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="px-4 py-2.5 bg-white/[0.04] border border-white/[0.08] rounded-lg text-sm text-[#94A3B8] hover:text-[#E2E8F0] transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
