//controller là tầng xử lý logic và call database thông qua services
import { NextFunction, Request, Response } from 'express'
import {
  ChangePasswordReqBody,
  emailVerifyReqQuery,
  ForgotPasswordReqBody,
  LoginReqBody,
  LogoutReqBody,
  RefreshTokenReqBody,
  RegisterReqBody,
  ResetPasswordReqBody,
  TokenPayLoad,
  UpdateMeReqBody,
  VerifyForgotPasswordReqBody
} from '~/models/requests/User.requests'
import usersServices from '~/services/users.services'
import { ParamsDictionary } from 'express-serve-static-core'
import { ErrorWithStatus } from '~/models/Errors'
import HTTP_STATUS from '~/constants/httpStatus'
import { USERS_MESSAGES } from '~/constants/messages'
import { UserVerifyStatus } from '~/constants/enums'

// export const loginController = (req: Request, res: Response) => {
//   //thêm tý logic trước khi trả kq cho người dùng
//   const { email, password } = req.body
//   //mình sẽ xà lơ 1 tí vì mình chưa có database
//   //nên mình sẽ kiểm tra người ta 1 password nào đó
//   // khi nào có database thì mình lên services kiểm tra
//   if (email === 'lolisuki18@gmail.com' && password === 'weArePiedTeam') {
//     res.json({
//       data: {
//         fname: 'Lolisuki',
//         yob: 1989
//       }
//     })
//   } else {
//     res.status(400).json({
//       message: 'Invalid email or password'
//     })
//   }
// }

//422 : là lỗi đưa thiếu
//400: là đưa sai

//request được cấu tạo từ rất nhìu thứ -> muốn cấu hình lại thì mình phải <> rồi định nghĩa lại
//-> sờ zo Request rồi định nghĩa lần lượt

//-Định nghĩa ParamsDictionary bằng cách ấn zo Request -> ấn zo   ParamsDictionary  -> thấy nó export Param thì lấy cái đường path chỗ đó
//-> chạy tới cây thư mục đó -> rồi copy path nó rồi đem lên trên import
// vì Param ko phải default nên phải import trong ngoặc nhọn

//phải định nghĩa lại thì khi req.body nó mới xổ ra cho mình
//route này nhận vào email và password để tạo tài khoản cho mình
export const registerController = async (
  req: Request<ParamsDictionary, any, RegisterReqBody>,
  res: Response,
  next: NextFunction
) => {
  //lấy email và password từ req.body mà người dùng muốn đăng ký tài khoản
  const { email } = req.body
  //phải định nghĩa req.body
  //tạo User và lưu vào database
  //chơi với database hay try cactch vào phòng rớt mạng
  //kiểm tra xem email đã có trong database hay chưa ?

  const isEmailExits = await usersServices.checkEmailExist(email)
  if (isEmailExits) {
    throw new ErrorWithStatus({
      status: HTTP_STATUS.CONFLICT, //409 (trước đây trả 401 làm FE tưởng hết phiên đăng nhập)
      message: USERS_MESSAGES.EMAIL_ALREADY_EXISTS
    })
  }
  const result = await usersServices.register(req.body)
  //nếu thành công
  res.status(HTTP_STATUS.CREATED).json({
    message: USERS_MESSAGES.REGISTER_SUCCESS,
    result
  })
}

//-> cái gì nhìu lần mình bỏ zo hàm
export const loginController = async (
  req: Request<ParamsDictionary, any, LoginReqBody>,
  res: Response,
  next: NextFunction
) => {
  //cần lấy email và password để tìm xem user nào đang sở hữu
  //nếu ko có user nào thì ngừng cuộc chơi
  //còn nếu có gì tạo access và rf token cho người ta
  const { email, password } = req.body
  const result = await usersServices.login({ email, password })
  res.status(HTTP_STATUS.OK).json({
    message: USERS_MESSAGES.LOGIN_SUCCESS,
    result // ac rf
  })
}

