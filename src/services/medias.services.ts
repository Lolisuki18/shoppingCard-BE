import { Request } from 'express'
import sharp from 'sharp'
import { UPLOAD_IMAGE_DIR, UPLOAD_IMAGE_TEMP_DIR } from '~/constants/dir'
import { getNameFromFullNameFile, handleUploadImage, handleUploadVideo } from '~/utils/file'
import fs from 'fs'
import path from 'path'
import databaseService from './database.services'
import { logger } from '~/utils/logger'
import { MediaType } from '~/constants/enums'
import { Media } from '~/models/Other'
import { apiUrl } from '~/utils/publicUrl'
class MediasService {
  //upload nhìu bức ảnh
  async handleUploadImage(req: Request) {
    //chuyển req thành file(nên xem lại file có dạng gì ?)
    const files = await handleUploadImage(req) // thu thập file từ req
    //filepath là đường dẫn của file cần xử lý đang nằm trong uploads/temp
    //file.newFilename: là tên unique mới của file sau khi upload lên, và ta gắn đuôi jpg
    //map dùng để thay đổi các phần tử trong mảng
    //biến đổi các phần tử theo một phương thức nào đó -> phải hứng

    //sẽ có rất nhiều async bất đồng bộ cùng chạy chung 1 thời điểm nên mình phải promise all để giải quyết vấn đề đó
    const result = await Promise.all(
      files.map(async (file) => {
        const newFilename = getNameFromFullNameFile(file.newFilename) + '.jpeg' // đặt tên mới cho file // có thể là '.jpg'
        const newPath = UPLOAD_IMAGE_DIR + '/' + newFilename // đường dẫn mới của file sau khi xử lý // đường dẫn mới
        // xử lý file bằng sharp
        //sharp sẽ nhận vào đường dẫn ucar file cần xử lý và xử lý
        //đường đẫn đến cái file cần optimize
        await sharp(file.filepath).jpeg().toFile(newPath)

        // console.log(info)
        // console.log(newPath)

        //sau khi mình xử lý xong mình sẽ bị dư 1 tấm hình(trong upload/temp) nên mình nên xoá nó đi
        // filepath là đường dẫn đến mục updaload(đường dẫn tới cái file cũ)
        // return info
        fs.unlinkSync(file.filepath) // xoá file tạm đi
        //cung cấp router link để người dùng vào xem hình vừa up
        return {
          url: `${apiUrl()}/static/image/${newFilename}`,
          type: MediaType.Image
        } as Media
        //truyền ra cái url vì mình chỉ cần cái url để đi tới thôi chứ không cần lưu thông tin
      })
    )
    return result
  }
  //upload video
  async handleUploadVideo(req: Request) {
    //chuyển req thành file(nên xem lại file có dạng gì ?)
    const files = await handleUploadVideo(req) // thu thập file từ req
    //filepath là đường dẫn của file cần xử lý đang nằm trong uploads/temp
    //file.newFilename: là tên unique mới của file sau khi upload lên, và ta gắn đuôi jpg
    //map dùng để thay đổi các phần tử trong mảng
    //biến đổi các phần tử theo một phương thức nào đó -> phải hứng

    //sẽ có rất nhiều async bất đồng bộ cùng chạy chung 1 thời điểm nên mình phải promise all để giải quyết vấn đề đó
    const result = await Promise.all(
      files.map(async (file) => {
        const newFilename = file.newFilename

        return {
          url: `${apiUrl()}/static/video/${newFilename}`,
          type: MediaType.Video
        } as Media
        //truyền ra cái url vì mình chỉ cần cái url để đi tới thôi chứ không cần lưu thông tin
      })
    )
    return result
  }
}

//URL ảnh do chính server này phục vụ -> tên file trong thư mục upload (URL ngoài / dạng khác trả undefined)
export const localImageFilename = (url: string) => {
  try {
    const parsed = new URL(url)
    if (parsed.origin !== new URL(apiUrl()).origin) return undefined
    const match = /^\/static\/image\/([^/]+)$/.exec(parsed.pathname)
    const name = match ? decodeURIComponent(match[1]) : undefined
    return name && name === path.basename(name) && !name.startsWith('.') ? name : undefined
  } catch {
    return undefined
  }
}

