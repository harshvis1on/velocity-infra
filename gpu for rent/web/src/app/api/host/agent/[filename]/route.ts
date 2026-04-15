import { NextResponse } from 'next/server'
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'

const CANDIDATES = [
  join(process.cwd(), '..', 'host-agent'),
  join(process.cwd(), 'public', 'agent'),
  join(process.cwd(), '.next', 'server', 'agent'),
]

const MIME: Record<string, string> = {
  'install.sh': 'text/x-shellscript',
  'agent.py': 'text/x-python',
  'requirements.txt': 'text/plain',
  'uninstall.sh': 'text/x-shellscript',
}

const ALLOWED_FILES = new Set(Object.keys(MIME))

function findFile(filename: string): string | null {
  for (const dir of CANDIDATES) {
    const p = join(dir, filename)
    if (existsSync(p)) return p
  }
  return null
}

export async function GET(
  _request: Request,
  { params }: { params: { filename: string } }
) {
  const { filename } = params

  if (!ALLOWED_FILES.has(filename)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const filePath = findFile(filename)
  if (!filePath) {
    return NextResponse.json({ error: 'File not found' }, { status: 404 })
  }

  try {
    const content = readFileSync(filePath, 'utf-8')
    return new NextResponse(content, {
      status: 200,
      headers: {
        'Content-Type': MIME[filename] || 'text/plain',
        'Cache-Control': 'public, max-age=300',
      },
    })
  } catch {
    return NextResponse.json({ error: 'File not found' }, { status: 404 })
  }
}
