import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import request from 'supertest'
import app from '~/app'
import { USER_ROLE, UserVerifyStatus } from '~/constants/enums'

export const api = request(app)
//client riêng để dựng / kiểm tra dữ liệu trực tiếp trong database
export const prisma = new PrismaClient()

export const PASSWORD = 'Test@12345'
let counter = 0

//xoá sạch dữ liệu (CASCADE kéo theo mọi bảng phụ thuộc)
export const resetDb = async () => {
  await prisma.$executeRawUnsafe('TRUNCATE TABLE "users", "categories", "coupons" RESTART IDENTITY CASCADE')
}

export const createUser = async ({
  role = USER_ROLE.User,
  verify = UserVerifyStatus.Verified,
  name = 'Tester'
}: { role?: USER_ROLE; verify?: UserVerifyStatus; name?: string } = {}) => {
  counter++
  const email = `user${counter}-${Date.now()}@test.com`
  const user = await prisma.user.create({
    data: {
      email,
      name,
      username: `user${counter}${Date.now()}`,
      password: await bcrypt.hash(PASSWORD, 4),
      role,
      verify,
      email_verify_token: verify === UserVerifyStatus.Verified ? '' : `pending-${counter}`
    }
  })
  return { id: user.id, email }
}

export const login = async (email: string, password = PASSWORD) => {
  const res = await api.post('/users/login').send({ email, password })
  if (res.status !== 200) throw new Error(`login failed: ${res.status} ${JSON.stringify(res.body)}`)
  return res.body.result as { access_token: string; refresh_token: string }
}

//tạo user rồi đăng nhập luôn, trả về token dạng header
export const createSession = async (options: Parameters<typeof createUser>[0] = {}) => {
  const user = await createUser(options)
  const tokens = await login(user.email)
  return { ...user, ...tokens, auth: { Authorization: `Bearer ${tokens.access_token}` } }
}

//dựng danh mục + sản phẩm (qua API, bằng tài khoản Admin)
export const createCatalog = async (adminAuth: { Authorization: string }) => {
  const category = await api
    .post('/categories')
    .set(adminAuth)
    .send({ name: `Cat ${++counter}` })
  const category_id = category.body.result.id as string
  const shirt = await api
    .post('/products')
    .set(adminAuth)
    .send({
      category_id,
      name: `Ao ${counter}`,
      variants: [
        { name: 'S', price: 100000, stock: 5 },
        { name: 'M', price: 120000, stock: 3 }
      ]
    })
  const simple = await api
    .post('/products')
    .set(adminAuth)
    .send({ category_id, name: `Op lung ${counter}`, price: 50000, stock: 10 })
  const variant = (name: string) =>
    shirt.body.result.variants.find((v: { name: string }) => v.name === name).id as string
  return {
    category_id,
    shirt: { id: shirt.body.result.id as string, S: variant('S'), M: variant('M') },
    simple: { id: simple.body.result.id as string, variant: simple.body.result.variants[0].id as string }
  }
}

export const shipping = {
  shipping_name: 'Nguyen Van A',
  shipping_phone: '0901234567',
  shipping_address: '1 Le Loi, HN'
}
