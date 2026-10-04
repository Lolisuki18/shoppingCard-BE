//các validator dùng chung cho nhóm API shop (category, product, cart, order)
import { checkSchema, ParamSchema } from 'express-validator'
import { OrderStatus } from '@prisma/client'
import {
  CART_MESSAGES,
  CATEGORY_MESSAGES,
  COMMON_MESSAGES,
  ORDER_MESSAGES,
  PRODUCT_MESSAGES
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
      isIn: { options: [['newest', 'price_asc', 'price_desc', 'name']], errorMessage: PRODUCT_MESSAGES.SORT_IS_INVALID }
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
      }
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
