import { PrismaClient } from '@prisma/client'
//npm i dotenv : dùng để tải thư viện để xài .env
import dotenv from 'dotenv'
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
      console.log('Kết nối PostgreSQL thành công!')
    } catch (err) {
      console.log(err)
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

  //dùng khi cần nhiều thao tác phải thành công/thất bại cùng nhau
  get $transaction() {
    return this.client.$transaction.bind(this.client)
  }
}

let databaseService = new DatabaseService()
export default databaseService
//tất cả những thằng ở services nên là class

//***** cách viết dependency injection -> design pattern
//nếu mình export class thì ra ngoài  thì nó sẽ rất dở -> những thằng sử dụng mình sẽ phải tạo instance  mới xài đc
//-> cứ mỗi 1 file thì nta phải tạo thì mới xài đc
// =>  tạo trước rồi export default cái instance ra để cho nta xài ->những thằng xài ko phải new
//-> ko cần tạo mới -> sẽ giảm tải dung lượng cho chúng ta
