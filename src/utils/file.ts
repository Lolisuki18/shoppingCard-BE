import fs from 'fs' // giúp cho mình thao tác file|folder trong hệ thống của mình
import { Request } from 'express'
import formidable, { File } from 'formidable'

import { UPLOAD_IMAGE_TEMP_DIR, UPLOAD_VIDEO_DIR, UPLOAD_VIDEO_TEMP_DIR } from '~/constants/dir'
//initFolder : hàm kiểm tra xem có folder upload không?
//nếu k có thì nó tạo giúp
export const initFolder = () => {
  //lấy đường dẫn từ góc hệ thống vào uploads
  // const uploadsFolderPath = path.resolve('uploads')
  //nếu mà đường dẫn k dẫn tới thư mục thì anh em mình tạo mới
  // if (!fs.existsSync(uploadsFolderPath)) {
  //   //trong quá trình tạo mong chờ mình đợi nên thêm Sync
  //   //bỏ vô thì nó sẽ tạo cho mình
  //   fs.mkdirSync(uploadsFolderPath, {
  //     recursive: true // nếu như trong tương lai có thể tạo các thư mục lòng vào nhau (bên trong thư mục này có thư mục khác) sẽ được cho phép
  //   })

  //tạo ra 1 cái mảng chạy con forEach thì sau này nếu thêm chỉ cần thêm phần tử vào mảng
  //tránh bị lặp code
  ;[UPLOAD_IMAGE_TEMP_DIR, UPLOAD_VIDEO_TEMP_DIR].forEach((dir) => {
    if (!fs.existsSync(dir)) {
      //trong quá trình tạo mong chờ mình đợi nên thêm Sync
      //bỏ vô thì nó sẽ tạo cho mình
      fs.mkdirSync(dir, {
        recursive: true // nếu như trong tương lai có thể tạo các thư mục lòng vào nhau (bên trong thư mục này có thư mục khác) sẽ được cho phép
      })
    }
  })
}
//handleUploadSingleImage: là hàm nhận vào req và ép đi qua lưới lọc của formidable để lấy các file
//  và mình chỉ lấy các file nào là ảnh mà thôi
export const handleUploadImage = async (req: Request) => {
  //tạo lưới lọc
  const form = formidable({
    uploadDir: UPLOAD_IMAGE_TEMP_DIR, //nơi sẽ lưu nếu vượt qua kiểm duyệt
    maxFiles: 4, // tối đa 4 file(bức hình,...)
    maxFileSize: 1024 * 300 * 4, //tối đa 4 hình không quá 300kb
    keepExtensions: true, // giữ lại đuôi file
    //xài option filter để kiểm tra file có phải là image không
    filter: ({ name, originalFilename, mimetype }) => {
      //name: name|key được truyền  vào trong <input name = 'blabla'>
      //originalFilename: tên file gốc// tên gốc của file
      //mimetype: kiểu file : kiểu file vd : image/png || là định dạng kiểu của file
      // console.log(name, originalFilename, mimetype) //log để xem
      const valid = name === 'image' && Boolean(mimetype?.includes('image/'))
      //mimetype? nếu là string thì check, k thì thôi
      //ép Boolean luôn, nếu k thì valid sẽ là boolean | undefied -> vì mimetype có thể có hoặc không

      //phải gửi file trong field có name là image và kiểu file là image luôn
      //nếu ko valid thì mình bắn lỗi về
      //nếu sai valid thì xài form.emit để gửi lỗi
      if (!valid) {
        //emit mang ý nghĩa là truyền tin 1 cái lỗi xuống
        form.emit('error' as any, new Error('File type is not valid') as any)
        //as any vì bug này formidable chưa fix, khi nào hết thì bỏ ra
      }
      //nếu đúng thì return valid
      return valid
    }
  })

  //chuyển form.parse về thành promise
  //files là object có dạng giống hình test cuối cùng
  //lần 2 thì đầu ra object File

  //xài form vừa tạo
  // đa số hành động .parse sẽ tốn thời gian -> nhưng hàm mà có xu hướng gọi call back thì mình sẽ biến nó thành Promise
  return new Promise<File[]>((resolve, reject) => {
    form.parse(req, (err, fields, files) => {
      if (err) return reject(err) //để ý dòng này
      //nếu có lỗi thì sẽ throw ra reject

      //nếu files từ req gửi lên ko có key image thì reject
      if (!files.image) {
        return reject(new Error('Image is empty'))
      }
      return resolve(files.image as File[])
      //hứa lại đưa thành mảng các file
      //files.image là array, lấy phần tử đầu tiên
      //mình chỉ lấy đúng thông tin của những bức hình thôi
    })
  })
}

