import ordersServices from '~/services/orders.services'
import { logger } from '~/utils/logger'

//đơn Pending quá ORDER_AUTO_CANCEL_HOURS giờ chưa được xác nhận sẽ bị tự huỷ (mặc định 48h, đặt 0 để tắt)
const DEFAULT_HOURS = 48
const RUN_EVERY_MS = 10 * 60 * 1000

export const startOrderJobs = () => {
  const hours =
    process.env.ORDER_AUTO_CANCEL_HOURS === undefined ? DEFAULT_HOURS : Number(process.env.ORDER_AUTO_CANCEL_HOURS)
  if (!Number.isFinite(hours) || hours <= 0) {
    logger.info('tắt tự huỷ đơn quá hạn (ORDER_AUTO_CANCEL_HOURS <= 0)')
    return () => {}
  }
  let running = false
  const run = async () => {
    if (running) return //lần trước chưa xong thì bỏ qua lần này
    running = true
    try {
      const count = await ordersServices.cancelExpiredPending(hours)
      if (count > 0) logger.info(`đã tự huỷ ${count} đơn Pending quá ${hours}h`)
    } catch (error) {
      logger.error('job huỷ đơn quá hạn lỗi', { error })
    } finally {
      running = false
    }
  }
  void run()
  const timer = setInterval(run, RUN_EVERY_MS)
  timer.unref() //không giữ tiến trình sống chỉ vì job
  return () => clearInterval(timer)
}
