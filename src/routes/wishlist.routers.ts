import { Router } from 'express'
import {
  addToWishlistController,
  getWishlistController,
  removeFromWishlistController
} from '~/controllers/wishlist.controllers'
import { requireVerifiedUser } from '~/middlewares/auth.middlewares'
import { filterMiddleware } from '~/middlewares/common.middleware'
import { addToWishlistValidator, paginationValidator, wishlistItemParamValidator } from '~/middlewares/shop.middlewares'
import { accessTokenValidation } from '~/middlewares/users.middlewares'
import { AddToWishlistReqBody } from '~/models/requests/Shop.requests'
import { wrapAsync } from '~/utils/handlers'

const wishlistRouter = Router()

//cần đăng nhập + đã verify email (giống giỏ hàng)
wishlistRouter.use(accessTokenValidation, requireVerifiedUser)

wishlistRouter.get('/', paginationValidator, wrapAsync(getWishlistController))
wishlistRouter.post(
  '/',
  filterMiddleware<AddToWishlistReqBody>(['product_id']),
  addToWishlistValidator,
  wrapAsync(addToWishlistController)
)
wishlistRouter.delete('/:product_id', wishlistItemParamValidator, wrapAsync(removeFromWishlistController))

export default wishlistRouter
