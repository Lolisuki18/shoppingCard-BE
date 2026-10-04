//import 3 interface giúp mô tả req , res, next do express cung cấp

import { Request } from 'express'
import { checkSchema, ParamSchema } from 'express-validator'
import { JsonWebTokenError } from 'jsonwebtoken'
import { capitalize } from 'lodash'
import HTTP_STATUS from '~/constants/httpStatus'
import { USERS_MESSAGES } from '~/constants/messages'
import { ErrorWithStatus } from '~/models/Errors'
import { verifyToken } from '~/utils/jwt'
import { validate } from '~/utils/validation'
import dotenv from 'dotenv'
import { REGEX_USERNAME } from '~/constants/regex'
dotenv.config()
//middleware giống như là 1 túi lọc, người dùng gửi request lên cho mình, mình sẽ ép req phải đi qua các middlewares để kiểm tra
// khi chạm vào next() thì sẽ chuyển sang phần tiếp theo

//Chơi với ts thì mọi biến là any mình mình phải định nghĩa những biến mình chuyền vào là gì
//-> Mình phải mô tả nó
// làm 1 middleware kiểm tra xem người dùng có gửi lên email và password không?

// export const loginValidator = (req: Request, res: Response, next: NextFunction) => {
//   //muốn xem body của request này có gì ?
//   console.log(req.body)
//   // lấy thủ trong request > trong body của request có email và password không ?
//   const { email, password } = req.body
//   //nếu ko có thì ko được đi tiếp
//   if (!email || !password) {
//     res.status(422).json({
//       error: 'Missing email or password'
//     }) //-> khi bắn dữ liệu về thì phải có lệnh return
//   }
//   next()
// }

//middlware ko được dùng để truy cập vào database để xem dữ liệu có đúng hay không? chỉ là kiểm tra nhập đúng kiểu hay ko?
// có nhập dữ liệu hay ko? hay bỏ trống?

//-> Ko được phép truy cập trực tiếp  vào database |
//-> chỉ có controller -> tầng severice mới được làm

// sẽ biến đổi registerValidator thành 1 cái middleware

//bản thân checkSchema đã là 1 cái middleware rồi nhưng nó ko tự trả ra lỗi được

//định nghĩa các kiểu Schema
const passwordSchema: ParamSchema = {
  notEmpty: {
    errorMessage: USERS_MESSAGES.PASSWORD_IS_REQUIRED
  },
  isString: {
    errorMessage: USERS_MESSAGES.PASSWORD_MUST_BE_A_STRING
  },
  isLength: {
    options: {
      // canh chỉ độ dài
      min: 8,
      max: 50
    },
    errorMessage: USERS_MESSAGES.PASSWORD_LENGTH_MUST_BE_FROM_8_TO_50
  },
  isStrongPassword: {
    options: {
      minLength: 8, // độ dài ngắn nhất
      minLowercase: 1, //ít nhất 1 kí tự tường
      minUppercase: 1, // ít nhất 1 kí tự hoa
      minNumbers: 1, // ít nhất có 1 số
      minSymbols: 1 //1 con kí tự đặc biệt
      //returnScore: true // trả về điểm mạnh yếu của password //-> ko nên đánh giá password người khác là tốt hay ko tốt
    },
    errorMessage: USERS_MESSAGES.PASSWORD_MUST_BE_STRONG
  }
}
const confirmPasswordSchema: ParamSchema = {
  notEmpty: {
    errorMessage: USERS_MESSAGES.CONFIRM_PASSWORD_IS_REQUIRED
  },
  isString: {
    errorMessage: USERS_MESSAGES.CONFIRM_PASSWORD_MUST_BE_A_STRING
  },
  isLength: {
    options: {
      // canh chỉ độ dài
      min: 8,
      max: 50
    },
    errorMessage: USERS_MESSAGES.CONFIRM_PASSWORD_LENGTH_MUST_BE_FROM_8_TO_50
  },
  isStrongPassword: {
    options: {
      minLength: 8, // độ dài ngắn nhất
      minLowercase: 1, //ít nhất 1 kí tự tường
      minUppercase: 1, // ít nhất 1 kí tự hoa
      minNumbers: 1, // ít nhất có 1 số
      minSymbols: 1 //1 con kí tự đặc biệt
      //returnScore: true // trả về điểm mạnh yếu của password //-> ko nên đánh giá password người khác là tốt hay ko tốt
    },
    errorMessage: USERS_MESSAGES.CONFIRM_PASSWORD_MUST_BE_STRONG
  },
  custom: {
    // hàm kiểm tra do mình tự tạo ra
    options: (value, { req }) => {
      // hàm nhận vào value , object chưa req
      //value chính là confirm_password
      if (value !== req.body.password) {
        throw new Error(USERS_MESSAGES.CONFIRM_PASSWORD_MUST_BE_THE_SAME_AS_PASSWORD)
        //throw thì nó sẽ ko hiện thị ra mà ghi vào ghi chú vì đang dùng express validation
        // nó sẽ ghi zo cuốn nhật kí , muốn đưa lỗi ra thì dùng từ khoá validationResult để đưa ra ngoài
      }
      return true
    }
  }
}

