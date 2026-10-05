//định nghĩa những gì người dùng gửi lên cho các API shop (category, product, cart, order)
import { ParsedQs } from 'qs'
import { DiscountType, OrderStatus } from '@prisma/client'

//query phân trang dùng chung (validator đã ép về number)
export interface PaginationQuery extends ParsedQs {
  page?: any
  limit?: any
}

//category
export interface CategoryReqBody {
  name: string
  description?: string
}
export type UpdateCategoryReqBody = Partial<CategoryReqBody>

//product
export interface ProductReqBody {
  category_id: string
  name: string
  description?: string
  price: number
  stock?: number
  images?: string[]
  is_active?: boolean
}
export type UpdateProductReqBody = Partial<ProductReqBody>

export type ProductSort = 'newest' | 'price_asc' | 'price_desc' | 'name'
export interface ProductListQuery extends PaginationQuery {
  search?: string
  category_id?: string
  min_price?: any
  max_price?: any
  sort?: ProductSort | string
}

//cart
export interface AddToCartReqBody {
  product_id: string
  quantity: number
}
export interface UpdateCartItemReqBody {
  quantity: number
}

//order
export interface CreateOrderReqBody {
  shipping_name: string
  shipping_phone: string
  shipping_address: string
  note?: string
  coupon_code?: string
}
export interface UpdateOrderStatusReqBody {
  status: OrderStatus
}
export interface OrderListQuery extends PaginationQuery {
  status?: OrderStatus | string
}

//coupon
export interface CouponReqBody {
  code: string
  description?: string
  discount_type: DiscountType
  discount_value: number
  min_order_amount?: number
  max_discount_amount?: number | null
  usage_limit?: number | null
  per_user_limit?: number | null
  starts_at?: Date | null
  expires_at?: Date | null
  is_active?: boolean
}
export type UpdateCouponReqBody = Partial<CouponReqBody>
export interface ValidateCouponReqBody {
  code: string
}
export interface CouponListQuery extends PaginationQuery {
  search?: string
  is_active?: string
}
