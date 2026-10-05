import { Prisma } from '@prisma/client'
import databaseService from './database.services'
import HTTP_STATUS from '~/constants/httpStatus'
import { CATEGORY_MESSAGES, PRODUCT_MESSAGES } from '~/constants/messages'
import { ErrorWithStatus } from '~/models/Errors'
import { ProductListQuery, ProductReqBody, UpdateProductReqBody } from '~/models/requests/Shop.requests'
import { buildPage, getPagination } from '~/utils/pagination'
import { isPrismaError } from '~/utils/prismaErrors'
import { generateUniqueSlug } from '~/utils/slug'

const productNotFound = () =>
  new ErrorWithStatus({ status: HTTP_STATUS.NOT_FOUND, message: PRODUCT_MESSAGES.NOT_FOUND })
const categoryNotFound = () =>
  new ErrorWithStatus({ status: HTTP_STATUS.NOT_FOUND, message: CATEGORY_MESSAGES.NOT_FOUND })

const orderBySort = (sort?: string): Prisma.ProductOrderByWithRelationInput[] => {
  switch (sort) {
    case 'price_asc':
      return [{ price: 'asc' }, { id: 'asc' }]
    case 'price_desc':
      return [{ price: 'desc' }, { id: 'asc' }]
    case 'rating':
      return [{ rating_avg: 'desc' }, { rating_count: 'desc' }, { id: 'asc' }]
    case 'name':
      return [{ name: 'asc' }, { id: 'asc' }]
    default:
      return [{ created_at: 'desc' }, { id: 'asc' }] //id để thứ tự ổn định khi phân trang
  }
}

class ProductsServices {
  //includeInactive = true dành cho Admin/Staff (xem cả sản phẩm đang ẩn)
  async getList(query: ProductListQuery, { includeInactive }: { includeInactive: boolean }) {
    const { page, limit, skip, take } = getPagination(query)
    const where: Prisma.ProductWhereInput = {
      ...(includeInactive ? {} : { is_active: true }),
      ...(query.category_id && { category_id: query.category_id }),
      ...(query.search && {
        OR: [
          { name: { contains: query.search, mode: 'insensitive' } },
          { description: { contains: query.search, mode: 'insensitive' } }
        ]
      }),
      ...((query.min_price !== undefined || query.max_price !== undefined) && {
        price: {
          ...(query.min_price !== undefined && { gte: query.min_price }),
          ...(query.max_price !== undefined && { lte: query.max_price })
        }
      })
    }
    const [items, total] = await Promise.all([
      databaseService.products.findMany({
        where,
        orderBy: orderBySort(query.sort),
        skip,
        take,
        include: { category: { select: { id: true, name: true, slug: true } } }
      }),
      databaseService.products.count({ where })
    ])
    return buildPage({ items, total, page, limit })
  }

  async getById(id: string, { includeInactive }: { includeInactive: boolean }) {
    const product = await databaseService.products.findFirst({
      where: { id, ...(includeInactive ? {} : { is_active: true }) },
      include: { category: { select: { id: true, name: true, slug: true } } }
    })
    if (!product) throw productNotFound()
    return product
  }

  async create(payload: ProductReqBody) {
    const category = await databaseService.categories.findUnique({
      where: { id: payload.category_id },
      select: { id: true }
    })
    if (!category) throw categoryNotFound()
    const slug = await generateUniqueSlug(payload.name, async (s) =>
      Boolean(await databaseService.products.findUnique({ where: { slug: s }, select: { id: true } }))
    )
    return databaseService.products.create({ data: { ...payload, slug } })
  }

  async update(id: string, payload: UpdateProductReqBody) {
    try {
      return await databaseService.products.update({ where: { id }, data: payload })
    } catch (error) {
      if (isPrismaError(error, 'P2025')) throw productNotFound()
      if (isPrismaError(error, 'P2003')) throw categoryNotFound() //category_id không tồn tại
      throw error
    }
  }

  //xoá cứng: các đơn cũ vẫn giữ nguyên nhờ order_items lưu sẵn tên/giá (product_id chuyển thành null)
  async delete(id: string) {
    try {
      await databaseService.products.delete({ where: { id } })
    } catch (error) {
      if (isPrismaError(error, 'P2025')) throw productNotFound()
      throw error
    }
  }
}

const productsServices = new ProductsServices()
export default productsServices
