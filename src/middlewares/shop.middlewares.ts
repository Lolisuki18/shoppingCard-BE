//các validator dùng chung cho nhóm API shop (category, product, cart, order)
import { checkSchema, CustomValidator, ParamSchema } from 'express-validator'
import { DiscountType, OrderStatus } from '@prisma/client'
import {
  ADDRESS_MESSAGES,
  CART_MESSAGES,
  CATEGORY_MESSAGES,
  COMMON_MESSAGES,
  COUPON_MESSAGES,
  ORDER_MESSAGES,
  PRODUCT_MESSAGES,
  REVIEW_MESSAGES,
  STATS_MESSAGES,
  VARIANT_MESSAGES,
  WISHLIST_MESSAGES
} from '~/constants/messages'
import { validate } from '~/utils/validation'

const uuidSchema = (errorMessage: string): ParamSchema => ({
  isUUID: { errorMessage }
})

//kiểm tra :id trên đường dẫn có phải UUID không (tránh để database báo lỗi 500)
export const idParamValidator = validate(
  checkSchema({ id: { in: ['params'], ...uuidSchema(COMMON_MESSAGES.ID_IS_INVALID) } })
)

//?page=1&limit=20
const paginationSchema: Record<'page' | 'limit', ParamSchema> = {
  page: {
    in: ['query'],
    optional: true,
    isInt: { options: { min: 1 }, errorMessage: COMMON_MESSAGES.PAGE_MUST_BE_A_POSITIVE_INTEGER },
    toInt: true
  },
  limit: {
    in: ['query'],
    optional: true,
    isInt: { options: { min: 1, max: 100 }, errorMessage: COMMON_MESSAGES.LIMIT_MUST_BE_FROM_1_TO_100 },
    toInt: true
  }
}

export const paginationValidator = validate(checkSchema(paginationSchema))

//---------------- category ----------------
const categoryNameSchema: ParamSchema = {
  isString: { errorMessage: CATEGORY_MESSAGES.NAME_IS_REQUIRED },
  trim: true,
  isLength: { options: { min: 1, max: 100 }, errorMessage: CATEGORY_MESSAGES.NAME_LENGTH_MUST_BE_FROM_1_TO_100 }
}
const categoryDescriptionSchema: ParamSchema = {
  optional: true,
  isString: { errorMessage: CATEGORY_MESSAGES.DESCRIPTION_MUST_BE_A_STRING },
  trim: true,
  isLength: { options: { max: 500 }, errorMessage: CATEGORY_MESSAGES.DESCRIPTION_LENGTH_MUST_BE_LESS_THAN_500 }
}

export const createCategoryValidator = validate(
  checkSchema({ name: categoryNameSchema, description: categoryDescriptionSchema }, ['body'])
)
export const updateCategoryValidator = validate(
  checkSchema({ name: { optional: true, ...categoryNameSchema }, description: categoryDescriptionSchema }, ['body'])
)

//---------------- product ----------------
const productNameSchema: ParamSchema = {
  isString: { errorMessage: PRODUCT_MESSAGES.NAME_IS_REQUIRED },
  trim: true,
  isLength: { options: { min: 1, max: 200 }, errorMessage: PRODUCT_MESSAGES.NAME_LENGTH_MUST_BE_FROM_1_TO_200 }
}
const productDescriptionSchema: ParamSchema = {
  optional: true,
  isString: { errorMessage: PRODUCT_MESSAGES.DESCRIPTION_MUST_BE_A_STRING },
  trim: true,
  isLength: { options: { max: 5000 }, errorMessage: PRODUCT_MESSAGES.DESCRIPTION_LENGTH_MUST_BE_LESS_THAN_5000 }
}
const priceSchema: ParamSchema = {
  isInt: { options: { min: 0 }, errorMessage: PRODUCT_MESSAGES.PRICE_MUST_BE_A_NON_NEGATIVE_INTEGER },
  toInt: true
}
const stockSchema: ParamSchema = {
  optional: true,
  isInt: { options: { min: 0 }, errorMessage: PRODUCT_MESSAGES.STOCK_MUST_BE_A_NON_NEGATIVE_INTEGER },
  toInt: true
}
const imagesSchema: ParamSchema = {
  optional: true,
  custom: {
    options: (value: unknown) => {
      const ok =
        Array.isArray(value) &&
        value.length <= 10 &&
        value.every((url) => typeof url === 'string' && url.length >= 1 && url.length <= 400)
      if (!ok) throw new Error(PRODUCT_MESSAGES.IMAGES_MUST_BE_AN_ARRAY_OF_URLS)
      return true
    }
  }
}
const isActiveSchema: ParamSchema = {
  optional: true,
  isBoolean: { options: { strict: true }, errorMessage: PRODUCT_MESSAGES.IS_ACTIVE_MUST_BE_A_BOOLEAN }
}

