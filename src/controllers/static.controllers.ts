import { Request, Response, NextFunction } from 'express'
import path from 'path'
import { UPLOAD_IMAGE_DIR, UPLOAD_VIDEO_DIR } from '~/constants/dir'
import HTTP_STATUS from '~/constants/httpStatus'
import fs from 'fs'
import mime from 'mime-types'
//chỉ cho phép đọc file nằm TRỰC TIẾP trong thư mục upload: namefile như "..%2F..%2F.env" bị từ chối
//(trả undefined nếu tên file không hợp lệ)
const safeFilePath = (dir: string, namefile: string) => {
  if (!namefile || namefile !== path.basename(namefile) || namefile.startsWith('.')) return undefined
  const filePath = path.resolve(dir, namefile)
  return path.dirname(filePath) === path.resolve(dir) ? filePath : undefined
}

const fileNotFound = (res: Response) => res.status(HTTP_STATUS.NOT_FOUND).json({ message: 'File not found' })

//image
export const serveImageController = (
  req: Request, //
  res: Response,
  next: NextFunction
) => {
  //người dùng gửi lên filename qua param
  const filePath = safeFilePath(UPLOAD_IMAGE_DIR, req.params.namefile)
  if (!filePath) return void fileNotFound(res)
  //gửi cho người ta cái file trong upload dir này
  res.sendFile(filePath, (error) => {
    if (error) fileNotFound(res)
  })
}

//video - full video
export const serveVideoController = (
  req: Request, //
  res: Response,
  next: NextFunction
) => {
  //người dùng gửi lên filename qua param
  const filePath = safeFilePath(UPLOAD_VIDEO_DIR, req.params.namefile)
  if (!filePath) return void fileNotFound(res)
  //gửi cho người ta cái file trong upload dir này
  res.sendFile(filePath, (error) => {
    if (error) fileNotFound(res)
  })
}

//streaming - từng khúc
export const serveVideoStreamController = async (
  req: Request, //
  res: Response,
  next: NextFunction
) => {
  const range = req.headers.range //lấy cái range trong headers

  const videoPath = safeFilePath(UPLOAD_VIDEO_DIR, req.params.namefile) //đường dẫn tới file video
  if (!videoPath || !fs.existsSync(videoPath)) return void fileNotFound(res)
  //nếu k có range thì báo lỗi, đòi liền
  if (!range) {
    res.status(HTTP_STATUS.BAD_REQUEST).send('Require range header')
  } else {
    //1MB = 10^6 byte (tính theo hệ 10, đây là mình thấy trên đt,UI)
    //tính theo hệ nhị là 2^20 byte (1024*1024)
    //giờ ta lấy dung lượng của video
    const videoSize = fs.statSync(videoPath).size //ở đây tính theo byte
    //dung lượng cho mỗi phân đoạn muốn stream
    const CHUNK_SIZE = 10 ** 6 //10^6 = 1MB
    //lấy giá trị byte bắt đầu từ header range (vd: bytes=8257536-29377173/29377174)
    //8257536 là cái cần lấy
    const start = Number(range.replace(/\D/g, '')) //lấy số đầu tiên từ còn lại thay bằng ''

    //lấy giá trị byte kết thúc-tức là khúc cần load đến
    const end = Math.min(start + CHUNK_SIZE, videoSize - 1) //nếu (start + CHUNK_SIZE) > videoSize thì lấy videoSize
    //dung lượng sẽ load thực tế
    const contentLength = end - start + 1 //thường thì nó luôn bằng CHUNK_SIZE, nhưng nếu là phần cuối thì sẽ nhỏ hơn

    const contentType = mime.lookup(videoPath) || 'video/*' //lấy kiểu file, nếu k đc thì mặc định là video/*
    const headers = {
      'Content-Range': `bytes ${start}-${end}/${videoSize}`, //end-1 vì nó tính từ 0
      'Accept-Ranges': 'bytes',
      'Content-Length': contentLength,
      'Content-Type': contentType
    }
    res.writeHead(HTTP_STATUS.PARTIAL_CONTENT, headers) //trả về phần nội dung
    //khai báo trong httpStatus.ts PARTIAL_CONTENT = 206: nội dung bị chia cắt nhiều đoạn
    const videoStreams = fs.createReadStream(videoPath, { start, end }) //đọc file từ start đến end
    videoStreams.pipe(res)
    //pipe: đọc file từ start đến end, sau đó ghi vào res để gữi cho client
  }
}
