import { Coupon, DiscountType, Prisma } from '@prisma/client'
import databaseService from './database.services'
import HTTP_STATUS from '~/constants/httpStatus'
import { COUPON_MESSAGES } from '~/constants/messages'
import { ErrorWithStatus } from '~/models/Errors'
import { CouponListQuery, CouponReqBody, UpdateCouponReqBody } from '~/models/requests/Shop.requests'
import { buildPage, getPagination } from '~/utils/pagination'
import { lockUserRow } from '~/utils/locks'
import { calculateShippingFee } from '~/utils/shipping'
import { isPrismaError } from '~/utils/prismaErrors'

type Tx = Prisma.TransactionClient

const couponNotFound = () => new ErrorWithStatus({ status: HTTP_STATUS.NOT_FOUND, message: COUPON_MESSAGES.NOT_FOUND })
const notApplicable = (message: string) => new ErrorWithStatus({ status: HTTP_STATUS.UNPROCESSABLE_ENTITY, message })

//số tiền được giảm cho đơn có tổng tiền hàng = subtotal (không bao giờ vượt quá subtotal)
export const calculateDiscount = (coupon: Coupon, subtotal: number) => {
  let discount =
    coupon.discount_type === DiscountType.Percent
      ? Math.floor((subtotal * coupon.discount_value) / 100)
      : coupon.discount_value
  if (coupon.discount_type === DiscountType.Percent && coupon.max_discount_amount !== null) {
    discount = Math.min(discount, coupon.max_discount_amount)
  }
  return Math.min(discount, subtotal)
}

//kiểm tra mã có dùng được cho user này với đơn trị giá subtotal không (không dùng được thì throw 422)
const assertApplicable = async (orders: Tx['order'], coupon: Coupon, user_id: string, subtotal: number) => {
  const now = new Date()
  if (!coupon.is_active) throw notApplicable(COUPON_MESSAGES.NOT_ACTIVE)
  if (coupon.starts_at && coupon.starts_at > now) throw notApplicable(COUPON_MESSAGES.NOT_STARTED)
  if (coupon.expires_at && coupon.expires_at <= now) throw notApplicable(COUPON_MESSAGES.EXPIRED)
  if (coupon.usage_limit !== null && coupon.used_count >= coupon.usage_limit) {
    throw notApplicable(COUPON_MESSAGES.USAGE_LIMIT_REACHED)
  }
  if (subtotal < coupon.min_order_amount) throw notApplicable(COUPON_MESSAGES.MIN_ORDER_NOT_REACHED)
  if (coupon.per_user_limit !== null) {
    //đơn đã huỷ thì không tính vào số lượt đã dùng
    const used = await orders.count({ where: { user_id, coupon_id: coupon.id, status: { not: 'Cancelled' } } })
    if (used >= coupon.per_user_limit) throw notApplicable(COUPON_MESSAGES.PER_USER_LIMIT_REACHED)
  }
}

//các ràng buộc giữa nhiều trường mà validator từng-trường không kiểm tra được
const assertValidShape = (data: {
  discount_type: DiscountType
  discount_value: number
  starts_at: Date | null
  expires_at: Date | null
}) => {
  if (data.discount_type === DiscountType.Percent && data.discount_value > 100) {
    throw notApplicable(COUPON_MESSAGES.PERCENT_MUST_BE_FROM_1_TO_100)
  }
  if (data.starts_at && data.expires_at && data.expires_at <= data.starts_at) {
    throw notApplicable(COUPON_MESSAGES.EXPIRES_MUST_BE_AFTER_STARTS)
  }
}

class CouponsServices {
  //---------------- khách hàng ----------------
  //xem trước: áp mã này vào giỏ hiện tại thì được giảm bao nhiêu
  async preview(user_id: string, code: string) {
    const cartItems = await databaseService.cartItems.findMany({ where: { user_id }, include: { variant: true } })
    if (cartItems.length === 0) throw notApplicable(COUPON_MESSAGES.CART_IS_EMPTY)
    const subtotal = cartItems.reduce((sum, item) => sum + item.variant.price * item.quantity, 0)
    const coupon = await databaseService.coupons.findUnique({ where: { code } })
    if (!coupon) throw couponNotFound()
    await assertApplicable(databaseService.orders, coupon, user_id, subtotal)
    const discount_amount = calculateDiscount(coupon, subtotal)
    const shipping_fee = calculateShippingFee(subtotal - discount_amount)
    return {
      coupon: { code: coupon.code, description: coupon.description },
      subtotal_amount: subtotal,
      discount_amount,
      shipping_fee,
      total_amount: subtotal - discount_amount + shipping_fee //đúng bằng total_amount của đơn nếu đặt ngay
    }
  }

