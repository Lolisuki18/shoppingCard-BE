export const USERS_MESSAGES = {
  VALIDATION_ERROR: 'Validation error',

  //name
  NAME_IS_REQUIRED: 'Name is required',
  NAME_MUST_BE_A_STRING: 'Name must be a string',
  NAME_LENGTH_MUST_BE_FROM_1_TO_100: 'Name length must be from 1 to 100',

  //email
  EMAIL_ALREADY_EXISTS: 'Email already exists',
  EMAIL_IS_REQUIRED: 'Email is required',
  EMAIL_IS_INVALID: 'Email is invalid',
  EMAIL_HAS_BEEN_UNVERIFIED: 'Email has been unverified',

  //password
  PASSWORD_IS_REQUIRED: 'Password is required',
  PASSWORD_MUST_BE_A_STRING: 'Password must be a string',
  PASSWORD_LENGTH_MUST_BE_FROM_8_TO_50: 'Password length must be from 8 to 50',
  PASSWORD_MUST_BE_STRONG:
    'Password must be at least 8 characters long and contain at least 1 lowercase letter, 1 uppercase letter, 1 number, and 1 symbol',

  //confirmPassword
  CONFIRM_PASSWORD_IS_REQUIRED: 'Confirm password is required',
  CONFIRM_PASSWORD_MUST_BE_A_STRING: 'Confirm password must be a string',
  CONFIRM_PASSWORD_LENGTH_MUST_BE_FROM_8_TO_50: 'Confirm length must be from 8 to 50',
  CONFIRM_PASSWORD_MUST_BE_STRONG:
    'Confirm password must be at least 8 characters long and contain at least 1 lowercase letter, 1 uppercase letter, 1 number, and 1 symbol',
  CONFIRM_PASSWORD_MUST_BE_THE_SAME_AS_PASSWORD: 'Confirm password must be the same as password',

  //dateOfBirth
  DATE_OF_BIRTH_BE_ISO8601: 'Date of birth must be ISO8601',

  //user
  EMAIL_OR_PASSWORD_IS_INCORRECT: 'Email or password is incorrect',
  LOGIN_SUCCESS: 'Login successfully',
  REGISTER_SUCCESS: 'Register successfully',
  ACCESS_TOKEN_IS_REQUIRED: 'Access Token is required',
  REFRESH_TOKEN_IS_REQUIRED: 'Refresh Token is required',
  LOGOUT_SUCCESS: 'Logout success',
  REFRESH_TOKEN_IS_INVALID: 'Refresh token is invalid',

  // email verify token
  EMAIL_VERIFY_TOKEN_IS_REQUIRED: 'Email verify token is required',
  EMAIL_VERIFY_TOKEN_IS_INVALID: 'Email verify token is invalid',
  EMAIL_VERIFY_SUCCESS: 'Email verify successfully',
  USER_NOT_FOUND: 'User not found',

  //resend email
  EMAIL_HAS_BEEN_VERIFYED: 'Email has been verifyed',
  ACCOUNT_HAS_BEEN_BANNED: 'Account has been banned',
  RESEND_EMAIL_SUCCESS: 'Resend email verify successfully',
  CHECK_EMAIL_TO_RESET_PASSWORD: 'Check Email to Reset Password',

  //verify forgotpassword
  FORGOT_PASSWORD_TOKEN_IS_REQUIRED: 'Forgot password token is required',
  VERIFY_FORGOT_PASSWORD_TOKEN_SUCCESS: 'Verify forgot password token success',
  FORGOT_PASSWORD_TOKEN_NOT_MATCH: 'Verify forgot password token success',

  //reset password
  RESET_PASSWORD_SUCCESS: 'Reset password success',

  //get me
  GET_ME_SUCCESS: 'Get me success',

  //update me
  BIO_MUST_BE_A_STRING: 'Bio must be a string',
  BIO_LENGTH_MUST_BE_LESS_THAN_200: 'Bio length must be less than 200',
  LOCATION_MUST_BE_A_STRING: 'Location must be a string',
  LOCATION_LENGTH_MUST_BE_LESS_THAN_200: 'Location length must be less than 200',
  WEBSITE_MUST_BE_A_STRING: 'Website must be a string',
  WEBSITE_LENGTH_MUST_BE_LESS_THAN_200: 'Website length must be less than 200',
  USERNAME_MUST_BE_A_STRING: 'Username must be a string',
  USERNAME_LENGTH_MUST_BE_LESS_THAN_50: 'Username length must be less than 50',
  IMAGE_URL_MUST_BE_A_STRING: 'Image url must be a string',
  IMAGE_URL_LENGTH_MUST_BE_LESS_THAN_400: 'Image url length must be less than 400',
  UPDATE_PROFILE_SUCCESS: 'Update profile success',
  USER_NOT_VERIFIED: 'User not verified',
  USERNAME_ALREADY_EXISTS: 'Username already exists',
  USERNAME_IS_INVALID:
    'Username must be a string and length must be 4 - 15, and contain only letters, numbers, and underscores, not only numbers',

  //change password
  CHANGE_PASSWORD_SUCCESS: 'Change password success',

  //refresh token
  REFRESH_TOKEN_SUCCESS: 'Refresh token sucess'
} as const //để k ai chỉnh đc

