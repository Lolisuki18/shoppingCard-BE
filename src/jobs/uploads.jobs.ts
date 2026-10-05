import { deleteOrphanUploads } from '~/services/medias.services'
import { logger } from '~/utils/logger'

//dọn ảnh upload không gắn vào đâu sau ORPHAN_UPLOAD_MAX_AGE_HOURS giờ (mặc định 24, đặt 0 để tắt). Chạy mỗi giờ
const DEFAULT_HOURS = 24
const RUN_EVERY_MS = 60 * 60 * 1000

export const startUploadJobs = () => {
  const raw = process.env.ORPHAN_UPLOAD_MAX_AGE_HOURS
  const hours = raw === undefined || raw.trim() === '' ? DEFAULT_HOURS : Number(raw)
  if (!Number.isFinite(hours) || hours <= 0) {
    logger.info('tắt dọn ảnh upload mồ côi (ORPHAN_UPLOAD_MAX_AGE_HOURS <= 0)')
    return () => {}
  }
  let running = false
  const run = async () => {
    if (running) return
    running = true
    try {
      const count = await deleteOrphanUploads(hours)
      if (count > 0) logger.info(`đã xoá ${count} file upload mồ côi (quá ${hours}h chưa gắn vào đâu)`)
    } catch (error) {
      logger.error('job dọn upload mồ côi lỗi', { error })
    } finally {
      running = false
    }
  }
  void run()
  const timer = setInterval(run, RUN_EVERY_MS)
  timer.unref()
  return () => clearInterval(timer)
}
