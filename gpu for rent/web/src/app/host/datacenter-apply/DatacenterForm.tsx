'use client'

import { useState } from 'react'
import { submitDatacenterApplication } from './actions'

export default function DatacenterForm() {
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    
    try {
      const formData = new FormData(e.currentTarget)
      await submitDatacenterApplication(formData)
      setSuccess(true)
    } catch (err: any) {
      setError(err.message || 'Failed to submit application')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="bg-green-500/5 border border-green-500/20 rounded-xl p-8 text-center">
        <svg className="w-12 h-12 text-green-500 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <h3 className="text-xl font-bold text-white mb-2">Application Submitted</h3>
        <p className="text-gray-400 text-sm">
          We will review your application and get back to you within 3-5 business days.
          You will receive an email notification once your application is processed.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm p-4 rounded-lg">
          {error}
        </div>
      )}

      {/* BUSINESS INFO */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-6">
        <h3 className="font-bold text-white mb-4">Business Information</h3>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-gray-400 font-medium">Business Name *</label>
            <input required name="business_name" type="text" placeholder="Acme Cloud Pvt Ltd" className="bg-black/50 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white focus:border-primary focus:outline-none" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-gray-400 font-medium">Business Registration No. *</label>
            <input required name="business_registration" type="text" placeholder="CIN / Registration Number" className="bg-black/50 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white focus:border-primary focus:outline-none" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-gray-400 font-medium">GSTIN</label>
            <input name="gstin" type="text" placeholder="22AAAAA0000A1Z5" className="bg-black/50 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white focus:border-primary focus:outline-none" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-gray-400 font-medium">CIN</label>
            <input name="cin" type="text" placeholder="U72200MH2020PTC123456" className="bg-black/50 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white focus:border-primary focus:outline-none" />
          </div>
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <label className="text-xs text-gray-400 font-medium">ISO/IEC 27001 Certificate Number</label>
            <input name="iso_cert_number" type="text" placeholder="Certificate number (if applicable)" className="bg-black/50 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white focus:border-primary focus:outline-none" />
          </div>
        </div>
      </div>

      {/* DATACENTER INFO */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-6">
        <h3 className="font-bold text-white mb-4">Datacenter Details</h3>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <label className="text-xs text-gray-400 font-medium">Datacenter Name *</label>
            <input required name="datacenter_name" type="text" placeholder="Name of the datacenter facility" className="bg-black/50 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white focus:border-primary focus:outline-none" />
          </div>
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <label className="text-xs text-gray-400 font-medium">Datacenter Address *</label>
            <input required name="datacenter_address" type="text" placeholder="Full street address" className="bg-black/50 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white focus:border-primary focus:outline-none" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-gray-400 font-medium">City *</label>
            <input required name="datacenter_city" type="text" placeholder="Mumbai" className="bg-black/50 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white focus:border-primary focus:outline-none" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-gray-400 font-medium">State *</label>
            <select required name="datacenter_state" className="bg-black/50 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white focus:border-primary focus:outline-none">
              <option value="">Select State</option>
              <option value="Maharashtra">Maharashtra</option>
              <option value="Karnataka">Karnataka</option>
              <option value="Tamil Nadu">Tamil Nadu</option>
              <option value="Telangana">Telangana</option>
              <option value="Delhi NCR">Delhi NCR</option>
              <option value="Gujarat">Gujarat</option>
              <option value="West Bengal">West Bengal</option>
              <option value="Uttar Pradesh">Uttar Pradesh</option>
              <option value="Rajasthan">Rajasthan</option>
              <option value="Other">Other</option>
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-gray-400 font-medium">GPU Servers to List *</label>
            <input required name="gpu_server_count" type="number" min="1" placeholder="5" className="bg-black/50 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white focus:border-primary focus:outline-none" />
          </div>
        </div>
      </div>

      {/* CONTACT INFO */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-6">
        <h3 className="font-bold text-white mb-4">Authorized Contact</h3>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-gray-400 font-medium">Full Name *</label>
            <input required name="contact_name" type="text" placeholder="Rajesh Kumar" className="bg-black/50 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white focus:border-primary focus:outline-none" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-gray-400 font-medium">Phone *</label>
            <input required name="contact_phone" type="tel" placeholder="+91 98765 43210" className="bg-black/50 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white focus:border-primary focus:outline-none" />
          </div>
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <label className="text-xs text-gray-400 font-medium">Email *</label>
            <input required name="contact_email" type="email" placeholder="rajesh@company.com" className="bg-black/50 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white focus:border-primary focus:outline-none" />
          </div>
        </div>
      </div>

      {/* NOTES */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-6">
        <h3 className="font-bold text-white mb-4">Additional Information</h3>
        <textarea 
          name="additional_notes" 
          rows={4}
          placeholder="Any additional information about your datacenter, certifications, or infrastructure..."
          className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white focus:border-primary focus:outline-none resize-none"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-primary hover:bg-primary-dark text-black font-bold py-3 rounded-xl transition-colors disabled:opacity-50 text-sm"
      >
        {loading ? 'Submitting Application...' : 'Submit Datacenter Application'}
      </button>
    </form>
  )
}