  //dùng khi tạo đơn (chạy trong transaction của đơn): kiểm tra + giữ 1 lượt dùng
  async redeem(tx: Tx, user_id: string, code: string, subtotal: number) {
    //khoá dòng user để các đơn song song của cùng 1 khách xếp hàng -> per_user_limit không bị vượt
    await lockUserRow(tx, user_id)
    const coupon = await tx.coupon.findUnique({ where: { code } })
    if (!coupon) throw couponNotFound()
    await assertApplicable(tx.order, coupon, user_id, subtotal)
    //tăng used_count bằng 1 câu lệnh có điều kiện: nhiều người dùng mã cùng lúc cũng không vượt usage_limit
    const updated = await tx.$executeRaw`
      UPDATE coupons SET used_count = used_count + 1
      WHERE id = ${coupon.id}::uuid AND (usage_limit IS NULL OR used_count < usage_limit)`
    if (updated === 0) throw notApplicable(COUPON_MESSAGES.USAGE_LIMIT_REACHED)
    return { coupon_id: coupon.id, coupon_code: coupon.code, discount_amount: calculateDiscount(coupon, subtotal) }
  }

  //đơn bị huỷ thì trả lại lượt dùng
  async release(tx: Tx, coupon_id: string) {
    await tx.coupon.updateMany({
      where: { id: coupon_id, used_count: { gt: 0 } },
      data: { used_count: { decrement: 1 } }
    })
  }

  //---------------- Admin / Staff ----------------
  async getList(query: CouponListQuery) {
    const { page, limit, skip, take } = getPagination(query)
    const where: Prisma.CouponWhereInput = {
      ...(query.search && { code: { contains: query.search, mode: 'insensitive' } }),
      ...(query.is_active !== undefined && { is_active: query.is_active === 'true' })
    }
    const [items, total] = await Promise.all([
      databaseService.coupons.findMany({ where, orderBy: [{ created_at: 'desc' }, { id: 'asc' }], skip, take }),
      databaseService.coupons.count({ where })
    ])
    return buildPage({ items, total, page, limit })
  }

  async getById(id: string) {
    const coupon = await databaseService.coupons.findUnique({ where: { id } })
    if (!coupon) throw couponNotFound()
    return coupon
  }

  async create(payload: CouponReqBody) {
    const data = { ...payload, starts_at: payload.starts_at ?? null, expires_at: payload.expires_at ?? null }
    assertValidShape(data)
    try {
      return await databaseService.coupons.create({ data })
    } catch (error) {
      if (isPrismaError(error, 'P2002')) {
        throw new ErrorWithStatus({ status: HTTP_STATUS.CONFLICT, message: COUPON_MESSAGES.CODE_ALREADY_EXISTS })
      }
      throw error
    }
  }

  async update(id: string, payload: UpdateCouponReqBody) {
    const current = await this.getById(id)
    assertValidShape({
      discount_type: payload.discount_type ?? current.discount_type,
      discount_value: payload.discount_value ?? current.discount_value,
      starts_at: payload.starts_at === undefined ? current.starts_at : payload.starts_at,
      expires_at: payload.expires_at === undefined ? current.expires_at : payload.expires_at
    })
    try {
      return await databaseService.coupons.update({ where: { id }, data: payload })
    } catch (error) {
      if (isPrismaError(error, 'P2025')) throw couponNotFound()
      if (isPrismaError(error, 'P2002')) {
        throw new ErrorWithStatus({ status: HTTP_STATUS.CONFLICT, message: COUPON_MESSAGES.CODE_ALREADY_EXISTS })
      }
      throw error
    }
  }

  //xoá cứng: các đơn đã dùng mã vẫn giữ coupon_code + discount_amount (coupon_id chuyển thành null)
  async delete(id: string) {
    try {
      await databaseService.coupons.delete({ where: { id } })
    } catch (error) {
      if (isPrismaError(error, 'P2025')) throw couponNotFound()
      throw error
    }
  }
}

const couponsServices = new CouponsServices()
export default couponsServices
