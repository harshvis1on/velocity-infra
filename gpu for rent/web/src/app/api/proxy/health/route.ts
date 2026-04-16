import { NextResponse } from 'next/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { getProvider } from '@/lib/providers';
import type { ProviderName, InstanceStatus } from '@/lib/providers/types';

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 });
  }
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const errors: string[] = [];
  let checked = 0;
  let updated = 0;

  try {
    const { data: instances, error: fetchErr } = await supabaseAdmin
      .from('instances')
      .select('id, status, machine_id, gpu_count, rental_contract_id, provider_instance_id')
      .not('provider_instance_id', 'is', null)
      .in('status', ['running', 'creating', 'stopped']);

    if (fetchErr) {
      return NextResponse.json({ error: fetchErr.message }, { status: 500 });
    }
    if (!instances || instances.length === 0) {
      return NextResponse.json({ checked: 0, updated: 0, errors: [] });
    }

    const machineIds = Array.from(new Set(instances.map(i => i.machine_id)));
    const { data: machines } = await supabaseAdmin
      .from('machines')
      .select('id, source, gpu_allocated, gpu_count')
      .in('id', machineIds);

    const machineMap = new Map(
      (machines || []).map(m => [m.id, m])
    );

    for (const instance of instances) {
      checked++;
      const machine = machineMap.get(instance.machine_id);
      if (!machine) {
        errors.push(`Instance ${instance.id}: machine ${instance.machine_id} not found`);
        continue;
      }

      let upstreamStatus: InstanceStatus;
      try {
        const provider = getProvider(machine.source as ProviderName);
        upstreamStatus = await provider.getInstanceStatus(instance.provider_instance_id!);
      } catch (err: any) {
        errors.push(`Instance ${instance.id}: provider check failed — ${err.message}`);
        continue;
      }

      if (upstreamStatus === instance.status) continue;

      if (upstreamStatus === 'destroyed') {
        await supabaseAdmin
          .from('instances')
          .update({ status: 'destroyed', destroyed_at: new Date().toISOString() })
          .eq('id', instance.id);

        if (instance.rental_contract_id) {
          await supabaseAdmin
            .from('rental_contracts')
            .update({ status: 'terminated', ended_at: new Date().toISOString() })
            .eq('id', instance.rental_contract_id);
        }

        const gpuToFree = instance.gpu_count || 1;
        const newAllocated = Math.max(0, (machine.gpu_allocated || 0) - gpuToFree);
        await supabaseAdmin
          .from('machines')
          .update({ gpu_allocated: newAllocated })
          .eq('id', machine.id);

        updated++;
      } else if (upstreamStatus === 'error') {
        await supabaseAdmin
          .from('instances')
          .update({ status: 'error' })
          .eq('id', instance.id);
        updated++;
      } else if (upstreamStatus === 'running' && instance.status === 'creating') {
        await supabaseAdmin
          .from('instances')
          .update({ status: 'running' })
          .eq('id', instance.id);
        updated++;
      } else if (upstreamStatus === 'stopped' && instance.status === 'running') {
        await supabaseAdmin
          .from('instances')
          .update({ status: 'stopped', stopped_at: new Date().toISOString() })
          .eq('id', instance.id);
        updated++;
      }
    }

    return NextResponse.json({ checked, updated, errors });
  } catch (err: any) {
    console.error('Proxy health check failed:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function GET(request: Request) {
  return POST(request);
}
