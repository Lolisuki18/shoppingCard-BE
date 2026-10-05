import { Prisma } from '@prisma/client'

//khoá dòng user trong transaction: các thao tác song song của CÙNG 1 user xếp hàng lần lượt
//(dùng khi cần kiểm tra "số lượng hiện có" rồi mới thêm, vd giới hạn coupon mỗi khách, số địa chỉ, địa chỉ mặc định)
export const lockUserRow = (tx: Prisma.TransactionClient, user_id: string) =>
  tx.$queryRaw`SELECT id FROM users WHERE id = ${user_id}::uuid FOR UPDATE`
