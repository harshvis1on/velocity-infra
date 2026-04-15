import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import crypto from 'crypto'

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function generateApiKey(): { key: string; prefix: string; hash: string } {
  const raw = crypto.randomBytes(32).toString('hex')
  const key = `vi_live_${raw}`
  const prefix = key.substring(0, 15)
  const hash = crypto.createHash('sha256').update(key).digest('hex')
  return { key, prefix, hash }
}

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: keys, error } = await supabaseAdmin
    .from('api_keys')
    .select('id, name, key_prefix, permissions, last_used_at, expires_at, revoked_at, created_at')
    .eq('user_id', user.id)
    .is('revoked_at', null)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ keys })
}

export async function POST(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const name = body.name || 'API Key'
  const permissions = body.permissions || { read: true, write: true, admin: false }
  const expiresInDays = body.expiresInDays || null

  const { key, prefix, hash } = generateApiKey()

  const expiresAt = expiresInDays
    ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000).toISOString()
    : null

  const { error } = await supabaseAdmin
    .from('api_keys')
    .insert({
      user_id: user.id,
      name,
      key_prefix: prefix,
      key_hash: hash,
      permissions,
      expires_at: expiresAt,
    })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({
    key,
    prefix,
    name,
    permissions,
    expires_at: expiresAt,
    message: 'Save this key now. It will not be shown again.',
  }, { status: 201 })
}
