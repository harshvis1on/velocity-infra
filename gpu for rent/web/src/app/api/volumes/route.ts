import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: volumes, error } = await supabase
    .from('volumes')
    .select('*, machines(gpu_model, location)')
    .eq('user_id', user.id)
    .neq('status', 'deleted')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ volumes })
}

export async function POST(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { machineId, name, sizeGb, mountPath } = body

  if (!machineId || !name) {
    return NextResponse.json({ error: 'machineId and name are required' }, { status: 400 })
  }

  const dockerVolumeName = `vel_${user.id.substring(0, 8)}_${name.toLowerCase().replace(/[^a-z0-9]/g, '_')}`

  const { data: volume, error } = await supabase
    .from('volumes')
    .insert({
      user_id: user.id,
      machine_id: machineId,
      name,
      size_gb: sizeGb || 50,
      mount_path: mountPath || '/workspace',
      docker_volume_name: dockerVolumeName,
      status: 'active',
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ volume }, { status: 201 })
}
