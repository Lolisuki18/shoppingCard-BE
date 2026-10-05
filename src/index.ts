//chạy server: kết nối database rồi mới mở cổng
import dotenv from 'dotenv'
import app from './app'
import databaseService from './services/database.services'
import { startOrderJobs } from './jobs/orders.jobs'
import { startUploadJobs } from './jobs/uploads.jobs'
import { initFolder } from './utils/file'
import { logger } from './utils/logger'

dotenv.config()
const PORT = Number(process.env.PORT) || 3000

const bootstrap = async () => {
  await databaseService.connect() //kết nối PostgreSQL (qua Prisma), lỗi thì dừng luôn thay vì chạy mà không có DB
  initFolder() // mỗi lần sever chạy thì nó sẽ tạo luôn thư mục upload cho mình luôn

  const stopOrderJobs = startOrderJobs()
  const stopUploadJobs = startUploadJobs()
  const server = app.listen(PORT, () => {
    logger.info(`SERVER BE đang chạy trên port : ${PORT}`)
  })

  //tắt êm: ngừng nhận request mới, đợi request đang chạy xong rồi mới ngắt DB
  const shutdown = (signal: string) => {
    logger.info(`nhận ${signal}, đang tắt server`)
    stopOrderJobs()
    stopUploadJobs()
    server.close(async () => {
      await databaseService.disconnect()
      process.exit(0)
    })
    setTimeout(() => process.exit(1), 10_000).unref() //quá 10s mà chưa đóng được thì ép tắt
  }
  process.on('SIGTERM', () => shutdown('SIGTERM'))
  process.on('SIGINT', () => shutdown('SIGINT'))
}

bootstrap().catch((error) => {
  logger.error('không khởi động được server', { error })
  process.exit(1)
})
