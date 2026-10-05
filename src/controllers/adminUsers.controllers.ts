import { Request, Response } from 'express'
import { ParamsDictionary } from 'express-serve-static-core'
import HTTP_STATUS from '~/constants/httpStatus'
import { ADMIN_USER_MESSAGES } from '~/constants/messages'
import { AdminUserListQuery, UpdateUserRoleReqBody } from '~/models/requests/Shop.requests'
import { TokenPayLoad } from '~/models/requests/User.requests'
import adminUsersServices from '~/services/adminUsers.services'

const getActorId = (req: Request<any, any, any, any>) => (req.decode_authorization as TokenPayLoad).user_id

export const adminGetUsersController = async (
  req: Request<ParamsDictionary, any, any, AdminUserListQuery>,
  res: Response
) => {
  const result = await adminUsersServices.getList(req.query)
  res.status(HTTP_STATUS.OK).json({ message: ADMIN_USER_MESSAGES.GET_LIST_SUCCESS, result })
}

export const adminGetUserController = async (req: Request<ParamsDictionary>, res: Response) => {
  const result = await adminUsersServices.getById(req.params.id)
  res.status(HTTP_STATUS.OK).json({ message: ADMIN_USER_MESSAGES.GET_SUCCESS, result })
}

export const adminBanUserController = async (req: Request<ParamsDictionary>, res: Response) => {
  const result = await adminUsersServices.ban(req.params.id, getActorId(req))
  res.status(HTTP_STATUS.OK).json({ message: ADMIN_USER_MESSAGES.BAN_SUCCESS, result })
}

export const adminUnbanUserController = async (req: Request<ParamsDictionary>, res: Response) => {
  const result = await adminUsersServices.unban(req.params.id)
  res.status(HTTP_STATUS.OK).json({ message: ADMIN_USER_MESSAGES.UNBAN_SUCCESS, result })
}

export const adminUpdateUserRoleController = async (
  req: Request<ParamsDictionary, any, UpdateUserRoleReqBody>,
  res: Response
) => {
  const result = await adminUsersServices.setRole(req.params.id, req.body.role, getActorId(req))
  res.status(HTTP_STATUS.OK).json({ message: ADMIN_USER_MESSAGES.UPDATE_ROLE_SUCCESS, result })
}
