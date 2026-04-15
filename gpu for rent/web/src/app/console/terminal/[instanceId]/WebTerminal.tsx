'use client'

import { useEffect, useRef, useState } from 'react'

export default function WebTerminal({
  instanceId,
  host,
  port,
  password,
}: {
  instanceId: string
  host: string
  port: number
  password?: string
}) {
  const termRef = useRef<HTMLDivElement>(null)
  const [copied, setCopied] = useState(false)

  const sshCommand = `ssh root@${host} -p ${port}`

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  useEffect(() => {
    if (!termRef.current) return

    let term: any = null
    let fitAddon: any = null

    const init = async () => {
      const { Terminal } = await import('xterm')
      const { FitAddon } = await import('xterm-addon-fit')
      await import('xterm/css/xterm.css')

      term = new Terminal({
        cursorBlink: true,
        fontSize: 14,
        fontFamily: '"JetBrains Mono", "Fira Code", "Cascadia Code", monospace',
        theme: {
          background: '#0a0a0a',
          foreground: '#e0e0e0',
          cursor: '#00ff88',
          selectionBackground: '#00ff8840',
          black: '#0a0a0a',
          green: '#00ff88',
          brightGreen: '#00ff88',
          cyan: '#00d4ff',
          yellow: '#ffb800',
          red: '#ff4444',
        },
        allowProposedApi: true,
      })

      fitAddon = new FitAddon()
      term.loadAddon(fitAddon)
      term.open(termRef.current!)
      fitAddon.fit()

      term.writeln('\x1b[1;32m╔══════════════════════════════════════════════════╗\x1b[0m')
      term.writeln('\x1b[1;32m║\x1b[0m  \x1b[1mVelocity Infra\x1b[0m — Web Terminal                  \x1b[1;32m║\x1b[0m')
      term.writeln('\x1b[1;32m╚══════════════════════════════════════════════════╝\x1b[0m')
      term.writeln('')
      term.writeln(`  Instance: \x1b[36m${instanceId.substring(0, 8)}\x1b[0m`)
      term.writeln(`  Host:     \x1b[33m${host}:${port}\x1b[0m`)
      if (password) {
        term.writeln(`  Password: \x1b[33m${password}\x1b[0m`)
      }
      term.writeln('')
      term.writeln('  \x1b[2mTo connect, run this in your local terminal:\x1b[0m')
      term.writeln('')
      term.writeln(`  \x1b[1;32m$ ${sshCommand}\x1b[0m`)
      term.writeln('')
      term.writeln('  \x1b[2m─────────────────────────────────────────────\x1b[0m')
      term.writeln('  \x1b[2mFull browser-based SSH is coming soon.\x1b[0m')
      term.writeln('  \x1b[2mFor now, use the SSH command above or VS Code Remote.\x1b[0m')
      term.writeln('')

      const handleResize = () => fitAddon?.fit()
      window.addEventListener('resize', handleResize)

      return () => {
        window.removeEventListener('resize', handleResize)
        term?.dispose()
      }
    }

    const cleanup = init()
    return () => { cleanup.then(fn => fn?.()) }
  }, [instanceId, host, port, password, sshCommand])

  return (
    <div className="flex-1 flex flex-col">
      <div className="bg-[#111] border-b border-white/10 px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500/60"></div>
            <div className="w-3 h-3 rounded-full bg-yellow-500/60"></div>
            <div className="w-3 h-3 rounded-full bg-green-500/60"></div>
          </div>
          <span className="text-xs text-gray-500 font-mono">root@{instanceId.substring(0, 8)}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => copyToClipboard(sshCommand)}
            className="text-xs bg-white/5 hover:bg-white/10 text-gray-300 px-3 py-1 rounded transition-colors font-mono"
          >
            {copied ? 'Copied!' : 'Copy SSH'}
          </button>
          {password && (
            <button
              onClick={() => copyToClipboard(password)}
              className="text-xs bg-white/5 hover:bg-white/10 text-gray-300 px-3 py-1 rounded transition-colors font-mono"
            >
              Copy Password
            </button>
          )}
        </div>
      </div>
      <div ref={termRef} className="flex-1" style={{ minHeight: 'calc(100vh - 96px)' }} />
    </div>
  )
}
