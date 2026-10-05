import { Prisma } from '@prisma/client'
import databaseService from './database.services'
import HTTP_STATUS from '~/constants/httpStatus'
import { CATEGORY_MESSAGES, PRODUCT_MESSAGES, VARIANT_MESSAGES } from '~/constants/messages'
import { ErrorWithStatus } from '~/models/Errors'
import {
  ProductListQuery,
  ProductReqBody,
  UpdateProductReqBody,
  UpdateVariantReqBody,
  VariantReqBody
} from '~/models/requests/Shop.requests'
import { buildPage, getPagination } from '~/utils/pagination'
import { aggregateVariants, syncProductAggregates } from '~/utils/productAggregates'
import { isPrismaError } from '~/utils/prismaErrors'
import { generateUniqueSlug } from '~/utils/slug'
import { deleteUnusedImages } from './medias.services'

type Tx = Prisma.TransactionClient

const productNotFound = () =>
  new ErrorWithStatus({ status: HTTP_STATUS.NOT_FOUND, message: PRODUCT_MESSAGES.NOT_FOUND })
const categoryNotFound = () =>
  new ErrorWithStatus({ status: HTTP_STATUS.NOT_FOUND, message: CATEGORY_MESSAGES.NOT_FOUND })
const variantNotFound = () =>
  new ErrorWithStatus({ status: HTTP_STATUS.NOT_FOUND, message: VARIANT_MESSAGES.NOT_FOUND })
const variantConflict = () =>
  new ErrorWithStatus({ status: HTTP_STATUS.CONFLICT, message: VARIANT_MESSAGES.ALREADY_EXISTS })

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

//khách chỉ thấy biến thể đang bán; Admin/Staff thấy tất cả
const productInclude = (includeInactive: boolean) =>
  ({
    category: { select: { id: true, name: true, slug: true } },
    variants: {
      ...(includeInactive ? {} : { where: { is_active: true } }),
      orderBy: [{ created_at: 'asc' }, { id: 'asc' }]
    }
  }) satisfies Prisma.ProductInclude

//tên biến thể không trùng nhau trong 1 sản phẩm, không phân biệt hoa/thường ("M" và "m" là một)
const assertVariantNameFree = async (tx: Tx, product_id: string, name: string, exceptId?: string) => {
  const duplicate = await tx.productVariant.findFirst({
    where: { product_id, name: { equals: name, mode: 'insensitive' }, ...(exceptId && { id: { not: exceptId } }) },
    select: { id: true }
  })
  if (duplicate) throw variantConflict()
}

