import { Router } from 'express'
import {
  cancelMyOrderController,
  createOrderController,
  getMyOrderController,
  getMyOrdersController
} from '~/controllers/orders.controllers'
import { requireVerifiedUser } from '~/middlewares/auth.middlewares'
import { filterMiddleware } from '~/middlewares/common.middleware'
import { createOrderValidator, idParamValidator, orderListValidator } from '~/middlewares/shop.middlewares'
import { accessTokenValidation } from '~/middlewares/users.middlewares'
import { CreateOrderReqBody } from '~/models/requests/Shop.requests'
import { wrapAsync } from '~/utils/handlers'

const orderRouter = Router()

//toàn bộ đơn hàng cần đăng nhập + đã verify email
orderRouter.use(accessTokenValidation, requireVerifiedUser)

//tạo đơn từ giỏ hàng hiện tại (chưa có thanh toán online -> thanh toán khi nhận hàng)
orderRouter.post(
  '/',
  filterMiddleware<CreateOrderReqBody>(['shipping_name', 'shipping_phone', 'shipping_address', 'note']),
  createOrderValidator,
  wrapAsync(createOrderController)
)
orderRouter.get('/', orderListValidator, wrapAsync(getMyOrdersController))
orderRouter.get('/:id', idParamValidator, wrapAsync(getMyOrderController))
orderRouter.post('/:id/cancel', idParamValidator, wrapAsync(cancelMyOrderController))

export default orderRouter