//---------------- variant ----------------
const variantNameSchema: ParamSchema = {
  isString: { errorMessage: VARIANT_MESSAGES.NAME_IS_REQUIRED },
  trim: true,
  isLength: { options: { min: 1, max: 100 }, errorMessage: VARIANT_MESSAGES.NAME_IS_REQUIRED }
}
const variantSkuSchema: ParamSchema = {
  optional: { options: { nullable: true } },
  isString: { errorMessage: VARIANT_MESSAGES.SKU_IS_INVALID },
  trim: true,
  isLength: { options: { min: 1, max: 64 }, errorMessage: VARIANT_MESSAGES.SKU_IS_INVALID }
}
const variantPriceSchema: ParamSchema = {
  isInt: { options: { min: 0 }, errorMessage: VARIANT_MESSAGES.PRICE_MUST_BE_A_NON_NEGATIVE_INTEGER },
  toInt: true
}
const variantStockSchema: ParamSchema = {
  optional: true,
  isInt: { options: { min: 0 }, errorMessage: VARIANT_MESSAGES.STOCK_MUST_BE_A_NON_NEGATIVE_INTEGER },
  toInt: true
}
const variantIsActiveSchema: ParamSchema = {
  optional: true,
  isBoolean: { options: { strict: true }, errorMessage: VARIANT_MESSAGES.IS_ACTIVE_MUST_BE_A_BOOLEAN }
}

export const createVariantValidator = validate(
  checkSchema(
    {
      name: variantNameSchema,
      sku: variantSkuSchema,
      price: variantPriceSchema,
      stock: variantStockSchema,
      is_active: variantIsActiveSchema
    },
    ['body']
  )
)
export const updateVariantValidator = validate(
  checkSchema(
    {
      name: { optional: true, ...variantNameSchema },
      sku: variantSkuSchema,
      price: { optional: true, ...variantPriceSchema },
      stock: variantStockSchema,
      is_active: variantIsActiveSchema
    },
    ['body']
  )
)
export const variantParamValidator = validate(
  checkSchema({
    id: { in: ['params'], ...uuidSchema(COMMON_MESSAGES.ID_IS_INVALID) },
    variant_id: { in: ['params'], ...uuidSchema(VARIANT_MESSAGES.ID_IS_INVALID) }
  })
)

