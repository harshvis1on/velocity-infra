import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createOfferSchema, updateOfferSchema } from '@/lib/validations';

export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: offers, error } = await supabase
    .from('offers')
    .select(`
      *,
      machines (id, gpu_model, gpu_count, vram_gb, ram_gb, vcpu_count, storage_gb, location, machine_tier, reliability_score, gpu_allocated, listed),
      rental_contracts (id, gpu_count, status, rental_end_date, renter_id, rental_type)
    `)
    .eq('host_id', user.id)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(offers);
}

export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const parsed = createOfferSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map(i => i.message).join(', ') },
      { status: 400 }
    );
  }

  const { machineId, pricePerGpuHrUsd, storagePricePerGbMonthUsd, bandwidthUploadPricePerGbUsd, bandwidthDownloadPricePerGbUsd, minGpu, offerEndDate, interruptibleMinPriceUsd, reservedDiscountFactor } = parsed.data;
  const autoPrice = body.autoPrice === true;

  const { data: machine, error: machineErr } = await supabase
    .from('machines')
    .select('id, host_id, gpu_count')
    .eq('id', machineId)
    .eq('host_id', user.id)
    .single();

  if (machineErr || !machine) {
    return NextResponse.json({ error: 'Machine not found or not owned by you' }, { status: 404 });
  }

  if (minGpu > machine.gpu_count) {
    return NextResponse.json({ error: `min_gpu (${minGpu}) exceeds machine GPU count (${machine.gpu_count})` }, { status: 400 });
  }

  const { data: existingOffer } = await supabase
    .from('offers')
    .select('id')
    .eq('machine_id', machineId)
    .eq('status', 'active')
    .maybeSingle();

  if (existingOffer) {
    return NextResponse.json({ error: 'Machine already has an active offer. Unlist the existing offer first.' }, { status: 409 });
  }

  const { data: offer, error: insertErr } = await supabase
    .from('offers')
    .insert({
      machine_id: machineId,
      host_id: user.id,
      price_per_gpu_hr_usd: pricePerGpuHrUsd,
      storage_price_per_gb_month_usd: storagePricePerGbMonthUsd,
      bandwidth_upload_price_per_gb_usd: bandwidthUploadPricePerGbUsd,
      bandwidth_download_price_per_gb_usd: bandwidthDownloadPricePerGbUsd,
      min_gpu: minGpu,
      offer_end_date: offerEndDate,
      interruptible_min_price_usd: interruptibleMinPriceUsd || null,
      reserved_discount_factor: reservedDiscountFactor,
      auto_price: autoPrice,
    })
    .select()
    .single();

  if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 500 });

  await supabase
    .from('machines')
    .update({ listed: true, status: 'available' })
    .eq('id', machineId);

  return NextResponse.json(offer, { status: 201 });
}

export async function PATCH(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const { offerId, ...updates } = body;

  if (!offerId || typeof offerId !== 'string') {
    return NextResponse.json({ error: 'offerId is required' }, { status: 400 });
  }

  const parsed = updateOfferSchema.safeParse(updates);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map(i => i.message).join(', ') },
      { status: 400 }
    );
  }

  const { data: offer, error: offerErr } = await supabase
    .from('offers')
    .select('id, machine_id, status, machines (id, gpu_count)')
    .eq('id', offerId)
    .eq('host_id', user.id)
    .single();

  if (offerErr || !offer) {
    return NextResponse.json({ error: 'Offer not found or not owned by you' }, { status: 404 });
  }

  if (offer.status !== 'active') {
    return NextResponse.json({ error: 'Only active offers can be updated' }, { status: 409 });
  }

  const machine = offer.machines as any;
  if (parsed.data.minGpu && machine && parsed.data.minGpu > machine.gpu_count) {
    return NextResponse.json(
      { error: `min_gpu (${parsed.data.minGpu}) exceeds machine GPU count (${machine.gpu_count})` },
      { status: 400 }
    );
  }

  const dbUpdates: Record<string, any> = {};
  if (parsed.data.pricePerGpuHrUsd !== undefined) dbUpdates.price_per_gpu_hr_usd = parsed.data.pricePerGpuHrUsd;
  if (parsed.data.storagePricePerGbMonthUsd !== undefined) dbUpdates.storage_price_per_gb_month_usd = parsed.data.storagePricePerGbMonthUsd;
  if (parsed.data.bandwidthUploadPricePerGbUsd !== undefined) dbUpdates.bandwidth_upload_price_per_gb_usd = parsed.data.bandwidthUploadPricePerGbUsd;
  if (parsed.data.bandwidthDownloadPricePerGbUsd !== undefined) dbUpdates.bandwidth_download_price_per_gb_usd = parsed.data.bandwidthDownloadPricePerGbUsd;
  if (parsed.data.minGpu !== undefined) dbUpdates.min_gpu = parsed.data.minGpu;
  if (parsed.data.offerEndDate !== undefined) dbUpdates.offer_end_date = parsed.data.offerEndDate;
  if (parsed.data.interruptibleMinPriceUsd !== undefined) dbUpdates.interruptible_min_price_usd = parsed.data.interruptibleMinPriceUsd;
  if (parsed.data.reservedDiscountFactor !== undefined) dbUpdates.reserved_discount_factor = parsed.data.reservedDiscountFactor;

  if (Object.keys(dbUpdates).length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
  }

  const { data: updated, error: updateErr } = await supabase
    .from('offers')
    .update(dbUpdates)
    .eq('id', offerId)
    .select()
    .single();

  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 });

  if (dbUpdates.price_per_gpu_hr_usd) {
    await supabase
      .from('machines')
      .update({ price_per_hour_usd: dbUpdates.price_per_gpu_hr_usd })
      .eq('id', offer.machine_id);
  }

  return NextResponse.json(updated);
}