const forgotPasswordSchema: ParamSchema = {
  notEmpty: {
    errorMessage: USERS_MESSAGES.FORGOT_PASSWORD_TOKEN_IS_REQUIRED
  },
  trim: true,
  custom: {
    options: async (value: string, { req }) => {
      // nếu ko truyền vào forgot password thì sẽ báo lỗi
      // value lúc này là forgot password token

      try {
        //bình thường thì nó sẽ là 422 nhưng mình sẽ ko muốn nên chụp nó lại bằng try catch để nó thành 401
        //verify forgot_password_token để lấy decode_forgot_password_token
        const decode_forgot_password_token = await verifyToken({
          token: value, //là forgot_password_token
          privateKey: process.env.JWT_SECRET_FORGOT_PASSWORD_TOKEN as string
        })
        //lưu lại decode forgot password token vào req
        ;(req as Request).decode_forgot_password_token = decode_forgot_password_token
      } catch (error) {
        throw new ErrorWithStatus({
          message: (error as JsonWebTokenError).message, // không quan tâm cái nội dung là gì , chỉ cần đổi cái status
          status: HTTP_STATUS.UNAUTHORIZED
        })
      }
      //
      return true
    }
  }
}
const nameSchema: ParamSchema = {
  notEmpty: {
    errorMessage: USERS_MESSAGES.NAME_IS_REQUIRED
  },
  isString: {
    errorMessage: USERS_MESSAGES.NAME_MUST_BE_A_STRING
  },
  trim: true, //nên đặt trim dưới này thay vì ở đầu
  isLength: {
    options: {
      min: 1,
      max: 100
    },
    errorMessage: USERS_MESSAGES.NAME_LENGTH_MUST_BE_FROM_1_TO_100
  }
}

const dateOfBirthSchema: ParamSchema = {
  isISO8601: {
    options: {
      strict: true,
      strictSeparator: true
    },
    errorMessage: USERS_MESSAGES.DATE_OF_BIRTH_BE_ISO8601
  }
}
//tí xài cho property avatar và cover_photo
const imageSchema: ParamSchema = {
  optional: true,
  isString: {
    errorMessage: USERS_MESSAGES.IMAGE_URL_MUST_BE_A_STRING ////messages.ts thêm IMAGE_URL_MUST_BE_A_STRING: 'Image url must be a string'
  },
  trim: true, //nên đặt trim dưới này thay vì ở đầu
  isLength: {
    options: {
      min: 1,
      max: 400
    },
    errorMessage: USERS_MESSAGES.IMAGE_URL_LENGTH_MUST_BE_LESS_THAN_400 //messages.ts thêm IMAGE_URL_LENGTH_MUST_BE_LESS_THAN_400: 'Image url length must be less than 400'
  }
}

//kiểm tra đăng ký
export const registerValidator = validate(
  checkSchema(
    {
      name: nameSchema,
      email: {
        notEmpty: {
          errorMessage: USERS_MESSAGES.EMAIL_IS_REQUIRED
        },
        isEmail: {
          errorMessage: USERS_MESSAGES.EMAIL_IS_INVALID
        },
        trim: true
      },
      password: passwordSchema,
      confirm_password: confirmPasswordSchema,
      date_of_birth: dateOfBirthSchema
    },
    ['body']
  )
)
//dù mình có xử lý lỗi như thế nào thì hệ thống cũng không có biết
//-> muốn hệ thống biết thì mình phải chạy hàm validationResult
//-> bản chất schema cũng chỉ trả về cho mình validation chains thôi

