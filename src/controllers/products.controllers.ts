import { Request, Response } from 'express'
import { ParamsDictionary } from 'express-serve-static-core'
import HTTP_STATUS from '~/constants/httpStatus'
import { PRODUCT_MESSAGES } from '~/constants/messages'
import { ProductListQuery, ProductReqBody, UpdateProductReqBody } from '~/models/requests/Shop.requests'
import productsServices from '~/services/products.services'

//public: chỉ thấy sản phẩm đang bán
export const getProductsController = async (
  req: Request<ParamsDictionary, any, any, ProductListQuery>,
  res: Response
) => {
  const result = await productsServices.getList(req.query, { includeInactive: false })
  res.status(HTTP_STATUS.OK).json({ message: PRODUCT_MESSAGES.GET_LIST_SUCCESS, result })
}

export const getProductController = async (req: Request<ParamsDictionary>, res: Response) => {
  const result = await productsServices.getById(req.params.id, { includeInactive: false })
  res.status(HTTP_STATUS.OK).json({ message: PRODUCT_MESSAGES.GET_SUCCESS, result })
}

//Admin/Staff: thấy cả sản phẩm đang ẩn
export const adminGetProductsController = async (
  req: Request<ParamsDictionary, any, any, ProductListQuery>,
  res: Response
) => {
  const result = await productsServices.getList(req.query, { includeInactive: true })
  res.status(HTTP_STATUS.OK).json({ message: PRODUCT_MESSAGES.GET_LIST_SUCCESS, result })
}

export const adminGetProductController = async (req: Request<ParamsDictionary>, res: Response) => {
  const result = await productsServices.getById(req.params.id, { includeInactive: true })
  res.status(HTTP_STATUS.OK).json({ message: PRODUCT_MESSAGES.GET_SUCCESS, result })
}

export const createProductController = async (req: Request<ParamsDictionary, any, ProductReqBody>, res: Response) => {
  const result = await productsServices.create(req.body)
  res.status(HTTP_STATUS.CREATED).json({ message: PRODUCT_MESSAGES.CREATE_SUCCESS, result })
}

export const updateProductController = async (
  req: Request<ParamsDictionary, any, UpdateProductReqBody>,
  res: Response
) => {
  const result = await productsServices.update(req.params.id, req.body)
  res.status(HTTP_STATUS.OK).json({ message: PRODUCT_MESSAGES.UPDATE_SUCCESS, result })
}

export const deleteProductController = async (req: Request<ParamsDictionary>, res: Response) => {
  await productsServices.delete(req.params.id)
  res.status(HTTP_STATUS.OK).json({ message: PRODUCT_MESSAGES.DELETE_SUCCESS })
}
