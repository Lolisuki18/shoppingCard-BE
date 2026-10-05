import { randomUUID } from 'crypto'
import { NextFunction, Request, Response } from 'express'
import { logger } from '~/utils/logger'

//gắn X-Request-Id cho mỗi request (nhận từ proxy nếu có) để lần theo 1 request qua log và lỗi
//LOG_REQUESTS=true/false bật tắt log từng request; mặc định bật ở production, tắt ở dev/test cho đỡ rối
const logRequests = () =>
  process.env.LOG_REQUESTS ? process.env.LOG_REQUESTS === 'true' : process.env.NODE_ENV === 'production'

export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const incoming = req.header('x-request-id')
  req.request_id = incoming && /^[\w.-]{1,64}$/.test(incoming) ? incoming : randomUUID()
  res.setHeader('X-Request-Id', req.request_id)
  if (!logRequests() || req.path === '/health') return next()
  const started = process.hrtime.bigint()
  res.on('finish', () => {
    const duration_ms = Math.round(Number(process.hrtime.bigint() - started) / 1e6)
    const level = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info'
    logger[level]('request', {
      request_id: req.request_id,
      method: req.method,
      url: req.originalUrl.split('?')[0], //bỏ query string để không ghi token / dữ liệu nhạy cảm vào log
      status: res.statusCode,
      duration_ms,
      user_id: req.decode_authorization?.user_id
    })
  })
  next()
}
