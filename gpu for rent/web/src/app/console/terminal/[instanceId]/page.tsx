import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import WebTerminal from './WebTerminal'

export default async function TerminalPage({ params }: { params: { instanceId: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: instance } = await supabase
    .from('instances')
    .select('id, status, tunnel_url, ssh_password, host_port, launch_mode, machines(public_ip)')
    .eq('id', params.instanceId)
    .eq('renter_id', user.id)
    .single()

  if (!instance || instance.status !== 'running') {
    return (
      <div className="min-h-screen bg-[#050505] text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Instance Not Available</h1>
          <p className="text-gray-400">This instance is not running or does not belong to you.</p>
          <a href="/console" className="text-primary hover:underline mt-4 inline-block">Back to Console</a>
        </div>
      </div>
    )
  }

  const machineData = instance.machines as any
  const connectionHost = instance.tunnel_url
    ? instance.tunnel_url.replace('https://', '').replace('http://', '')
    : machineData?.public_ip || ''
  const connectionPort = instance.tunnel_url ? 443 : instance.host_port || 22

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col">
      <header className="h-12 flex items-center justify-between px-4 border-b border-white/10 bg-[#050505]">
        <div className="flex items-center gap-3">
          <a href="/console" className="text-gray-400 hover:text-white transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </a>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
            <span className="font-mono text-sm">Terminal — {params.instanceId.substring(0, 8)}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span className="font-mono">{connectionHost}:{connectionPort}</span>
        </div>
      </header>
      <WebTerminal
        instanceId={params.instanceId}
        host={connectionHost}
        port={connectionPort}
        password={instance.ssh_password || undefined}
      />
    </div>
  )
}
