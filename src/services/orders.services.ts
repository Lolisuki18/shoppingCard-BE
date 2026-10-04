import { OrderStatus, Prisma } from '@prisma/client'
import databaseService from './database.services'
import HTTP_STATUS from '~/constants/httpStatus'
import { ORDER_MESSAGES } from '~/constants/messages'
import { ErrorWithStatus } from '~/models/Errors'
import { CreateOrderReqBody, OrderListQuery } from '~/models/requests/Shop.requests'
import { buildPage, getPagination } from '~/utils/pagination'

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

const orderInclude = { items: { orderBy: { product_name: 'asc' } } } satisfies Prisma.OrderInclude

//đổi trạng thái đơn sang Cancelled và trả hàng về kho (chạy trong transaction)
//updateMany kèm điều kiện status hiện tại để 2 request huỷ cùng lúc không trả kho 2 lần
const cancelAndRestock = async (tx: Tx, order_id: string, fromStatus: OrderStatus) => {
  const { count } = await tx.order.updateMany({
    where: { id: order_id, status: fromStatus },
    data: { status: 'Cancelled' }
  })
  if (count === 0) throw conflict(ORDER_MESSAGES.INVALID_STATUS_TRANSITION)
  const items = await tx.orderItem.findMany({ where: { order_id } })
  for (const item of items) {
    if (item.product_id) {
      //sản phẩm có thể đã bị xoá (product_id = null) thì bỏ qua
      await tx.product.updateMany({ where: { id: item.product_id }, data: { stock: { increment: item.quantity } } })
    }
  }
}

class OrdersServices {
  //tạo đơn từ giỏ hàng: kiểm tra + trừ kho + tạo đơn + xoá giỏ trong 1 transaction (lỗi giữa chừng thì rollback hết)
  async createFromCart(user_id: string, body: CreateOrderReqBody) {
    return databaseService.$transaction(async (tx) => {
      const cartItems = await tx.cartItem.findMany({
        where: { user_id },
        include: { product: true },
        orderBy: { product_id: 'asc' } //thứ tự cố định để 2 đơn song song không khoá chéo nhau (deadlock)
      })
      if (cartItems.length === 0) {
        throw new ErrorWithStatus({ status: HTTP_STATUS.UNPROCESSABLE_ENTITY, message: ORDER_MESSAGES.CART_IS_EMPTY })
      }

      for (const item of cartItems) {
        if (!item.product.is_active) throw conflict(ORDER_MESSAGES.PRODUCT_UNAVAILABLE)
        //trừ kho bằng 1 câu lệnh có điều kiện stock >= quantity: an toàn khi nhiều người mua cùng lúc
        const { count } = await tx.product.updateMany({
          where: { id: item.product_id, is_active: true, stock: { gte: item.quantity } },
          data: { stock: { decrement: item.quantity } }
        })
        if (count === 0) throw conflict(ORDER_MESSAGES.NOT_ENOUGH_STOCK)
      }

      const order = await tx.order.create({
        data: {
          user_id,
          total_amount: cartItems.reduce((sum, item) => sum + item.product.price * item.quantity, 0),
          shipping_name: body.shipping_name,
          shipping_phone: body.shipping_phone,
          shipping_address: body.shipping_address,
          note: body.note ?? '',
          items: {
            create: cartItems.map((item) => ({
              product_id: item.product_id,
              product_name: item.product.name,
              product_image: item.product.images[0] ?? '',
              unit_price: item.product.price, //chốt giá tại thời điểm mua
              quantity: item.quantity
            }))
          }
        },
        include: orderInclude
      })
      await tx.cartItem.deleteMany({ where: { user_id } })
      return order
    })
  }

  //user_id có giá trị: chỉ lấy đơn của user đó (khách hàng). Bỏ trống: lấy tất cả (Admin/Staff)
  async getList(query: OrderListQuery, user_id?: string) {
    const { page, limit, skip, take } = getPagination(query)
    const where: Prisma.OrderWhereInput = {
      ...(user_id && { user_id }),
      ...(query.status && { status: query.status as OrderStatus })
    }
    const [items, total] = await Promise.all([
      databaseService.orders.findMany({
        where,
        orderBy: [{ created_at: 'desc' }, { id: 'asc' }],
        skip,
        take,
        include: orderInclude
      }),
      databaseService.orders.count({ where })
    ])
    return buildPage({ items, total, page, limit })
  }

  //đơn của người khác vẫn trả 404 (không lộ là đơn đó có tồn tại)
  async getById(id: string, user_id?: string) {
    const order = await databaseService.orders.findFirst({
      where: { id, ...(user_id && { user_id }) },
      include: orderInclude
    })
    if (!order) throw orderNotFound()
    return order
  }

  //khách tự huỷ: chỉ khi đơn còn Pending
  async cancelByCustomer(id: string, user_id: string) {
    await databaseService.$transaction(async (tx) => {
      const order = await tx.order.findFirst({ where: { id, user_id }, select: { status: true } })
      if (!order) throw orderNotFound()
      if (order.status !== 'Pending') throw conflict(ORDER_MESSAGES.CANNOT_CANCEL)
      await cancelAndRestock(tx, id, 'Pending')
    })
    return this.getById(id, user_id)
  }

  //Admin/Staff đổi trạng thái theo bảng ALLOWED_TRANSITIONS
  async updateStatus(id: string, status: OrderStatus) {
    await databaseService.$transaction(async (tx) => {
      const order = await tx.order.findUnique({ where: { id }, select: { status: true } })
      if (!order) throw orderNotFound()
      if (!ALLOWED_TRANSITIONS[order.status].includes(status)) {
        throw conflict(ORDER_MESSAGES.INVALID_STATUS_TRANSITION)
      }
      if (status === 'Cancelled') {
        await cancelAndRestock(tx, id, order.status)
      } else {
        const { count } = await tx.order.updateMany({ where: { id, status: order.status }, data: { status } })
        if (count === 0) throw conflict(ORDER_MESSAGES.INVALID_STATUS_TRANSITION)
      }
    })
    return this.getById(id)
  }
}

const ordersServices = new OrdersServices()
export default ordersServices
