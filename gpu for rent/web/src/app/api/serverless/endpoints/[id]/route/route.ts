import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';

// We need admin client to bypass RLS for routing requests
const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Verify endpoint belongs to user
  const { data: endpoint, error: endpointError } = await supabase
    .from('endpoints')
    .select('id, max_queue_time, max_workers')
    .eq('id', params.id)
    .eq('user_id', user.id)
    .single();

  if (endpointError || !endpoint) {
    return NextResponse.json({ error: 'Endpoint not found' }, { status: 404 });
  }

  // 1. Find active workers for this endpoint
  const { data: workers, error: workersError } = await supabaseAdmin
    .from('workers')
    .select('id, worker_url, queue_time, state')
    .eq('state', 'active')
    .not('worker_url', 'is', null)
    .in('workergroup_id', (
      await supabaseAdmin.from('workergroups').select('id').eq('endpoint_id', params.id)
    ).data?.map(wg => wg.id) || []);

  if (workersError) {
    return NextResponse.json({ error: 'Failed to fetch workers' }, { status: 500 });
  }

  // 2. Filter workers under max_queue_time and sort by lowest queue_time
  const availableWorkers = workers
    ?.filter(w => w.queue_time < endpoint.max_queue_time)
    .sort((a, b) => a.queue_time - b.queue_time) || [];

  // Create a request record
  const { data: endpointRequest, error: requestError } = await supabaseAdmin
    .from('endpoint_requests')
    .insert({
      endpoint_id: params.id,
      status: 'queued'
    })
    .select()
    .single();

  if (requestError) {
    return NextResponse.json({ error: 'Failed to create request record' }, { status: 500 });
  }

  if (availableWorkers.length > 0) {
    // 3. Route to the best worker
    const bestWorker = availableWorkers[0];
    
    // Update request status
    await supabaseAdmin
      .from('endpoint_requests')
      .update({ worker_id: bestWorker.id, status: 'routed' })
      .eq('id', endpointRequest.id);

    // Generate a simple signature for the pyworker to verify
    // In production, use a proper HMAC with a shared secret
    const signature = Buffer.from(`${endpointRequest.id}:${bestWorker.id}:${process.env.SUPABASE_SERVICE_ROLE_KEY?.substring(0, 10)}`).toString('base64');

    return NextResponse.json({
      worker_url: bestWorker.worker_url,
      auth_data: {
        request_id: endpointRequest.id,
        signature,
        endpoint_id: params.id
      }
    });
  } else {
    // 4. No workers available, queue the request
    // The autoscaler will pick this up if we are under max_workers
    return NextResponse.json({ 
      message: 'Request queued, no workers currently available',
      request_id: endpointRequest.id,
      status: 'queued'
    }, { status: 202 });
  }
}