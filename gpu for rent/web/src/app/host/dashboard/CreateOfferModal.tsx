'use client';

import { useState } from 'react';
import { createClient } from '@/utils/supabase/client';

interface Machine {
  id: string;
  gpu_model: string;
  gpu_count: number;
  vram_gb: number;
  offers?: any[];
}

const SUGGESTED_PRICES: Record<string, number> = {
  'RTX 4090': 40,
  'RTX 3090': 25,
  'RTX 3080': 20,
  'RTX 3070': 15,
  'RTX 4080': 35,
  'RTX 4070': 28,
  'A100': 95,
  'A10': 45,
  'A6000': 55,
  'H100': 180,
  'L40S': 60,
  'L40': 55,
  'L4': 25,
  'T4': 12,
  'V100': 18,
};

function getSuggestedPrice(gpuModel: string): number {
  const upper = gpuModel.toUpperCase();
  for (const [key, price] of Object.entries(SUGGESTED_PRICES)) {
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

  const [storagePriceMonth, setStoragePriceMonth] = useState('4.50');
  const [minGpu, setMinGpu] = useState('1');
  const [interruptiblePrice, setInterruptiblePrice] = useState('');
  const [reservedDiscount, setReservedDiscount] = useState('40');

  const eligibleMachines = machines.filter(m => {
    const activeOffers = m.offers?.filter((o: any) => o.status === 'active') || [];
    return activeOffers.length === 0;
  });

  const selectedMachine = eligibleMachines.find(m => m.id === machineId);
  const suggested = selectedMachine ? getSuggestedPrice(selectedMachine.gpu_model) : 0;

  const price = parseFloat(pricePerGpuHr) || 0;
  const reservedPrice = price * (1 - parseInt(reservedDiscount) / 100);
  const interruptPrice = interruptiblePrice ? parseFloat(interruptiblePrice) : price * 0.5;

  const handleMachineSelect = (id: string) => {
    setMachineId(id);
    const m = eligibleMachines.find(x => x.id === id);
    if (m) {
      const s = getSuggestedPrice(m.gpu_model);
      setPricePerGpuHr(String(s));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    setSuccess(false);

    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const offerEndDate = new Date();
      offerEndDate.setDate(offerEndDate.getDate() + parseInt(durationDays));

      const { error: insertError } = await supabase.from('offers').insert({
        machine_id: machineId,
        host_id: user.id,
        price_per_gpu_hr_inr: price,
        storage_price_per_gb_month_inr: parseFloat(storagePriceMonth),
        min_gpu: parseInt(minGpu),
        offer_end_date: offerEndDate.toISOString(),
        interruptible_min_price_inr: interruptiblePrice ? parseFloat(interruptiblePrice) : null,
        reserved_discount_factor: parseInt(reservedDiscount) / 100,
        status: 'active',
      });

      if (insertError) throw new Error(insertError.message);

      await supabase.from('machines').update({
        listed: true,
        price_per_hour_inr: price,
      }).eq('id', machineId);

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
        className="bg-primary hover:bg-primary-dark text-black font-bold py-2 px-4 rounded-lg text-sm transition-colors"
      >
        Create Offer
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-[#0a0a0a] border border-white/10 rounded-2xl w-full max-w-md mx-4 shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-white/10">
          <h2 className="text-lg font-bold">List Machine on Marketplace</h2>
          <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-white text-xl">&times;</button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Machine selector */}
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Select Machine</label>
            <select
              value={machineId}
              onChange={e => handleMachineSelect(e.target.value)}
              required
              className="w-full rounded-lg px-3 py-2.5 bg-black/50 border border-white/10 text-sm focus:border-primary focus:outline-none"
            >
              <option value="">Choose a machine...</option>
              {eligibleMachines.map(m => (
                <option key={m.id} value={m.id}>
                  {m.gpu_count}x {m.gpu_model} ({m.vram_gb}GB) — suggested ₹{getSuggestedPrice(m.gpu_model)}/GPU/hr
                </option>
              ))}
            </select>
            {eligibleMachines.length === 0 && (
              <p className="text-xs text-yellow-400 mt-1">All machines already have active offers.</p>
            )}
          </div>

          {/* Price — the ONE main field */}
          {machineId && (
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Price per GPU/hr (₹)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">₹</span>
                <input
                  type="number"
                  step="0.50"
                  min="1"
                  value={pricePerGpuHr}
                  onChange={e => setPricePerGpuHr(e.target.value)}
                  required
                  className="w-full rounded-lg pl-7 pr-3 py-2.5 bg-black/50 border border-white/10 text-sm text-white focus:border-primary focus:outline-none font-mono text-lg"
                />
              </div>
              <div className="flex items-center gap-2 mt-1.5">
                <span className="text-xs text-gray-500">Suggested: ₹{suggested}/hr</span>
                {price !== suggested && (
                  <button
                    type="button"
                    onClick={() => setPricePerGpuHr(String(suggested))}
                    className="text-xs text-primary hover:underline"
                  >
                    Use suggested
                  </button>
                )}
              </div>

              {/* Price preview */}
              {price > 0 && (
                <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                  <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-2">
                    <div className="text-[10px] text-blue-400 uppercase font-bold">On-Demand</div>
                    <div className="font-mono text-sm text-white">₹{price.toFixed(0)}/hr</div>
                  </div>
                  <div className="bg-green-500/5 border border-green-500/20 rounded-lg p-2">
                    <div className="text-[10px] text-green-400 uppercase font-bold">Reserved</div>
                    <div className="font-mono text-sm text-white">₹{reservedPrice.toFixed(0)}/hr</div>
                    <div className="text-[9px] text-gray-500">-{reservedDiscount}%</div>
                  </div>
                  <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-lg p-2">
                    <div className="text-[10px] text-yellow-400 uppercase font-bold">Interruptible</div>
                    <div className="font-mono text-sm text-white">₹{interruptPrice.toFixed(0)}/hr</div>
                    <div className="text-[9px] text-gray-500">min floor</div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Duration */}
          {machineId && (
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Listing Duration</label>
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
                        : 'bg-black/30 border-white/10 text-gray-400 hover:border-white/20'
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
              className="text-xs text-gray-500 hover:text-gray-300 flex items-center gap-1"
            >
              <svg className={`w-3 h-3 transition-transform ${showAdvanced ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
              Advanced pricing options
            </button>
          )}

          {showAdvanced && (
            <div className="space-y-3 pl-2 border-l-2 border-white/5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-gray-500 mb-1 block">Storage (₹/GB/mo)</label>
                  <input
                    type="number" step="0.01" min="0"
                    value={storagePriceMonth}
                    onChange={e => setStoragePriceMonth(e.target.value)}
                    className="w-full rounded px-2.5 py-1.5 bg-black/50 border border-white/10 text-xs text-white focus:border-primary focus:outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-gray-500 mb-1 block">Min GPUs per rental</label>
                  <select
                    value={minGpu}
                    onChange={e => setMinGpu(e.target.value)}
                    className="w-full rounded px-2.5 py-1.5 bg-black/50 border border-white/10 text-xs text-white focus:border-primary focus:outline-none"
                  >
                    {[1, 2, 4, 8].filter(n => !selectedMachine || n <= selectedMachine.gpu_count).map(n => (
                      <option key={n} value={n}>{n} GPU{n > 1 ? 's' : ''}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-gray-500 mb-1 block">Interruptible floor (₹/hr)</label>
                  <input
                    type="number" step="0.50" min="0"
                    value={interruptiblePrice}
                    onChange={e => setInterruptiblePrice(e.target.value)}
                    placeholder={`${(price * 0.5).toFixed(0)} (auto)`}
                    className="w-full rounded px-2.5 py-1.5 bg-black/50 border border-white/10 text-xs text-white focus:border-primary focus:outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-gray-500 mb-1 block">Reserved discount</label>
                  <select
                    value={reservedDiscount}
                    onChange={e => setReservedDiscount(e.target.value)}
                    className="w-full rounded px-2.5 py-1.5 bg-black/50 border border-white/10 text-xs text-white focus:border-primary focus:outline-none"
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
          {success && <div className="p-2.5 bg-green-500/10 border border-green-500/20 rounded-lg text-xs text-green-400">Listed! Your machine is now on the marketplace.</div>}

          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              disabled={submitting || !machineId || !price}
              className="flex-1 bg-primary hover:bg-primary-dark text-black font-bold py-2.5 rounded-lg transition-colors disabled:opacity-50 text-sm"
            >
              {submitting ? 'Publishing...' : 'Publish Listing'}
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-sm text-gray-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