export const MEDIAS_MESSAGES = {
  IMAGE_IS_EMPTY: 'Image is empty'
} as const

export const AUTH_MESSAGES = {
  ACCOUNT_IS_BANNED: 'Account has been banned',
  PERMISSION_DENIED: 'You do not have permission to perform this action',
  EMAIL_MUST_BE_VERIFIED: 'Email must be verified to perform this action'
} as const

export const COMMON_MESSAGES = {
  TOO_MANY_REQUESTS: 'Too many requests, please try again later',
  INTERNAL_SERVER_ERROR: 'Internal server error',
  INVALID_JSON: 'Request body is not valid JSON',
  PAYLOAD_TOO_LARGE: 'Request body is too large',
  ROUTE_NOT_FOUND: 'Route not found',
  ID_IS_INVALID: 'Id must be a valid UUID',
  PAGE_MUST_BE_A_POSITIVE_INTEGER: 'Page must be a positive integer',
  LIMIT_MUST_BE_FROM_1_TO_100: 'Limit must be an integer from 1 to 100'
} as const

export const CATEGORY_MESSAGES = {
  NAME_IS_REQUIRED: 'Category name is required',
  NAME_LENGTH_MUST_BE_FROM_1_TO_100: 'Category name length must be from 1 to 100',
  DESCRIPTION_MUST_BE_A_STRING: 'Category description must be a string',
  DESCRIPTION_LENGTH_MUST_BE_LESS_THAN_500: 'Category description length must be less than 500',
  NAME_ALREADY_EXISTS: 'Category name already exists',
  NOT_FOUND: 'Category not found',
  HAS_PRODUCTS: 'Category still has products, move or delete them first',
  GET_SUCCESS: 'Get category success',
  GET_LIST_SUCCESS: 'Get categories success',
  CREATE_SUCCESS: 'Create category success',
  UPDATE_SUCCESS: 'Update category success',
  DELETE_SUCCESS: 'Delete category success'
} as const

export const PRODUCT_MESSAGES = {
  NAME_IS_REQUIRED: 'Product name is required',
  NAME_LENGTH_MUST_BE_FROM_1_TO_200: 'Product name length must be from 1 to 200',
  DESCRIPTION_MUST_BE_A_STRING: 'Product description must be a string',
  DESCRIPTION_LENGTH_MUST_BE_LESS_THAN_5000: 'Product description length must be less than 5000',
  PRICE_MUST_BE_A_NON_NEGATIVE_INTEGER: 'Price must be a non-negative integer',
  STOCK_MUST_BE_A_NON_NEGATIVE_INTEGER: 'Stock must be a non-negative integer',
  IMAGES_MUST_BE_AN_ARRAY_OF_URLS: 'Images must be an array of at most 10 urls (each at most 400 characters)',
  IS_ACTIVE_MUST_BE_A_BOOLEAN: 'is_active must be a boolean',
  CATEGORY_ID_IS_REQUIRED: 'Category id is required',
  MIN_PRICE_MUST_BE_A_NON_NEGATIVE_INTEGER: 'min_price must be a non-negative integer',
  MAX_PRICE_MUST_BE_A_NON_NEGATIVE_INTEGER: 'max_price must be a non-negative integer',
  SORT_IS_INVALID: 'sort must be one of: newest, price_asc, price_desc, name, rating',
  PRICE_IS_REQUIRED: 'Price is required when the product has no variants',
  VARIANTS_MUST_BE_A_LIST: 'variants must be a list of 1 - 50 variants',
  NOT_FOUND: 'Product not found',
  GET_SUCCESS: 'Get product success',
  GET_LIST_SUCCESS: 'Get products success',
  CREATE_SUCCESS: 'Create product success',
  UPDATE_SUCCESS: 'Update product success',
  DELETE_SUCCESS: 'Delete product success'
} as const

