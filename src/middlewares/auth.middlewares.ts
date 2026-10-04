import { NextFunction, Request, Response } from 'express'
import { USER_ROLE, UserVerifyStatus } from '~/constants/enums'
import HTTP_STATUS from '~/constants/httpStatus'
import { AUTH_MESSAGES, USERS_MESSAGES } from '~/constants/messages'
import { ErrorWithStatus } from '~/models/Errors'
import databaseService from '~/services/database.services'
import { wrapAsync } from '~/utils/handlers'

//các middleware ở đây chạy SAU accessTokenValidation (cần req.decode_authorization)
//access_token không chứa role nên phải hỏi database -> đổi role / ban user là có hiệu lực ngay

//lấy user hiện tại từ database, gắn vào req.current_user, chặn user bị khoá
const loadCurrentUser = async (req: Request) => {
  if (req.current_user) return req.current_user
  const user = await databaseService.users.findUnique({
    where: { id: req.decode_authorization?.user_id },
    select: { id: true, role: true, verify: true }
  })
  if (!user) {
    throw new ErrorWithStatus({ status: HTTP_STATUS.UNAUTHORIZED, message: USERS_MESSAGES.USER_NOT_FOUND })
  }
  if (user.verify === UserVerifyStatus.Banned) {
    throw new ErrorWithStatus({ status: HTTP_STATUS.FORBIDDEN, message: AUTH_MESSAGES.ACCOUNT_IS_BANNED })
  }
  req.current_user = user
  return user
}

//yêu cầu đã đăng nhập, email đã verify và tài khoản không bị khoá (dùng cho giỏ hàng, đặt hàng)
export const requireVerifiedUser = wrapAsync(async (req: Request, res: Response, next: NextFunction) => {
  const user = await loadCurrentUser(req)
  if (user.verify !== UserVerifyStatus.Verified) {
    throw new ErrorWithStatus({ status: HTTP_STATUS.FORBIDDEN, message: AUTH_MESSAGES.EMAIL_MUST_BE_VERIFIED })
  }
  next()
})

//yêu cầu user có 1 trong các role được liệt kê, ví dụ requireRoles(USER_ROLE.Admin, USER_ROLE.Staff)
export const requireRoles = (...roles: USER_ROLE[]) =>
  wrapAsync(async (req: Request, res: Response, next: NextFunction) => {
    const user = await loadCurrentUser(req)
    if (!roles.includes(user.role)) {
      throw new ErrorWithStatus({ status: HTTP_STATUS.FORBIDDEN, message: AUTH_MESSAGES.PERMISSION_DENIED })
    }
    next()
  })