export const logoutController = async (
  req: Request<ParamsDictionary, any, LogoutReqBody>,
  res: Response,
  next: NextFunction
) => {
  //xem thử user_id trong payload của refresh_token và acccess_token có giống không ?
  const { refresh_token } = req.body
  const { user_id: user_id_at } = req.decode_authorization as TokenPayLoad
  const { user_id: user_id_rf } = req.decode_refresh_token as TokenPayLoad

  if (user_id_at != user_id_rf) {
    throw new ErrorWithStatus({
      status: HTTP_STATUS.UNAUTHORIZED, //401
      message: USERS_MESSAGES.REFRESH_TOKEN_IS_INVALID
    })
  }
  //nếu mà tủng rồi thì mình xem thử refresh_token có đc quyền dùng dịch vụ không ?
  await usersServices.checkRefreshToken({
    user_id: user_id_at,
    refresh_token
  })
  //khi nào có mã đó trong database thì mình tiến hành logout(xoá rf khỏi hệ thống)
  await usersServices.logout(refresh_token)
  res.status(HTTP_STATUS.OK).json({
    message: USERS_MESSAGES.LOGOUT_SUCCESS
  })
}

export const emailVerifyController = async (
  req: Request<ParamsDictionary, any, any, emailVerifyReqQuery>,
  res: Response,
  next: NextFunction
) => {
  //định nghĩa lại req vì mình chưa định nghĩa phần query nên sẽ bị lỗi ở email_verify_token
  const { email_verify_token } = req.query
  const { user_id } = req.decode_email_verify_token as TokenPayLoad
  //kiểm tra xem user_id của token có khớp với lại email_verify_token
  //mà người dùng gửi lên không ?
  const user = await usersServices.checkEmailVerifyToken({ user_id, email_verify_token })
  if (user.verify === UserVerifyStatus.Banned) {
    res.status(HTTP_STATUS.ACCEPTED).json({
      message: USERS_MESSAGES.ACCOUNT_HAS_BEEN_BANNED
    })
  } else {
    //verify email
    const result = await usersServices.verifyEmail(user_id)
    //kết quả
    res.status(HTTP_STATUS.OK).json({
      message: USERS_MESSAGES.EMAIL_VERIFY_SUCCESS,
      result
    })
  }
}

export const resendEmailVarifyToken = async (
  req: Request<ParamsDictionary, any, any>,
  res: Response,
  next: NextFunction
) => {
  const { user_id } = req.decode_authorization as TokenPayLoad
  //Dùng user_id tìm thằng user đó
  const user = await usersServices.findUserById(user_id)
  //kiểm tra xem thằng user đó đã bị xoá khỏi hệ thống chưa
  //nếu user này đã verify rồi thì mình
  if (user.verify === UserVerifyStatus.Verified) {
    res.status(HTTP_STATUS.ACCEPTED).json({
      message: USERS_MESSAGES.EMAIL_HAS_BEEN_VERIFYED
    })
  } else if (user.verify === UserVerifyStatus.Banned) {
    res.status(HTTP_STATUS.ACCEPTED).json({
      message: USERS_MESSAGES.ACCOUNT_HAS_BEEN_BANNED
    })
  } else {
    //tiến hành tạo email_verify_token lưu và gửi lại cho người dùng
    await usersServices.resendEmailVerify(user_id)
    res.status(HTTP_STATUS.OK).json({
      message: USERS_MESSAGES.RESEND_EMAIL_SUCCESS
    })
  }
  //kiểm tra xem user đã verify chưa , chưa thì mới tạo token và send
}
//forgot password
export const forgotPasswordController = async (
  req: Request<ParamsDictionary, any, ForgotPasswordReqBody>,
  res: Response,
  next: NextFunction
) => {
  const { email } = req.body
  //dùng email để tìm user này là ai
  const hashUser = await usersServices.checkEmailExist(email)
  if (!hashUser) {
    throw new ErrorWithStatus({
      status: HTTP_STATUS.NOT_FOUND, //404
      message: USERS_MESSAGES.USER_NOT_FOUND
    })
  } else {
    //nếu có user từ email này thì mình tạo token và gửi link vào email cho nó
    await usersServices.forgotPassword(email)
    res.status(HTTP_STATUS.OK).json({
      message: USERS_MESSAGES.CHECK_EMAIL_TO_RESET_PASSWORD
    })
  }
}

