import { OrderStatus, Prisma } from '@prisma/client'
import databaseService from './database.services'
import HTTP_STATUS from '~/constants/httpStatus'
import { ADDRESS_MESSAGES, ORDER_MESSAGES } from '~/constants/messages'
import { ErrorWithStatus } from '~/models/Errors'
import {
  CreateOrderReqBody,
  OrderListQuery,
  UpdateOrderStatusReqBody,
  UpdateTrackingReqBody
} from '~/models/requests/Shop.requests'
import { generateOrderCode } from '~/utils/orderCode'
import { buildPage, getPagination } from '~/utils/pagination'
import { syncProductAggregates } from '~/utils/productAggregates'
import { calculateShippingFee } from '~/utils/shipping'
import couponsServices from './coupons.services'
import mailServices from './mail.services'

type Tx = Prisma.TransactionClient

const orderNotFound = () => new ErrorWithStatus({ status: HTTP_STATUS.NOT_FOUND, message: ORDER_MESSAGES.NOT_FOUND })
const conflict = (message: string) => new ErrorWithStatus({ status: HTTP_STATUS.CONFLICT, message })

//trạng thái nào được chuyển sang trạng thái nào (Admin/Staff)
const ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  Pending: ['Confirmed', 'Cancelled'],
  Confirmed: ['Shipping', 'Cancelled'],
  Shipping: ['Delivered'],
  Delivered: [],
  Cancelled: []
}

//khách thấy dòng thời gian trạng thái (không có người thực hiện); Admin/Staff thấy thêm changed_by và thông tin khách
const customerInclude = {
  items: { orderBy: { product_name: 'asc' } },
  history: {
    orderBy: [{ created_at: 'asc' }, { id: 'asc' }],
    select: { from_status: true, to_status: true, note: true, created_at: true }
  }
} satisfies Prisma.OrderInclude
const adminInclude = {
  items: { orderBy: { product_name: 'asc' } },
  history: { orderBy: [{ created_at: 'asc' }, { id: 'asc' }] },
  user: { select: { id: true, name: true, email: true } }
} satisfies Prisma.OrderInclude
const includeFor = (admin: boolean) => (admin ? adminInclude : customerInclude)

//ghi 1 dòng vào nhật ký đổi trạng thái (changed_by null = hệ thống)
const recordHistory = (
  tx: Tx,
  order_id: string,
  from_status: OrderStatus | null,
  to_status: OrderStatus,
  { by, note }: { by: string | null; note?: string }
) => tx.orderStatusHistory.create({ data: { order_id, from_status, to_status, note: note ?? '', changed_by: by } })

//đổi trạng thái đơn sang Cancelled, trả hàng về kho và trả lại lượt dùng coupon (chạy trong transaction)
//updateMany kèm điều kiện status hiện tại để 2 request huỷ cùng lúc không trả kho 2 lần
const cancelAndRestock = async (
  tx: Tx,
  order_id: string,
  fromStatus: OrderStatus,
  { by, reason }: { by: string | null; reason?: string }
) => {
  const { count } = await tx.order.updateMany({
    where: { id: order_id, status: fromStatus },
    data: { status: 'Cancelled', cancelled_at: new Date(), cancel_reason: reason ?? '' }
  })
  if (count === 0) throw conflict(ORDER_MESSAGES.INVALID_STATUS_TRANSITION)
  await recordHistory(tx, order_id, fromStatus, 'Cancelled', { by, note: reason })
  const cancelled = await tx.order.findUnique({ where: { id: order_id }, select: { coupon_id: true } })
  if (cancelled?.coupon_id) await couponsServices.release(tx, cancelled.coupon_id)
  const items = await tx.orderItem.findMany({ where: { order_id }, orderBy: { variant_id: 'asc' } })
  const productIds = new Set<string>()
  for (const item of items) {
    //biến thể / sản phẩm có thể đã bị xoá (variant_id = null) thì bỏ qua
    if (item.variant_id) {
      await tx.productVariant.updateMany({
        where: { id: item.variant_id },
        data: { stock: { increment: item.quantity } }
      })
    }
    if (item.product_id) productIds.add(item.product_id)
  }
  for (const product_id of [...productIds].sort()) await syncProductAggregates(tx, product_id)
}

class OrdersServices {
  //tạo đơn từ giỏ hàng: kiểm tra + trừ kho + tạo đơn + xoá giỏ trong 1 transaction (lỗi giữa chừng thì rollback hết)
  async createFromCart(user_id: string, body: CreateOrderReqBody) {
    const order = await this.createOrderInTransaction(user_id, body)
    void mailServices.sendOrderMail(order.id, 'created') //sau khi đã commit; gửi lỗi không ảnh hưởng đơn
    return order
  }

