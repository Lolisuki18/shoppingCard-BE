//định nghĩa lại tất cả các thư viện của mình nếu cần
// định nghĩa lại các interface trong thư viện của mình nếu mình cần
import { Request } from 'express'
import { TokenPayLoad } from './models/requests/User.requests'
declare module 'express' {
  interface Request {
    request_id?: string
    decode_authorization?: TokenPayLoad
    decode_refresh_token?: TokenPayLoad
    decode_email_verify_token?: TokenPayLoad
    decode_forgot_password_token?: TokenPayLoad
    //người dùng hiện tại (lấy từ database nên role/verify luôn mới nhất), do auth.middlewares gắn vào
    current_user?: { id: string; role: number; verify: number }
  }
}
