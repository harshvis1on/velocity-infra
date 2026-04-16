'use client'

import { useState } from 'react'

interface ConnectButtonProps {
  instanceId: string
  publicIp?: string
  hostPort?: number
  launchMode?: string
  tunnelUrl?: string
  sshPassword?: string
}

export default function ConnectButton({ instanceId, publicIp, hostPort, launchMode, tunnelUrl, sshPassword }: ConnectButtonProps) {
  const [showDetails, setShowDetails] = useState(false)

  const hasTunnel = !!tunnelUrl
  const hasDirectAccess = !!publicIp && !!hostPort

  const sshCommand = hasTunnel
    ? `ssh root@${tunnelUrl.replace('https://', '').replace('http://', '')} -p 443`
    : hasDirectAccess
      ? `ssh root@${publicIp} -p ${hostPort}`
      : null

  const jupyterUrl = hasTunnel
    ? tunnelUrl
    : hasDirectAccess
      ? `http://${publicIp}:${(hostPort || 0) + 1}`
      : null

  if (!sshCommand) {
    return (
      <button
        onClick={() => alert('Connection details are not ready yet. The host agent is still provisioning your instance.')}
        className="bg-white/[0.04] border border-white/[0.08] hover:border-primary/30 text-[#94A3B8] hover:text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors opacity-60"
      >
        Connecting...
      </button>
    )
  }

  return (
    <div className="relative">
      <button
        onClick={() => setShowDetails(!showDetails)}
        className="bg-gradient-to-r from-primary-dark to-primary hover:shadow-glow text-white px-4 py-2 rounded-lg text-sm font-bold transition-colors"
      >
        Connect
      </button>
      {showDetails && (
        <div className="absolute right-0 top-12 z-50 bg-[#0B0F19] border border-white/[0.06] rounded-xl p-4 w-96 shadow-2xl">
          <div className="space-y-3">
            <div>
              <div className="text-xs text-[#94A3B8] mb-1.5 font-medium">SSH Command</div>
              <div className="bg-white/[0.03] p-2.5 rounded-lg border border-white/[0.06] font-mono text-xs text-white select-all break-all">
                {sshCommand}
              </div>
            </div>

            {sshPassword && (
              <div>
                <div className="text-xs text-[#94A3B8] mb-1.5 font-medium">SSH Password</div>
                <div className="bg-white/[0.03] p-2.5 rounded-lg border border-white/[0.06] font-mono text-xs text-amber-400 select-all">
                  {sshPassword}
                </div>
              </div>
            )}

            {(launchMode === 'jupyter' || launchMode === 'both') && jupyterUrl && (
              <div>
                <div className="text-xs text-[#94A3B8] mb-1.5 font-medium">JupyterLab</div>
                <a
                  href={jupyterUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="block bg-white/[0.03] p-2.5 rounded-lg border border-white/[0.06] font-mono text-xs text-primary hover:underline break-all"
                >
                  {jupyterUrl}
                </a>
              </div>
            )}

            {hasTunnel && (
              <div className="flex items-center gap-1.5 text-[10px] text-primary">
                <div className="w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_6px_rgba(129,140,248,0.5)]"></div>
                Connected via Cloudflare Tunnel
              </div>
            )}
            {!hasTunnel && hasDirectAccess && (
              <div className="flex items-center gap-1.5 text-[10px] text-amber-400">
                <div className="w-1.5 h-1.5 rounded-full bg-amber-500"></div>
                Direct IP (host must have port {hostPort} open)
              </div>
            )}
          </div>

          <div className="flex gap-2 mt-3">
            <button
              onClick={() => {
                navigator.clipboard.writeText(sshCommand)
                setShowDetails(false)
              }}
              className="flex-1 bg-white/[0.04] border border-white/[0.08] hover:border-primary/30 hover:text-white text-[#94A3B8] text-xs font-medium py-1.5 rounded-lg transition-colors"
            >
              Copy SSH
            </button>
            <button
              onClick={() => {
                const cfgHost = tunnelUrl
                  ? tunnelUrl.replace('https://', '').replace('http://', '')
                  : publicIp || 'pending'
                const cfgPort = tunnelUrl ? 443 : hostPort || 22
                const config = [
                  `Host velocity-${instanceId.substring(0, 8)}`,
                  `  HostName ${cfgHost}`,
                  `  User root`,
                  `  Port ${cfgPort}`,
                  `  StrictHostKeyChecking no`,
                ].join('\n')
                navigator.clipboard.writeText(config)
                setShowDetails(false)
              }}
              className="flex-1 bg-primary/[0.15] hover:bg-primary/[0.25] text-primary text-xs font-medium py-1.5 rounded-lg transition-colors"
            >
              VS Code
            </button>
            <a
              href={`/console/terminal/${instanceId}`}
              className="flex-1 bg-primary/[0.15] hover:bg-primary/[0.25] text-primary text-xs font-medium py-1.5 rounded-lg transition-colors text-center"
            >
              Terminal
            </a>
            <button
              onClick={() => setShowDetails(false)}
              className="bg-white/[0.04] hover:bg-white/[0.08] text-[#94A3B8] hover:text-white text-xs font-medium py-1.5 px-3 rounded-lg transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
