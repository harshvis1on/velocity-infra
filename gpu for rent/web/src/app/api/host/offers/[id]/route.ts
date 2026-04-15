import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { updateOfferSchema } from '@/lib/validations';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: offer, error } = await supabase
    .from('offers')
    .select(`
      *,
      machines (id, gpu_model, gpu_count, vram_gb, ram_gb, location, machine_tier, reliability_score, gpu_allocated),
      rental_contracts (id, gpu_count, status, rental_end_date, renter_id, rental_type, price_per_gpu_hr_inr, created_at)
    `)
    .eq('id', params.id)
    .eq('host_id', user.id)
    .single();

  if (error) return NextResponse.json({ error: 'Offer not found' }, { status: 404 });
  return NextResponse.json(offer);
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const parsed = updateOfferSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map(i => i.message).join(', ') },
      { status: 400 }
    );
  }

  const { data: existing } = await supabase
    .from('offers')
    .select('id, status')
    .eq('id', params.id)
    .eq('host_id', user.id)
    .single();

  if (!existing) return NextResponse.json({ error: 'Offer not found' }, { status: 404 });
  if (existing.status !== 'active') {
    return NextResponse.json({ error: 'Can only update active offers' }, { status: 400 });
  }

  const updateData: Record<string, any> = {};
  if (parsed.data.pricePerGpuHrInr !== undefined) updateData.price_per_gpu_hr_inr = parsed.data.pricePerGpuHrInr;
  if (parsed.data.storagePricePerGbMonthInr !== undefined) updateData.storage_price_per_gb_month_inr = parsed.data.storagePricePerGbMonthInr;
  if (parsed.data.bandwidthUploadPricePerGbInr !== undefined) updateData.bandwidth_upload_price_per_gb_inr = parsed.data.bandwidthUploadPricePerGbInr;
  if (parsed.data.bandwidthDownloadPricePerGbInr !== undefined) updateData.bandwidth_download_price_per_gb_inr = parsed.data.bandwidthDownloadPricePerGbInr;
  if (parsed.data.minGpu !== undefined) updateData.min_gpu = parsed.data.minGpu;
  if (parsed.data.offerEndDate !== undefined) updateData.offer_end_date = parsed.data.offerEndDate;
  if (parsed.data.interruptibleMinPriceInr !== undefined) updateData.interruptible_min_price_inr = parsed.data.interruptibleMinPriceInr;
  if (parsed.data.reservedDiscountFactor !== undefined) updateData.reserved_discount_factor = parsed.data.reservedDiscountFactor;

  const { data: updated, error } = await supabase
    .from('offers')
    .update(updateData)
    .eq('id', params.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(updated);
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: offer } = await supabase
    .from('offers')
    .select('id, machine_id, status')
    .eq('id', params.id)
    .eq('host_id', user.id)
    .single();

  if (!offer) return NextResponse.json({ error: 'Offer not found' }, { status: 404 });

  const { error } = await supabase
    .from('offers')
    .update({ status: 'unlisted' })
    .eq('id', params.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { data: remainingOffers } = await supabase
    .from('offers')
    .select('id')
    .eq('machine_id', offer.machine_id)
    .eq('status', 'active');

  if (!remainingOffers || remainingOffers.length === 0) {
    await supabase
      .from('machines')
      .update({ listed: false })
      .eq('id', offer.machine_id);
  }

  return NextResponse.json({ success: true, message: 'Offer unlisted. Existing rental contracts are unaffected.' });
}
