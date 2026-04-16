import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { createRentalSchema } from '@/lib/validations';
import { withRateLimit } from '@/lib/with-rate-limit';
import { RENT_LIMIT } from '@/lib/rate-limit';
import { getProvider } from '@/lib/providers';
import type { ProviderName } from '@/lib/providers/types';
import { getUsdToInr } from '@/lib/providers/margin';

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GPU allocation is now handled atomically via the allocate_gpus RPC (SELECT ... FOR UPDATE)

export async function POST(request: Request) {
  const rateLimitResponse = withRateLimit(RENT_LIMIT)(request);
  if (rateLimitResponse) return rateLimitResponse;

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const parsed = createRentalSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map(i => i.message).join(', ') },
      { status: 400 }
    );
  }

  const { offerId, gpuCount, templateId, diskSize, launchMode, rentalType, bidPriceUsd, sshKeyId, newSshKey } = parsed.data;

  const { data: offer, error: offerErr } = await supabaseAdmin
    .from('offers')
    .select(`
      *,
      machines (id, gpu_model, gpu_count, vram_gb, ram_gb, vcpu_count, storage_gb, host_id, gpu_allocated, status, source, provider_machine_id)
    `)
    .eq('id', offerId)
    .eq('status', 'active')
    .single();

  if (offerErr || !offer) {
    return NextResponse.json({ error: 'Offer not found or no longer active' }, { status: 404 });
  }

  const machine = offer.machines;
  if (!machine) {
    return NextResponse.json({ error: 'Machine not found' }, { status: 404 });
  }

  const isProxy = machine.source !== 'native';

  if (machine.status === 'paused' || machine.status === 'offline' || machine.status === 'removed') {
    return NextResponse.json({ error: 'Machine is not accepting new rentals' }, { status: 409 });
  }

  if (gpuCount < offer.min_gpu) {
    return NextResponse.json({ error: `Minimum GPU count for this offer is ${offer.min_gpu}` }, { status: 400 });
  }

  if (!isProxy) {
    if ((gpuCount & (gpuCount - 1)) !== 0 && gpuCount !== machine.gpu_count) {
      return NextResponse.json({ error: 'GPU count must be a power of 2 or the full machine' }, { status: 400 });
    }
  }

  const gpuAvailable = machine.gpu_count - (machine.gpu_allocated || 0);
  if (gpuCount > gpuAvailable) {
    return NextResponse.json({ error: `Only ${gpuAvailable} GPUs available on this machine` }, { status: 400 });
  }

  if (rentalType === 'interruptible') {
    if (!bidPriceUsd) {
      return NextResponse.json({ error: 'Bid price required for interruptible rental' }, { status: 400 });
    }
    if (offer.interruptible_min_price_usd && bidPriceUsd < offer.interruptible_min_price_usd) {
      return NextResponse.json({ error: `Bid must be at least $${offer.interruptible_min_price_usd}/GPU/hr` }, { status: 400 });
    }
  }

  const { data: template } = await supabaseAdmin
    .from('templates')
    .select('*')
    .eq('id', templateId)
    .single();

  if (!template) {
    return NextResponse.json({ error: 'Template not found' }, { status: 404 });
  }

  const { data: profile } = await supabaseAdmin
    .from('users')
    .select('wallet_balance_usd')
    .eq('id', user.id)
    .single();

  if (!profile) {
    return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
  }

  let effectivePrice: number;
  if (rentalType === 'interruptible') {
    effectivePrice = bidPriceUsd!;
  } else if (rentalType === 'reserved' && offer.reserved_discount_factor) {
    effectivePrice = offer.price_per_gpu_hr_usd * (1 - offer.reserved_discount_factor);
  } else {
    effectivePrice = offer.price_per_gpu_hr_usd;
  }
  const estimatedHourlyCost = effectivePrice * gpuCount;

  if (profile.wallet_balance_usd < estimatedHourlyCost) {
    return NextResponse.json(
      { error: `Insufficient balance. Need $${estimatedHourlyCost.toFixed(2)}/hr, have $${profile.wallet_balance_usd.toFixed(2)}` },
      { status: 402 }
    );
  }

  // --- SSH key resolution (shared by both paths) ---
  let finalSshKey = '';
  if (newSshKey) {
    finalSshKey = newSshKey;
    await supabaseAdmin.from('ssh_keys').insert({
      user_id: user.id,
      name: 'Key ' + new Date().toLocaleDateString(),
      public_key: newSshKey,
    });
  } else if (sshKeyId) {
    const { data: savedKey } = await supabaseAdmin
      .from('ssh_keys')
      .select('public_key')
      .eq('id', sshKeyId)
      .eq('user_id', user.id)
      .single();
    if (!savedKey) {
      return NextResponse.json({ error: 'SSH key not found or does not belong to you' }, { status: 404 });
    }
    finalSshKey = savedKey.public_key;
  }

  // --- GPU allocation (native only) ---
  let gpuIndices: number[] = [];

  if (!isProxy) {
    const { data: allocResult, error: allocErr } = await supabaseAdmin.rpc('allocate_gpus', {
      p_machine_id: machine.id,
      p_gpu_count: gpuCount,
    });

    if (allocErr || allocResult?.error) {
      return NextResponse.json(
        { error: allocResult?.error || allocErr?.message || 'Could not allocate GPU indices' },
        { status: 409 }
      );
    }

    gpuIndices = allocResult.gpu_indices;
  }

  // --- Create rental contract ---
  const { data: contract, error: contractErr } = await supabaseAdmin
    .from('rental_contracts')
    .insert({
      offer_id: offerId,
      machine_id: machine.id,
      renter_id: user.id,
      gpu_count: gpuCount,
      gpu_indices: gpuIndices,
      price_per_gpu_hr_usd: effectivePrice,
      storage_price_per_gb_month_usd: offer.storage_price_per_gb_month_usd,
      bandwidth_upload_price_per_gb_usd: offer.bandwidth_upload_price_per_gb_usd,
      bandwidth_download_price_per_gb_usd: offer.bandwidth_download_price_per_gb_usd,
      rental_type: rentalType,
      bid_price_usd: bidPriceUsd || null,
      rental_end_date: offer.offer_end_date,
    })
    .select()
    .single();

  if (contractErr) {
    return NextResponse.json({ error: contractErr.message }, { status: 500 });
  }

  // --- Create instance ---
  const { data: instance, error: instanceErr } = await supabaseAdmin
    .from('instances')
    .insert({
      renter_id: user.id,
      machine_id: machine.id,
      rental_contract_id: contract.id,
      status: 'creating',
      docker_image: template.docker_image,
      disk_size_gb: diskSize,
      gpu_count: gpuCount,
      gpu_indices: gpuIndices,
      launch_mode: launchMode,
      rental_type: rentalType,
      bid_price_usd: bidPriceUsd || null,
      ssh_public_key: finalSshKey,
    })
    .select()
    .single();

  if (instanceErr) {
    await supabaseAdmin
      .from('rental_contracts')
      .update({ status: 'terminated', ended_at: new Date().toISOString() })
      .eq('id', contract.id);
    return NextResponse.json({ error: instanceErr.message }, { status: 500 });
  }

  // --- Proxy provisioning ---
  if (isProxy) {
    try {
      const provider = getProvider(machine.source as ProviderName);
      const result = await provider.provisionInstance({
        providerMachineId: machine.provider_machine_id,
        dockerImage: template.docker_image,
        gpuCount: gpuCount,
        diskSizeGb: diskSize,
        sshPublicKey: finalSshKey || undefined,
      });

      await supabaseAdmin
        .from('instances')
        .update({
          provider_instance_id: result.providerId,
          provider_cost_per_hr: result.actualCostPerHrUsd * getUsdToInr(),
          status: 'running',
          host_port: result.connectionInfo.sshPort,
          ssh_password: result.connectionInfo.sshPassword || null,
        })
        .eq('id', instance.id);

      if (result.connectionInfo.publicIp) {
        await supabaseAdmin
          .from('machines')
          .update({ public_ip: result.connectionInfo.publicIp })
          .eq('id', machine.id);
      }
    } catch (provisionErr) {
      const msg = provisionErr instanceof Error ? provisionErr.message : 'Unknown provisioning error';

      await Promise.all([
        supabaseAdmin
          .from('instances')
          .update({ status: 'failed' })
          .eq('id', instance.id),
        supabaseAdmin
          .from('rental_contracts')
          .update({ status: 'terminated', ended_at: new Date().toISOString() })
          .eq('id', contract.id),
      ]);

      return NextResponse.json(
        { error: `Proxy provisioning failed: ${msg}` },
        { status: 502 }
      );
    }
  }

  await supabaseAdmin
    .from('templates')
    .update({ deploy_count: (template.deploy_count || 0) + 1 })
    .eq('id', templateId);

  return NextResponse.json({
    contract,
    instance,
    message: isProxy
      ? `Rental contract created. ${gpuCount} GPU(s) provisioned via ${machine.source}. Instance is running.`
      : `Rental contract created. ${gpuCount} GPU(s) allocated on devices [${gpuIndices.join(', ')}]. Container is being launched.`,
  }, { status: 201 });
}
