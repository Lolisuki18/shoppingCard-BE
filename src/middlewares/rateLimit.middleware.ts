import { NextFunction, Request, Response } from 'express'
import rateLimit from 'express-rate-limit'
import HTTP_STATUS from '~/constants/httpStatus'
import { COMMON_MESSAGES } from '~/constants/messages'

//đếm theo IP, lưu trong bộ nhớ của tiến trình (chạy nhiều instance thì mỗi instance đếm riêng -> cần store dùng chung như Redis)
//đặt RATE_LIMIT_DISABLED=true để tắt (dùng khi chạy test)
const disabled = () => process.env.RATE_LIMIT_DISABLED === 'true'

const createLimiter = (options: { windowMs: number; limit: number; skipSuccessfulRequests?: boolean }) => {
  const limiter = rateLimit({
    ...options,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    handler: (req: Request, res: Response) => {
      res.status(HTTP_STATUS.TOO_MANY_REQUESTS).json({ message: COMMON_MESSAGES.TOO_MANY_REQUESTS })
    }
  })
  return (req: Request, res: Response, next: NextFunction) => (disabled() ? next() : limiter(req, res, next))
}

const MINUTE = 60 * 1000

//toàn bộ API: chặn spam chung
export const globalLimiter = createLimiter({ windowMs: MINUTE, limit: 300 })
//đăng nhập: chỉ đếm lần thất bại để người dùng thật đăng nhập đúng không bị khoá
export const loginLimiter = createLimiter({ windowMs: 15 * MINUTE, limit: 10, skipSuccessfulRequests: true })
//đăng ký tài khoản
export const registerLimiter = createLimiter({ windowMs: 60 * MINUTE, limit: 10 })
//những API gửi email (quên mật khẩu, gửi lại link xác thực) và đặt lại mật khẩu: chống spam mail / dò token
export const emailLimiter = createLimiter({ windowMs: 15 * MINUTE, limit: 5 })