//mảng variants khi tạo sản phẩm: kiểm tra từng phần tử (và chuẩn hoá name/sku) ngay tại đây
const variantsSchema: ParamSchema = {
  optional: true,
  custom: {
    options: (value: unknown) => {
      if (!Array.isArray(value) || value.length < 1 || value.length > 50) {
        throw new Error(PRODUCT_MESSAGES.VARIANTS_MUST_BE_A_LIST)
      }
      const names = new Set<string>()
      for (const raw of value) {
        const v = raw as Record<string, unknown>
        if (!raw || typeof raw !== 'object' || typeof v.name !== 'string')
          throw new Error(VARIANT_MESSAGES.NAME_IS_REQUIRED)
        const name = v.name.trim()
        if (name.length < 1 || name.length > 100) throw new Error(VARIANT_MESSAGES.NAME_IS_REQUIRED)
        if (names.has(name.toLowerCase())) throw new Error(VARIANT_MESSAGES.NAMES_MUST_BE_UNIQUE)
        names.add(name.toLowerCase())
        v.name = name
        if (!Number.isInteger(v.price) || (v.price as number) < 0) {
          throw new Error(VARIANT_MESSAGES.PRICE_MUST_BE_A_NON_NEGATIVE_INTEGER)
        }
        if (v.stock !== undefined && (!Number.isInteger(v.stock) || (v.stock as number) < 0)) {
          throw new Error(VARIANT_MESSAGES.STOCK_MUST_BE_A_NON_NEGATIVE_INTEGER)
        }
        if (v.sku !== undefined && v.sku !== null) {
          if (typeof v.sku !== 'string' || v.sku.trim().length < 1 || v.sku.trim().length > 64) {
            throw new Error(VARIANT_MESSAGES.SKU_IS_INVALID)
          }
          v.sku = v.sku.trim()
        }
        if (v.is_active !== undefined && typeof v.is_active !== 'boolean') {
          throw new Error(VARIANT_MESSAGES.IS_ACTIVE_MUST_BE_A_BOOLEAN)
        }
        //chỉ giữ các trường hợp lệ
        for (const key of Object.keys(v))
          if (!['name', 'sku', 'price', 'stock', 'is_active'].includes(key)) delete v[key]
      }
      return true
    }
  }
}
//price chỉ bắt buộc khi sản phẩm không có variants
const noVariants: CustomValidator = (value, { req }) => !(Array.isArray(req.body?.variants) && req.body.variants.length)

export const createProductValidator = validate(
  checkSchema(
    {
      category_id: uuidSchema(PRODUCT_MESSAGES.CATEGORY_ID_IS_REQUIRED),
      name: productNameSchema,
      description: productDescriptionSchema,
      price: { ...priceSchema, isInt: { ...(priceSchema.isInt as object), if: noVariants } },
      stock: stockSchema,
      variants: variantsSchema,
      images: imagesSchema,
      is_active: isActiveSchema
    },
    ['body']
  )
)
export const updateProductValidator = validate(
  checkSchema(
    {
      category_id: { optional: true, ...uuidSchema(PRODUCT_MESSAGES.CATEGORY_ID_IS_REQUIRED) },
      name: { optional: true, ...productNameSchema },
      description: productDescriptionSchema,
      price: { optional: true, ...priceSchema },
      stock: stockSchema,
      images: imagesSchema,
      is_active: isActiveSchema
    },
    ['body']
  )
)

export const productListValidator = validate(
  checkSchema({
    ...paginationSchema,
    search: { in: ['query'], optional: true, isString: true, trim: true },
    category_id: { in: ['query'], optional: true, ...uuidSchema(COMMON_MESSAGES.ID_IS_INVALID) },
    min_price: {
      in: ['query'],
      optional: true,
      isInt: { options: { min: 0 }, errorMessage: PRODUCT_MESSAGES.MIN_PRICE_MUST_BE_A_NON_NEGATIVE_INTEGER },
      toInt: true
    },
    max_price: {
      in: ['query'],
      optional: true,
      isInt: { options: { min: 0 }, errorMessage: PRODUCT_MESSAGES.MAX_PRICE_MUST_BE_A_NON_NEGATIVE_INTEGER },
      toInt: true
    },
    sort: {
      in: ['query'],
      optional: true,
      isIn: {
        options: [['newest', 'price_asc', 'price_desc', 'name', 'rating']],
        errorMessage: PRODUCT_MESSAGES.SORT_IS_INVALID
      }
    }
  })
)