//=> viết 1 cái hàm -> viết trong utils

//Viết hàm kiểm tra loginReqBody

export const loginValidator = validate(
  checkSchema(
    {
      email: {
        notEmpty: {
          errorMessage: USERS_MESSAGES.EMAIL_IS_REQUIRED
        },
        isEmail: {
          errorMessage: USERS_MESSAGES.EMAIL_IS_INVALID
        },
        trim: true
      },
      password: passwordSchema
    },
    ['body']
  )
)

// ['body'] - > nó sẽ nhảy zo phần body kiếm

//Viết làm kiểm tra access_token
export const accessTokenValidation = validate(
  checkSchema(
    {
      Authorization: {
        notEmpty: {
          errorMessage: USERS_MESSAGES.ACCESS_TOKEN_IS_REQUIRED
        },
        custom: {
          options: async (value, { req }) => {
            //value này 'Bearer <access_token>'
            const access_token = value.split(' ')[1] // có trường hợp người dùng chỉ người chữ bearer à ko gửi accesstoken
            // sẽ bị null -> sẽ bị cash hệ thống
            if (!access_token) {
              throw new ErrorWithStatus({
                status: HTTP_STATUS.UNAUTHORIZED, //401
                message: USERS_MESSAGES.ACCESS_TOKEN_IS_REQUIRED
              })
            }
            //mình phải try catch -> để đổi mã lỗi của nó thành 401 -> chụp nó lại đổi mã rồi ném lại ra
            try {
              // nếu có mã thì mình sẽ verify(xác thực chữ ký)
              const decode_authoriation = await verifyToken({
                token: access_token,
                privateKey: process.env.JWT_SECRET_ACCESS_TOKEN as string
              })
              //decode_authoriation là payload của access_token đã mã hoá
              //bên trong đó có user_id và token_type....
              ;(req as Request).decode_authorization = decode_authoriation
              //dùng để lưu nó lại vì khi hàm chạy xong thì nó sẽ mất -> mình cần phải lưu nó lại đê dùng ở các tầng sau
            } catch (error) {
              throw new ErrorWithStatus({
                status: HTTP_STATUS.UNAUTHORIZED, //401
                message: capitalize((error as JsonWebTokenError).message)
              })
            }
            //nếu ok hêt
            return true
          }
        }
      }
    },
    ['headers']
  )
)

//Viết hàm kiểm tra refresh_token
export const refreshTokenValidator = validate(
  checkSchema(
    {
      refresh_token: {
        //vô là kiểm tra
        notEmpty: {
          errorMessage: USERS_MESSAGES.REFRESH_TOKEN_IS_REQUIRED
        },
        custom: {
          options: async (value, { req }) => {
            //value này là refreshToken
            try {
              const decode_refresh_token = await verifyToken({
                token: value,
                privateKey: process.env.JWT_SECRET_REFRESH_TOKEN as string
              })
              ;(req as Request).decode_refresh_token = decode_refresh_token
            } catch (error) {
              throw new ErrorWithStatus({
                status: HTTP_STATUS.UNAUTHORIZED, //401
                message: capitalize((error as JsonWebTokenError).message)
              })
            }
            return true
          }
        }
      }
    },
    ['body']
  )
)
// email verify
export const emailVerifyTokenValidation = validate(
  checkSchema(
    {
      email_verify_token: {
        trim: true, //chặn trường hợp nó gửi rất nhiều dấu cách
        notEmpty: {
          errorMessage: USERS_MESSAGES.EMAIL_VERIFY_TOKEN_IS_REQUIRED
        },
        custom: {
          options: async (value: string, { req }) => {
            //value là email_verify_token
            try {
              const decode_email_verify_token = await verifyToken({
                token: value, //email_verify_token
                privateKey: process.env.JWT_SECRET_EMAIL_VERIFY_TOKEN as string
              })
              //decode_email_verify_token là payloda của email_verify_token
              ;(req as Request).decode_email_verify_token = decode_email_verify_token
            } catch (error) {
              throw new ErrorWithStatus({
                status: HTTP_STATUS.UNAUTHORIZED, //401
                message: USERS_MESSAGES.EMAIL_IS_INVALID
              })
            }
            return true // qua hết thì true
          }
        }
      }
    },

    ['query']
  )
)