export const CART_MESSAGES = {
  PRODUCT_ID_IS_INVALID: 'product_id must be a valid UUID',
  QUANTITY_MUST_BE_FROM_1_TO_999: 'Quantity must be an integer from 1 to 999',
  PRODUCT_NOT_AVAILABLE: 'Product is not available',
  NOT_ENOUGH_STOCK: 'Not enough stock for this quantity',
  ITEM_NOT_FOUND: 'Item is not in your cart',
  VARIANT_REQUIRED: 'This product has several variants, variant_id is required',
  GET_SUCCESS: 'Get cart success',
  ADD_SUCCESS: 'Add to cart success',
  UPDATE_SUCCESS: 'Update cart item success',
  REMOVE_SUCCESS: 'Remove cart item success',
  CLEAR_SUCCESS: 'Clear cart success'
} as const

export const ORDER_MESSAGES = {
  SHIPPING_NAME_IS_REQUIRED: 'Shipping name is required (1 - 100 characters)',
  SHIPPING_PHONE_IS_INVALID: 'Shipping phone is invalid',
  SHIPPING_ADDRESS_IS_REQUIRED: 'Shipping address is required (1 - 300 characters)',
  NOTE_LENGTH_MUST_BE_LESS_THAN_500: 'Note must be a string shorter than 500 characters',
  STATUS_IS_INVALID: 'Status must be one of: Pending, Confirmed, Shipping, Delivered, Cancelled',
  CART_IS_EMPTY: 'Your cart is empty',
  PRODUCT_UNAVAILABLE: 'A product in your cart is no longer available',
  NOT_ENOUGH_STOCK: 'Not enough stock for a product in your cart',
  NOT_FOUND: 'Order not found',
  CANNOT_CANCEL: 'Only Pending orders can be cancelled by the customer',
  INVALID_STATUS_TRANSITION: 'This status change is not allowed',
  CREATE_SUCCESS: 'Create order success',
  GET_SUCCESS: 'Get order success',
  GET_LIST_SUCCESS: 'Get orders success',
  CANCEL_SUCCESS: 'Cancel order success',
  UPDATE_STATUS_SUCCESS: 'Update order status success'
} as const

export const COUPON_MESSAGES = {
  CODE_IS_INVALID: 'Coupon code must be 3 - 32 characters (letters, numbers, - or _)',
  DESCRIPTION_LENGTH_MUST_BE_LESS_THAN_500: 'Coupon description must be a string shorter than 500 characters',
  DISCOUNT_TYPE_IS_INVALID: 'discount_type must be one of: Percent, Fixed',
  DISCOUNT_VALUE_MUST_BE_A_POSITIVE_INTEGER: 'discount_value must be a positive integer',
  PERCENT_MUST_BE_FROM_1_TO_100: 'A Percent coupon must have discount_value from 1 to 100',
  MIN_ORDER_AMOUNT_MUST_BE_A_NON_NEGATIVE_INTEGER: 'min_order_amount must be a non-negative integer',
  MAX_DISCOUNT_AMOUNT_MUST_BE_A_POSITIVE_INTEGER: 'max_discount_amount must be a positive integer or null',
  USAGE_LIMIT_MUST_BE_A_POSITIVE_INTEGER: 'usage_limit must be a positive integer or null',
  PER_USER_LIMIT_MUST_BE_A_POSITIVE_INTEGER: 'per_user_limit must be a positive integer or null',
  DATE_IS_INVALID: 'starts_at / expires_at must be an ISO 8601 date or null',
  EXPIRES_MUST_BE_AFTER_STARTS: 'expires_at must be after starts_at',
  IS_ACTIVE_MUST_BE_A_BOOLEAN: 'is_active must be a boolean',
  CODE_ALREADY_EXISTS: 'Coupon code already exists',
  NOT_FOUND: 'Coupon not found',
  NOT_ACTIVE: 'This coupon is not active',
  NOT_STARTED: 'This coupon is not valid yet',
  EXPIRED: 'This coupon has expired',
  USAGE_LIMIT_REACHED: 'This coupon has been fully redeemed',
  PER_USER_LIMIT_REACHED: 'You have already used this coupon the maximum number of times',
  MIN_ORDER_NOT_REACHED: 'Your order does not reach the minimum amount for this coupon',
  CART_IS_EMPTY: 'Your cart is empty',
  VALIDATE_SUCCESS: 'Coupon can be applied',
  GET_SUCCESS: 'Get coupon success',
  GET_LIST_SUCCESS: 'Get coupons success',
  CREATE_SUCCESS: 'Create coupon success',
  UPDATE_SUCCESS: 'Update coupon success',
  DELETE_SUCCESS: 'Delete coupon success'
} as const

