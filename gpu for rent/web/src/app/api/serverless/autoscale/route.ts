import { NextResponse } from 'next/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  // Optional: Add a simple auth check for cron jobs
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // 1. Get all active endpoints with their workergroups and workers
    const { data: endpoints, error: endpointsError } = await supabaseAdmin
      .from('endpoints')
      .select(`
        id, 
        max_workers, 
        min_workers, 
        target_util, 
        inactivity_timeout,
        workergroups (
          id,
          template_id,
          gpu_ram,
          search_params,
          workers (
            id,
            state,
            current_load,
            perf_rating,
            last_metrics_at
          )
        )
      `)
      .eq('status', 'active');

    if (endpointsError) {
      console.error('Failed to fetch endpoints for autoscaling:', endpointsError);
      return NextResponse.json({ error: 'Failed to fetch endpoints' }, { status: 500 });
    }

    const actions = [];

    // 2. Process each endpoint
    for (const endpoint of endpoints || []) {
      const workergroups = endpoint.workergroups || [];
      if (workergroups.length === 0) continue;

      // For simplicity, we assume one workergroup per endpoint for now
      const wg = workergroups[0];
      const workers = wg.workers || [];

      const activeWorkers = workers.filter((w: any) => w.state === 'active' || w.state === 'ready');
      const recruitingWorkers = workers.filter((w: any) => w.state === 'recruiting' || w.state === 'loading');
      
      const totalWorkers = activeWorkers.length + recruitingWorkers.length;

      // Calculate total load and capacity
      const totalLoad = activeWorkers.reduce((sum: number, w: any) => sum + (w.current_load || 0), 0);
      const totalCapacity = activeWorkers.reduce((sum: number, w: any) => sum + (w.perf_rating || 100), 0);
      
      const currentUtil = totalCapacity > 0 ? totalLoad / totalCapacity : 0;

      // Check for scale up
      if (currentUtil > endpoint.target_util && totalWorkers < endpoint.max_workers) {
        // Need to scale up
        actions.push({ type: 'scale_up', endpoint_id: endpoint.id, reason: 'high_utilization' });
        
        // Create a new worker in recruiting state
        await supabaseAdmin.from('workers').insert({
          workergroup_id: wg.id,
          state: 'recruiting'
        });
        
        // In a real system, you would also trigger the recruitment process here
        // (e.g., finding an available machine and creating an instance)
      } 
      // Check for scale down
      else if (currentUtil < (endpoint.target_util * 0.5) && totalWorkers > endpoint.min_workers) {
        // Need to scale down
        // Find the least loaded worker to release
        const leastLoadedWorker = activeWorkers.sort((a: any, b: any) => (a.current_load || 0) - (b.current_load || 0))[0];
        
        if (leastLoadedWorker) {
          actions.push({ type: 'scale_down', endpoint_id: endpoint.id, worker_id: leastLoadedWorker.id, reason: 'low_utilization' });
          
          // Mark worker for releasing
          await supabaseAdmin.from('workers').update({ state: 'releasing' }).eq('id', leastLoadedWorker.id);
          
          // In a real system, you would also terminate the underlying instance
        }
      }
      // Check for inactivity timeout
      else if (endpoint.inactivity_timeout && totalWorkers > endpoint.min_workers) {
        const now = new Date().getTime();
        for (const worker of activeWorkers) {
          if (worker.last_metrics_at) {
            const lastMetricsTime = new Date(worker.last_metrics_at).getTime();
            const inactiveSeconds = (now - lastMetricsTime) / 1000;
            
            if (inactiveSeconds > endpoint.inactivity_timeout && (worker.current_load || 0) === 0) {
              actions.push({ type: 'scale_down', endpoint_id: endpoint.id, worker_id: worker.id, reason: 'inactivity_timeout' });
              await supabaseAdmin.from('workers').update({ state: 'releasing' }).eq('id', worker.id);
            }
          }
        }
      }
    }

    return NextResponse.json({ success: true, actions });
  } catch (error: any) {
    console.error('Autoscaler error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}