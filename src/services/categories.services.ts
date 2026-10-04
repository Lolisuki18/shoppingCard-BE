import databaseService from './database.services'
import HTTP_STATUS from '~/constants/httpStatus'
import { CATEGORY_MESSAGES } from '~/constants/messages'
import { ErrorWithStatus } from '~/models/Errors'
import { CategoryReqBody, UpdateCategoryReqBody } from '~/models/requests/Shop.requests'
import { isPrismaError } from '~/utils/prismaErrors'
import { generateUniqueSlug } from '~/utils/slug'

const notFound = () => new ErrorWithStatus({ status: HTTP_STATUS.NOT_FOUND, message: CATEGORY_MESSAGES.NOT_FOUND })
const nameExists = () =>
  new ErrorWithStatus({ status: HTTP_STATUS.CONFLICT, message: CATEGORY_MESSAGES.NAME_ALREADY_EXISTS })

class CategoriesServices {
  //danh sách category kèm số sản phẩm đang bán
  async getAll() {
    const categories = await databaseService.categories.findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { products: { where: { is_active: true } } } } }
    })
    return categories.map(({ _count, ...category }) => ({ ...category, product_count: _count.products }))
  }

  async getById(id: string) {
    const category = await databaseService.categories.findUnique({ where: { id } })
    if (!category) throw notFound()
    return category
  }

  async create({ name, description }: CategoryReqBody) {
    const slug = await generateUniqueSlug(name, async (s) =>
      Boolean(await databaseService.categories.findUnique({ where: { slug: s }, select: { id: true } }))
    )
    try {
      return await databaseService.categories.create({ data: { name, slug, description } })
    } catch (error) {
      if (isPrismaError(error, 'P2002')) throw nameExists() //2 người tạo trùng tên cùng lúc
      throw error
    }
  }

  async update(id: string, payload: UpdateCategoryReqBody) {
    try {
      return await databaseService.categories.update({ where: { id }, data: payload })
    } catch (error) {
      if (isPrismaError(error, 'P2025')) throw notFound()
      if (isPrismaError(error, 'P2002')) throw nameExists()
      throw error
    }
  }

  async delete(id: string) {
    try {
      await databaseService.categories.delete({ where: { id } })
    } catch (error) {
      if (isPrismaError(error, 'P2025')) throw notFound()
      //foreign key Restrict: category còn sản phẩm
      if (isPrismaError(error, 'P2003')) {
        throw new ErrorWithStatus({ status: HTTP_STATUS.CONFLICT, message: CATEGORY_MESSAGES.HAS_PRODUCTS })
      }
      throw error
    }
  }
}

const categoriesServices = new CategoriesServices()
export default categoriesServices
