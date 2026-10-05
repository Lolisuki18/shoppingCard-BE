import { Request, Response } from 'express'
import { ParamsDictionary } from 'express-serve-static-core'
import HTTP_STATUS from '~/constants/httpStatus'
import { REVIEW_MESSAGES } from '~/constants/messages'
import { CreateReviewReqBody, PaginationQuery, UpdateReviewReqBody } from '~/models/requests/Shop.requests'
import { TokenPayLoad } from '~/models/requests/User.requests'
import reviewsServices from '~/services/reviews.services'

const getUserId = (req: Request<any, any, any, any>) => (req.decode_authorization as TokenPayLoad).user_id

export const getProductReviewsController = async (
  req: Request<ParamsDictionary, any, any, PaginationQuery>,
  res: Response
) => {
  const result = await reviewsServices.getList(req.params.id, req.query)
  res.status(HTTP_STATUS.OK).json({ message: REVIEW_MESSAGES.GET_LIST_SUCCESS, result })
}

export const createReviewController = async (
  req: Request<ParamsDictionary, any, CreateReviewReqBody>,
  res: Response
) => {
  const result = await reviewsServices.create(getUserId(req), req.params.id, req.body)
  res.status(HTTP_STATUS.CREATED).json({ message: REVIEW_MESSAGES.CREATE_SUCCESS, result })
}

export const updateReviewController = async (
  req: Request<ParamsDictionary, any, UpdateReviewReqBody>,
  res: Response
) => {
  const result = await reviewsServices.update(req.params.id, getUserId(req), req.body)
  res.status(HTTP_STATUS.OK).json({ message: REVIEW_MESSAGES.UPDATE_SUCCESS, result })
}

export const deleteReviewController = async (req: Request<ParamsDictionary>, res: Response) => {
  //requireVerifiedUser đã gắn current_user
  await reviewsServices.delete(req.params.id, req.current_user as { id: string; role: number })
  res.status(HTTP_STATUS.OK).json({ message: REVIEW_MESSAGES.DELETE_SUCCESS })
}