//---------------- cart ----------------
const quantitySchema: ParamSchema = {
  isInt: { options: { min: 1, max: 999 }, errorMessage: CART_MESSAGES.QUANTITY_MUST_BE_FROM_1_TO_999 },
  toInt: true
}
const variantIdSchema: ParamSchema = { optional: true, ...uuidSchema(VARIANT_MESSAGES.ID_IS_INVALID) }
export const addToCartValidator = validate(
  checkSchema(
    {
      product_id: uuidSchema(CART_MESSAGES.PRODUCT_ID_IS_INVALID),
      variant_id: variantIdSchema,
      quantity: quantitySchema
    },
    ['body']
  )
)
export const updateCartItemValidator = validate(
  checkSchema({
    product_id: { in: ['params'], ...uuidSchema(CART_MESSAGES.PRODUCT_ID_IS_INVALID) },
    variant_id: { in: ['body'], ...variantIdSchema },
    quantity: { in: ['body'], ...quantitySchema }
  })
)
//DELETE /cart/items/:product_id?variant_id=
export const cartItemParamValidator = validate(
  checkSchema({
    product_id: { in: ['params'], ...uuidSchema(CART_MESSAGES.PRODUCT_ID_IS_INVALID) },
    variant_id: { in: ['query'], ...variantIdSchema }
  })
)

//---------------- coupon ----------------
//mã luôn được chuẩn hoá thành IN HOA (khách gõ "sale10" vẫn dùng được mã SALE10)
const couponCodeSchema = ({ optional }: { optional: boolean }): ParamSchema => ({
  optional,
  isString: { errorMessage: COUPON_MESSAGES.CODE_IS_INVALID },
  trim: true,
  toUpperCase: true,
  matches: { options: /^[A-Z0-9_-]{3,32}$/, errorMessage: COUPON_MESSAGES.CODE_IS_INVALID }
})
const nullableInt = (min: number, errorMessage: string): ParamSchema => ({
  optional: { options: { nullable: true } },
  isInt: { options: { min }, errorMessage },
  toInt: true
})
const nullableDate: ParamSchema = {
  optional: { options: { nullable: true } },
  isISO8601: { errorMessage: COUPON_MESSAGES.DATE_IS_INVALID },
  toDate: true
}
const couponFields = (isCreate: boolean): Record<string, ParamSchema> => {
  const required = (schema: ParamSchema): ParamSchema => (isCreate ? schema : { optional: true, ...schema })
  return {
    code: isCreate ? couponCodeSchema({ optional: false }) : couponCodeSchema({ optional: true }),
    description: {
      optional: true,
      isString: { errorMessage: COUPON_MESSAGES.DESCRIPTION_LENGTH_MUST_BE_LESS_THAN_500 },
      trim: true,
      isLength: { options: { max: 500 }, errorMessage: COUPON_MESSAGES.DESCRIPTION_LENGTH_MUST_BE_LESS_THAN_500 }
    },
    discount_type: required({
      isIn: { options: [Object.values(DiscountType)], errorMessage: COUPON_MESSAGES.DISCOUNT_TYPE_IS_INVALID }
    }),
    discount_value: required({
      isInt: { options: { min: 1 }, errorMessage: COUPON_MESSAGES.DISCOUNT_VALUE_MUST_BE_A_POSITIVE_INTEGER },
      toInt: true
    }),
    min_order_amount: {
      optional: true,
      isInt: { options: { min: 0 }, errorMessage: COUPON_MESSAGES.MIN_ORDER_AMOUNT_MUST_BE_A_NON_NEGATIVE_INTEGER },
      toInt: true
    },
    max_discount_amount: nullableInt(1, COUPON_MESSAGES.MAX_DISCOUNT_AMOUNT_MUST_BE_A_POSITIVE_INTEGER),
    usage_limit: nullableInt(1, COUPON_MESSAGES.USAGE_LIMIT_MUST_BE_A_POSITIVE_INTEGER),
    per_user_limit: nullableInt(1, COUPON_MESSAGES.PER_USER_LIMIT_MUST_BE_A_POSITIVE_INTEGER),
    starts_at: nullableDate,
    expires_at: nullableDate,
    is_active: {
      optional: true,
      isBoolean: { options: { strict: true }, errorMessage: COUPON_MESSAGES.IS_ACTIVE_MUST_BE_A_BOOLEAN }
    }
  }
}
export const createCouponValidator = validate(checkSchema(couponFields(true), ['body']))
export const updateCouponValidator = validate(checkSchema(couponFields(false), ['body']))
export const validateCouponValidator = validate(checkSchema({ code: couponCodeSchema({ optional: false }) }, ['body']))
export const couponListValidator = validate(
  checkSchema({
    ...paginationSchema,
    search: { in: ['query'], optional: true, isString: true, trim: true },
    is_active: {
      in: ['query'],
      optional: true,
      isIn: { options: [['true', 'false']], errorMessage: COUPON_MESSAGES.IS_ACTIVE_MUST_BE_A_BOOLEAN }
    }
  })
)

