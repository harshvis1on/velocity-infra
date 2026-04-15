import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { template_id, gpu_ram, search_params, launch_args } = body;

    if (!template_id) {
      return NextResponse.json({ error: 'template_id is required' }, { status: 400 });
    }

    // Verify endpoint belongs to user
    const { data: endpoint, error: endpointError } = await supabase
      .from('endpoints')
      .select('id')
      .eq('id', params.id)
      .eq('user_id', user.id)
      .single();

    if (endpointError || !endpoint) {
      return NextResponse.json({ error: 'Endpoint not found' }, { status: 404 });
    }

    // Verify template exists
    const { data: template, error: templateError } = await supabase
      .from('templates')
      .select('id')
      .eq('id', template_id)
      .single();

    if (templateError || !template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    const { data, error } = await supabase
      .from('workergroups')
      .insert({
        endpoint_id: params.id,
        template_id,
        gpu_ram: gpu_ram || 24,
        search_params: search_params || {},
        launch_args: launch_args || '',
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Verify endpoint belongs to user
  const { data: endpoint, error: endpointError } = await supabase
    .from('endpoints')
    .select('id')
    .eq('id', params.id)
    .eq('user_id', user.id)
    .single();

  if (endpointError || !endpoint) {
    return NextResponse.json({ error: 'Endpoint not found' }, { status: 404 });
  }

  const { data, error } = await supabase
    .from('workergroups')
    .select('*, templates(*)')
    .eq('endpoint_id', params.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}