//viết hàm khi nhân filename: abv.png thì cchir lấy abv để sau này mình gắn đuổi .jpeg vào
//hàm tiện ích, nhận vào filename: adcadc.png
//lấy adcadc bỏ .png để sau này thêm .jpeg vào
export const getNameFromFullNameFile = (filename: string) => {
  const nameArr = filename.split('.')
  //có thể sẽ có rất nhiều . -> cái cuối cùng mới là cái mình cần bỏ đi
  //ví dụ sang.anh1.ninh.png
  //nên mình chỉ xoá phần tử cuối cùng -> dùng lệnh pop
  nameArr.pop() // xoá phần tử cuối cùng, tức là xoá đuôi .png
  //sau khi bỏ thằng cuối xong thì gom lại
  return nameArr.join('-') // nối lại chuỗi
  // sau thì sang-anh1-ninh
}

//hàm giữ lại phần đuôi video
export const getExtendsion = (filename: string) => {
  const nameArr = filename.split('.')
  return nameArr.pop() // pop là xoá và trả ra phần tử bị xoá(pt cuối)
}

// handle upload video
export const handleUploadVideo = async (req: Request) => {
  //tạo lưới lọc
  const form = formidable({
    //có thể optimize video -> lên npm kiếm
    uploadDir: UPLOAD_VIDEO_DIR, //nơi sẽ lưu nếu vượt qua kiểm duyệt -> video ko có optimize mình sẽ ko lưu zo temp
    maxFiles: 1, // tối đa 1 file(video)
    maxFileSize: 1024 * 1024 * 50, // chất lượng HD nhưng chỉ 50mb
    keepExtensions: true, // giữ lại đuôi file
    //xài option filter để kiểm tra file có phải là image không
    filter: ({ name, originalFilename, mimetype }) => {
      //name: name|key được truyền  vào trong <input name = 'blabla'>
      //originalFilename: tên file gốc// tên gốc của file
      //mimetype: kiểu file : kiểu file vd : image/png || là định dạng kiểu của file
      // console.log(name, originalFilename, mimetype) //log để xem
      const valid = name === 'video' && Boolean(mimetype?.includes('video/'))
      //mimetype? nếu là string thì check, k thì thôi
      //ép Boolean luôn, nếu k thì valid sẽ là boolean | undefied -> vì mimetype có thể có hoặc không

      //phải gửi file trong field có name là image và kiểu file là image luôn
      //nếu ko valid thì mình bắn lỗi về
      //nếu sai valid thì xài form.emit để gửi lỗi
      if (!valid) {
        //emit mang ý nghĩa là truyền tin 1 cái lỗi xuống
        form.emit('error' as any, new Error('File type is not valid') as any)
        //as any vì bug này formidable chưa fix, khi nào hết thì bỏ ra
      }
      //nếu đúng thì return valid
      return valid
    }
  })

  //chuyển form.parse về thành promise
  //files là object có dạng giống hình test cuối cùng
  //lần 2 thì đầu ra object File

  //xài form vừa tạo
  // đa số hành động .parse sẽ tốn thời gian -> nhưng hàm mà có xu hướng gọi call back thì mình sẽ biến nó thành Promise
  return new Promise<File[]>((resolve, reject) => {
    form.parse(req, (err, fields, files) => {
      if (err) return reject(err) //để ý dòng này
      //nếu có lỗi thì sẽ throw ra reject

      //nếu files từ req gửi lên ko có key image thì reject
      if (!files.video) {
        return reject(new Error('Video is empty'))
      }
      return resolve(files.video as File[])
      //hứa lại đưa thành mảng các file
      //files.image là array, lấy phần tử đầu tiên
      //mình chỉ lấy đúng thông tin của những bức hình thôi
    })
  })
}
