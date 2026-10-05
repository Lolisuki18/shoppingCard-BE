import { Request, Response } from 'express'
import { ParamsDictionary } from 'express-serve-static-core'
import HTTP_STATUS from '~/constants/httpStatus'
import { COUPON_MESSAGES } from '~/constants/messages'
import {
  CouponListQuery,
  CouponReqBody,
  UpdateCouponReqBody,
  ValidateCouponReqBody
} from '~/models/requests/Shop.requests'
import { TokenPayLoad } from '~/models/requests/User.requests'
import couponsServices from '~/services/coupons.services'

//---------------- khách hàng ----------------
export const validateCouponController = async (
  req: Request<ParamsDictionary, any, ValidateCouponReqBody>,
  res: Response
) => {
  const { user_id } = req.decode_authorization as TokenPayLoad
  const result = await couponsServices.preview(user_id, req.body.code)
  res.status(HTTP_STATUS.OK).json({ message: COUPON_MESSAGES.VALIDATE_SUCCESS, result })
}

//---------------- Admin / Staff ----------------
export const adminGetCouponsController = async (
  req: Request<ParamsDictionary, any, any, CouponListQuery>,
  res: Response
) => {
  const result = await couponsServices.getList(req.query)
  res.status(HTTP_STATUS.OK).json({ message: COUPON_MESSAGES.GET_LIST_SUCCESS, result })
}

export const adminGetCouponController = async (req: Request<ParamsDictionary>, res: Response) => {
  const result = await couponsServices.getById(req.params.id)
  res.status(HTTP_STATUS.OK).json({ message: COUPON_MESSAGES.GET_SUCCESS, result })
}

export const adminCreateCouponController = async (
  req: Request<ParamsDictionary, any, CouponReqBody>,
  res: Response
) => {
  const result = await couponsServices.create(req.body)
  res.status(HTTP_STATUS.CREATED).json({ message: COUPON_MESSAGES.CREATE_SUCCESS, result })
}

export const adminUpdateCouponController = async (
  req: Request<ParamsDictionary, any, UpdateCouponReqBody>,
  res: Response
) => {
  const result = await couponsServices.update(req.params.id, req.body)
  res.status(HTTP_STATUS.OK).json({ message: COUPON_MESSAGES.UPDATE_SUCCESS, result })
}

export const adminDeleteCouponController = async (req: Request<ParamsDictionary>, res: Response) => {
  await couponsServices.delete(req.params.id)
  res.status(HTTP_STATUS.OK).json({ message: COUPON_MESSAGES.DELETE_SUCCESS })
}
