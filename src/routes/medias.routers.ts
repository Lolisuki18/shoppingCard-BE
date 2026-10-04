import { Router } from 'express'
import { uploadImageController, uploadVideoController } from '~/controllers/medias.controllers'
import { accessTokenValidation } from '~/middlewares/users.middlewares'
import { wrapAsync } from '~/utils/handlers'
const mediaRouter = Router()

//set up route
//upload image
mediaRouter.post('/upload-image', accessTokenValidation, wrapAsync(uploadImageController))

//upload video
mediaRouter.post('/upload-video', accessTokenValidation, wrapAsync(uploadVideoController))
//mình công khai cái thư mục này
// mediaRouter.use('/', express.static(UPLOAD_IMAGE_DIR)) -> ko dùng cách này vì nó ko có tốt

export default mediaRouter
