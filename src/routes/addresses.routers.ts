import { Router } from 'express'
import {
  createAddressController,
  deleteAddressController,
  getAddressesController,
  updateAddressController
} from '~/controllers/addresses.controllers'
import { requireVerifiedUser } from '~/middlewares/auth.middlewares'
import { filterMiddleware } from '~/middlewares/common.middleware'
import { createAddressValidator, idParamValidator, updateAddressValidator } from '~/middlewares/shop.middlewares'
import { accessTokenValidation } from '~/middlewares/users.middlewares'
import { AddressReqBody } from '~/models/requests/Shop.requests'
import { wrapAsync } from '~/utils/handlers'

const addressRouter = Router()
const ADDRESS_FIELDS: (keyof AddressReqBody)[] = ['name', 'phone', 'address', 'is_default']

//sổ địa chỉ của chính mình: cần đăng nhập + đã verify email
addressRouter.use(accessTokenValidation, requireVerifiedUser)

addressRouter.get('/', wrapAsync(getAddressesController))
addressRouter.post(
  '/',
  filterMiddleware<AddressReqBody>(ADDRESS_FIELDS),
  createAddressValidator,
  wrapAsync(createAddressController)
)
addressRouter.patch(
  '/:id',
  idParamValidator,
  filterMiddleware<AddressReqBody>(ADDRESS_FIELDS),
  updateAddressValidator,
  wrapAsync(updateAddressController)
)
addressRouter.delete('/:id', idParamValidator, wrapAsync(deleteAddressController))

export default addressRouter
