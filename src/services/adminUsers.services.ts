import { Prisma } from '@prisma/client'
import databaseService from './database.services'
import { UserVerifyStatus } from '~/constants/enums'
import HTTP_STATUS from '~/constants/httpStatus'
import { ADMIN_USER_MESSAGES } from '~/constants/messages'
import { ErrorWithStatus } from '~/models/Errors'
import { AdminUserListQuery } from '~/models/requests/Shop.requests'
import { buildPage, getPagination } from '~/utils/pagination'

//chỉ những cột an toàn: KHÔNG có password, email_verify_token, forgot_password_token
const adminUserSelect = {
  id: true,
  name: true,
  email: true,
  username: true,
  avatar: true,
  date_of_birth: true,
  location: true,
  role: true,
  verify: true,
  created_at: true,
  updated_at: true,
  _count: { select: { orders: true } }
} satisfies Prisma.UserSelect

const userNotFound = () =>
  new ErrorWithStatus({ status: HTTP_STATUS.NOT_FOUND, message: ADMIN_USER_MESSAGES.NOT_FOUND })
const cannotChangeSelf = () =>
  new ErrorWithStatus({ status: HTTP_STATUS.CONFLICT, message: ADMIN_USER_MESSAGES.CANNOT_CHANGE_SELF })

class AdminUsersServices {
  async getList(query: AdminUserListQuery) {
    const { page, limit, skip, take } = getPagination(query)
    const where: Prisma.UserWhereInput = {
      ...(query.role !== undefined && { role: query.role }),
      ...(query.verify !== undefined && { verify: query.verify }),
      ...(query.search && {
        OR: [
          { name: { contains: query.search, mode: 'insensitive' } },
          { email: { contains: query.search, mode: 'insensitive' } },
          { username: { contains: query.search, mode: 'insensitive' } }
        ]
      })
    }
    const [items, total] = await Promise.all([
      databaseService.users.findMany({
        where,
        orderBy: [{ created_at: 'desc' }, { id: 'asc' }],
        skip,
        take,
        select: adminUserSelect
      }),
      databaseService.users.count({ where })
    ])
    return buildPage({ items, total, page, limit })
  }

  async getById(id: string) {
    const user = await databaseService.users.findUnique({ where: { id }, select: adminUserSelect })
    if (!user) throw userNotFound()
    return user
  }

  //khoá: không đăng nhập / đặt hàng được nữa và bị đăng xuất khỏi mọi thiết bị (xoá refresh token)
  async ban(id: string, actor_id: string) {
    if (id === actor_id) throw cannotChangeSelf()
    await databaseService.$transaction(async (tx) => {
      const user = await tx.user.findUnique({ where: { id }, select: { verify: true } })
      if (!user) throw userNotFound()
      if (user.verify === UserVerifyStatus.Banned) {
        throw new ErrorWithStatus({ status: HTTP_STATUS.CONFLICT, message: ADMIN_USER_MESSAGES.ALREADY_BANNED })
      }
      await tx.user.update({ where: { id }, data: { verify: UserVerifyStatus.Banned } })
      await tx.refreshToken.deleteMany({ where: { user_id: id } })
    })
    return this.getById(id)
  }

  //mở khoá: người đã xác thực email trước đó quay lại Verified, người chưa xác thực thì về Unverified (không được bỏ qua bước xác thực email)
  async unban(id: string) {
    const user = await databaseService.users.findUnique({
      where: { id },
      select: { verify: true, email_verify_token: true }
    })
    if (!user) throw userNotFound()
    if (user.verify !== UserVerifyStatus.Banned) {
      throw new ErrorWithStatus({ status: HTTP_STATUS.CONFLICT, message: ADMIN_USER_MESSAGES.NOT_BANNED })
    }
    //email_verify_token được xoá rỗng khi đã xác thực email
    const verify = user.email_verify_token === '' ? UserVerifyStatus.Verified : UserVerifyStatus.Unverified
    await databaseService.users.update({ where: { id }, data: { verify } })
    return this.getById(id)
  }

  //đổi role có hiệu lực ngay (role được kiểm tra từ DB ở mỗi request). Không tự đổi role của chính mình để không khoá mất quyền Admin
  async setRole(id: string, role: number, actor_id: string) {
    if (id === actor_id) throw cannotChangeSelf()
    try {
      await databaseService.users.update({ where: { id }, data: { role } })
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') throw userNotFound()
      throw error
    }
    return this.getById(id)
  }
}

const adminUsersServices = new AdminUsersServices()
export default adminUsersServices
