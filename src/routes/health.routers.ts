import { Router } from 'express'
import HTTP_STATUS from '~/constants/httpStatus'
import databaseService from '~/services/database.services'
import { logger } from '~/utils/logger'

//dùng cho load balancer / healthcheck của nền tảng deploy: 200 khi server và database đều ổn, 503 khi mất database
const healthRouter = Router()
healthRouter.get('/', async (req, res) => {
  try {
    await databaseService.$queryRaw`SELECT 1`
    res.status(HTTP_STATUS.OK).json({ status: 'ok', database: 'up', uptime_seconds: Math.round(process.uptime()) })
  } catch (error) {
    logger.error('healthcheck: không kết nối được database', { error })
    res.status(HTTP_STATUS.SERVICE_UNAVAILABLE).json({ status: 'error', database: 'down' })
  }
})

export default healthRouter
