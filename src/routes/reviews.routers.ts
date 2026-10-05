import { Router } from 'express'
import { deleteReviewController, updateReviewController } from '~/controllers/reviews.controllers'
import { requireVerifiedUser } from '~/middlewares/auth.middlewares'
import { filterMiddleware } from '~/middlewares/common.middleware'
import { idParamValidator, updateReviewValidator } from '~/middlewares/shop.middlewares'
import { accessTokenValidation } from '~/middlewares/users.middlewares'
import { UpdateReviewReqBody } from '~/models/requests/Shop.requests'
import { wrapAsync } from '~/utils/handlers'

//sửa / xoá 1 đánh giá (tạo + xem đánh giá nằm ở /products/:id/reviews)
const reviewRouter = Router()
reviewRouter.use(accessTokenValidation, requireVerifiedUser)

reviewRouter.patch(
  '/:id',
  idParamValidator,
  filterMiddleware<UpdateReviewReqBody>(['rating', 'comment']),
  updateReviewValidator,
  wrapAsync(updateReviewController)
)
//chủ review hoặc Admin/Staff
reviewRouter.delete('/:id', idParamValidator, wrapAsync(deleteReviewController))

export default reviewRouter
