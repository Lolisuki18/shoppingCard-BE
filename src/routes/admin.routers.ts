import { Router } from 'express'
import { USER_ROLE } from '~/constants/enums'
import {
  adminBanUserController,
  adminGetUserController,
  adminGetUsersController,
  adminUnbanUserController,
  adminUpdateUserRoleController
} from '~/controllers/adminUsers.controllers'
import {
  adminCreateCouponController,
  adminDeleteCouponController,
  adminGetCouponController,
  adminGetCouponsController,
  adminUpdateCouponController
} from '~/controllers/coupons.controllers'
import {
  lowStockController,
  overviewStatsController,
  revenueStatsController,
  topProductsController
} from '~/controllers/stats.controllers'
import {
  adminGetOrderController,
  adminGetOrdersController,
  adminUpdateOrderStatusController
} from '~/controllers/orders.controllers'
import { adminGetProductController, adminGetProductsController } from '~/controllers/products.controllers'
import { requireRoles } from '~/middlewares/auth.middlewares'
import { filterMiddleware } from '~/middlewares/common.middleware'
import {
  adminUserListValidator,
  couponListValidator,
  createCouponValidator,
  idParamValidator,
  lowStockValidator,
  orderListValidator,
  overviewStatsValidator,
  productListValidator,
  revenueStatsValidator,
  topProductsValidator,
  updateCouponValidator,
  updateOrderStatusValidator,
  updateUserRoleValidator
} from '~/middlewares/shop.middlewares'
import { accessTokenValidation } from '~/middlewares/users.middlewares'
import { CouponReqBody, UpdateOrderStatusReqBody, UpdateUserRoleReqBody } from '~/models/requests/Shop.requests'
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

//thống kê (dashboard): chỉ Admin vì có số liệu doanh thu
adminRouter.use('/stats', requireRoles(USER_ROLE.Admin))
adminRouter.get('/stats/overview', overviewStatsValidator, wrapAsync(overviewStatsController))
adminRouter.get('/stats/revenue', revenueStatsValidator, wrapAsync(revenueStatsController))
adminRouter.get('/stats/top-products', topProductsValidator, wrapAsync(topProductsController))
adminRouter.get('/stats/low-stock', lowStockValidator, wrapAsync(lowStockController))

//quản lý người dùng: chỉ Admin
adminRouter.use('/users', requireRoles(USER_ROLE.Admin))
adminRouter.get('/users', adminUserListValidator, wrapAsync(adminGetUsersController))
adminRouter.get('/users/:id', idParamValidator, wrapAsync(adminGetUserController))
adminRouter.post('/users/:id/ban', idParamValidator, wrapAsync(adminBanUserController))
adminRouter.post('/users/:id/unban', idParamValidator, wrapAsync(adminUnbanUserController))
adminRouter.patch(
  '/users/:id/role',
  idParamValidator,
  filterMiddleware<UpdateUserRoleReqBody>(['role']),
  updateUserRoleValidator,
  wrapAsync(adminUpdateUserRoleController)
)

export default adminRouter
