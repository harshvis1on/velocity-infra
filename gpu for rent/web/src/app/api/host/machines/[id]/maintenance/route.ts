import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { maintenanceWindowSchema } from '@/lib/validations';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: machine } = await supabase
    .from('machines')
    .select('id')
    .eq('id', params.id)
    .eq('host_id', user.id)
    .single();

  if (!machine) return NextResponse.json({ error: 'Machine not found' }, { status: 404 });

  const { data: windows, error } = await supabase
    .from('maintenance_windows')
    .select('*')
    .eq('machine_id', params.id)
    .in('status', ['scheduled', 'active'])
    .order('start_date', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(windows);
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const parsed = maintenanceWindowSchema.safeParse({ ...body, machineId: params.id });
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map(i => i.message).join(', ') },
      { status: 400 }
    );
  }

  const { data: machine } = await supabase
    .from('machines')
    .select('id')
    .eq('id', params.id)
    .eq('host_id', user.id)
    .single();

  if (!machine) return NextResponse.json({ error: 'Machine not found or not owned by you' }, { status: 404 });

  const { data: window, error } = await supabase
    .from('maintenance_windows')
    .insert({
      machine_id: params.id,
      start_date: parsed.data.startDate,
      duration_hrs: parsed.data.durationHrs,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(window, { status: 201 });
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: machine } = await supabase
    .from('machines')
    .select('id')
    .eq('id', params.id)
    .eq('host_id', user.id)
    .single();

  if (!machine) return NextResponse.json({ error: 'Machine not found' }, { status: 404 });

  const { error } = await supabase
    .from('maintenance_windows')
    .update({ status: 'cancelled' })
    .eq('machine_id', params.id)
    .eq('status', 'scheduled');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
