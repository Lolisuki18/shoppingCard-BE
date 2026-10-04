import { Request, Response } from 'express'
import { ParamsDictionary } from 'express-serve-static-core'
import HTTP_STATUS from '~/constants/httpStatus'
import { ORDER_MESSAGES } from '~/constants/messages'
import { CreateOrderReqBody, OrderListQuery, UpdateOrderStatusReqBody } from '~/models/requests/Shop.requests'
import { TokenPayLoad } from '~/models/requests/User.requests'
import ordersServices from '~/services/orders.services'

const getUserId = (req: Request<any, any, any, any>) => (req.decode_authorization as TokenPayLoad).user_id

//---------------- khách hàng ----------------
export const createOrderController = async (req: Request<ParamsDictionary, any, CreateOrderReqBody>, res: Response) => {
  const result = await ordersServices.createFromCart(getUserId(req), req.body)
  res.status(HTTP_STATUS.CREATED).json({ message: ORDER_MESSAGES.CREATE_SUCCESS, result })
}

export const getMyOrdersController = async (
  req: Request<ParamsDictionary, any, any, OrderListQuery>,
  res: Response
) => {
  const result = await ordersServices.getList(req.query, getUserId(req))
  res.status(HTTP_STATUS.OK).json({ message: ORDER_MESSAGES.GET_LIST_SUCCESS, result })
}

export const getMyOrderController = async (req: Request<ParamsDictionary>, res: Response) => {
  const result = await ordersServices.getById(req.params.id, getUserId(req))
  res.status(HTTP_STATUS.OK).json({ message: ORDER_MESSAGES.GET_SUCCESS, result })
}

export const cancelMyOrderController = async (req: Request<ParamsDictionary>, res: Response) => {
  const result = await ordersServices.cancelByCustomer(req.params.id, getUserId(req))
  res.status(HTTP_STATUS.OK).json({ message: ORDER_MESSAGES.CANCEL_SUCCESS, result })
}

//---------------- Admin / Staff ----------------
export const adminGetOrdersController = async (
  req: Request<ParamsDictionary, any, any, OrderListQuery>,
  res: Response
) => {
  const result = await ordersServices.getList(req.query)
  res.status(HTTP_STATUS.OK).json({ message: ORDER_MESSAGES.GET_LIST_SUCCESS, result })
}

export const adminGetOrderController = async (req: Request<ParamsDictionary>, res: Response) => {
  const result = await ordersServices.getById(req.params.id)
  res.status(HTTP_STATUS.OK).json({ message: ORDER_MESSAGES.GET_SUCCESS, result })
}

export const adminUpdateOrderStatusController = async (
  req: Request<ParamsDictionary, any, UpdateOrderStatusReqBody>,
  res: Response
) => {
  const result = await ordersServices.updateStatus(req.params.id, req.body.status)
  res.status(HTTP_STATUS.OK).json({ message: ORDER_MESSAGES.UPDATE_STATUS_SUCCESS, result })
}
