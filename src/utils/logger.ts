//logger tối giản: production in 1 dòng JSON mỗi log (dễ thu thập), dev in dạng dễ đọc
//error (Error object) được chuyển thành { name, message, stack } để không mất thông tin khi JSON.stringify
type Level = 'debug' | 'info' | 'warn' | 'error'
const LEVELS: Record<Level, number> = { debug: 10, info: 20, warn: 30, error: 40 }

const serialize = (value: unknown): unknown => {
  if (value instanceof Error) return { name: value.name, message: value.message, stack: value.stack }
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, v]) => [key, serialize(v)]))
  }
  return value
}

const write = (level: Level, message: string, meta?: Record<string, unknown>) => {
  const min = LEVELS[(process.env.LOG_LEVEL as Level) || 'info'] ?? LEVELS.info
  if (LEVELS[level] < min) return
  const data = meta ? (serialize(meta) as Record<string, unknown>) : {}
  const stream = level === 'error' || level === 'warn' ? console.error : console.log
  if (process.env.NODE_ENV === 'production') {
    stream(JSON.stringify({ time: new Date().toISOString(), level, message, ...data }))
  } else {
    stream(`[${level}] ${message}`, Object.keys(data).length ? data : '')
  }
}

export const logger = {
  debug: (message: string, meta?: Record<string, unknown>) => write('debug', message, meta),
  info: (message: string, meta?: Record<string, unknown>) => write('info', message, meta),
  warn: (message: string, meta?: Record<string, unknown>) => write('warn', message, meta),
  error: (message: string, meta?: Record<string, unknown>) => write('error', message, meta)
}