  private async createOrderInTransaction(user_id: string, body: CreateOrderReqBody) {
    return databaseService.$transaction(async (tx) => {
      const cartItems = await tx.cartItem.findMany({
        where: { user_id },
        include: { product: true, variant: true },
        orderBy: { variant_id: 'asc' } //thứ tự cố định để 2 đơn song song không khoá chéo nhau (deadlock)
      })
      if (cartItems.length === 0) {
        throw new ErrorWithStatus({ status: HTTP_STATUS.UNPROCESSABLE_ENTITY, message: ORDER_MESSAGES.CART_IS_EMPTY })
      }

      for (const item of cartItems) {
        if (!item.product.is_active || !item.variant.is_active) throw conflict(ORDER_MESSAGES.PRODUCT_UNAVAILABLE)
        //trừ kho (của biến thể) bằng 1 câu lệnh có điều kiện stock >= quantity: an toàn khi nhiều người mua cùng lúc
        const { count } = await tx.productVariant.updateMany({
          where: { id: item.variant_id, is_active: true, stock: { gte: item.quantity } },
          data: { stock: { decrement: item.quantity } }
        })
        if (count === 0) throw conflict(ORDER_MESSAGES.NOT_ENOUGH_STOCK)
      }
      //cập nhật tồn kho tổng của từng sản phẩm (thứ tự cố định để không khoá chéo nhau)
      for (const product_id of [...new Set(cartItems.map((item) => item.product_id))].sort()) {
        await syncProductAggregates(tx, product_id)
      }

      const shipping = await this.resolveShipping(tx, user_id, body)
      const subtotal = cartItems.reduce((sum, item) => sum + item.variant.price * item.quantity, 0)
      const coupon = body.coupon_code
        ? await couponsServices.redeem(tx, user_id, body.coupon_code, subtotal)
        : { coupon_id: null, coupon_code: '', discount_amount: 0 }

      const goodsAmount = subtotal - coupon.discount_amount
      const shippingFee = calculateShippingFee(goodsAmount)

      const order = await tx.order.create({
        data: {
          code: await this.uniqueCode(tx),
          user_id,
          total_amount: goodsAmount + shippingFee,
          shipping_fee: shippingFee,
          coupon_id: coupon.coupon_id,
          coupon_code: coupon.coupon_code,
          discount_amount: coupon.discount_amount,
          shipping_name: shipping.name,
          shipping_phone: shipping.phone,
          shipping_address: shipping.address,
          note: body.note ?? '',
          history: { create: { from_status: null, to_status: 'Pending', changed_by: user_id } },
          items: {
            create: cartItems.map((item) => ({
              product_id: item.product_id,
              variant_id: item.variant_id,
              product_name: item.product.name,
              variant_name: item.variant.name,
              product_image: item.product.images[0] ?? '',
              unit_price: item.variant.price, //chốt giá tại thời điểm mua
              quantity: item.quantity
            }))
          }
        },
        include: customerInclude
      })
      await tx.cartItem.deleteMany({ where: { user_id } })
      return order
    })
  }

  //mã đơn chưa ai dùng (cột code có unique làm chốt chặn cuối nếu 2 đơn trùng mã cùng lúc)
  private async uniqueCode(tx: Tx) {
    for (let attempt = 0; attempt < 5; attempt++) {
      const code = generateOrderCode()
      if (!(await tx.order.findUnique({ where: { code }, select: { id: true } }))) return code
    }
    return generateOrderCode()
  }

  //thông tin giao hàng: lấy từ sổ địa chỉ (address_id) hoặc từ 3 trường shipping_* khách nhập (validator đã bắt buộc có 1 trong 2)
  private async resolveShipping(tx: Tx, user_id: string, body: CreateOrderReqBody) {
    if (body.address_id) {
      const saved = await tx.address.findFirst({ where: { id: body.address_id, user_id } })
      if (!saved) throw new ErrorWithStatus({ status: HTTP_STATUS.NOT_FOUND, message: ADDRESS_MESSAGES.NOT_FOUND })
      return { name: saved.name, phone: saved.phone, address: saved.address }
    }
    return {
      name: body.shipping_name as string,
      phone: body.shipping_phone as string,
      address: body.shipping_address as string
    }
  }

  //user_id có giá trị: chỉ lấy đơn của user đó (khách hàng). Bỏ trống: lấy tất cả (Admin/Staff)
  async getList(query: OrderListQuery, user_id?: string) {
    const admin = user_id === undefined
    const { page, limit, skip, take } = getPagination(query)
    const where: Prisma.OrderWhereInput = {
      ...(user_id && { user_id }),
      ...(query.status && { status: query.status as OrderStatus }),
      //tìm theo mã đơn; Admin/Staff tìm được thêm theo tên / số điện thoại người nhận
      ...(query.search && {
        OR: [
          { code: { contains: query.search, mode: 'insensitive' } },
          ...(admin
            ? [
                { shipping_name: { contains: query.search, mode: 'insensitive' as const } },
                { shipping_phone: { contains: query.search } }
              ]
            : [])
        ]
      })
    }
    const [items, total] = await Promise.all([
      databaseService.orders.findMany({
        where,
        orderBy: [{ created_at: 'desc' }, { id: 'asc' }],
        skip,
        take,
        include: includeFor(admin)
      }),
      databaseService.orders.count({ where })
    ])
    return buildPage({ items, total, page, limit })
  }

