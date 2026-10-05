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
export interface VariantReqBody {
  name: string
  sku?: string | null
  price: number
  stock?: number
  is_active?: boolean
}
export type UpdateVariantReqBody = Partial<VariantReqBody>

export interface ProductReqBody {
  category_id: string
  name: string
  description?: string
  //sản phẩm không có tuỳ chọn: truyền price (+ stock). Sản phẩm có size/màu...: truyền variants (price/stock bỏ qua)
  price?: number
  stock?: number
  variants?: VariantReqBody[]
  images?: string[]
  is_active?: boolean
}
export type UpdateProductReqBody = Partial<ProductReqBody>

export type ProductSort = 'newest' | 'price_asc' | 'price_desc' | 'name' | 'rating'
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
  variant_id?: string //bắt buộc nếu sản phẩm có nhiều biến thể
  quantity: number
}
export interface UpdateCartItemReqBody {
  variant_id?: string
  quantity: number
}

//order
export interface CreateOrderReqBody {
  //chọn 1 trong 2: address_id (địa chỉ trong sổ địa chỉ) hoặc nhập thẳng 3 trường shipping_*
  address_id?: string
  shipping_name?: string
  shipping_phone?: string
  shipping_address?: string
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

//review
export interface CreateReviewReqBody {
  rating: number
  comment?: string
}
export type UpdateReviewReqBody = Partial<CreateReviewReqBody>

//wishlist
export interface AddToWishlistReqBody {
  product_id: string
}

//thống kê (from tính, to KHÔNG tính: created_at >= from và < to)
export interface StatsRangeQuery extends ParsedQs {
  from?: any
  to?: any
}
export interface RevenueQuery extends StatsRangeQuery {
  group_by?: 'day' | 'month' | string
}
export interface TopProductsQuery extends StatsRangeQuery {
  limit?: any
}
export interface LowStockQuery extends PaginationQuery {
  threshold?: any
}

//address
export interface AddressReqBody {
  name: string
  phone: string
  address: string
  is_default?: boolean
}
export type UpdateAddressReqBody = Partial<AddressReqBody>

//quản lý người dùng (Admin)
export interface AdminUserListQuery extends PaginationQuery {
  search?: string
  role?: any
  verify?: any
}
export interface UpdateUserRoleReqBody {
  role: number
}