//---------------- address ----------------
const PHONE_REGEX = /^(0|\+84)\d{9,10}$/
const addressFields = (isCreate: boolean): Record<string, ParamSchema> => {
  const required = (schema: ParamSchema): ParamSchema => (isCreate ? schema : { optional: true, ...schema })
  return {
    name: required({
      isString: { errorMessage: ADDRESS_MESSAGES.NAME_IS_REQUIRED },
      trim: true,
      isLength: { options: { min: 1, max: 100 }, errorMessage: ADDRESS_MESSAGES.NAME_IS_REQUIRED }
    }),
    phone: required({
      isString: { errorMessage: ADDRESS_MESSAGES.PHONE_IS_INVALID },
      trim: true,
      matches: { options: PHONE_REGEX, errorMessage: ADDRESS_MESSAGES.PHONE_IS_INVALID }
    }),
    address: required({
      isString: { errorMessage: ADDRESS_MESSAGES.ADDRESS_IS_REQUIRED },
      trim: true,
      isLength: { options: { min: 1, max: 300 }, errorMessage: ADDRESS_MESSAGES.ADDRESS_IS_REQUIRED }
    }),
    is_default: {
      optional: true,
      isBoolean: { options: { strict: true }, errorMessage: ADDRESS_MESSAGES.IS_DEFAULT_MUST_BE_A_BOOLEAN }
    }
  }
}
export const createAddressValidator = validate(checkSchema(addressFields(true), ['body']))
export const updateAddressValidator = validate(checkSchema(addressFields(false), ['body']))

//---------------- order ----------------
//chỉ bắt buộc các trường shipping_* khi KHÔNG có address_id: điều kiện `if` gắn vào validator đầu tiên (isString),
//khi điều kiện sai thì cả chuỗi kiểm tra phía sau bị bỏ qua
const noAddressId: CustomValidator = (value, { req }) => !req.body?.address_id
const unlessAddressId = (schema: ParamSchema): ParamSchema => ({
  ...schema,
  isString: { ...(schema.isString as object), if: noAddressId }
})
export const createOrderValidator = validate(
  checkSchema(
    {
      address_id: { optional: true, ...uuidSchema(ADDRESS_MESSAGES.ID_IS_INVALID) },
      //có address_id thì lấy thông tin giao hàng từ sổ địa chỉ, không bắt buộc 3 trường shipping_*
      shipping_name: unlessAddressId({
        isString: { errorMessage: ORDER_MESSAGES.SHIPPING_NAME_IS_REQUIRED },
        trim: true,
        isLength: { options: { min: 1, max: 100 }, errorMessage: ORDER_MESSAGES.SHIPPING_NAME_IS_REQUIRED }
      }),
      shipping_phone: unlessAddressId({
        isString: { errorMessage: ORDER_MESSAGES.SHIPPING_PHONE_IS_INVALID },
        trim: true,
        matches: { options: PHONE_REGEX, errorMessage: ORDER_MESSAGES.SHIPPING_PHONE_IS_INVALID }
      }),
      shipping_address: unlessAddressId({
        isString: { errorMessage: ORDER_MESSAGES.SHIPPING_ADDRESS_IS_REQUIRED },
        trim: true,
        isLength: { options: { min: 1, max: 300 }, errorMessage: ORDER_MESSAGES.SHIPPING_ADDRESS_IS_REQUIRED }
      }),
      note: {
        optional: true,
        isString: { errorMessage: ORDER_MESSAGES.NOTE_LENGTH_MUST_BE_LESS_THAN_500 },
        trim: true,
        isLength: { options: { max: 500 }, errorMessage: ORDER_MESSAGES.NOTE_LENGTH_MUST_BE_LESS_THAN_500 }
      },
      coupon_code: couponCodeSchema({ optional: true })
    },
    ['body']
  )
)

