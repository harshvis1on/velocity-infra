import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: machine } = await supabase
    .from('machines')
    .select('id, self_test_passed, self_test_at, cuda_version, inet_down_mbps, inet_up_mbps, pcie_bandwidth_gbps, dlperf_score, reliability_score, gpu_temp, gpu_memory_total_mb')
    .eq('id', params.id)
    .eq('host_id', user.id)
    .single();

  if (!machine) {
    return NextResponse.json({ error: 'Machine not found or not owned by you' }, { status: 404 });
  }

  const results = {
    machineId: machine.id,
    selfTestPassed: machine.self_test_passed,
    selfTestAt: machine.self_test_at,
    cudaVersion: machine.cuda_version,
    internetDown: machine.inet_down_mbps,
    internetUp: machine.inet_up_mbps,
    pcieBandwidth: machine.pcie_bandwidth_gbps,
    dlperfScore: machine.dlperf_score,
    reliability: machine.reliability_score,
    gpuTemp: machine.gpu_temp,
    gpuVramMb: machine.gpu_memory_total_mb,
    instructions: 'Run `python agent.py --self-test` on the host machine to execute a self-test. Results will be reported automatically.',
    minimumRequirements: {
      cudaVersion: '>= 12.0',
      reliability: '>= 90%',
      openPortsPerGpu: '>= 3',
      internetDown: '>= 500 Mbps',
      internetUp: '>= 500 Mbps',
      gpuVram: '>= 7 GB',
    },
  };

  return NextResponse.json(results);
}
