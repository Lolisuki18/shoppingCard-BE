import { Request, Response } from 'express'
import { ParamsDictionary } from 'express-serve-static-core'
import HTTP_STATUS from '~/constants/httpStatus'
import { CATEGORY_MESSAGES } from '~/constants/messages'
import { CategoryReqBody, UpdateCategoryReqBody } from '~/models/requests/Shop.requests'
import categoriesServices from '~/services/categories.services'

export const getCategoriesController = async (req: Request, res: Response) => {
  const result = await categoriesServices.getAll()
  res.status(HTTP_STATUS.OK).json({ message: CATEGORY_MESSAGES.GET_LIST_SUCCESS, result })
}

export const getCategoryController = async (req: Request<ParamsDictionary>, res: Response) => {
  const result = await categoriesServices.getById(req.params.id)
  res.status(HTTP_STATUS.OK).json({ message: CATEGORY_MESSAGES.GET_SUCCESS, result })
}

export const createCategoryController = async (req: Request<ParamsDictionary, any, CategoryReqBody>, res: Response) => {
  const result = await categoriesServices.create(req.body)
  res.status(HTTP_STATUS.CREATED).json({ message: CATEGORY_MESSAGES.CREATE_SUCCESS, result })
}

export const updateCategoryController = async (
  req: Request<ParamsDictionary, any, UpdateCategoryReqBody>,
  res: Response
) => {
  const result = await categoriesServices.update(req.params.id, req.body)
  res.status(HTTP_STATUS.OK).json({ message: CATEGORY_MESSAGES.UPDATE_SUCCESS, result })
}

export const deleteCategoryController = async (req: Request<ParamsDictionary>, res: Response) => {
  await categoriesServices.delete(req.params.id)
  res.status(HTTP_STATUS.OK).json({ message: CATEGORY_MESSAGES.DELETE_SUCCESS })
}
