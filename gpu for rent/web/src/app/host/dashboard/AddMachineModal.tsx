'use client'

import { useState } from 'react'
import { addMachine } from './actions'

export default function AddMachineModal() {
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(formData: FormData) {
    setLoading(true)
    setError(null)
    try {
      await addMachine(formData)
      setIsOpen(false)
    } catch (err: any) {
      setError(err.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="bg-primary hover:bg-primary-dark text-black text-sm font-bold py-2 px-4 rounded transition-colors flex items-center gap-2"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
        List Machine
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-[#0a0a0a] border border-white/10 rounded-2xl w-full max-w-2xl shadow-2xl relative my-8">
            
            <div className="p-6 border-b border-white/10 flex justify-between items-center bg-black/50 rounded-t-2xl">
              <div>
                <h2 className="text-xl font-bold text-white">List Your Machine</h2>
                <p className="text-sm text-gray-400 mt-1">Configure your hardware specs and pricing to start renting.</p>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 p-2 rounded-full transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            
            <div className="p-6">
              {error && (
                <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 text-red-500 text-sm rounded-lg flex items-start gap-3">
                  <svg className="w-5 h-5 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  <div>
                    <div className="font-bold mb-1">Failed to list machine</div>
                    {error}
                  </div>
                </div>
              )}

              <form id="add-machine-form" action={handleSubmit} className="space-y-8">
                
                {/* Section 1: Hardware */}
                <div>
                  <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" /></svg>
                    Hardware Specs
                  </h3>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs text-gray-300 font-medium">GPU Model</label>
                      <input required name="gpu_model" type="text" placeholder="e.g. RTX 4090" className="bg-black/50 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all" />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs text-gray-300 font-medium">GPU Count</label>
                      <input required name="gpu_count" type="number" min="1" defaultValue="1" className="bg-black/50 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all" />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs text-gray-300 font-medium">VRAM (GB per GPU)</label>
                      <input required name="vram_gb" type="number" min="1" placeholder="e.g. 24" className="bg-black/50 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all" />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs text-gray-300 font-medium">System RAM (GB)</label>
                      <input required name="ram_gb" type="number" min="1" placeholder="e.g. 64" className="bg-black/50 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all" />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs text-gray-300 font-medium">vCPU Count</label>
                      <input required name="vcpu_count" type="number" min="1" placeholder="e.g. 16" className="bg-black/50 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all" />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs text-gray-300 font-medium">Total Storage (GB)</label>
                      <input required name="storage_gb" type="number" min="1" placeholder="e.g. 1000" className="bg-black/50 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all" />
                    </div>
                  </div>
                </div>

                {/* Section 2: Hosting Model */}
                <div>
                  <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                    Hosting Rules & Location
                  </h3>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs text-gray-300 font-medium flex items-center gap-1">
                        Min GPU Slice
                        <span className="text-gray-500 cursor-help" title="Smallest number of GPUs a renter can rent from this machine">ⓘ</span>
                      </label>
                      <input required name="min_gpu" type="number" min="1" defaultValue="1" className="bg-black/50 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all" />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs text-gray-300 font-medium">Location</label>
                      <input required name="location" type="text" placeholder="e.g. Mumbai, India" className="bg-black/50 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all" />
                    </div>
                    <div className="flex flex-col gap-1.5 col-span-2">
                      <label className="text-xs text-gray-300 font-medium flex items-center gap-1">
                        Offer End Date
                        <span className="text-gray-500 cursor-help" title="You commit to keeping the machine online until this date.">ⓘ</span>
                      </label>
                      <input required name="offer_end_date" type="datetime-local" className="bg-black/50 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all [color-scheme:dark]" />
                    </div>
                  </div>
                </div>

                {/* Section 3: Pricing */}
                <div>
                  <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    Pricing
                  </h3>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs text-gray-300 font-medium">GPU Price per Hour (₹)</label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">₹</span>
                        <input required name="price_per_hour_inr" type="number" step="0.01" min="1" placeholder="35.00" className="w-full bg-black/50 border border-white/10 rounded-lg pl-8 pr-4 py-2.5 text-sm text-white focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all font-mono" />
                      </div>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs text-gray-300 font-medium">Storage Price (₹/GB/hr)</label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">₹</span>
                        <input required name="storage_price_per_gb_hr" type="number" step="0.00001" min="0" defaultValue="0.00014" className="w-full bg-black/50 border border-white/10 rounded-lg pl-8 pr-4 py-2.5 text-sm text-white focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all font-mono" />
                      </div>
                    </div>
                  </div>
                </div>

              </form>
            </div>

            <div className="p-6 border-t border-white/10 bg-black/50 rounded-b-2xl flex justify-end gap-3">
              <button 
                type="button" 
                onClick={() => setIsOpen(false)}
                className="px-6 py-2 text-sm font-medium text-gray-300 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button 
                type="submit"
                form="add-machine-form"
                disabled={loading}
                className="bg-primary hover:bg-primary-dark text-black text-sm font-bold py-2 px-8 rounded transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-black" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                    Listing...
                  </>
                ) : (
                  'List Machine'
                )}
              </button>
            </div>

          </div>
        </div>
      )}
    </>
  )
}
