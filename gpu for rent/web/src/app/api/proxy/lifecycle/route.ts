import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { getProvider } from '@/lib/providers';
import type { ProviderName } from '@/lib/providers/types';

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { action, instanceId } = body as { action: string; instanceId: string };

  if (!action || !instanceId) {
    return NextResponse.json({ error: 'action and instanceId are required' }, { status: 400 });
  }
  if (action !== 'stop' && action !== 'destroy') {
    return NextResponse.json({ error: 'action must be stop or destroy' }, { status: 400 });
  }

  const { data: instance, error: instanceErr } = await supabaseAdmin
    .from('instances')
    .select('id, machine_id, gpu_count, rental_contract_id, provider_instance_id, status')
    .eq('id', instanceId)
    .eq('renter_id', user.id)
    .single();

  if (instanceErr || !instance) {
    return NextResponse.json({ error: 'Instance not found' }, { status: 404 });
  }

  if (!instance.provider_instance_id) {
    return NextResponse.json(
      { error: 'Not a proxy instance — use the standard lifecycle endpoints' },
      { status: 400 }
    );
  }

  const { data: machine } = await supabaseAdmin
    .from('machines')
    .select('id, source, gpu_allocated, gpu_count')
    .eq('id', instance.machine_id)
    .single();

  if (!machine) {
    return NextResponse.json({ error: 'Machine not found' }, { status: 404 });
  }

  try {
    const provider = getProvider(machine.source as ProviderName);

    if (action === 'stop') {
      await provider.stopInstance(instance.provider_instance_id);

      await supabaseAdmin
        .from('instances')
        .update({ status: 'stopped', stopped_at: new Date().toISOString() })
        .eq('id', instance.id);
    }

    if (action === 'destroy') {
      await provider.destroyInstance(instance.provider_instance_id);

      await supabaseAdmin
        .from('instances')
        .update({ status: 'destroyed', destroyed_at: new Date().toISOString() })
        .eq('id', instance.id);

      const gpuToFree = instance.gpu_count || 1;
      const newAllocated = Math.max(0, (machine.gpu_allocated || 0) - gpuToFree);
      await supabaseAdmin
        .from('machines')
        .update({ gpu_allocated: newAllocated })
        .eq('id', machine.id);

      if (instance.rental_contract_id) {
        await supabaseAdmin
          .from('rental_contracts')
          .update({ status: 'terminated', ended_at: new Date().toISOString() })
          .eq('id', instance.rental_contract_id);
      }
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error(`Proxy lifecycle ${action} failed for instance ${instanceId}:`, err);
    return NextResponse.json({ error: err.message || 'Provider call failed' }, { status: 502 });
  }
}
