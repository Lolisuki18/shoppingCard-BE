import databaseService from './database.services'
import HTTP_STATUS from '~/constants/httpStatus'
import { CART_MESSAGES } from '~/constants/messages'
import { ErrorWithStatus } from '~/models/Errors'
import { calculateShippingFee, getShippingConfig } from '~/utils/shipping'

const itemNotFound = () => new ErrorWithStatus({ status: HTTP_STATUS.NOT_FOUND, message: CART_MESSAGES.ITEM_NOT_FOUND })
const notEnoughStock = () =>
  new ErrorWithStatus({ status: HTTP_STATUS.CONFLICT, message: CART_MESSAGES.NOT_ENOUGH_STOCK })
const variantRequired = () =>
  new ErrorWithStatus({ status: HTTP_STATUS.UNPROCESSABLE_ENTITY, message: CART_MESSAGES.VARIANT_REQUIRED })

class CartsServices {
  async getCart(user_id: string) {
    const rows = await databaseService.cartItems.findMany({
      where: { user_id },
      orderBy: [{ created_at: 'asc' }, { id: 'asc' }],
      include: {
        product: { select: { id: true, name: true, slug: true, images: true, is_active: true } },
        variant: { select: { id: true, name: true, sku: true, price: true, stock: true, is_active: true } }
      }
    })
    const items = rows.map((row) => ({
      //price/stock của product trong giỏ là của biến thể được chọn
      product: { ...row.product, price: row.variant.price, stock: row.variant.stock },
      variant: row.variant,
      quantity: row.quantity,
      subtotal: row.variant.price * row.quantity,
      //false nếu sản phẩm / biến thể đã bị ẩn hoặc không đủ hàng -> FE cảnh báo trước khi đặt
      available: row.product.is_active && row.variant.is_active && row.variant.stock >= row.quantity
    }))
    const total_amount = items.reduce((sum, item) => sum + item.subtotal, 0)
    //phí ship ước tính khi chưa áp mã giảm giá (giỏ trống thì 0); khi đặt hàng phí ship tính lại trên tiền hàng sau giảm giá
    const shipping_fee = items.length === 0 ? 0 : calculateShippingFee(total_amount)
    return {
      items,
      total_quantity: items.reduce((sum, item) => sum + item.quantity, 0),
      total_amount,
      shipping_fee,
      free_shipping_threshold: getShippingConfig().free_shipping_threshold
    }
  }

  //chọn biến thể: có variant_id thì dùng đúng biến thể đó; không có thì chỉ hợp lệ khi sản phẩm có đúng 1 biến thể đang bán
  private async resolveVariant(product_id: string, variant_id?: string) {
    const variants = await databaseService.variants.findMany({
      where: { product_id, is_active: true, product: { is_active: true }, ...(variant_id && { id: variant_id }) },
      select: { id: true, stock: true }
    })
    if (variants.length === 0) {
      throw new ErrorWithStatus({ status: HTTP_STATUS.NOT_FOUND, message: CART_MESSAGES.PRODUCT_NOT_AVAILABLE })
    }
    if (variants.length > 1) throw variantRequired()
    return variants[0]
  }

  //thêm vào giỏ: nếu đã có thì cộng dồn số lượng
  async addItem({
    user_id,
    product_id,
    variant_id,
    quantity
  }: {
    user_id: string
    product_id: string
    variant_id?: string
    quantity: number
  }) {
    const variant = await this.resolveVariant(product_id, variant_id)
    const key = { user_id_variant_id: { user_id, variant_id: variant.id } }
    const existing = await databaseService.cartItems.findUnique({ where: key, select: { quantity: true } })
    const newQuantity = (existing?.quantity ?? 0) + quantity
    if (newQuantity > variant.stock) throw notEnoughStock()
    await databaseService.cartItems.upsert({
      where: key,
      create: { user_id, product_id, variant_id: variant.id, quantity },
      update: { quantity: newQuantity }
    })
    return this.getCart(user_id)
  }

  //tìm dòng giỏ hàng của sản phẩm: có variant_id thì đúng biến thể đó, không có thì chỉ hợp lệ khi giỏ có đúng 1 dòng của sản phẩm
  private async findLine(user_id: string, product_id: string, variant_id?: string) {
    const lines = await databaseService.cartItems.findMany({
      where: { user_id, product_id, ...(variant_id && { variant_id }) },
      include: { product: { select: { is_active: true } }, variant: { select: { stock: true, is_active: true } } }
    })
    if (lines.length === 0) throw itemNotFound()
    if (lines.length > 1) throw variantRequired()
    return lines[0]
  }

  //đặt lại số lượng của 1 dòng trong giỏ
  async updateItem({
    user_id,
    product_id,
    variant_id,
    quantity
  }: {
    user_id: string
    product_id: string
    variant_id?: string
    quantity: number
  }) {
    const item = await this.findLine(user_id, product_id, variant_id)
    if (!item.product.is_active || !item.variant.is_active) {
      throw new ErrorWithStatus({ status: HTTP_STATUS.NOT_FOUND, message: CART_MESSAGES.PRODUCT_NOT_AVAILABLE })
    }
    if (quantity > item.variant.stock) throw notEnoughStock()
    await databaseService.cartItems.update({ where: { id: item.id }, data: { quantity } })
    return this.getCart(user_id)
  }

  async removeItem({ user_id, product_id, variant_id }: { user_id: string; product_id: string; variant_id?: string }) {
    const item = await this.findLine(user_id, product_id, variant_id)
    await databaseService.cartItems.delete({ where: { id: item.id } })
    return this.getCart(user_id)
  }

  async clear(user_id: string) {
    await databaseService.cartItems.deleteMany({ where: { user_id } })
  }
}

const cartsServices = new CartsServices()
export default cartsServices