//verify forgot password
export const verifyForgotPasswordTokenController = async (
  req: Request<ParamsDictionary, any, VerifyForgotPasswordReqBody>,
  res: Response,
  next: NextFunction
) => {
  //FE đã gửi lên forgot_password_token cho mình để kiểm tra xem forgot_password_token này còn hiệu lực không?
  //vậy thì mình chỉ cần tìm xem forgot_password_token và user_id trong payload
  //còn sỡ hữu không ?
  const { forgot_password_token } = req.body
  const { user_id } = req.decode_forgot_password_token as TokenPayLoad // as vì hệ thống ko biết trước đó mình có xử lý được hay không ?
  //tìm xem thử user đó có forgot_password_token này không ?
  const user = await usersServices.findUserById(user_id)
  if (!user) {
    throw new ErrorWithStatus({
      // thông thường thì sẽ không ai xoá 1 account khỏi hệ thống cả -> nên viết cho vui thôi
      status: HTTP_STATUS.NOT_FOUND,
      message: USERS_MESSAGES.USER_NOT_FOUND
    })
  }

  //kiểm tra account có bị ban hay không ? -> bị ban thì vẫn cho
  // if (user.verify === UserVerifyStatus.Banned) {
  //   throw new ErrorWithStatus({
  //     message: USERS_MESSAGES.ACCOUNT_HAS_BEEN_BANNED,
  //     status: HTTP_STATUS.UNAUTHORIZED
  //   })
  // }
  //nếu có user thì xem thử forgot_password_token có khớp trong user không ?
  if (user.forgot_password_token !== forgot_password_token) {
    throw new ErrorWithStatus({
      message: USERS_MESSAGES.FORGOT_PASSWORD_TOKEN_NOT_MATCH,
      status: HTTP_STATUS.UNAUTHORIZED
    })
  }
  //còn lại thì oke thôi
  //nếu đúng thì trả về thông báo cho FE
  res.status(HTTP_STATUS.OK).json({
    message: USERS_MESSAGES.VERIFY_FORGOT_PASSWORD_TOKEN_SUCCESS
  })
}

//reset password
export const resetPasswordController = async (
  req: Request<ParamsDictionary, any, ResetPasswordReqBody>,
  res: Response,
  next: NextFunction
) => {
  //FE đã gửi lên forgot_password_token cho mình để kiểm tra xem forgot_password_token này còn hiệu lực không?
  //vậy thì mình chỉ cần tìm xem forgot_password_token và user_id trong payload
  //còn sỡ hữu không ?

  const { forgot_password_token, password } = req.body
  const { user_id } = req.decode_forgot_password_token as TokenPayLoad // as vì hệ thống ko biết trước đó mình có xử lý được hay không ?
  //tìm xem thử user đó có forgot_password_token này không ?
  const user = await usersServices.findUserById(user_id)
  if (!user) {
    throw new ErrorWithStatus({
      // thông thường thì sẽ không ai xoá 1 account khỏi hệ thống cả -> nên viết cho vui thôi
      status: HTTP_STATUS.NOT_FOUND,
      message: USERS_MESSAGES.USER_NOT_FOUND
    })
  }

  //kiểm tra account có bị ban hay không ? -> bị ban thì vẫn cho
  // if (user.verify === UserVerifyStatus.Banned) {
  //   throw new ErrorWithStatus({
  //     message: USERS_MESSAGES.ACCOUNT_HAS_BEEN_BANNED,
  //     status: HTTP_STATUS.UNAUTHORIZED
  //   })
  // }
  //nếu có user thì xem thử forgot_password_token có khớp trong user không ?
  if (user.forgot_password_token !== forgot_password_token) {
    throw new ErrorWithStatus({
      message: USERS_MESSAGES.FORGOT_PASSWORD_TOKEN_NOT_MATCH,
      status: HTTP_STATUS.UNAUTHORIZED
    })
  }
  //còn lại thì oke thì cập nhập mật khẩu cho người ta
  await usersServices.resetPassword({ user_id, password })
  //nếu đúng thì trả về thông báo cho FE
  res.status(HTTP_STATUS.OK).json({
    message: USERS_MESSAGES.RESET_PASSWORD_SUCCESS
  })
}

