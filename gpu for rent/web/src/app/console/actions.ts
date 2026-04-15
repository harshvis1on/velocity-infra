'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function stopInstance(instanceId: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('You must be logged in.')
  }

  const { data: instance } = await supabase
    .from('instances')
    .select('machine_id, gpu_count, rental_contract_id')
    .eq('id', instanceId)
    .eq('renter_id', user.id)
    .single()

  if (!instance) throw new Error('Instance not found.')

  await supabase
    .from('instances')
    .update({ status: 'stopped', stopped_at: new Date().toISOString() })
    .eq('id', instanceId)

  const gpuToFree = instance.gpu_count || 1

  const { data: machine } = await supabase
    .from('machines')
    .select('gpu_allocated')
    .eq('id', instance.machine_id)
    .single()

  if (machine) {
    const newAllocated = Math.max(0, (machine.gpu_allocated || 0) - gpuToFree)
    await supabase
      .from('machines')
      .update({ gpu_allocated: newAllocated })
      .eq('id', instance.machine_id)
  }

  revalidatePath('/console')
  revalidatePath('/host/dashboard')
}

export async function destroyInstance(instanceId: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('You must be logged in.')
  }

  const { data: instance } = await supabase
    .from('instances')
    .select('machine_id, gpu_count, rental_contract_id')
    .eq('id', instanceId)
    .eq('renter_id', user.id)
    .single()

  if (!instance) throw new Error('Instance not found.')

  await supabase
    .from('instances')
    .update({ status: 'destroyed', destroyed_at: new Date().toISOString() })
    .eq('id', instanceId)

  const gpuToFree = instance.gpu_count || 1

  const { data: machine } = await supabase
    .from('machines')
    .select('gpu_allocated, gpu_count')
    .eq('id', instance.machine_id)
    .single()

  if (machine) {
    const newAllocated = Math.max(0, (machine.gpu_allocated || 0) - gpuToFree)
    await supabase
      .from('machines')
      .update({
        gpu_allocated: newAllocated,
        status: newAllocated === 0 ? 'available' : 'available',
      })
      .eq('id', instance.machine_id)
  }

  if (instance.rental_contract_id) {
    await supabase
      .from('rental_contracts')
      .update({ status: 'terminated', ended_at: new Date().toISOString() })
      .eq('id', instance.rental_contract_id)
  }

  revalidatePath('/console')
  revalidatePath('/host/dashboard')
}
