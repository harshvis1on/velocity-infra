import { NextResponse } from 'next/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';

// We need admin client to update worker metrics securely
const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const body = await request.json();
    const { current_load, queue_time, perf_rating, state, auth_secret } = body;

    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret || auth_secret !== cronSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (current_load === undefined || queue_time === undefined) {
      return NextResponse.json({ error: 'Missing required metrics' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('workers')
      .update({
        current_load,
        queue_time,
        perf_rating: perf_rating || 100.0,
        state: state || 'active',
        last_metrics_at: new Date().toISOString()
      })
      .eq('id', params.id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, worker: data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}