//userService chứa các method giúp xử lý liên quan đến bảng users
import { randomUUID } from 'crypto'
import databaseService from './database.services'
import { LoginReqBody, RegisterReqBody, UpdateMeReqBody } from '~/models/requests/User.requests'
import { comparePassword, hashPassword } from '~/utils/crypto'
import { signToken } from '~/utils/jwt'
import { TokenType, UserVerifyStatus } from '~/constants/enums'
import { ErrorWithStatus } from '~/models/Errors'
import HTTP_STATUS from '~/constants/httpStatus'
import { AUTH_MESSAGES, USERS_MESSAGES } from '~/constants/messages'
import mailServices from './mail.services'
import dotenv from 'dotenv'
dotenv.config()

//những cột nhạy cảm không bao giờ được trả ra cho client
const SENSITIVE_FIELDS = {
  password: true,
  email_verify_token: true,
  forgot_password_token: true
} as const

//payload là cái kiện dữ liệu và mình sẽ mô tả trong đó
class UsersServices {
  //viết hàm dùng jwt để ký access_token
  private signAccessToken(user_id: string) {
    return signToken({
      payload: { user_id, token_type: TokenType.AccessToken },
      privateKey: process.env.JWT_SECRET_ACCESS_TOKEN as string,
      options: { expiresIn: process.env.ACCESS_TOKEN_EXPIRE_IN }
    })
  }
  //viết hàm dùng jwt để ký Refresh_token
  private signRefreshToken(user_id: string) {
    //-> signToken là promise mà mình ko đợi awai .. -> SignRefreshToken cũng trở thành Promise luôn
    //jti ngẫu nhiên để 2 token ký trong cùng 1 giây vẫn khác nhau (cột token là UNIQUE)
    return signToken({
      payload: { user_id, token_type: TokenType.RefreshToken, jti: randomUUID() },
      privateKey: process.env.JWT_SECRET_REFRESH_TOKEN as string,
      options: { expiresIn: process.env.REFRESH_TOKEN_EXPIRE_IN }
    })
  }
  //Viêt hàm dùng jwt để ký email_verify_token
  private signEmailVerifyToken(user_id: string) {
    return signToken({
      payload: { user_id, token_type: TokenType.EmailVerificationToken },
      privateKey: process.env.JWT_SECRET_EMAIL_VERIFY_TOKEN as string,
      options: { expiresIn: process.env.EMAIL_VERIFY_TOKEN_EXPIRE_IN }
    })
  }
  //viết hàm dùng jwt để ký forgot_password_token
  private signForgotPasswordToken(user_id: string) {
    return signToken({
      payload: { user_id, token_type: TokenType.ForgotPasswordToken },
      privateKey: process.env.JWT_SECRET_FORGOT_PASSWORD_TOKEN as string,
      options: { expiresIn: process.env.FORGOT_PASSWORD_TOKEN_EXPIRE_IN }
    })
  }

  //ký cặp access_token + refresh_token và lưu refresh_token vào database
  private async signAndSaveTokens(user_id: string) {
    // -> dùng Promise.all để ký 1 phát 2 cái luôn ko cần đợi nhau -> làm nhìu tác vụ bất đồng bộ trong cùng 1 lúc
    const [access_token, refresh_token] = await Promise.all([
      this.signAccessToken(user_id),
      this.signRefreshToken(user_id)
    ])
    //1 người dùng có thể có rất nhiều rf (đăng nhập nhiều thiết bị)
    await databaseService.refreshTokens.create({ data: { token: refresh_token, user_id } })
    return { access_token, refresh_token }
  }

  //hàm dùng để check refresh token
  async checkRefreshToken({ user_id, refresh_token }: { user_id: string; refresh_token: string }) {
    const refreshToken = await databaseService.refreshTokens.findFirst({
      where: { user_id, token: refresh_token }
    })
    if (!refreshToken) {
      throw new ErrorWithStatus({
        status: HTTP_STATUS.UNAUTHORIZED, //401
        message: USERS_MESSAGES.REFRESH_TOKEN_IS_INVALID
      })
    }
    return refreshToken
  }
  //hàm check email
  async checkEmailExist(email: string) {
    //vào database và tìm user sở hữu email đó nếu có thì nghĩa là có người xài rồi
    const user = await databaseService.users.findUnique({ where: { email }, select: { id: true } })
    return Boolean(user) // ép kiểu user thành dạng boolean
  }

