'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function seedDummyMachines() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Must be logged in to seed data')
  }

  const dummyMachines = [
    {
      host_id: user.id,
      gpu_model: 'RTX 4090',
      gpu_count: 1,
      vram_gb: 24,
      ram_gb: 64,
      vcpu_count: 16,
      storage_gb: 500,
      location: 'Mumbai, MH',
      price_per_hour_usd: 35.00,
      status: 'available',
    },
    {
      host_id: user.id,
      gpu_model: 'RTX 3090',
      gpu_count: 2,
      vram_gb: 24,
      ram_gb: 128,
      vcpu_count: 32,
      storage_gb: 1000,
      location: 'Bangalore, KA',
      price_per_hour_usd: 45.00,
      status: 'available',
    },
    {
      host_id: user.id,
      gpu_model: 'A100 PCIe',
      gpu_count: 4,
      vram_gb: 80,
      ram_gb: 512,
      vcpu_count: 64,
      storage_gb: 2000,
      location: 'Pune, MH',
      price_per_hour_usd: 440.00,
      status: 'available',
    },
    {
      host_id: user.id,
      gpu_model: 'H100 SXM5',
      gpu_count: 8,
      vram_gb: 80,
      ram_gb: 2048,
      vcpu_count: 128,
      storage_gb: 4000,
      location: 'Delhi, DL',
      price_per_hour_usd: 1760.00,
      status: 'available',
    },
    {
      host_id: user.id,
      gpu_model: 'L40S',
      gpu_count: 1,
      vram_gb: 48,
      ram_gb: 128,
      vcpu_count: 32,
      storage_gb: 500,
      location: 'Chennai, KA',
      price_per_hour_usd: 95.00,
      status: 'available',
    }
  ]

  for (const m of dummyMachines) {
    await supabase.from('machines').insert(m)
  }

  revalidatePath('/console')
  revalidatePath('/host/dashboard')
}
