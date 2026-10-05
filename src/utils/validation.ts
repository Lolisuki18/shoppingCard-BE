import { Request, Response, NextFunction } from 'express'
import { validationResult, ValidationChain } from 'express-validator'
import { RunnableValidationChains } from 'express-validator/lib/middlewares/schema'
import HTTP_STATUS from '~/constants/httpStatus'
import { EntityError, ErrorWithStatus } from '~/models/Errors'

//validations: ContextRunner[]:  ContextRunner[] dạng validations cũ
//-> mình xài công nghệ mới rồi nên
//-> checkSchema mình xài RunnableValidationChains<ValidationChain>

//hàm validate sẽ xài như sau validate(checkSchema({.....}))
//và checkSchema sẽ return RunnableValidationChains<ValidationChain>
//nên mình định nghĩa validate là hàm nhận vào
//Object có dạng RunnableValidationChains<ValidationChain>

// kiểm tra lỗi và trả ra cho mình 1 cái middleware
// lấy lỗi từ cái checkSchema ra và nó thông báo
//=> mục đích là sẽ biến các checkSchema của mình thành 1 cái middleware bình thường
//-> có lỗi thì nó thông báo ko có thì nó next()
//-> bởi vì checkSchema sẽ ko trả ra lỗi nó chỉ kiểm tra và note lỗi lại thôi

//checkSchema hiện tại là validations
export const validate = (validations: RunnableValidationChains<ValidationChain>) => {
  //import trước rồi mới định nghĩa
  return async (req: Request, res: Response, next: NextFunction) => {
    //lôi thằng checkSchema ra để lấy danh sách lỗi
    //---------------mở danh sách lỗi
    //phải đợi vì nó là 1 Promise
    await validations.run(req) // hàm này tương đường với hàm validationResult(ValidationChanins) , run là cho checkSchema
    //funct này cũng lấy lỗi từ Request
    const errors = validationResult(req) // lập danh sách lỗi trong req

    if (errors.isEmpty()) {
      return next()
    }
    const errorObject = errors.mapped() //: cho mình thêm cái tên -> lỗi này là của ai
    const entityError = new EntityError({ errors: {} })
    //-> được đặt tên là errorObject
    //-> để muốn truy cập vào password sẽ là errorsObject['password']
    //.array() // biến thành mảng lỗi
    //for in duyệt key
    for (const key in errorObject) {
      const { msg } = errorObject[key] // lấy ra msg trong mỗi thuộc tính
      //nếu cóp nội dung lỗi nào mà giống ErrorWithStatus hoặc có lỗi có mã khác 422
      //validate chỉ bắt lỗi 422 thôi -> nếu ko phải thì đưa cho thằng tổng xử lý
      //những lỗi mình tự tạo có dạng ErrorWithStatus và mã phải 422 nó mới xử lý
      if (msg instanceof ErrorWithStatus && msg.status !== HTTP_STATUS.UNPROCESSABLE_ENTITY) {
        return next(msg) //return để không gọi next() lần thứ hai bên dưới (trước đây 1 request bị xử lý lỗi 2 lần)
      }
      //những lồi là 422 sẽ được nhét vào entityError
      entityError.errors[key] = errorObject[key].msg
    }
    next(entityError)
  }
}

// new Date().toISOString(......)
