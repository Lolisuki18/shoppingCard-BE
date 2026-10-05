import { Router } from 'express'
import {
  createProductController,
  deleteProductController,
  getProductController,
  getProductsController,
  updateProductController
} from '~/controllers/products.controllers'
import { createReviewController, getProductReviewsController } from '~/controllers/reviews.controllers'
import { USER_ROLE } from '~/constants/enums'
import { requireRoles, requireVerifiedUser } from '~/middlewares/auth.middlewares'
import { filterMiddleware } from '~/middlewares/common.middleware'
import {
  createProductValidator,
  createReviewValidator,
  idParamValidator,
  paginationValidator,
  productListValidator,
  updateProductValidator
} from '~/middlewares/shop.middlewares'
import { accessTokenValidation } from '~/middlewares/users.middlewares'
import { CreateReviewReqBody, ProductReqBody } from '~/models/requests/Shop.requests'
import { wrapAsync } from '~/utils/handlers'

const productRouter = Router()

const PRODUCT_FIELDS: (keyof ProductReqBody)[] = [
  'category_id',
  'name',
  'description',
  'price',
  'stock',
  'images',
  'is_active'
]

//public: tìm kiếm / lọc / phân trang, và xem chi tiết (chỉ sản phẩm đang bán)
productRouter.get('/', productListValidator, wrapAsync(getProductsController))
productRouter.get('/:id', idParamValidator, wrapAsync(getProductController))

//đánh giá: ai cũng xem được; chỉ khách đã nhận hàng sản phẩm đó mới được viết
productRouter.get('/:id/reviews', idParamValidator, paginationValidator, wrapAsync(getProductReviewsController))
productRouter.post(
  '/:id/reviews',
  accessTokenValidation,
  requireVerifiedUser,
  idParamValidator,
  filterMiddleware<CreateReviewReqBody>(['rating', 'comment']),
  createReviewValidator,
  wrapAsync(createReviewController)
)

//Admin + Staff
const manage = [accessTokenValidation, requireRoles(USER_ROLE.Admin, USER_ROLE.Staff)]
productRouter.post(
  '/',
  ...manage,
  filterMiddleware<ProductReqBody>(PRODUCT_FIELDS),
  createProductValidator,
  wrapAsync(createProductController)
)
productRouter.patch(
  '/:id',
  ...manage,
  idParamValidator,
  filterMiddleware<ProductReqBody>(PRODUCT_FIELDS),
  updateProductValidator,
  wrapAsync(updateProductController)
)
//chỉ Admin được xoá
productRouter.delete(
  '/:id',
  accessTokenValidation,
  requireRoles(USER_ROLE.Admin),
  idParamValidator,
  wrapAsync(deleteProductController)
)

export default productRouter
