import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function GET() {
  const supabase = createClient()
  const { data: templates, error } = await supabase
    .from('templates')
    .select('*')
    .order('deploy_count', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ templates })
}

export async function POST(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()

  const { data: template, error } = await supabase
    .from('templates')
    .insert({
      name: body.name,
      label: body.label || body.name,
      docker_image: body.dockerImage,
      description: body.description || '',
      category: body.category || 'base',
      launch_mode: body.launchMode || 'ssh',
      on_start_script: body.onStartScript || '',
      env_vars: body.envVars || {},
      min_vram_gb: body.minVramGb || 0,
      is_custom: true,
      is_public: body.isPublic !== false,
      created_by: user.id,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ template }, { status: 201 })
}
