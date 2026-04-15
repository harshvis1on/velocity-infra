'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { addMachineSchema } from '@/lib/validations'

export async function addMachine(formData: FormData) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('You must be logged in to add a machine.')
  }

  const rawData = {
    gpu_model: formData.get('gpu_model') as string,
    gpu_count: parseInt(formData.get('gpu_count') as string, 10),
    vram_gb: parseInt(formData.get('vram_gb') as string, 10),
    ram_gb: parseInt(formData.get('ram_gb') as string, 10),
    vcpu_count: parseInt(formData.get('vcpu_count') as string, 10),
    storage_gb: parseInt(formData.get('storage_gb') as string, 10),
    location: formData.get('location') as string,
    price_per_hour_inr: parseFloat(formData.get('price_per_hour_inr') as string),
    storage_price_per_gb_hr: parseFloat(formData.get('storage_price_per_gb_hr') as string || '0.00014'),
    min_gpu: parseInt(formData.get('min_gpu') as string || '1', 10),
  }

  const parsed = addMachineSchema.safeParse(rawData)
  if (!parsed.success) {
    throw new Error(`Invalid input: ${parsed.error.issues.map(i => i.message).join(', ')}`)
  }

  const offerEndDateStr = formData.get('offer_end_date') as string

  const { data: machine, error } = await supabase
    .from('machines')
    .insert({
      host_id: user.id,
      gpu_model: parsed.data.gpu_model,
      gpu_count: parsed.data.gpu_count,
      vram_gb: parsed.data.vram_gb,
      ram_gb: parsed.data.ram_gb,
      vcpu_count: parsed.data.vcpu_count,
      storage_gb: parsed.data.storage_gb,
      location: parsed.data.location,
      price_per_hour_inr: parsed.data.price_per_hour_inr,
      storage_price_per_gb_hr: parsed.data.storage_price_per_gb_hr,
      min_gpu: parsed.data.min_gpu,
      status: 'available',
    })
    .select('id')
    .single()

  if (error) {
    console.error('Error adding machine:', error)
    throw new Error(`Failed to add machine: ${error.message}`)
  }

  if (machine && offerEndDateStr) {
    const { error: offerErr } = await supabase
      .from('offers')
      .insert({
        machine_id: machine.id,
        host_id: user.id,
        price_per_gpu_hr_inr: parsed.data.price_per_hour_inr,
        storage_price_per_gb_month_inr: parsed.data.storage_price_per_gb_hr * 24 * 30,
        min_gpu: parsed.data.min_gpu,
        offer_end_date: new Date(offerEndDateStr).toISOString(),
      })

    if (offerErr) {
      console.error('Machine created but offer failed:', offerErr)
    } else {
      await supabase
        .from('machines')
        .update({ listed: true })
        .eq('id', machine.id)
    }
  }

  revalidatePath('/host/dashboard')
  revalidatePath('/console')
}

export async function createOffer(formData: FormData) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('You must be logged in.')

  const machineId = formData.get('machine_id') as string
  const pricePerGpuHr = parseFloat(formData.get('price_per_gpu_hr_inr') as string)
  const storagePriceMonth = parseFloat(formData.get('storage_price_per_gb_month_inr') as string || '4.5')
  const minGpu = parseInt(formData.get('min_gpu') as string || '1', 10)
  const offerEndDate = formData.get('offer_end_date') as string
  const interruptibleMinPrice = formData.get('interruptible_min_price_inr') as string
  const reservedDiscount = parseFloat(formData.get('reserved_discount_factor') as string || '0.4')

  if (!machineId || !pricePerGpuHr || !offerEndDate) {
    throw new Error('Machine ID, GPU price, and offer end date are required.')
  }

  const { data: machine } = await supabase
    .from('machines')
    .select('id, gpu_count')
    .eq('id', machineId)
    .eq('host_id', user.id)
    .single()

  if (!machine) throw new Error('Machine not found or not owned by you.')

  const { data: existing } = await supabase
    .from('offers')
    .select('id')
    .eq('machine_id', machineId)
    .eq('status', 'active')
    .maybeSingle()

  if (existing) {
    throw new Error('Machine already has an active offer. Unlist it first.')
  }

  const { error } = await supabase
    .from('offers')
    .insert({
      machine_id: machineId,
      host_id: user.id,
      price_per_gpu_hr_inr: pricePerGpuHr,
      storage_price_per_gb_month_inr: storagePriceMonth,
      min_gpu: minGpu,
      offer_end_date: new Date(offerEndDate).toISOString(),
      interruptible_min_price_inr: interruptibleMinPrice ? parseFloat(interruptibleMinPrice) : null,
      reserved_discount_factor: reservedDiscount,
    })

  if (error) {
    console.error('Error creating offer:', error)
    throw new Error('Failed to create offer.')
  }

  await supabase
    .from('machines')
    .update({ listed: true, status: 'available' })
    .eq('id', machineId)

  revalidatePath('/host/dashboard')
  revalidatePath('/console')
}

