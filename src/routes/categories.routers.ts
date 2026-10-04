import { Router } from 'express'
import {
  createCategoryController,
  deleteCategoryController,
  getCategoriesController,
  getCategoryController,
  updateCategoryController
} from '~/controllers/categories.controllers'
import { USER_ROLE } from '~/constants/enums'
import { requireRoles } from '~/middlewares/auth.middlewares'
import { filterMiddleware } from '~/middlewares/common.middleware'
import { createCategoryValidator, idParamValidator, updateCategoryValidator } from '~/middlewares/shop.middlewares'
import { accessTokenValidation } from '~/middlewares/users.middlewares'
import { CategoryReqBody } from '~/models/requests/Shop.requests'
import { wrapAsync } from '~/utils/handlers'

const categoryRouter = Router()

//public: xem danh sách / chi tiết
categoryRouter.get('/', wrapAsync(getCategoriesController))
categoryRouter.get('/:id', idParamValidator, wrapAsync(getCategoryController))

//Admin + Staff: tạo / sửa (filterMiddleware chỉ giữ lại các field cho phép)
const manage = [accessTokenValidation, requireRoles(USER_ROLE.Admin, USER_ROLE.Staff)]
categoryRouter.post(
  '/',
  ...manage,
  filterMiddleware<CategoryReqBody>(['name', 'description']),
  createCategoryValidator,
  wrapAsync(createCategoryController)
)
categoryRouter.patch(
  '/:id',
  ...manage,
  idParamValidator,
  filterMiddleware<CategoryReqBody>(['name', 'description']),
  updateCategoryValidator,
  wrapAsync(updateCategoryController)
)
//chỉ Admin được xoá
categoryRouter.delete(
  '/:id',
  accessTokenValidation,
  requireRoles(USER_ROLE.Admin),
  idParamValidator,
  wrapAsync(deleteCategoryController)
)

export default categoryRouter