  //đơn của người khác vẫn trả 404 (không lộ là đơn đó có tồn tại)
  async getById(id: string, user_id?: string) {
    const order = await databaseService.orders.findFirst({
      where: { id, ...(user_id && { user_id }) },
      include: includeFor(user_id === undefined)
    })
    if (!order) throw orderNotFound()
    return order
  }

  //khách tự huỷ: chỉ khi đơn còn Pending
  async cancelByCustomer(id: string, user_id: string, reason?: string) {
    await databaseService.$transaction(async (tx) => {
      const order = await tx.order.findFirst({ where: { id, user_id }, select: { status: true } })
      if (!order) throw orderNotFound()
      if (order.status !== 'Pending') throw conflict(ORDER_MESSAGES.CANNOT_CANCEL)
      await cancelAndRestock(tx, id, 'Pending', { by: user_id, reason })
    })
    void mailServices.sendOrderMail(id, 'status')
    return this.getById(id, user_id)
  }

  //tự huỷ các đơn Pending quá lâu không được xác nhận: trả hàng về kho + trả lượt coupon. Trả về số đơn đã huỷ
  //nhiều instance chạy cùng lúc vẫn an toàn: cancelAndRestock chỉ thành công với instance đầu tiên (điều kiện status)
  async cancelExpiredPending(olderThanHours: number) {
    const cutoff = new Date(Date.now() - olderThanHours * 60 * 60 * 1000)
    const BATCH = 100
    let cancelled = 0
    for (;;) {
      const expired = await databaseService.orders.findMany({
        where: { status: 'Pending', created_at: { lt: cutoff } },
        select: { id: true },
        orderBy: { created_at: 'asc' },
        take: BATCH
      })
      let cancelledInBatch = 0
      for (const { id } of expired) {
        try {
          await databaseService.$transaction((tx) =>
            cancelAndRestock(tx, id, 'Pending', {
              by: null,
              reason: `Tự huỷ do quá ${olderThanHours} giờ chưa được xác nhận`
            })
          )
          cancelledInBatch++
          void mailServices.sendOrderMail(id, 'status')
        } catch (error) {
          //đơn vừa được xác nhận/huỷ bởi người khác giữa chừng -> bỏ qua đơn này
          if (!(error instanceof ErrorWithStatus && error.status === HTTP_STATUS.CONFLICT)) throw error
        }
      }
      cancelled += cancelledInBatch
      if (expired.length < BATCH || cancelledInBatch === 0) return cancelled
    }
  }

  //Admin/Staff đổi trạng thái theo bảng ALLOWED_TRANSITIONS. note = ghi chú (với Cancelled là lý do huỷ);
  //carrier + tracking_code chỉ đi kèm khi chuyển sang Shipping
  async updateStatus(id: string, body: UpdateOrderStatusReqBody, actor_id: string) {
    const { status, note, carrier, tracking_code } = body
    if ((carrier !== undefined || tracking_code !== undefined) && status !== 'Shipping') {
      throw new ErrorWithStatus({
        status: HTTP_STATUS.UNPROCESSABLE_ENTITY,
        message: ORDER_MESSAGES.TRACKING_ONLY_WITH_SHIPPING
      })
    }
    await databaseService.$transaction(async (tx) => {
      const order = await tx.order.findUnique({ where: { id }, select: { status: true } })
      if (!order) throw orderNotFound()
      if (!ALLOWED_TRANSITIONS[order.status].includes(status)) {
        throw conflict(ORDER_MESSAGES.INVALID_STATUS_TRANSITION)
      }
      if (status === 'Cancelled') {
        await cancelAndRestock(tx, id, order.status, { by: actor_id, reason: note })
        return
      }
      const { count } = await tx.order.updateMany({
        where: { id, status: order.status },
        data: {
          status,
          ...(status === 'Delivered' && { delivered_at: new Date() }),
          ...(carrier !== undefined && { carrier }),
          ...(tracking_code !== undefined && { tracking_code })
        }
      })
      if (count === 0) throw conflict(ORDER_MESSAGES.INVALID_STATUS_TRANSITION)
      await recordHistory(tx, id, order.status, status, { by: actor_id, note })
    })
    void mailServices.sendOrderMail(id, 'status')
    return this.getById(id)
  }

  //sửa đơn vị vận chuyển / mã vận đơn của đơn đang giao (vd nhập nhầm mã)
  async updateTracking(id: string, { carrier, tracking_code }: UpdateTrackingReqBody) {
    const { count } = await databaseService.orders.updateMany({
      where: { id, status: 'Shipping' },
      data: { ...(carrier !== undefined && { carrier }), ...(tracking_code !== undefined && { tracking_code }) }
    })
    if (count === 0) {
      //không tìm thấy hoặc không còn ở trạng thái Shipping
      await this.getById(id)
      throw conflict(ORDER_MESSAGES.TRACKING_ONLY_WHEN_SHIPPING)
    }
    return this.getById(id)
  }
}

const ordersServices = new OrdersServices()
export default ordersServices
