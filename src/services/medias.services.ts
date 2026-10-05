import { Request } from 'express'
import sharp from 'sharp'
import { UPLOAD_IMAGE_DIR } from '~/constants/dir'
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

const mediasService = new MediasService()

export default mediasService
