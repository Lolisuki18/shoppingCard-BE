import databaseService from './database.services'
import HTTP_STATUS from '~/constants/httpStatus'
import { WISHLIST_MESSAGES } from '~/constants/messages'
import { ErrorWithStatus } from '~/models/Errors'
import { PaginationQuery } from '~/models/requests/Shop.requests'
import { buildPage, getPagination } from '~/utils/pagination'
import { isPrismaError } from '~/utils/prismaErrors'

const productInclude = {
  product: {
    select: {
      id: true,
      name: true,
      slug: true,
      price: true,
      stock: true,
      images: true,
      rating_avg: true,
      rating_count: true
    }
  }
}

class WishlistServices {
  //sản phẩm đã bị ẩn thì không hiện trong danh sách yêu thích
  async getList(user_id: string, query: PaginationQuery) {
    const { page, limit, skip, take } = getPagination(query)
    const where = { user_id, product: { is_active: true } }
    const [items, total] = await Promise.all([
      databaseService.wishlistItems.findMany({
        where,
        orderBy: [{ created_at: 'desc' }, { id: 'asc' }],
        skip,
        take,
        include: productInclude
      }),
      databaseService.wishlistItems.count({ where })
    ])
    return buildPage({ items, total, page, limit })
  }

  //thêm lần nữa thì không lỗi (giữ nguyên bản ghi cũ)
  async add(user_id: string, product_id: string) {
    const product = await databaseService.products.findFirst({
      where: { id: product_id, is_active: true },
      select: { id: true }
    })
    if (!product) {
      throw new ErrorWithStatus({ status: HTTP_STATUS.NOT_FOUND, message: WISHLIST_MESSAGES.PRODUCT_NOT_AVAILABLE })
    }
    try {
      return await databaseService.wishlistItems.upsert({
        where: { user_id_product_id: { user_id, product_id } },
        create: { user_id, product_id },
        update: {},
        include: productInclude
      })
    } catch (error) {
      //2 request thêm cùng lúc: bản ghi kia đã được tạo, đọc lại là xong
      if (isPrismaError(error, 'P2002')) {
        return databaseService.wishlistItems.findUniqueOrThrow({
          where: { user_id_product_id: { user_id, product_id } },
          include: productInclude
        })
      }
      throw error
    }
  }

  async remove(user_id: string, product_id: string) {
    const { count } = await databaseService.wishlistItems.deleteMany({ where: { user_id, product_id } })
    if (count === 0) {
      throw new ErrorWithStatus({ status: HTTP_STATUS.NOT_FOUND, message: WISHLIST_MESSAGES.ITEM_NOT_FOUND })
    }
  }
}

const wishlistServices = new WishlistServices()
export default wishlistServices