//forgot Password
export const forgotPasswordValidator = validate(
  checkSchema(
    {
      email: {
        notEmpty: {
          errorMessage: USERS_MESSAGES.EMAIL_IS_REQUIRED
        },
        isEmail: {
          errorMessage: USERS_MESSAGES.EMAIL_IS_INVALID
        },
        trim: true
      }
    },
    ['body']
  )
)

//verify forgot password
export const forgotPasswordTokenValidator = validate(
  checkSchema(
    {
      forgot_password_token: forgotPasswordSchema
    },
    ['body']
  )
)

//reset-password

export const resetPasswordValidator = validate(
  checkSchema(
    {
      password: passwordSchema,
      confirm_password: confirmPasswordSchema
    },
    ['body']
  )
)

//update me
export const updateMeValidator = validate(
  checkSchema(
    {
      name: {
        // phân rã là đè lên các thuộc tính đã có sẵn
        optional: true, //đc phép có hoặc k
        ...nameSchema, //phân rã nameSchema ra
        notEmpty: undefined //ghi đè lên notEmpty của nameSchema
      },
      date_of_birth: {
        optional: true, //đc phép có hoặc k
        ...dateOfBirthSchema, //phân rã nameSchema ra
        notEmpty: undefined //ghi đè lên notEmpty của nameSchema
      },
      bio: {
        optional: true,
        isString: {
          errorMessage: USERS_MESSAGES.BIO_MUST_BE_A_STRING ////messages.ts thêm BIO_MUST_BE_A_STRING: 'Bio must be a string'
        },
        trim: true, //trim phát đặt cuối, nếu k thì nó sẽ lỗi validatior
        isLength: {
          options: {
            min: 1,
            max: 200
          },
          errorMessage: USERS_MESSAGES.BIO_LENGTH_MUST_BE_LESS_THAN_200 //messages.ts thêm BIO_LENGTH_MUST_BE_LESS_THAN_200: 'Bio length must be less than 200'
        }
      },
      //giống bio
      location: {
        optional: true,
        isString: {
          errorMessage: USERS_MESSAGES.LOCATION_MUST_BE_A_STRING ////messages.ts thêm LOCATION_MUST_BE_A_STRING: 'Location must be a string'
        },
        trim: true,
        isLength: {
          options: {
            min: 1,
            max: 200
          },
          errorMessage: USERS_MESSAGES.LOCATION_LENGTH_MUST_BE_LESS_THAN_200 //messages.ts thêm LOCATION_LENGTH_MUST_BE_LESS_THAN_200: 'Location length must be less than 200'
        }
      },
      //giống location
      website: {
        optional: true,
        isString: {
          errorMessage: USERS_MESSAGES.WEBSITE_MUST_BE_A_STRING ////messages.ts thêm WEBSITE_MUST_BE_A_STRING: 'Website must be a string'
        },
        trim: true,
        isLength: {
          options: {
            min: 1,
            max: 200
          },

          errorMessage: USERS_MESSAGES.WEBSITE_LENGTH_MUST_BE_LESS_THAN_200 //messages.ts thêm WEBSITE_LENGTH_MUST_BE_LESS_THAN_200: 'Website length must be less than 200'
        }
      },
      username: {
        optional: true,
        isString: {
          errorMessage: USERS_MESSAGES.USERNAME_MUST_BE_A_STRING ////messages.ts thêm USERNAME_MUST_BE_A_STRING: 'Username must be a string'
        },
        trim: true,
        isLength: {
          options: {
            min: 1,
            max: 50
          },
          errorMessage: USERS_MESSAGES.USERNAME_LENGTH_MUST_BE_LESS_THAN_50 //messages.ts thêm USERNAME_LENGTH_MUST_BE_LESS_THAN_50: 'Username length must be less than 50'
        },
        custom: {
          options: (value: string, { req }) => {
            //value chính là username
            if (!REGEX_USERNAME.test(value)) {
              throw new Error(USERS_MESSAGES.USERNAME_IS_INVALID)
            }
            return true
          }
        }
      },
      avatar: imageSchema,
      cover_photo: imageSchema
    },
    ['body']
  )
)

//change password
export const changePasswordValidator = validate(
  checkSchema(
    {
      old_password: passwordSchema,
      password: passwordSchema,
      confirm_password: confirmPasswordSchema
    },
    ['body']
  )
)