  //hàm tìm user bằng userid
  async findUserById(user_id: string) {
    const user = await databaseService.users.findUnique({ where: { id: user_id } })
    if (!user) {
      throw new ErrorWithStatus({
        status: HTTP_STATUS.NOT_FOUND, //404
        message: USERS_MESSAGES.USER_NOT_FOUND
      })
    }
    //nếu có thì
    return user
  }
  //đăng ký
  async register(payload: RegisterReqBody) {
    //tạo trước luôn user ID -> dùng để ký email_verify_token ngay từ đầu
    //-> mỗi người dùng sẽ chỉ cần verify 1 lần
    const user_id = randomUUID()
    const email_verify_token = await this.signEmailVerifyToken(user_id)
    await databaseService.users.create({
      data: {
        id: user_id,
        name: payload.name,
        email: payload.email,
        username: `user${user_id}`, // tạo thêm prop username vào
        email_verify_token,
        password: await hashPassword(payload.password),
        //date_of_birth gửi lên là string nên phải đổi sang Date
        date_of_birth: new Date(payload.date_of_birth)
      }
    })
    //sau khi tạo tài khoản và lưu lên database ta sẽ ký ac và rf token để đưa cho người dùng
    const tokens = await this.signAndSaveTokens(user_id)

    //gửi email_verify_token vào email của người đăng ký (không chờ: gửi lỗi cũng không làm đăng ký thất bại)
    void mailServices.sendVerifyEmail(payload.email, payload.name, email_verify_token)
    return tokens
  }
  //hàm đăng nhập
  async login({ email, password }: LoginReqBody) {
    //bcrypt có salt ngẫu nhiên nên không thể tìm bằng hash được -> tìm theo email rồi so sánh password
    const user = await databaseService.users.findUnique({
      where: { email },
      select: { id: true, password: true, verify: true }
    })

    if (!user || !(await comparePassword(password, user.password))) {
      throw new ErrorWithStatus({
        status: HTTP_STATUS.UNPROCESSABLE_ENTITY, //422
        message: USERS_MESSAGES.EMAIL_OR_PASSWORD_IS_INCORRECT
      })
    }
    //tài khoản bị khoá không được đăng nhập (kiểm tra sau khi đúng mật khẩu để không lộ trạng thái tài khoản cho người lạ)
    if (user.verify === UserVerifyStatus.Banned) {
      throw new ErrorWithStatus({ status: HTTP_STATUS.FORBIDDEN, message: AUTH_MESSAGES.ACCOUNT_IS_BANNED })
    }
    //nếu có user thì tạo at và rf
    return this.signAndSaveTokens(user.id)
    // tất cả đều phải là Object
  }
  //hàm đăng xuất
  async logout(refresh_token: string) {
    await databaseService.refreshTokens.deleteMany({ where: { token: refresh_token } })
  }
  //hàm check email verify
  async checkEmailVerifyToken({ user_id, email_verify_token }: { user_id: string; email_verify_token: string }) {
    //tìm xem user nào có sở hữu 2 thông tin này cùng lúc -> nếu có thì nghĩa là token hợp lệ
    //nếu ko có nghĩa là token đã bị thay thế rồi
    const user = await databaseService.users.findFirst({
      where: { id: user_id, email_verify_token }
    })
    //nếu k tìm được thì  có nghĩa là token này đã bị thay thế
    if (!user) {
      throw new ErrorWithStatus({
        status: HTTP_STATUS.UNPROCESSABLE_ENTITY, //422
        message: USERS_MESSAGES.EMAIL_VERIFY_TOKEN_IS_INVALID
      })
    }
    //nếu có thì
    return user
  }
  //gọi hàm này khi đã kiểm tra email_verify_token đúng mã
  // đúng người dùng
  async verifyEmail(user_id: string) {
    //cập nhập trạng thái trong account (updated_at tự cập nhật nhờ @updatedAt)
    await databaseService.users.update({
      where: { id: user_id },
      data: { verify: UserVerifyStatus.Verified, email_verify_token: '' }
    })
    //ký lại access và rf
    return this.signAndSaveTokens(user_id)
  }

  //gửi lại link verifyEmail
  async resendEmailVerify(user_id: string) {
    const email_verify_token = await this.signEmailVerifyToken(user_id)
    //lưu vào lại database
    const user = await databaseService.users.update({
      where: { id: user_id },
      data: { email_verify_token },
      select: { email: true, name: true }
    })
    void mailServices.sendVerifyEmail(user.email, user.name, email_verify_token)
  }
  //forgot Password
  async forgotPassword(email: string) {
    //dùng email tìm user lấy id tạo forgot_password_token
    const user = await databaseService.users.findUnique({ where: { email }, select: { id: true, name: true } })
    if (user) {
      //ký forgot_password_token
      const forgot_password_token = await this.signForgotPasswordToken(user.id)
      //lưu vào database
      await databaseService.users.update({
        where: { id: user.id },
        data: { forgot_password_token }
      })
      //gửi link đặt lại mật khẩu (trỏ về FE) cho người dùng
      void mailServices.sendForgotPassword(email, user.name, forgot_password_token)
    }
  }
  //reset password
  async resetPassword({ user_id, password }: { user_id: string; password: string }) {
    //tìm user có user_id này và cập nhập password
    await databaseService.users.update({
      where: { id: user_id },
      data: { password: await hashPassword(password), forgot_password_token: '' }
    })
  }
  //get me
  async getMe(user_id: string) {
    const user = await databaseService.users.findUnique({
      where: { id: user_id },
      //omit giúp loại bỏ các thuộc tính như password, email_verify_token, forgot_password_token
      omit: SENSITIVE_FIELDS
    })
    if (!user) {
      throw new ErrorWithStatus({
        status: HTTP_STATUS.NOT_FOUND,
        message: USERS_MESSAGES.USER_NOT_FOUND
      })
    }
    // sẽ ko có những thuộc tính nêu trên , tránh bị lộ thông tin
    return user
  }