export const REVIEW_MESSAGES = {
  RATING_MUST_BE_FROM_1_TO_5: 'Rating must be an integer from 1 to 5',
  COMMENT_LENGTH_MUST_BE_LESS_THAN_2000: 'Comment must be a string shorter than 2000 characters',
  MUST_PURCHASE_FIRST: 'You can only review products from a delivered order',
  ALREADY_REVIEWED: 'You have already reviewed this product, edit your review instead',
  NOT_FOUND: 'Review not found',
  GET_LIST_SUCCESS: 'Get reviews success',
  CREATE_SUCCESS: 'Create review success',
  UPDATE_SUCCESS: 'Update review success',
  DELETE_SUCCESS: 'Delete review success'
} as const

export const WISHLIST_MESSAGES = {
  PRODUCT_ID_IS_INVALID: 'product_id must be a valid UUID',
  PRODUCT_NOT_AVAILABLE: 'Product is not available',
  ITEM_NOT_FOUND: 'Product is not in your wishlist',
  GET_LIST_SUCCESS: 'Get wishlist success',
  ADD_SUCCESS: 'Add to wishlist success',
  REMOVE_SUCCESS: 'Remove from wishlist success'
} as const

export const STATS_MESSAGES = {
  DATE_IS_INVALID: 'from / to must be ISO 8601 dates',
  RANGE_IS_INVALID: 'from must be before to',
  RANGE_TOO_LARGE: 'Range is too large for this group_by (max 366 days, or 60 months)',
  GROUP_BY_IS_INVALID: 'group_by must be one of: day, month',
  LIMIT_MUST_BE_FROM_1_TO_50: 'limit must be an integer from 1 to 50',
  THRESHOLD_MUST_BE_A_NON_NEGATIVE_INTEGER: 'threshold must be a non-negative integer',
  OVERVIEW_SUCCESS: 'Get overview success',
  REVENUE_SUCCESS: 'Get revenue success',
  TOP_PRODUCTS_SUCCESS: 'Get top products success',
  LOW_STOCK_SUCCESS: 'Get low stock products success'
} as const

export const ADDRESS_MESSAGES = {
  NAME_IS_REQUIRED: 'Recipient name is required (1 - 100 characters)',
  PHONE_IS_INVALID: 'Phone is invalid',
  ADDRESS_IS_REQUIRED: 'Address is required (1 - 300 characters)',
  IS_DEFAULT_MUST_BE_A_BOOLEAN: 'is_default must be a boolean',
  ID_IS_INVALID: 'address_id must be a valid UUID',
  LIMIT_REACHED: 'You can save at most 10 addresses',
  NOT_FOUND: 'Address not found',
  GET_LIST_SUCCESS: 'Get addresses success',
  CREATE_SUCCESS: 'Create address success',
  UPDATE_SUCCESS: 'Update address success',
  DELETE_SUCCESS: 'Delete address success'
} as const

export const VARIANT_MESSAGES = {
  NAME_IS_REQUIRED: 'Variant name is required (1 - 100 characters)',
  NAMES_MUST_BE_UNIQUE: 'Variant names must be unique within a product',
  SKU_IS_INVALID: 'sku must be 1 - 64 characters or null',
  PRICE_MUST_BE_A_NON_NEGATIVE_INTEGER: 'Variant price must be a non-negative integer',
  STOCK_MUST_BE_A_NON_NEGATIVE_INTEGER: 'Variant stock must be a non-negative integer',
  IS_ACTIVE_MUST_BE_A_BOOLEAN: 'Variant is_active must be a boolean',
  ID_IS_INVALID: 'variant_id must be a valid UUID',
  NOT_FOUND: 'Variant not found',
  ALREADY_EXISTS: 'A variant with this name or SKU already exists',
  HAS_VARIANTS: 'This product has variants: update price and stock on each variant (/products/:id/variants)',
  MUST_KEEP_ONE: 'A product needs at least one variant',
  CANNOT_RENAME_DEFAULT: 'The default variant of a product without options cannot be renamed',
  CREATE_SUCCESS: 'Create variant success',
  UPDATE_SUCCESS: 'Update variant success',
  DELETE_SUCCESS: 'Delete variant success'
} as const

export const ADMIN_USER_MESSAGES = {
  ROLE_IS_INVALID: 'role must be 0 (Admin), 1 (Staff) or 2 (User)',
  VERIFY_IS_INVALID: 'verify must be 0 (Unverified), 1 (Verified) or 2 (Banned)',
  NOT_FOUND: 'User not found',
  CANNOT_CHANGE_SELF: 'You cannot ban yourself or change your own role',
  NOT_BANNED: 'This user is not banned',
  ALREADY_BANNED: 'This user is already banned',
  GET_LIST_SUCCESS: 'Get users success',
  GET_SUCCESS: 'Get user success',
  BAN_SUCCESS: 'Ban user success',
  UNBAN_SUCCESS: 'Unban user success',
  UPDATE_ROLE_SUCCESS: 'Update user role success'
} as const
