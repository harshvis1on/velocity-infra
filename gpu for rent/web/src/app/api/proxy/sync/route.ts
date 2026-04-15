import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getEnabledProviders, getProxyHostId } from '@/lib/providers'
import { applyMargin, applyStorageMargin } from '@/lib/providers/margin'
import type { ProxyGpuOffer } from '@/lib/providers/types'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: Request) {
  const authHeader = request.headers.get('Authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const errors: string[] = []
  let synced = 0
  const seenMachineIds: string[] = []

  let hostId: string
  try {
    hostId = getProxyHostId()
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }

  const providers = getEnabledProviders()
  if (providers.length === 0) {
    return NextResponse.json({ synced: 0, stale: 0, errors: ['No providers enabled'] })
  }

  for (const provider of providers) {
    let offers: ProxyGpuOffer[]
    try {
      offers = await provider.syncAvailableGpus()
    } catch (err: any) {
      errors.push(`${provider.name}: syncAvailableGpus failed – ${err.message}`)
      continue
    }

    for (const offer of offers) {
      try {
        const { priceInr: pricePerGpuHrInr } = applyMargin(offer.pricePerGpuHrUsd)
        const storagePriceInr = applyStorageMargin(offer.storagePricePerGbMonthUsd)

        // Upsert machine
        const { data: existing } = await supabase
          .from('machines')
          .select('id')
          .eq('source', offer.provider)
          .eq('provider_machine_id', offer.providerMachineId)
          .limit(1)
          .single()

        let machineId: string

        if (existing) {
          const { error: updateErr } = await supabase
            .from('machines')
            .update({
              gpu_model: offer.gpuModel,
              gpu_count: offer.gpuCount,
              vram_gb: offer.vramGb,
              ram_gb: offer.ramGb,
              vcpu_count: offer.vcpuCount,
              storage_gb: offer.storageGb,
              status: 'available',
              listed: true,
              location: offer.location,
              reliability_score: offer.reliability,
              last_heartbeat: new Date().toISOString(),
              price_per_hour_inr: pricePerGpuHrInr,
            })
            .eq('id', existing.id)
          if (updateErr) throw updateErr
          machineId = existing.id
        } else {
          const { data: inserted, error: insertErr } = await supabase
            .from('machines')
            .insert({
              host_id: hostId,
              gpu_model: offer.gpuModel,
              gpu_count: offer.gpuCount,
              vram_gb: offer.vramGb,
              ram_gb: offer.ramGb,
              vcpu_count: offer.vcpuCount,
              storage_gb: offer.storageGb,
              status: 'available',
              listed: true,
              source: offer.provider,
              provider_machine_id: offer.providerMachineId,
              location: offer.location,
              reliability_score: offer.reliability,
              last_heartbeat: new Date().toISOString(),
              price_per_hour_inr: pricePerGpuHrInr,
            })
            .select('id')
            .single()
          if (insertErr || !inserted) throw insertErr ?? new Error('Machine insert returned null')
          machineId = inserted.id
        }

        seenMachineIds.push(machineId)

        // Upsert offer
        const { data: existingOffer } = await supabase
          .from('offers')
          .select('id')
          .eq('machine_id', machineId)
          .eq('status', 'active')
          .limit(1)
          .single()

        if (existingOffer) {
          const { error: offerUpdateErr } = await supabase
            .from('offers')
            .update({
              price_per_gpu_hr_inr: pricePerGpuHrInr,
              storage_price_per_gb_month_inr: storagePriceInr,
            })
            .eq('id', existingOffer.id)
          if (offerUpdateErr) throw offerUpdateErr
        } else {
          const { error: offerInsertErr } = await supabase
            .from('offers')
            .insert({
              machine_id: machineId,
              host_id: hostId,
              status: 'active',
              price_per_gpu_hr_inr: pricePerGpuHrInr,
              storage_price_per_gb_month_inr: storagePriceInr,
              min_gpu: 1,
              source: offer.provider,
            })
          if (offerInsertErr) throw offerInsertErr
        }

        synced++
      } catch (err: any) {
        errors.push(`${provider.name}/${offer.providerMachineId}: ${err.message}`)
      }
    }
  }

  // Mark stale proxy machines as offline and their offers as expired
  let stale = 0
  const { data: staleMachines } = await supabase
    .from('machines')
    .select('id')
    .eq('host_id', hostId)
    .eq('status', 'available')
    .not('id', 'in', `(${seenMachineIds.join(',')})`)

  if (staleMachines && staleMachines.length > 0) {
    const staleIds = staleMachines.map((m) => m.id)

    const { error: machineErr } = await supabase
      .from('machines')
      .update({ status: 'offline', listed: false })
      .in('id', staleIds)
    if (machineErr) errors.push(`Stale machine update: ${machineErr.message}`)

    const { error: offerErr } = await supabase
      .from('offers')
      .update({ status: 'expired' })
      .in('machine_id', staleIds)
      .eq('status', 'active')
    if (offerErr) errors.push(`Stale offer update: ${offerErr.message}`)

    stale = staleIds.length
  }

  return NextResponse.json({ synced, stale, errors: errors.length > 0 ? errors : undefined })
}