//get me
export const getMeController = async (
  req: Request<ParamsDictionary, any, any>, //
  res: Response,
  next: NextFunction
) => {
  //trong cái access token mà người dùng gửi lên thì chắc mình sẽ có decode_authorization => tìm đc user_id =>user

  //middleware accessTOkenValidator đã chạy rồi nên ta có thể lấy được user_id từ decode_access_token
  const { user_id } = req.decode_authorization as TokenPayLoad
  //tìm user thông qua user_id này và trả ra thông tin của user đó
  //truy cập vào database nên ta sẽ code ở user severvie
  const userInfor = await usersServices.getMe(user_id)
  //hàm này ta chưa code nhưng nó dùng để tìm thông tin người dùng user_id
  res.status(HTTP_STATUS.OK).json({
    message: USERS_MESSAGES.GET_ME_SUCCESS,
    result: userInfor //as User
  })
}

//update me
export const updateMeController = async (
  req: Request<ParamsDictionary, any, UpdateMeReqBody>,
  res: Response,
  next: NextFunction
) => {
  //muốn người dùng gửi access_token để mình biết họ là ai
  const { user_id } = req.decode_authorization as TokenPayLoad
  const user = await usersServices.findUserById(user_id)
  // và họ còn gửi rất nhiều thông tin muốn update trong body
  if (user.verify !== UserVerifyStatus.Verified) {
    throw new ErrorWithStatus({
      status: HTTP_STATUS.UNAUTHORIZED,
      message: USERS_MESSAGES.EMAIL_HAS_BEEN_UNVERIFIED
    })
  }
  //tiến hành cập nhập bằng tất cả những gì mà client đã gửi vào body
  const { body } = req
  const userInfor = await usersServices.updateMe({ user_id, payload: body })
  res.status(HTTP_STATUS.OK).json({
    message: USERS_MESSAGES.UPDATE_PROFILE_SUCCESS,
    result: userInfor
  })
}

//change password
export const changePasswordController = async (
  req: Request<ParamsDictionary, any, ChangePasswordReqBody>,
  res: Response,
  next: NextFunction
) => {
  //lấy user_id từ decode_authorization
  const { user_id } = req.decode_authorization as TokenPayLoad
  //lấy old_password và password từ req.body
  const { old_password, password } = req.body
  //kiểm tra xem old_password có đúng với password có trong database không ?
  // xong rồi tiến hành đổi mật khẩu cho user của user_id này
  await usersServices.changePassword({
    user_id,
    old_password,
    password
  })
  //vừa tìm thấy thì update nếu có
  //thông báo
  res.status(HTTP_STATUS.OK).json({
    message: USERS_MESSAGES.CHANGE_PASSWORD_SUCCESS
  })
}

//refresh token
export const refreshTokenController = async (
  req: Request<ParamsDictionary, any, RefreshTokenReqBody>,
  res: Response,
  next: NextFunction
) => {
  // kiểm tra xem mã có trong database hay k (còn hiệu lực không ?)
  const { refresh_token } = req.body
  const { user_id } = req.decode_refresh_token as TokenPayLoad

  await usersServices.checkRefreshToken({ user_id, refresh_token })
  //tiền hành mình  tạo ac và rf mới
  const result = await usersServices.refreshToken({ user_id, refresh_token })

  res.status(HTTP_STATUS.OK).json({
    message: USERS_MESSAGES.REFRESH_TOKEN_SUCCESS,
    result
  })
}
