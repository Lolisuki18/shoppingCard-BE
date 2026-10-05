import { Router } from 'express'
import {
  addToCartController,
  clearCartController,
  getCartController,
  mergeCartController,
  removeCartItemController,
  updateCartItemController
} from '~/controllers/carts.controllers'
import { requireVerifiedUser } from '~/middlewares/auth.middlewares'
import { filterMiddleware } from '~/middlewares/common.middleware'
import {
  addToCartValidator,
  cartItemParamValidator,
  mergeCartValidator,
  updateCartItemValidator
} from '~/middlewares/shop.middlewares'
import { accessTokenValidation } from '~/middlewares/users.middlewares'
import { AddToCartReqBody, MergeCartReqBody, UpdateCartItemReqBody } from '~/models/requests/Shop.requests'
import { wrapAsync } from '~/utils/handlers'

const cartRouter = Router()

//toàn bộ giỏ hàng cần đăng nhập + đã verify email
cartRouter.use(accessTokenValidation, requireVerifiedUser)

cartRouter.get('/', wrapAsync(getCartController))
cartRouter.delete('/', wrapAsync(clearCartController))
//gộp giỏ hàng khách vãng lai (FE lưu ở localStorage) vào giỏ tài khoản ngay sau khi đăng nhập
cartRouter.post(
  '/merge',
  filterMiddleware<MergeCartReqBody>(['items']),
  mergeCartValidator,
  wrapAsync(mergeCartController)
)
cartRouter.post(
  '/items',
  filterMiddleware<AddToCartReqBody>(['product_id', 'variant_id', 'quantity']),
  addToCartValidator,
  wrapAsync(addToCartController)
)
cartRouter.patch(
  '/items/:product_id',
  filterMiddleware<UpdateCartItemReqBody>(['variant_id', 'quantity']),
  updateCartItemValidator,
  wrapAsync(updateCartItemController)
)
cartRouter.delete('/items/:product_id', cartItemParamValidator, wrapAsync(removeCartItemController))

export default cartRouter