const statusValues = Object.values(OrderStatus)
export const updateOrderStatusValidator = validate(
  checkSchema({ status: { isIn: { options: [statusValues], errorMessage: ORDER_MESSAGES.STATUS_IS_INVALID } } }, [
    'body'
  ])
)
export const orderListValidator = validate(
  checkSchema({
    ...paginationSchema,
    status: {
      in: ['query'],
      optional: true,
      isIn: { options: [statusValues], errorMessage: ORDER_MESSAGES.STATUS_IS_INVALID }
    }
  })
)

//---------------- review ----------------
const ratingSchema: ParamSchema = {
  isInt: { options: { min: 1, max: 5 }, errorMessage: REVIEW_MESSAGES.RATING_MUST_BE_FROM_1_TO_5 },
  toInt: true
}
const reviewCommentSchema: ParamSchema = {
  optional: true,
  isString: { errorMessage: REVIEW_MESSAGES.COMMENT_LENGTH_MUST_BE_LESS_THAN_2000 },
  trim: true,
  isLength: { options: { max: 2000 }, errorMessage: REVIEW_MESSAGES.COMMENT_LENGTH_MUST_BE_LESS_THAN_2000 }
}
export const createReviewValidator = validate(
  checkSchema({ rating: ratingSchema, comment: reviewCommentSchema }, ['body'])
)
export const updateReviewValidator = validate(
  checkSchema({ rating: { optional: true, ...ratingSchema }, comment: reviewCommentSchema }, ['body'])
)

//---------------- wishlist ----------------
export const addToWishlistValidator = validate(
  checkSchema({ product_id: uuidSchema(WISHLIST_MESSAGES.PRODUCT_ID_IS_INVALID) }, ['body'])
)
export const wishlistItemParamValidator = validate(
  checkSchema({ product_id: { in: ['params'], ...uuidSchema(WISHLIST_MESSAGES.PRODUCT_ID_IS_INVALID) } })
)

//---------------- thống kê (Admin) ----------------
const statsDateSchema = (field: 'from' | 'to'): ParamSchema => ({
  in: ['query'],
  optional: true,
  isISO8601: { errorMessage: STATS_MESSAGES.DATE_IS_INVALID },
  toDate: true,
  custom: {
    //from phải đứng trước to (chỉ kiểm tra ở ô 'to' để báo lỗi 1 lần)
    options: (value: Date, { req }) => {
      if (field === 'to' && req.query?.from instanceof Date && value <= req.query.from) {
        throw new Error(STATS_MESSAGES.RANGE_IS_INVALID)
      }
      return true
    }
  }
})
const statsRangeSchema = { from: statsDateSchema('from'), to: statsDateSchema('to') }

export const overviewStatsValidator = validate(checkSchema(statsRangeSchema))
export const revenueStatsValidator = validate(
  checkSchema({
    ...statsRangeSchema,
    group_by: {
      in: ['query'],
      optional: true,
      isIn: { options: [['day', 'month']], errorMessage: STATS_MESSAGES.GROUP_BY_IS_INVALID }
    }
  })
)
export const topProductsValidator = validate(
  checkSchema({
    ...statsRangeSchema,
    limit: {
      in: ['query'],
      optional: true,
      isInt: { options: { min: 1, max: 50 }, errorMessage: STATS_MESSAGES.LIMIT_MUST_BE_FROM_1_TO_50 },
      toInt: true
    }
  })
)
export const lowStockValidator = validate(
  checkSchema({
    ...paginationSchema,
    threshold: {
      in: ['query'],
      optional: true,
      isInt: { options: { min: 0 }, errorMessage: STATS_MESSAGES.THRESHOLD_MUST_BE_A_NON_NEGATIVE_INTEGER },
      toInt: true
    }
  })
)
