import { Router } from 'express'
import { validateCouponController } from '~/controllers/coupons.controllers'
import { requireVerifiedUser } from '~/middlewares/auth.middlewares'
import { filterMiddleware } from '~/middlewares/common.middleware'
import { validateCouponValidator } from '~/middlewares/shop.middlewares'
import { accessTokenValidation } from '~/middlewares/users.middlewares'
import { ValidateCouponReqBody } from '~/models/requests/Shop.requests'
import { wrapAsync } from '~/utils/handlers'

const couponRouter = Router()

//cần đăng nhập + đã verify email (giống giỏ hàng, đơn hàng)
couponRouter.use(accessTokenValidation, requireVerifiedUser)

//xem trước: áp mã này vào giỏ hiện tại thì được giảm bao nhiêu
couponRouter.post(
  '/validate',
  filterMiddleware<ValidateCouponReqBody>(['code']),
  validateCouponValidator,
  wrapAsync(validateCouponController)
)

export default couponRouter
