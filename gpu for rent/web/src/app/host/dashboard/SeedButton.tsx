'use client'

import { useState } from 'react'
import { seedDummyMachines } from './seedActions'

export default function SeedButton() {
  const [loading, setLoading] = useState(false)

  async function handleSeed() {
    setLoading(true)
    try {
      await seedDummyMachines()
      alert('Successfully seeded 5 test machines to the marketplace!')
    } catch (err: any) {
      alert(err.message || 'Failed to seed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <button 
      onClick={handleSeed}
      disabled={loading}
      className="bg-white/10 hover:bg-white/20 text-white text-sm font-bold py-2 px-4 rounded transition-colors disabled:opacity-50"
    >
      {loading ? 'Seeding...' : 'Seed Test Data'}
    </button>
  )
}
