import databaseService from './database.services'
import HTTP_STATUS from '~/constants/httpStatus'
import { CART_MESSAGES } from '~/constants/messages'
import { ErrorWithStatus } from '~/models/Errors'

const itemNotFound = () => new ErrorWithStatus({ status: HTTP_STATUS.NOT_FOUND, message: CART_MESSAGES.ITEM_NOT_FOUND })
const notEnoughStock = () =>
  new ErrorWithStatus({ status: HTTP_STATUS.CONFLICT, message: CART_MESSAGES.NOT_ENOUGH_STOCK })

class CartsServices {
  async getCart(user_id: string) {
    const rows = await databaseService.cartItems.findMany({
      where: { user_id },
      orderBy: { created_at: 'asc' },
      include: {
        product: {
          select: { id: true, name: true, slug: true, price: true, stock: true, images: true, is_active: true }
        }
      }
    })
    const items = rows.map((row) => ({
      product: row.product,
      quantity: row.quantity,
      subtotal: row.product.price * row.quantity,
      //false nếu sản phẩm đã bị ẩn hoặc không đủ hàng -> FE cảnh báo trước khi đặt
      available: row.product.is_active && row.product.stock >= row.quantity
    }))
    return {
      items,
      total_quantity: items.reduce((sum, item) => sum + item.quantity, 0),
      total_amount: items.reduce((sum, item) => sum + item.subtotal, 0)
    }
  }

  //thêm vào giỏ: nếu đã có thì cộng dồn số lượng
  async addItem({ user_id, product_id, quantity }: { user_id: string; product_id: string; quantity: number }) {
    const product = await databaseService.products.findFirst({
      where: { id: product_id, is_active: true },
      select: { stock: true }
    })
    if (!product) {
      throw new ErrorWithStatus({ status: HTTP_STATUS.NOT_FOUND, message: CART_MESSAGES.PRODUCT_NOT_AVAILABLE })
    }
    const existing = await databaseService.cartItems.findUnique({
      where: { user_id_product_id: { user_id, product_id } },
      select: { quantity: true }
    })
    const newQuantity = (existing?.quantity ?? 0) + quantity
    if (newQuantity > product.stock) throw notEnoughStock()
    await databaseService.cartItems.upsert({
      where: { user_id_product_id: { user_id, product_id } },
      create: { user_id, product_id, quantity },
      update: { quantity: newQuantity }
    })
    return this.getCart(user_id)
  }

  //đặt lại số lượng của 1 dòng trong giỏ
  async updateItem({ user_id, product_id, quantity }: { user_id: string; product_id: string; quantity: number }) {
    const item = await databaseService.cartItems.findUnique({
      where: { user_id_product_id: { user_id, product_id } },
      include: { product: { select: { stock: true, is_active: true } } }
    })
    if (!item) throw itemNotFound()
    if (!item.product.is_active) {
      throw new ErrorWithStatus({ status: HTTP_STATUS.NOT_FOUND, message: CART_MESSAGES.PRODUCT_NOT_AVAILABLE })
    }
    if (quantity > item.product.stock) throw notEnoughStock()
    await databaseService.cartItems.update({
      where: { user_id_product_id: { user_id, product_id } },
      data: { quantity }
    })
    return this.getCart(user_id)
  }

  async removeItem({ user_id, product_id }: { user_id: string; product_id: string }) {
    const { count } = await databaseService.cartItems.deleteMany({ where: { user_id, product_id } })
    if (count === 0) throw itemNotFound()
    return this.getCart(user_id)
  }

  async clear(user_id: string) {
    await databaseService.cartItems.deleteMany({ where: { user_id } })
  }
}

const cartsServices = new CartsServices()
export default cartsServices
