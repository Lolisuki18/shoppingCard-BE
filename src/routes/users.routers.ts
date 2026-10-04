import express from 'express'
import {
  changePasswordController,
  emailVerifyController,
  forgotPasswordController,
  getMeController,
  loginController,
  logoutController,
  refreshTokenController,
  registerController,
  resendEmailVarifyToken,
  resetPasswordController,
  updateMeController,
  verifyForgotPasswordTokenController
} from '~/controllers/users.controllers'
import { filterMiddleware } from '~/middlewares/common.middleware'
import {
  accessTokenValidation,
  changePasswordValidator,
  emailVerifyTokenValidation,
  forgotPasswordTokenValidator,
  forgotPasswordValidator,
  loginValidator,
  refreshTokenValidator,
  registerValidator,
  resetPasswordValidator,
  updateMeValidator
} from '~/middlewares/users.middlewares'
import { UpdateMeReqBody } from '~/models/requests/User.requests'
import { wrapAsync } from '~/utils/handlers'

const userRouter = express.Router()

// userRouter.use(
//   (req, res, next) => {
//     console.log('Time : ', Date.now())
//     return next() // -> phải đặt tới đc next thì mới chạy tới đc
//     // nếu next thì ko nên có  cái gì ở dưới nưuax
//     // res.status(400).send('not allowed') // khi trả lỗi thì nó vẫn sẽ đi -> mình phải thêm return vào để nó ko chạy xuống dưới
//     // console.log('Ahihi') -> ko có return là thằng này vãn chạy được ->nên tập thoái quen là luôn có return trước chữ next
//   },
//   (req, res, next) => {
//     console.log('Time2 : ', Date.now())
//     next()
//   }
// )  -> đây là middleware toàn cục -> là dù làm gì cũng sẽ đi qua cái middleware này -> nó là bắt buộc

//middleware ngoài nhận vào req và res còn nhận vào next nữa
//next có nghĩa là được cho phép đi tiếp  -> nếu ko có next thì sẽ ko đi tiếp đc
// => next được coi là cổng chặn

//=> sẽ đc có rất nhiều middleware nhưng chỉ được có 1 thằng cuối cùng
//  loginValidator là middleware cục bộ -> vào login thì mình mới đi qua cái này

//localhost::3000/users/login
/*
Description: Login a new user
Path: users/register
Method: POST
BODY:{
    name : string,
    email: string,
 
}*/
userRouter.post('/login', loginValidator, wrapAsync(loginController))

/*
Description: Register a new user
Path: users/register
Method: POST
BODY:{
    name : string,
    email: string,
    password: string,
    confirm_password: string
    date_of_birth: ISO8601 // một dạng chuỗi 
}

*/
// userRouter.post(
//   '/register',
//   registerValidator,
//   async (req, res, next) => {
//     console.log('request handler 1')
//     //next(new Error('Error from request handler 1')) // next(err) là hành động throw 1 cái lỗi -> nó sẽ đưa tới Error Hanler mà mình ko có thì nó sẽ đưa lỗi ra ngoài mà hình
//     // nếu next bên trong có nội dung thì nó sẽ tự hiểu nó là lỗi -> nó sẽ tự ném xuống tầng ErrorHandle gần nhất
//     //-> mà ko đi qua tầng tiếp theo
//     //-> chữ next() -> ship tới thằng middleware gần nhất
//     //-> nếu có lỗi next('nội dung') thì bay xuống chỗ middleware có err ErrorHanlde
//     //throw new Error(Erorr from request handler1) -> khác next vì sẽ ko dùng đc cho hàm async(bất đồng bộ)
//     //Next(err) chạy đc cả đồng bộ và bất đồng bộ
//     // try {
//     //   //call database xong bị bug
//     //   throw new Error('Error from request handler 1')
//     // } catch (error) {
//     //   next(error)
//     // }
//     // Promise.reject(new Error('Error from request handler 1')).catch((error) => next())
//     // Promise.reject(new Error('Error from request handler 1')).catch(next)
//   },
//   (req, res, next) => {
//     console.log('request handler 2')
//     next()
//   },
//   (req, res, next) => {
//     console.log('request handler 3')
//     res.json({
//       message: 'Successfully'
//     })
//   },
//   (err, req, res, next) => {
//     res.status(400).json({
//       message: err.message
//     })
//   }
// )

userRouter.post('/register', registerValidator, wrapAsync(registerController))

//middleware ko dungf async nhìu -> nhìu lỗi hay j mình cũng next()  nên dùng throw cũng bình thường

