'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

async function callProxyLifecycle(action: 'stop' | 'destroy', instanceId: string): Promise<boolean> {
  try {
    const base = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
    const res = await fetch(`${base}/api/proxy/lifecycle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, instanceId }),
    })
    if (!res.ok) {
      console.error(`Proxy lifecycle ${action} failed: ${res.status} ${await res.text()}`)
      return false
    }
    return true
  } catch (err) {
    console.error(`Proxy lifecycle ${action} error:`, err)
    return false
  }
}

export async function stopInstance(instanceId: string): Promise<{ error?: string }> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'You must be logged in.' }
  }

  const { data: instance } = await supabase
    .from('instances')
    .select('machine_id, gpu_count, rental_contract_id, status, provider_instance_id, status_confirmed_at')
    .eq('id', instanceId)
    .eq('renter_id', user.id)
    .single()

  if (!instance) return { error: 'Instance not found.' }

  if (instance.status === 'stopped') {
    return {}
  }

  const { data: machine } = await supabase
    .from('machines')
    .select('gpu_allocated, source')
    .eq('id', instance.machine_id)
    .single()

  if (!machine) return { error: 'Machine not found.' }

  const isProxy = machine.source !== 'native' && !!instance.provider_instance_id

  if (isProxy) {
    await callProxyLifecycle('stop', instanceId)
  }

  const updatePayload: Record<string, unknown> = {
    status: 'stopped',
    stopped_at: new Date().toISOString(),
  }
  if (instance.status_confirmed_at) {
    updatePayload.status_confirmed_at = null
  }

  await supabase
    .from('instances')
    .update(updatePayload)
    .eq('id', instanceId)

  const gpuToFree = instance.gpu_count || 1
  const newAllocated = Math.max(0, (machine.gpu_allocated || 0) - gpuToFree)
  await supabase
    .from('machines')
    .update({ gpu_allocated: newAllocated })
    .eq('id', instance.machine_id)

  revalidatePath('/console')
  revalidatePath('/host/dashboard')
  return {}
}

export async function destroyInstance(instanceId: string): Promise<{ error?: string }> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'You must be logged in.' }
  }

  const { data: instance } = await supabase
    .from('instances')
    .select('machine_id, gpu_count, rental_contract_id, status, provider_instance_id, status_confirmed_at')
    .eq('id', instanceId)
    .eq('renter_id', user.id)
    .single()

  if (!instance) return { error: 'Instance not found.' }

  if (instance.status === 'destroyed') {
    return {}
  }

  const { data: machine } = await supabase
    .from('machines')
    .select('gpu_allocated, gpu_count, source')
    .eq('id', instance.machine_id)
    .single()

  if (!machine) return { error: 'Machine not found.' }

  const isProxy = machine.source !== 'native' && !!instance.provider_instance_id

  if (isProxy) {
    await callProxyLifecycle('destroy', instanceId)
  }

  const updatePayload: Record<string, unknown> = {
    status: 'destroyed',
    destroyed_at: new Date().toISOString(),
  }
  if (instance.status_confirmed_at) {
    updatePayload.status_confirmed_at = null
  }

  await supabase
    .from('instances')
    .update(updatePayload)
    .eq('id', instanceId)

  const gpuToFree = instance.gpu_count || 1
  const newAllocated = Math.max(0, (machine.gpu_allocated || 0) - gpuToFree)
  await supabase
    .from('machines')
    .update({
      gpu_allocated: newAllocated,
      status: newAllocated === 0 ? 'available' : 'available',
    })
    .eq('id', instance.machine_id)

  if (instance.rental_contract_id) {
    await supabase
      .from('rental_contracts')
      .update({ status: 'terminated', ended_at: new Date().toISOString() })
      .eq('id', instance.rental_contract_id)
  }

  revalidatePath('/console')
  revalidatePath('/host/dashboard')
  return {}
}
