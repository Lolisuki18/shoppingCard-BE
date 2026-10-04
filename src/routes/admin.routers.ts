import { Router } from 'express'
import { USER_ROLE } from '~/constants/enums'
import {
  adminGetOrderController,
  adminGetOrdersController,
  adminUpdateOrderStatusController
} from '~/controllers/orders.controllers'
import { adminGetProductController, adminGetProductsController } from '~/controllers/products.controllers'
import { requireRoles } from '~/middlewares/auth.middlewares'
import { filterMiddleware } from '~/middlewares/common.middleware'
import {
  idParamValidator,
  orderListValidator,
  productListValidator,
  updateOrderStatusValidator
} from '~/middlewares/shop.middlewares'
import { accessTokenValidation } from '~/middlewares/users.middlewares'
import { UpdateOrderStatusReqBody } from '~/models/requests/Shop.requests'
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

export default adminRouter