// người dùng muốn đăng nhập phải gửi thông tin đăng nhập qua body phải xài method post còn method get thì chỉ là lấy về mà ko có body
//những cái hàm xử lý đều có tên chung là handler
//ở giữa là middleware
// ở cuối là controller

/*
Description: Log out
Path: users/logout
Method: post
HEADER :{
    Authorization : 'Bearer <access_token>'
}
BODY:{
    refresh_token: stirng
}*/

userRouter.post('/logout', accessTokenValidation, refreshTokenValidator, wrapAsync(logoutController))

//userRouter.post('/me')
// zo database xuất hết thông tin nhưng ko xuất password

//những hoạt động bấm đường dẫn thường là method get
//bấm submit thường là method post
/*
Description: verify email => khi người dùng bấm vào link trong email thì họ sẽ gửi 
->email_verify_token thông qua query để mình kiểm tra, vậy thì trong query sẽ có token đó 
mình sẽ verify và lưu payload vào decode_email_verify_token 
->tạo ac và rf cho em đăng nhập(option)

Path: users/verify-email/?email_verify_token=stirng
Method: get 
*/
userRouter.get('/verify-email', emailVerifyTokenValidation, wrapAsync(emailVerifyController))

/*
Description : gửi lại link verify email khi người dùng ấn nút gửi lại email
path: users/resend-verify-email
method: post 
headers: {Authorization: 'Bearer <access_token>'}
*/
userRouter.post('/resend-verify-email', accessTokenValidation, wrapAsync(resendEmailVarifyToken))

/*
Description: thông báo bị quên mật khẩu, yêu cầu lấy lại -> gửi lên email
->sever kiểm tra email có tồn tại trong hệ thống không? -> gửi link khôi phục account qua email cho người dùng
method: post
path : users/forgot-password
body: {email: string}
*/
userRouter.post('/forgot-password', forgotPasswordValidator, wrapAsync(forgotPasswordController))

/*
  Description : verify link in email to reset password
  path: users/verify-forgot-password-token
  method : post
  body:{forgot_password_token : string}
*/
userRouter.post(
  '/verify-forgot-password',
  forgotPasswordTokenValidator, //
  wrapAsync(verifyForgotPasswordTokenController)
)
//reset-password
/*
  Desciption: reset password 
  path: reset-password
  method: post
  body:{
    password: string,
    confirm_password: string,
    forgot_password_token: string,
  }
*/
//lỗi 404 là thiếu dấu / chỗ đường đẫn
userRouter.post(
  '/reset-password',
  forgotPasswordTokenValidator, //hàm này kiểm tra forgot_password_token
  resetPasswordValidator, //kiểm tra password,confirm_password
  wrapAsync(resetPasswordController)
)

//get me

/*
  Description : in ra các thông tin của người dùng
  path : users/me
  method: post
  Header: {Authorization: Bearer <access_token>}
  body:{}
*/
userRouter.post('/me', accessTokenValidation, wrapAsync(getMeController))

//
/*
des: update profile của user
path: '/me'
method: patch
Header: {Authorization: Bearer <access_token>}
body: {
  name?: string
  date_of_birth?: Date
  bio?: string // optional
  location?: string // optional
  website?: string // optional
  username?: string // optional
  avatar?: string // optional
  cover_photo?: string // optional}
*/
//method patch -> truyền vào access và những thông tin mà mình muốn cập nhập -> thành chức năng cập nhập thông tin
userRouter.patch(
  '/me',
  filterMiddleware<UpdateMeReqBody>([
    'name',
    'date_of_birth',
    'bio',
    'location',
    'website',
    'avatar',
    'username',
    'cover_photo'
  ]),
  accessTokenValidation, //kiểm tra accessToken và biết ai muốn cập nhập
  updateMeValidator, //kiểm tra các trường dữ liệu(field) mà người dùng muốn cập nhập có hợp lệ không ?
  wrapAsync(updateMeController) // tiến hành cập nhập
)

/*
  Description: change password 
  path: '/change-password'
  method: PUT
  header: {
    Authorization: 'Bearer <access_token>'
  }
  body: {old_password: string, password: string, confirm_password: string}
*/
//bị object object
userRouter.put(
  '/change-password',
  accessTokenValidation, //kiểm tra acccessToken
  changePasswordValidator,
  wrapAsync(changePasswordController)
)

/*
  description: refresh-token
  khi mà access_token hết hạn thì dùng chức nằng này 
  path: users/refresh-token
  method: post
  body:{
    refresh_token:string
  }
*/

userRouter.post('/refresh-token', refreshTokenValidator, wrapAsync(refreshTokenController))

export default userRouter
