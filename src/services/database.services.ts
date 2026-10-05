import { PrismaClient } from '@prisma/client'
//npm i dotenv : dùng để tải thư viện để xài .env
import dotenv from 'dotenv'
import { logger } from '~/utils/logger'
dotenv.config() //kích hoạt liên kết env

class DatabaseService {
  //PrismaClient đã tự quản lý connection pool nên chỉ cần 1 instance cho cả app
  private client: PrismaClient
  constructor() {
    this.client = new PrismaClient()
  }

  async connect() {
    try {
      // $connect là optional (Prisma tự connect khi query đầu tiên), nhưng gọi sớm để lỗi kết nối hiện ngay lúc bật server
      await this.client.$connect()
      await this.client.$queryRaw`SELECT 1`
      logger.info('Kết nối PostgreSQL thành công!')
    } catch (err) {
      logger.error('Không kết nối được PostgreSQL', { error: err })
      throw err
    }
  }

  async disconnect() {
    await this.client.$disconnect()
  }

  //hàm lấy delegate của bảng users
  get users() {
    return this.client.user
  }

  get refreshTokens() {
    return this.client.refreshToken
  }

  get categories() {
    return this.client.category
  }

  get products() {
    return this.client.product
  }

  get variants() {
    return this.client.productVariant
  }

  get orderItems() {
    return this.client.orderItem
  }

  get cartItems() {
    return this.client.cartItem
  }

  get orders() {
    return this.client.order
  }

  get addresses() {
    return this.client.address
  }

  get reviews() {
    return this.client.review
  }

  get wishlistItems() {
    return this.client.wishlistItem
  }

  get coupons() {
    return this.client.coupon
  }

  //câu lệnh SQL thô cho những báo cáo mà Prisma không diễn đạt được (luôn dùng dạng template để giá trị được tham số hoá)
  get $queryRaw() {
    return this.client.$queryRaw.bind(this.client) as PrismaClient['$queryRaw']
  }

  //dùng khi cần nhiều thao tác phải thành công/thất bại cùng nhau (throw trong callback sẽ rollback tất cả)
  get $transaction() {
    return this.client.$transaction.bind(this.client) as PrismaClient['$transaction']
  }
}

const databaseService = new DatabaseService()
export default databaseService
//tất cả những thằng ở services nên là class

//***** cách viết dependency injection -> design pattern
//nếu mình export class thì ra ngoài  thì nó sẽ rất dở -> những thằng sử dụng mình sẽ phải tạo instance  mới xài đc
//-> cứ mỗi 1 file thì nta phải tạo thì mới xài đc
// =>  tạo trước rồi export default cái instance ra để cho nta xài ->những thằng xài ko phải new
//-> ko cần tạo mới -> sẽ giảm tải dung lượng cho chúng ta