export async function unlistOffer(offerId: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('You must be logged in.')

  const { data: offer } = await supabase
    .from('offers')
    .select('id, machine_id')
    .eq('id', offerId)
    .eq('host_id', user.id)
    .single()

  if (!offer) throw new Error('Offer not found.')

  await supabase
    .from('offers')
    .update({ status: 'unlisted' })
    .eq('id', offerId)

  const { data: remaining } = await supabase
    .from('offers')
    .select('id')
    .eq('machine_id', offer.machine_id)
    .eq('status', 'active')

  if (!remaining || remaining.length === 0) {
    await supabase
      .from('machines')
      .update({ listed: false })
      .eq('id', offer.machine_id)
  }

  revalidatePath('/host/dashboard')
  revalidatePath('/console')
}

export async function unlistMachine(machineId: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('You must be logged in.')

  await supabase
    .from('offers')
    .update({ status: 'unlisted' })
    .eq('machine_id', machineId)
    .eq('host_id', user.id)
    .eq('status', 'active')

  await supabase
    .from('machines')
    .update({ listed: false, status: 'offline' })
    .eq('id', machineId)
    .eq('host_id', user.id)

  revalidatePath('/host/dashboard')
  revalidatePath('/console')
}

export async function updateMachinePricing(machineId: string, formData: FormData) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('You must be logged in.')

  const pricePerHourInr = parseFloat(formData.get('price_per_hour_inr') as string)
  const storagePricePerGbHr = parseFloat(formData.get('storage_price_per_gb_hr') as string)
  const offerEndDateStr = formData.get('offer_end_date') as string
  const offerEndDate = offerEndDateStr ? new Date(offerEndDateStr).toISOString() : null

  const { error } = await supabase
    .from('machines')
    .update({
      price_per_hour_inr: pricePerHourInr,
      storage_price_per_gb_hr: storagePricePerGbHr,
      offer_end_date: offerEndDate
    })
    .eq('id', machineId)
    .eq('host_id', user.id)

  if (error) throw new Error('Failed to update pricing.')

  revalidatePath('/host/dashboard')
  revalidatePath('/console')
}

export async function scheduleMaintenance(machineId: string, startDate: string, durationHrs: number) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('You must be logged in.')

  const { data: machine } = await supabase
    .from('machines')
    .select('id')
    .eq('id', machineId)
    .eq('host_id', user.id)
    .single()

  if (!machine) throw new Error('Machine not found.')

  const { error } = await supabase
    .from('maintenance_windows')
    .insert({
      machine_id: machineId,
      start_date: new Date(startDate).toISOString(),
      duration_hrs: durationHrs,
    })

  if (error) throw new Error('Failed to schedule maintenance.')

  revalidatePath('/host/dashboard')
}

export async function cancelMaintenance(machineId: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('You must be logged in.')

  await supabase
    .from('maintenance_windows')
    .update({ status: 'cancelled' })
    .eq('machine_id', machineId)
    .eq('status', 'scheduled')

  revalidatePath('/host/dashboard')
}
