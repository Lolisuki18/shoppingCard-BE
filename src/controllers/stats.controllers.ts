import { Request, Response } from 'express'
import { ParamsDictionary } from 'express-serve-static-core'
import HTTP_STATUS from '~/constants/httpStatus'
import { STATS_MESSAGES } from '~/constants/messages'
import { LowStockQuery, RevenueQuery, StatsRangeQuery, TopProductsQuery } from '~/models/requests/Shop.requests'
import statsServices from '~/services/stats.services'

export const overviewStatsController = async (
  req: Request<ParamsDictionary, any, any, StatsRangeQuery>,
  res: Response
) => {
  const result = await statsServices.overview(req.query)
  res.status(HTTP_STATUS.OK).json({ message: STATS_MESSAGES.OVERVIEW_SUCCESS, result })
}

export const revenueStatsController = async (req: Request<ParamsDictionary, any, any, RevenueQuery>, res: Response) => {
  const result = await statsServices.revenue(req.query)
  res.status(HTTP_STATUS.OK).json({ message: STATS_MESSAGES.REVENUE_SUCCESS, result })
}

export const topProductsController = async (
  req: Request<ParamsDictionary, any, any, TopProductsQuery>,
  res: Response
) => {
  const result = await statsServices.topProducts(req.query)
  res.status(HTTP_STATUS.OK).json({ message: STATS_MESSAGES.TOP_PRODUCTS_SUCCESS, result })
}

export const lowStockController = async (req: Request<ParamsDictionary, any, any, LowStockQuery>, res: Response) => {
  const result = await statsServices.lowStock(req.query)
  res.status(HTTP_STATUS.OK).json({ message: STATS_MESSAGES.LOW_STOCK_SUCCESS, result })
}
