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
  SORT_IS_INVALID: 'sort must be one of: newest, price_asc, price_desc, name',
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
