//các validator dùng chung cho nhóm API shop (category, product, cart, order)
import { checkSchema, ParamSchema } from 'express-validator'
import { DiscountType, OrderStatus } from '@prisma/client'
import {
  CART_MESSAGES,
  CATEGORY_MESSAGES,
  COMMON_MESSAGES,
  COUPON_MESSAGES,
  ORDER_MESSAGES,
  PRODUCT_MESSAGES,
  REVIEW_MESSAGES,
  STATS_MESSAGES,
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

export const createProductValidator = validate(
  checkSchema(
    {
      category_id: uuidSchema(PRODUCT_MESSAGES.CATEGORY_ID_IS_REQUIRED),
      name: productNameSchema,
      description: productDescriptionSchema,
      price: priceSchema,
      stock: stockSchema,
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
export const addToCartValidator = validate(
  checkSchema({ product_id: uuidSchema(CART_MESSAGES.PRODUCT_ID_IS_INVALID), quantity: quantitySchema }, ['body'])
)
export const updateCartItemValidator = validate(
  checkSchema({
    product_id: { in: ['params'], ...uuidSchema(CART_MESSAGES.PRODUCT_ID_IS_INVALID) },
    quantity: { in: ['body'], ...quantitySchema }
  })
)
export const cartItemParamValidator = validate(
  checkSchema({ product_id: { in: ['params'], ...uuidSchema(CART_MESSAGES.PRODUCT_ID_IS_INVALID) } })
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

//---------------- order ----------------
export const createOrderValidator = validate(
  checkSchema(
    {
      shipping_name: {
        isString: { errorMessage: ORDER_MESSAGES.SHIPPING_NAME_IS_REQUIRED },
        trim: true,
        isLength: { options: { min: 1, max: 100 }, errorMessage: ORDER_MESSAGES.SHIPPING_NAME_IS_REQUIRED }
      },
      shipping_phone: {
        isString: { errorMessage: ORDER_MESSAGES.SHIPPING_PHONE_IS_INVALID },
        trim: true,
        matches: { options: /^(0|\+84)\d{9,10}$/, errorMessage: ORDER_MESSAGES.SHIPPING_PHONE_IS_INVALID }
      },
      shipping_address: {
        isString: { errorMessage: ORDER_MESSAGES.SHIPPING_ADDRESS_IS_REQUIRED },
        trim: true,
        isLength: { options: { min: 1, max: 300 }, errorMessage: ORDER_MESSAGES.SHIPPING_ADDRESS_IS_REQUIRED }
      },
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