//xoá file ảnh upload không còn được ai dùng. Giữ lại ảnh còn được tham chiếu bởi sản phẩm khác, avatar/cover của user,
//hoặc bản chụp trong đơn hàng cũ (order_items.product_image) để lịch sử đơn hàng không bị vỡ ảnh. Không bao giờ throw
export const deleteUnusedImages = async (urls: string[]) => {
  for (const url of new Set(urls)) {
    const filename = localImageFilename(url)
    if (!filename) continue
    try {
      const [product, user, orderItem] = await Promise.all([
        databaseService.products.findFirst({ where: { images: { has: url } }, select: { id: true } }),
        databaseService.users.findFirst({
          where: { OR: [{ avatar: url }, { cover_photo: url }] },
          select: { id: true }
        }),
        databaseService.orderItems.findFirst({ where: { product_image: url }, select: { id: true } })
      ])
      if (product || user || orderItem) continue
      await fs.promises.unlink(path.join(UPLOAD_IMAGE_DIR, filename))
    } catch (error) {
      if ((error as NodeJS.ErrnoException)?.code !== 'ENOENT')
        logger.warn('không xoá được ảnh không còn dùng', { url, error })
    }
  }
}

//ảnh upload lên nhưng KHÔNG được gắn vào đâu (sản phẩm, avatar/cover, bản chụp trong đơn hàng) và đã quá olderThanHours giờ
//thì xoá; file lỗi còn sót trong thư mục tạm cũng bị xoá. Trả về số file đã xoá.
//So khớp theo TÊN FILE (không theo host trong URL) để API_URL từng đổi cũng không làm xoá nhầm ảnh đang dùng.
//Chỉ xử lý ảnh: video không được lưu ở đâu trong DB nên không có cách biết video nào còn dùng -> không đụng tới
export const deleteOrphanUploads = async (olderThanHours: number) => {
  const cutoff = Date.now() - olderThanHours * 60 * 60 * 1000
  let deleted = 0
  const oldFiles = async (dir: string) => {
    const entries = await fs.promises.readdir(dir, { withFileTypes: true }).catch(() => [])
    const result: string[] = []
    for (const entry of entries) {
      if (!entry.isFile() || entry.name.startsWith('.')) continue
      const stat = await fs.promises.stat(path.join(dir, entry.name)).catch(() => undefined)
      if (stat && stat.mtimeMs < cutoff) result.push(entry.name)
    }
    return result
  }
  const remove = async (dir: string, name: string) => {
    try {
      await fs.promises.unlink(path.join(dir, name))
      deleted++
    } catch (error) {
      if ((error as NodeJS.ErrnoException)?.code !== 'ENOENT')
        logger.warn('không xoá được file upload mồ côi', { name, error })
    }
  }

  //thư mục tạm: file ở đây là upload dở dang / lỗi, quá hạn thì xoá
  for (const name of await oldFiles(UPLOAD_IMAGE_TEMP_DIR)) await remove(UPLOAD_IMAGE_TEMP_DIR, name)

  const candidates = await oldFiles(UPLOAD_IMAGE_DIR)
  const BATCH = 500
  for (let i = 0; i < candidates.length; i += BATCH) {
    const names = candidates.slice(i, i + BATCH)
    const rows = await databaseService.$queryRaw<{ name: string }[]>`
      SELECT DISTINCT substring(u FROM '/static/image/([^/?#]+)$') AS name
      FROM (
        SELECT unnest(images) AS u FROM products
        UNION ALL SELECT avatar FROM users
        UNION ALL SELECT cover_photo FROM users
        UNION ALL SELECT product_image FROM order_items
      ) refs
      WHERE u LIKE '%/static/image/%' AND substring(u FROM '/static/image/([^/?#]+)$') = ANY(${names}::text[])`
    const used = new Set(rows.map((row) => row.name))
    for (const name of names) if (!used.has(name)) await remove(UPLOAD_IMAGE_DIR, name)
  }
  return deleted
}

const mediasService = new MediasService()

export default mediasService
