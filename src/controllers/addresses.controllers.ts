import { Request, Response } from 'express'
import { ParamsDictionary } from 'express-serve-static-core'
import HTTP_STATUS from '~/constants/httpStatus'
import { ADDRESS_MESSAGES } from '~/constants/messages'
import { AddressReqBody, UpdateAddressReqBody } from '~/models/requests/Shop.requests'
import { TokenPayLoad } from '~/models/requests/User.requests'
import addressesServices from '~/services/addresses.services'

const getUserId = (req: Request<any, any, any, any>) => (req.decode_authorization as TokenPayLoad).user_id

export const getAddressesController = async (req: Request, res: Response) => {
  const result = await addressesServices.getList(getUserId(req))
  res.status(HTTP_STATUS.OK).json({ message: ADDRESS_MESSAGES.GET_LIST_SUCCESS, result })
}

export const createAddressController = async (req: Request<ParamsDictionary, any, AddressReqBody>, res: Response) => {
  const result = await addressesServices.create(getUserId(req), req.body)
  res.status(HTTP_STATUS.CREATED).json({ message: ADDRESS_MESSAGES.CREATE_SUCCESS, result })
}

export const updateAddressController = async (
  req: Request<ParamsDictionary, any, UpdateAddressReqBody>,
  res: Response
) => {
  const result = await addressesServices.update(req.params.id, getUserId(req), req.body)
  res.status(HTTP_STATUS.OK).json({ message: ADDRESS_MESSAGES.UPDATE_SUCCESS, result })
}

export const deleteAddressController = async (req: Request<ParamsDictionary>, res: Response) => {
  await addressesServices.delete(req.params.id, getUserId(req))
  res.status(HTTP_STATUS.OK).json({ message: ADDRESS_MESSAGES.DELETE_SUCCESS })
}
