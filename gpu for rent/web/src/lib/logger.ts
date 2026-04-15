import crypto from 'crypto'

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LogEntry {
  level: LogLevel
  message: string
  timestamp: string
  request_id?: string
  user_id?: string
  path?: string
  method?: string
  status_code?: number
  duration_ms?: number
  [key: string]: any
}

function log(level: LogLevel, message: string, meta?: Record<string, any>) {
  const entry: LogEntry = {
    level,
    message,
    timestamp: new Date().toISOString(),
    ...meta,
  }

  const output = JSON.stringify(entry)

  switch (level) {
    case 'error':
      console.error(output)
      break
    case 'warn':
      console.warn(output)
      break
    case 'debug':
      if (process.env.NODE_ENV === 'development') console.debug(output)
      break
    default:
      console.log(output)
  }
}

export const logger = {
  debug: (message: string, meta?: Record<string, any>) => log('debug', message, meta),
  info: (message: string, meta?: Record<string, any>) => log('info', message, meta),
  warn: (message: string, meta?: Record<string, any>) => log('warn', message, meta),
  error: (message: string, meta?: Record<string, any>) => log('error', message, meta),

  withRequest: (request: Request) => {
    const requestId = crypto.randomUUID()
    const url = new URL(request.url)
    const base = {
      request_id: requestId,
      path: url.pathname,
      method: request.method,
    }
    return {
      debug: (msg: string, meta?: Record<string, any>) => log('debug', msg, { ...base, ...meta }),
      info: (msg: string, meta?: Record<string, any>) => log('info', msg, { ...base, ...meta }),
      warn: (msg: string, meta?: Record<string, any>) => log('warn', msg, { ...base, ...meta }),
      error: (msg: string, meta?: Record<string, any>) => log('error', msg, { ...base, ...meta }),
      requestId,
    }
  },
}
