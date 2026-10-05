import { Router } from 'express'
import { USER_ROLE } from '~/constants/enums'
import {
  adminCreateCouponController,
  adminDeleteCouponController,
  adminGetCouponController,
  adminGetCouponsController,
  adminUpdateCouponController
} from '~/controllers/coupons.controllers'
import {
  adminGetOrderController,
  adminGetOrdersController,
  adminUpdateOrderStatusController
} from '~/controllers/orders.controllers'
import { adminGetProductController, adminGetProductsController } from '~/controllers/products.controllers'
import { requireRoles } from '~/middlewares/auth.middlewares'
import { filterMiddleware } from '~/middlewares/common.middleware'
import {
  couponListValidator,
  createCouponValidator,
  idParamValidator,
  orderListValidator,
  productListValidator,
  updateCouponValidator,
  updateOrderStatusValidator
} from '~/middlewares/shop.middlewares'
import { accessTokenValidation } from '~/middlewares/users.middlewares'
import { CouponReqBody, UpdateOrderStatusReqBody } from '~/models/requests/Shop.requests'
import { wrapAsync } from '~/utils/handlers'

//khu vực quản trị: chỉ Admin + Staff
const adminRouter = Router()
adminRouter.use(accessTokenValidation, requireRoles(USER_ROLE.Admin, USER_ROLE.Staff))

//sản phẩm: xem cả sản phẩm đang ẩn
adminRouter.get('/products', productListValidator, wrapAsync(adminGetProductsController))
adminRouter.get('/products/:id', idParamValidator, wrapAsync(adminGetProductController))

//đơn hàng của tất cả khách
adminRouter.get('/orders', orderListValidator, wrapAsync(adminGetOrdersController))
adminRouter.get('/orders/:id', idParamValidator, wrapAsync(adminGetOrderController))
adminRouter.patch(
  '/orders/:id/status',
  idParamValidator,
  filterMiddleware<UpdateOrderStatusReqBody>(['status']),
  updateOrderStatusValidator,
  wrapAsync(adminUpdateOrderStatusController)
)

//mã giảm giá: Admin + Staff tạo/sửa, chỉ Admin được xoá
const COUPON_FIELDS: (keyof CouponReqBody)[] = [
  'code',
  'description',
  'discount_type',
  'discount_value',
  'min_order_amount',
  'max_discount_amount',
  'usage_limit',
  'per_user_limit',
  'starts_at',
  'expires_at',
  'is_active'
]
adminRouter.get('/coupons', couponListValidator, wrapAsync(adminGetCouponsController))
adminRouter.get('/coupons/:id', idParamValidator, wrapAsync(adminGetCouponController))
adminRouter.post(
  '/coupons',
  filterMiddleware<CouponReqBody>(COUPON_FIELDS),
  createCouponValidator,
  wrapAsync(adminCreateCouponController)
)
adminRouter.patch(
  '/coupons/:id',
  idParamValidator,
  filterMiddleware<CouponReqBody>(COUPON_FIELDS),
  updateCouponValidator,
  wrapAsync(adminUpdateCouponController)
)
adminRouter.delete(
  '/coupons/:id',
  requireRoles(USER_ROLE.Admin),
  idParamValidator,
  wrapAsync(adminDeleteCouponController)
)

export default adminRouter