//has_variants = false: sản phẩm không có tuỳ chọn (chỉ có biến thể mặc định tên rỗng)
const present = <T extends { variants: { name: string }[] }>(product: T) => ({
  ...product,
  has_variants: product.variants.some((variant) => variant.name !== '')
})

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
        include: productInclude(includeInactive)
      }),
      databaseService.products.count({ where })
    ])
    return buildPage({ items: items.map(present), total, page, limit })
  }

  async getById(id: string, { includeInactive }: { includeInactive: boolean }) {
    const product = await databaseService.products.findFirst({
      where: { id, ...(includeInactive ? {} : { is_active: true }) },
      include: productInclude(includeInactive)
    })
    if (!product) throw productNotFound()
    return present(product)
  }

  //không truyền variants: tạo 1 biến thể mặc định (name "") từ price + stock
  async create(payload: ProductReqBody) {
    const { variants: variantInput, price, stock, ...fields } = payload
    const category = await databaseService.categories.findUnique({
      where: { id: payload.category_id },
      select: { id: true }
    })
    if (!category) throw categoryNotFound()
    const slug = await generateUniqueSlug(payload.name, async (s) =>
      Boolean(await databaseService.products.findUnique({ where: { slug: s }, select: { id: true } }))
    )
    const variants: VariantReqBody[] = variantInput?.length
      ? variantInput
      : [{ name: '', price: price ?? 0, stock: stock ?? 0 }]
    const aggregates = aggregateVariants(
      variants.map((v) => ({ ...v, stock: v.stock ?? 0, is_active: v.is_active ?? true }))
    )
    try {
      const product = await databaseService.products.create({
        data: {
          ...fields,
          slug,
          ...aggregates,
          variants: {
            create: variants.map((v) => ({
              name: v.name,
              sku: v.sku ?? null,
              price: v.price,
              stock: v.stock ?? 0,
              is_active: v.is_active ?? true
            }))
          }
        },
        include: productInclude(true)
      })
      return present(product)
    } catch (error) {
      if (isPrismaError(error, 'P2002')) throw variantConflict() //trùng SKU
      throw error
    }
  }

  //price / stock chỉ dùng được với sản phẩm không có tuỳ chọn (sửa biến thể mặc định); sản phẩm có biến thể thì sửa ở /variants
  async update(id: string, payload: UpdateProductReqBody) {
    const { price, stock, variants: _ignored, ...fields } = payload
    let removedImages: string[] = []
    try {
      await databaseService.$transaction(async (tx) => {
        const product = await tx.product.findUnique({ where: { id }, select: { id: true, images: true } })
        if (!product) throw productNotFound()
        if (fields.images) removedImages = product.images.filter((url) => !fields.images?.includes(url))
        if (price !== undefined || stock !== undefined) {
          const variants = await tx.productVariant.findMany({
            where: { product_id: id },
            select: { id: true, name: true }
          })
          if (variants.length !== 1 || variants[0].name !== '') {
            throw new ErrorWithStatus({ status: HTTP_STATUS.CONFLICT, message: VARIANT_MESSAGES.HAS_VARIANTS })
          }
          await tx.productVariant.update({
            where: { id: variants[0].id },
            data: { ...(price !== undefined && { price }), ...(stock !== undefined && { stock }) }
          })
        }
        await tx.product.update({ where: { id }, data: fields })
        await syncProductAggregates(tx, id)
      })
    } catch (error) {
      if (isPrismaError(error, 'P2025')) throw productNotFound()
      if (isPrismaError(error, 'P2003')) throw categoryNotFound() //category_id không tồn tại
      throw error
    }
    void deleteUnusedImages(removedImages) //ảnh vừa bị gỡ khỏi sản phẩm, xoá file nếu không còn ai dùng
    return this.getById(id, { includeInactive: true })
  }

  //xoá cứng: các đơn cũ vẫn giữ nguyên nhờ order_items lưu sẵn tên/giá (product_id, variant_id chuyển thành null)
  async delete(id: string) {
    try {
      const deleted = await databaseService.products.delete({ where: { id }, select: { images: true } })
      void deleteUnusedImages(deleted.images) //xoá file ảnh của sản phẩm (trừ ảnh đã nằm trong đơn hàng cũ)
    } catch (error) {
      if (isPrismaError(error, 'P2025')) throw productNotFound()
      throw error
    }
  }

  //---------------- biến thể ----------------
  //thêm biến thể vào sản phẩm đang không có tuỳ chọn: biến thể mặc định được thay bằng biến thể mới
  //(giỏ hàng đang chứa biến thể mặc định bị xoá khỏi giỏ; đơn cũ vẫn giữ nguyên bản chụp)
  async addVariant(product_id: string, body: VariantReqBody) {
    try {
      await databaseService.$transaction(async (tx) => {
        const product = await tx.product.findUnique({ where: { id: product_id }, select: { id: true } })
        if (!product) throw productNotFound()
        await assertVariantNameFree(tx, product_id, body.name)
        await tx.productVariant.deleteMany({ where: { product_id, name: '' } })
        await tx.productVariant.create({
          data: {
            product_id,
            name: body.name,
            sku: body.sku ?? null,
            price: body.price,
            stock: body.stock ?? 0,
            is_active: body.is_active ?? true
          }
        })
        await syncProductAggregates(tx, product_id)
      })
    } catch (error) {
      if (isPrismaError(error, 'P2002')) throw variantConflict()
      throw error
    }
    return this.getById(product_id, { includeInactive: true })
  }

  async updateVariant(product_id: string, variant_id: string, body: UpdateVariantReqBody) {
    try {
      await databaseService.$transaction(async (tx) => {
        const variant = await tx.productVariant.findFirst({ where: { id: variant_id, product_id } })
        if (!variant) throw variantNotFound()
        if (variant.name === '' && body.name !== undefined) {
          throw new ErrorWithStatus({ status: HTTP_STATUS.CONFLICT, message: VARIANT_MESSAGES.CANNOT_RENAME_DEFAULT })
        }
        if (body.name !== undefined) await assertVariantNameFree(tx, product_id, body.name, variant_id)
        await tx.productVariant.update({ where: { id: variant_id }, data: body })
        await syncProductAggregates(tx, product_id)
      })
    } catch (error) {
      if (isPrismaError(error, 'P2002')) throw variantConflict()
      throw error
    }
    return this.getById(product_id, { includeInactive: true })
  }

  async deleteVariant(product_id: string, variant_id: string) {
    await databaseService.$transaction(async (tx: Tx) => {
      const variants = await tx.productVariant.findMany({ where: { product_id }, select: { id: true } })
      if (!variants.some((variant) => variant.id === variant_id)) throw variantNotFound()
      if (variants.length <= 1) {
        throw new ErrorWithStatus({ status: HTTP_STATUS.CONFLICT, message: VARIANT_MESSAGES.MUST_KEEP_ONE })
      }
      await tx.productVariant.delete({ where: { id: variant_id } })
      await syncProductAggregates(tx, product_id)
    })
    return this.getById(product_id, { includeInactive: true })
  }
}

const productsServices = new ProductsServices()
export default productsServices
