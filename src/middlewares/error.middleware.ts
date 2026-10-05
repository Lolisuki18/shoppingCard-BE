//file này chứa hàm error handler tổng
import { Request, Response, NextFunction } from 'express'
import { omit } from 'lodash'
import { Prisma } from '@prisma/client'
import HTTP_STATUS from '~/constants/httpStatus'
import { COMMON_MESSAGES } from '~/constants/messages'
import { ErrorWithStatus } from '~/models/Errors'
import { logger } from '~/utils/logger'

//đường dẫn không tồn tại
export const notFoundHandler = (req: Request, res: Response) => {
  res.status(HTTP_STATUS.NOT_FOUND).json({ message: COMMON_MESSAGES.ROUTE_NOT_FOUND })
}

// lỗi từ toàn bộ hệ thống sẽ được dồn về đây
export const defaultErrorHandler = (error: any, req: Request, res: Response, next: NextFunction) => {
  //header đã gửi đi rồi thì để Express tự đóng kết nối
  if (res.headersSent) return next(error)

  //lỗi nghiệp vụ do mình chủ động throw (có status, message an toàn để trả cho client)
  if (error instanceof ErrorWithStatus) {
    res.status(error.status).json(omit(error, ['status']))
    return
  }

  //lỗi do body-parser: JSON sai cú pháp hoặc body quá lớn
  if (error?.type === 'entity.parse.failed') {
    res.status(HTTP_STATUS.BAD_REQUEST).json({ message: COMMON_MESSAGES.INVALID_JSON })
    return
  }
  if (error?.type === 'entity.too.large') {
    res.status(HTTP_STATUS.PAYLOAD_TOO_LARGE).json({ message: COMMON_MESSAGES.PAYLOAD_TOO_LARGE })
    return
  }

  //còn lại là lỗi không lường trước (bug, database lỗi...): ghi chi tiết vào log, KHÔNG trả chi tiết ra ngoài
  logger.error('unhandled error', {
    request_id: req.request_id,
    method: req.method,
    url: req.originalUrl,
    user_id: req.decode_authorization?.user_id,
    prisma_code: error instanceof Prisma.PrismaClientKnownRequestError ? error.code : undefined,
    error
  })
  const body: Record<string, unknown> = { message: COMMON_MESSAGES.INTERNAL_SERVER_ERROR }
  //chỉ khi chủ động bật DEBUG_ERRORS=true (môi trường dev) mới trả thêm chi tiết lỗi
  if (process.env.DEBUG_ERRORS === 'true') body.errorInfor = { message: error?.message, stack: error?.stack }
  res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(body)
}
