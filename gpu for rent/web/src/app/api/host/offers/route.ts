import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createOfferSchema } from '@/lib/validations';

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

  const { machineId, pricePerGpuHrInr, storagePricePerGbMonthInr, bandwidthUploadPricePerGbInr, bandwidthDownloadPricePerGbInr, minGpu, offerEndDate, interruptibleMinPriceInr, reservedDiscountFactor } = parsed.data;

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
      price_per_gpu_hr_inr: pricePerGpuHrInr,
      storage_price_per_gb_month_inr: storagePricePerGbMonthInr,
      bandwidth_upload_price_per_gb_inr: bandwidthUploadPricePerGbInr,
      bandwidth_download_price_per_gb_inr: bandwidthDownloadPricePerGbInr,
      min_gpu: minGpu,
      offer_end_date: offerEndDate,
      interruptible_min_price_inr: interruptibleMinPriceInr || null,
      reserved_discount_factor: reservedDiscountFactor,
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
