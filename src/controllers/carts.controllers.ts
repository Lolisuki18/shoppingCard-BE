import { Request, Response } from 'express'
import { ParamsDictionary } from 'express-serve-static-core'
import HTTP_STATUS from '~/constants/httpStatus'
import { CART_MESSAGES } from '~/constants/messages'
import { AddToCartReqBody, UpdateCartItemReqBody } from '~/models/requests/Shop.requests'
import { TokenPayLoad } from '~/models/requests/User.requests'
import cartsServices from '~/services/carts.services'

//các route giỏ hàng đã qua accessTokenValidation nên chắc chắn có decode_authorization
const getUserId = (req: Request<any, any, any, any>) => (req.decode_authorization as TokenPayLoad).user_id

export const getCartController = async (req: Request, res: Response) => {
  const result = await cartsServices.getCart(getUserId(req))
  res.status(HTTP_STATUS.OK).json({ message: CART_MESSAGES.GET_SUCCESS, result })
}

export const addToCartController = async (req: Request<ParamsDictionary, any, AddToCartReqBody>, res: Response) => {
  const { product_id, variant_id, quantity } = req.body
  const result = await cartsServices.addItem({ user_id: getUserId(req), product_id, variant_id, quantity })
  res.status(HTTP_STATUS.OK).json({ message: CART_MESSAGES.ADD_SUCCESS, result })
}

export const updateCartItemController = async (
  req: Request<ParamsDictionary, any, UpdateCartItemReqBody>,
  res: Response
) => {
  const result = await cartsServices.updateItem({
    user_id: getUserId(req),
    product_id: req.params.product_id,
    variant_id: req.body.variant_id,
    quantity: req.body.quantity
  })
  res.status(HTTP_STATUS.OK).json({ message: CART_MESSAGES.UPDATE_SUCCESS, result })
}

export const removeCartItemController = async (
  req: Request<ParamsDictionary, any, any, { variant_id?: string }>,
  res: Response
) => {
  const result = await cartsServices.removeItem({
    user_id: getUserId(req),
    product_id: req.params.product_id,
    variant_id: req.query.variant_id
  })
  res.status(HTTP_STATUS.OK).json({ message: CART_MESSAGES.REMOVE_SUCCESS, result })
}

export const clearCartController = async (req: Request, res: Response) => {
  await cartsServices.clear(getUserId(req))
  res.status(HTTP_STATUS.OK).json({ message: CART_MESSAGES.CLEAR_SUCCESS })
}
