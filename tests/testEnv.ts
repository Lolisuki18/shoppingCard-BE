//cấu hình môi trường cho test. TEST_DATABASE_URL trỏ tới 1 database RIÊNG (dữ liệu trong đó bị xoá sạch mỗi lần chạy!)
export const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ||
  'postgresql://shoppingcard:shoppingcard@localhost:5433/shoppingcard_test?schema=public'

export const applyTestEnv = () => {
  Object.assign(process.env, {
    DATABASE_URL: TEST_DATABASE_URL,
    NODE_ENV: 'test',
    JWT_SECRET_ACCESS_TOKEN: 'test-access',
    JWT_SECRET_REFRESH_TOKEN: 'test-refresh',
    JWT_SECRET_EMAIL_VERIFY_TOKEN: 'test-email',
    JWT_SECRET_FORGOT_PASSWORD_TOKEN: 'test-forgot',
    ACCESS_TOKEN_EXPIRE_IN: '15m',
    REFRESH_TOKEN_EXPIRE_IN: '7d',
    EMAIL_VERIFY_TOKEN_EXPIRE_IN: '7d',
    FORGOT_PASSWORD_TOKEN_EXPIRE_IN: '7d',
    SMTP_HOST: '', //không gửi mail thật
    LOG_LEVEL: 'error',
    RATE_LIMIT_DISABLED: 'true',
    SHIPPING_FEE: '30000',
    FREE_SHIPPING_THRESHOLD: '500000',
    ORDER_AUTO_CANCEL_HOURS: '48'
  })
}
