import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import crypto from 'crypto'

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function getUserFromApiKey(authHeader: string): Promise<{ user_id: string } | null> {
  const apiKey = authHeader.replace('Bearer ', '')
  const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex')

  const { data: keys } = await supabaseAdmin
    .from('api_keys')
    .select('user_id, permissions, expires_at, revoked_at')
    .eq('key_hash', keyHash)
    .is('revoked_at', null)
    .limit(1)

  if (!keys || keys.length === 0) return null
  const key = keys[0]
  if (key.expires_at && new Date(key.expires_at) < new Date()) return null

  await supabaseAdmin
    .from('api_keys')
    .update({ last_used_at: new Date().toISOString() })
    .eq('key_hash', keyHash)

  return { user_id: key.user_id }
}

export async function GET(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: machines, error } = await supabase
    .from('machines')
    .select('id, gpu_model, gpu_count, vram_gb, ram_gb, vcpu_count, storage_gb, status, machine_tier, last_heartbeat, reliability_score, self_test_passed, created_at')
    .eq('host_id', user.id)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ machines })
}

export async function POST(request: Request) {
  const authHeader = request.headers.get('Authorization') || ''
  let userId: string | null = null

  if (authHeader.startsWith('Bearer vi_live_')) {
    const keyResult = await getUserFromApiKey(authHeader)
    if (!keyResult) return NextResponse.json({ error: 'Invalid or revoked API key' }, { status: 401 })
    userId = keyResult.user_id
  } else {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    userId = user.id
  }

  const { data: profile } = await supabaseAdmin
    .from('users')
    .select('role')
    .eq('id', userId)
    .single()

  if (!profile || profile.role !== 'host') {
    return NextResponse.json({ error: 'Only host accounts can register machines' }, { status: 403 })
  }

  let body: any
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { gpu_model, gpu_count, vram_gb, ram_gb, vcpu_count, storage_gb, os, cuda_version, docker_version, public_ip } = body

  if (!gpu_model || !gpu_count || !vram_gb) {
    return NextResponse.json({ error: 'gpu_model, gpu_count, and vram_gb are required' }, { status: 400 })
  }

  const { data: machine, error } = await supabaseAdmin
    .from('machines')
    .insert({
      host_id: userId,
      gpu_model,
      gpu_count: gpu_count || 1,
      vram_gb: vram_gb || 0,
      ram_gb: ram_gb || 0,
      vcpu_count: vcpu_count || 0,
      storage_gb: storage_gb || 0,
      price_per_hour_inr: 0,
      status: 'available',
      machine_tier: 'unverified',
      cuda_version: cuda_version || null,
      public_ip: public_ip || null,
      location: 'India',
    })
    .select('id')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    machine_id: machine.id,
    api_url: (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim(),
    message: 'Machine registered. Use your API key (--api-key) to authenticate the agent. Run self-test to complete setup.',
  }, { status: 201 })
}
