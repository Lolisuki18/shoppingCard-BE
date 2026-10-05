import { Request, Response } from 'express'
import { ParamsDictionary } from 'express-serve-static-core'
import HTTP_STATUS from '~/constants/httpStatus'
import { WISHLIST_MESSAGES } from '~/constants/messages'
import { AddToWishlistReqBody, PaginationQuery } from '~/models/requests/Shop.requests'
import { TokenPayLoad } from '~/models/requests/User.requests'
import wishlistServices from '~/services/wishlist.services'

const getUserId = (req: Request<any, any, any, any>) => (req.decode_authorization as TokenPayLoad).user_id

export const getWishlistController = async (
  req: Request<ParamsDictionary, any, any, PaginationQuery>,
  res: Response
) => {
  const result = await wishlistServices.getList(getUserId(req), req.query)
  res.status(HTTP_STATUS.OK).json({ message: WISHLIST_MESSAGES.GET_LIST_SUCCESS, result })
}

export const addToWishlistController = async (
  req: Request<ParamsDictionary, any, AddToWishlistReqBody>,
  res: Response
) => {
  const result = await wishlistServices.add(getUserId(req), req.body.product_id)
  res.status(HTTP_STATUS.OK).json({ message: WISHLIST_MESSAGES.ADD_SUCCESS, result })
}

export const removeFromWishlistController = async (req: Request<ParamsDictionary>, res: Response) => {
  await wishlistServices.remove(getUserId(req), req.params.product_id)
  res.status(HTTP_STATUS.OK).json({ message: WISHLIST_MESSAGES.REMOVE_SUCCESS })
}
