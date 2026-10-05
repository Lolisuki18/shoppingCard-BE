//dựng app express (chưa listen, chưa kết nối DB) để index.ts chạy server và test import dùng lại
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import dotenv from 'dotenv'
import userRouter from './routes/users.routers'
import { defaultErrorHandler, notFoundHandler } from './middlewares/error.middleware'
import { requestLogger } from './middlewares/requestLogger.middleware'
import { globalLimiter } from './middlewares/rateLimit.middleware'
import mediaRouter from './routes/medias.routers'
import staticRouter from './routes/static.routers'
import categoryRouter from './routes/categories.routers'
import productRouter from './routes/products.routers'
import cartRouter from './routes/carts.routers'
import orderRouter from './routes/orders.routers'
import couponRouter from './routes/coupons.routers'
import reviewRouter from './routes/reviews.routers'
import wishlistRouter from './routes/wishlist.routers'
import addressRouter from './routes/addresses.routers'
import docsRouter, { docsEnabled } from './routes/docs.routers'
import healthRouter from './routes/health.routers'
import adminRouter from './routes/admin.routers'

dotenv.config()

//CORS_ORIGIN: danh sách origin của FE, cách nhau bằng dấu phẩy ("*" = cho tất cả). Bỏ trống thì dùng CLIENT_URL
const corsOrigins = () => {
  const raw = process.env.CORS_ORIGIN || process.env.CLIENT_URL || 'http://localhost:8000'
  return raw === '*' ? '*' : raw.split(',').map((origin) => origin.trim().replace(/\/$/, ''))
}

export const createApp = () => {
  const app = express()
  //đứng sau reverse proxy (nginx, Render, Heroku...) thì đặt TRUST_PROXY=1 để rate limit đếm đúng IP của khách
  if (process.env.TRUST_PROXY) {
    const value = process.env.TRUST_PROXY
    app.set('trust proxy', /^\d+$/.test(value) ? Number(value) : value === 'true')
  }
  app.disable('x-powered-by')
  app.use(requestLogger)
  //tài liệu API (Swagger UI) đặt trước helmet toàn cục vì cần CSP riêng
  if (docsEnabled()) app.use('/docs', docsRouter)
  //ảnh upload được FE ở domain khác nhúng vào nên cho phép cross-origin cho resource
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }))
  app.use(cors({ origin: corsOrigins() }))
  app.use(globalLimiter)
  app.use(express.json({ limit: '100kb' })) // cho sever xài 1 middleware biến đổi json -> ko có cái này sẽ bị biến thành undefined

  //server dùng cái route đã tạo
  app.use('/health', healthRouter)
  app.use('/users', userRouter)
  app.use('/medias', mediaRouter)
  app.use('/static', staticRouter)
  app.use('/categories', categoryRouter)
  app.use('/products', productRouter)
  app.use('/cart', cartRouter)
  app.use('/orders', orderRouter)
  app.use('/coupons', couponRouter)
  app.use('/reviews', reviewRouter)
  app.use('/wishlist', wishlistRouter)
  app.use('/addresses', addressRouter)
  app.use('/admin', adminRouter)

  app.use(notFoundHandler)
  //-> điểm tập kết lỗi của hệ thống
  app.use(defaultErrorHandler)
  return app
}

const app = createApp()
export default app
