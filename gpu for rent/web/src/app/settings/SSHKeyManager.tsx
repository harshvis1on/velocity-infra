'use client'

import { useState } from 'react'
import { addSshKey, deleteSshKey } from './actions'

export default function SSHKeyManager({ initialKeys }: { initialKeys: any[] }) {
  const [keys, setKeys] = useState(initialKeys)
  const [name, setName] = useState('')
  const [publicKey, setPublicKey] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleAddKey = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      if (!name || !publicKey) throw new Error('Name and public key are required.')
      if (!publicKey.startsWith('ssh-')) throw new Error('Invalid SSH public key format.')
      
      const newKey = await addSshKey(name, publicKey)
      setKeys([newKey, ...keys])
      setName('')
      setPublicKey('')
    } catch (err: any) {
      setError(err.message || 'Failed to add SSH key')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteKey = async (id: string) => {
    if (!confirm('Are you sure you want to delete this SSH key?')) return
    try {
      await deleteSshKey(id)
      setKeys(keys.filter(k => k.id !== id))
    } catch (err: any) {
      alert(err.message || 'Failed to delete SSH key')
    }
  }

  return (
    <div className="bg-white/[0.03] border border-white/[0.06] p-6 rounded-xl mt-6">
      <h2 className="text-xl font-heading font-bold text-[#E2E8F0] mb-6">SSH Keys</h2>
      <p className="text-sm text-[#94A3B8] mb-6">
        Add your public SSH keys here. You can select them when deploying a new instance to enable secure access.
      </p>
      
      <form onSubmit={handleAddKey} className="mb-8 space-y-4">
        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-500 text-sm rounded-lg">
            {error}
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-1">
            <label className="text-xs text-[#64748B] font-medium mb-1 block">Key Name</label>
            <input 
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. My MacBook Pro" 
              className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-3 py-2 text-sm text-[#E2E8F0] focus:border-primary focus:outline-none placeholder:text-[#475569]" 
            />
          </div>
          <div className="md:col-span-2">
            <label className="text-xs text-[#64748B] font-medium mb-1 block">Public Key</label>
            <input 
              value={publicKey}
              onChange={(e) => setPublicKey(e.target.value)}
              placeholder="ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQC..." 
              className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-3 py-2 text-sm text-[#E2E8F0] focus:border-primary focus:outline-none font-mono placeholder:text-[#475569]" 
            />
          </div>
        </div>
        <button 
          type="submit"
          disabled={loading}
          className="bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] text-[#94A3B8] text-xs font-bold py-2 px-4 rounded-lg transition-all disabled:opacity-50"
        >
          {loading ? 'Adding...' : 'Add SSH Key'}
        </button>
      </form>

      <div className="space-y-4">
        {keys.length === 0 ? (
          <div className="text-sm text-[#64748B] text-center py-4">No SSH keys added yet.</div>
        ) : (
          keys.map(key => (
            <div key={key.id} className="p-4 border border-white/[0.06] rounded-xl bg-white/[0.03] flex justify-between items-center">
              <div>
                <div className="text-sm font-medium text-[#E2E8F0]">{key.name}</div>
                <div className="text-xs text-[#64748B] font-mono mt-1">
                  {key.public_key.substring(0, 30)}...{key.public_key.substring(key.public_key.length - 20)}
                </div>
              </div>
              <button 
                onClick={() => handleDeleteKey(key.id)}
                className="text-red-500 hover:text-red-400 text-xs font-medium transition-colors p-2"
              >
                Delete
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
