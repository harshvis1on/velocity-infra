import { NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import crypto from 'crypto'

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: Request) {
  const authHeader = request.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer vi_live_')) {
    return NextResponse.json({ error: 'Invalid API key format' }, { status: 401 })
  }

  const apiKey = authHeader.replace('Bearer ', '')
  const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex')

  const { data: keys, error } = await supabaseAdmin
    .from('api_keys')
    .select('user_id, permissions, expires_at')
    .eq('key_hash', keyHash)
    .is('revoked_at', null)
    .limit(1)

  if (error || !keys || keys.length === 0) {
    return NextResponse.json({ error: 'Invalid or revoked API key' }, { status: 401 })
  }

  const key = keys[0]
  if (key.expires_at && new Date(key.expires_at) < new Date()) {
    return NextResponse.json({ error: 'API key expired' }, { status: 401 })
  }

  await supabaseAdmin
    .from('api_keys')
    .update({ last_used_at: new Date().toISOString() })
    .eq('key_hash', keyHash)

  return NextResponse.json({
    valid: true,
    user_id: key.user_id,
    permissions: key.permissions,
  })
}
