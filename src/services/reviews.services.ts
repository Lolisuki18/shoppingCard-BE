import { Prisma } from '@prisma/client'
import databaseService from './database.services'
import { USER_ROLE } from '~/constants/enums'
import HTTP_STATUS from '~/constants/httpStatus'
import { PRODUCT_MESSAGES, REVIEW_MESSAGES } from '~/constants/messages'
import { ErrorWithStatus } from '~/models/Errors'
import { CreateReviewReqBody, PaginationQuery, UpdateReviewReqBody } from '~/models/requests/Shop.requests'
import { buildPage, getPagination } from '~/utils/pagination'
import { isPrismaError } from '~/utils/prismaErrors'

type Tx = Prisma.TransactionClient

const reviewNotFound = () => new ErrorWithStatus({ status: HTTP_STATUS.NOT_FOUND, message: REVIEW_MESSAGES.NOT_FOUND })
const productNotFound = () =>
  new ErrorWithStatus({ status: HTTP_STATUS.NOT_FOUND, message: PRODUCT_MESSAGES.NOT_FOUND })

//chỉ lộ thông tin công khai của người đánh giá
const reviewInclude = {
  user: { select: { id: true, name: true, username: true, avatar: true } }
} satisfies Prisma.ReviewInclude

//tính lại điểm trung bình + số đánh giá lưu sẵn trên product (để danh sách sản phẩm không phải tính mỗi lần)
const refreshProductRating = async (tx: Tx, product_id: string) => {
  const { _avg, _count } = await tx.review.aggregate({
    where: { product_id },
    _avg: { rating: true },
    _count: { _all: true }
  })
  await tx.product.update({
    where: { id: product_id },
    data: { rating_avg: Math.round((_avg.rating ?? 0) * 100) / 100, rating_count: _count._all }
  })
}

class ReviewsServices {
  //đánh giá của 1 sản phẩm đang bán (public)
  async getList(product_id: string, query: PaginationQuery) {
    const product = await databaseService.products.findFirst({
      where: { id: product_id, is_active: true },
      select: { rating_avg: true, rating_count: true }
    })
    if (!product) throw productNotFound()
    const { page, limit, skip, take } = getPagination(query)
    const where = { product_id }
    const [items, total] = await Promise.all([
      databaseService.reviews.findMany({
        where,
        orderBy: [{ created_at: 'desc' }, { id: 'asc' }],
        skip,
        take,
        include: reviewInclude
      }),
      databaseService.reviews.count({ where })
    ])
    return { ...buildPage({ items, total, page, limit }), ...product }
  }

  //chỉ khách đã nhận hàng (đơn Delivered có sản phẩm này) mới được đánh giá
  async create(user_id: string, product_id: string, body: CreateReviewReqBody) {
    const product = await databaseService.products.findFirst({ where: { id: product_id }, select: { id: true } })
    if (!product) throw productNotFound()
    const purchased = await databaseService.orders.findFirst({
      where: { user_id, status: 'Delivered', items: { some: { product_id } } },
      select: { id: true }
    })
    if (!purchased) {
      throw new ErrorWithStatus({ status: HTTP_STATUS.FORBIDDEN, message: REVIEW_MESSAGES.MUST_PURCHASE_FIRST })
    }
    try {
      return await databaseService.$transaction(async (tx) => {
        const review = await tx.review.create({
          data: { user_id, product_id, rating: body.rating, comment: body.comment ?? '' },
          include: reviewInclude
        })
        await refreshProductRating(tx, product_id)
        return review
      })
    } catch (error) {
      if (isPrismaError(error, 'P2002')) {
        throw new ErrorWithStatus({ status: HTTP_STATUS.CONFLICT, message: REVIEW_MESSAGES.ALREADY_REVIEWED })
      }
      if (isPrismaError(error, 'P2003')) throw productNotFound() //sản phẩm bị xoá giữa chừng
      throw error
    }
  }

  //chỉ sửa được đánh giá của chính mình (của người khác trả 404)
  async update(id: string, user_id: string, body: UpdateReviewReqBody) {
    return databaseService.$transaction(async (tx) => {
      const review = await tx.review.findFirst({ where: { id, user_id }, select: { product_id: true } })
      if (!review) throw reviewNotFound()
      const updated = await tx.review.update({
        where: { id },
        data: {
          ...(body.rating !== undefined && { rating: body.rating }),
          ...(body.comment !== undefined && { comment: body.comment })
        },
        include: reviewInclude
      })
      await refreshProductRating(tx, review.product_id)
      return updated
    })
  }

  //chủ review xoá được review của mình; Admin/Staff xoá được mọi review (gỡ nội dung vi phạm)
  async delete(id: string, current_user: { id: string; role: number }) {
    const isModerator = current_user.role === USER_ROLE.Admin || current_user.role === USER_ROLE.Staff
    await databaseService.$transaction(async (tx) => {
      const review = await tx.review.findFirst({
        where: { id, ...(!isModerator && { user_id: current_user.id }) },
        select: { product_id: true }
      })
      if (!review) throw reviewNotFound()
      await tx.review.delete({ where: { id } })
      await refreshProductRating(tx, review.product_id)
    })
  }
}

const reviewsServices = new ReviewsServices()
export default reviewsServices