  //update me
  //do req.body có quá nhiều thông tin thì đặt tên là payload,
  async updateMe({
    user_id,
    payload
  }: {
    user_id: string //
    payload: UpdateMeReqBody
  }) {
    //trong payload có 2 trường dữ liệu cần xử lý
    //date_of_birth
    //_ là ám chỉ cho việc nó private
    const _payload = payload.date_of_birth ? { ...payload, date_of_birth: new Date(payload.date_of_birth) } : payload // không biết lúc cập nhập thông tin m có gửi lên date_if_birth cho t hay không ?
    //nếu có thì chuyển qua kiểu date còn ko thì cứ bt

    //username
    if (_payload.username) {
      //nếu có thì tìm xem có ai giống không? có ai bị trùng không ?
      const user = await databaseService.users.findUnique({
        where: { username: _payload.username },
        select: { id: true }
      })
      if (user) {
        throw new ErrorWithStatus({
          status: HTTP_STATUS.UNPROCESSABLE_ENTITY,
          message: USERS_MESSAGES.USERNAME_ALREADY_EXISTS
        })
      }
    }
    //nếu userName truyền lên mà không có người trùng thì ok -> mình bắt đầu cập nhập
    // trả về người dùng đã update, loại bỏ những thông tin nhạy cảm
    return databaseService.users.update({
      where: { id: user_id },
      data: _payload,
      omit: SENSITIVE_FIELDS
    })
  }

  //changepassword
  async changePassword({
    user_id,
    old_password,
    password
  }: {
    user_id: string
    old_password: string
    password: string
  }) {
    //tìm user bằng id rồi so sánh old_password với hash đã lưu
    const user = await databaseService.users.findUnique({
      where: { id: user_id },
      select: { password: true }
    })
    //nếu ko có user nào khớp thì mình throw lỗi
    if (!user || !(await comparePassword(old_password, user.password))) {
      throw new ErrorWithStatus({
        status: HTTP_STATUS.UNAUTHORIZED, //401
        message: USERS_MESSAGES.USER_NOT_FOUND
      })
    }
    //nếu có thì cập nhập lại password đã hash
    await databaseService.users.update({
      where: { id: user_id },
      data: { password: await hashPassword(password) }
    })
    //nếu muốn nta đổi mk xong tự đăng nhập luôn thì trả về rf và ac token
    //nhưng ở đây mình chỉ cho người ta đổi mk thôi , nên trả về message
  }

  //refresh token
  async refreshToken({
    user_id,
    refresh_token //
  }: {
    user_id: string
    refresh_token: string
  }) {
    //tài khoản bị khoá thì không cấp token mới nữa
    const account = await databaseService.users.findUnique({ where: { id: user_id }, select: { verify: true } })
    if (account?.verify === UserVerifyStatus.Banned) {
      await databaseService.refreshTokens.deleteMany({ where: { user_id } })
      throw new ErrorWithStatus({ status: HTTP_STATUS.FORBIDDEN, message: AUTH_MESSAGES.ACCOUNT_IS_BANNED })
    }
    // tạo 2 ac và rf(chưa tính đến vấn đề nó sẽ bị route timing)
    const [access_token, new_refresh_token] = await Promise.all([
      this.signAccessToken(user_id),
      this.signRefreshToken(user_id)
    ])
    //xoá mã cũ và lưu mã mới trong 1 transaction để không bị mất/dư token nếu 1 trong 2 thất bại
    await databaseService.$transaction([
      databaseService.refreshTokens.deleteMany({ where: { token: refresh_token } }),
      databaseService.refreshTokens.create({ data: { token: new_refresh_token, user_id } })
    ])
    //ném ra ac và rf mới
    return {
      access_token,
      refresh_token: new_refresh_token
    }
  }
}

//chơi với database phải await async vì nó sẽ tốn thời gian
let usersServices = new UsersServices()
export default usersServices
