import { beforeAll, describe, expect, it } from 'vitest'
import { USER_ROLE, UserVerifyStatus } from '~/constants/enums'
import { api, createSession, createUser, login, PASSWORD, prisma, resetDb } from './helpers'

beforeAll(resetDb)

describe('đăng ký -> xác thực email -> đăng nhập', () => {
  const email = 'newbie@test.com'
  let access_token = ''

  it('đăng ký trả token, tài khoản ban đầu chưa xác thực nên chưa dùng được giỏ hàng', async () => {
    const res = await api.post('/users/register').send({
      name: 'Newbie',
      email,
      password: PASSWORD,
      confirm_password: PASSWORD,
      date_of_birth: new Date('2000-01-01').toISOString()
    })
    expect(res.status).toBe(201)
    access_token = res.body.result.access_token
    const cart = await api.get('/cart').set('Authorization', `Bearer ${access_token}`)
    expect(cart.status).toBe(403)
  })

  it('đăng ký trùng email trả 409, dữ liệu sai trả 422', async () => {
    const dup = await api.post('/users/register').send({
      name: 'Newbie',
      email,
      password: PASSWORD,
      confirm_password: PASSWORD,
      date_of_birth: new Date('2000-01-01').toISOString()
    })
    expect(dup.status).toBe(409)
    const bad = await api.post('/users/register').send({ email: 'x' })
    expect(bad.status).toBe(422)
    expect(bad.body.errors).toBeTruthy()
  })

  it('bấm link xác thực (token trong DB) thì dùng được giỏ hàng', async () => {
    const user = await prisma.user.findUniqueOrThrow({ where: { email } })
    const verify = await api.get('/users/verify-email').query({ email_verify_token: user.email_verify_token })
    expect(verify.status).toBe(200)
    const cart = await api.get('/cart').set('Authorization', `Bearer ${verify.body.result.access_token}`)
    expect(cart.status).toBe(200)
  })

  it('sai mật khẩu bị từ chối, đúng mật khẩu đăng nhập được và /users/me trả đúng người', async () => {
    const wrong = await api.post('/users/login').send({ email, password: 'Wrong@12345' })
    expect(wrong.status).toBe(422)
    const { access_token } = await login(email)
    const me = await api.post('/users/me').set('Authorization', `Bearer ${access_token}`)
    expect(me.body.result.email).toBe(email)
    expect(me.body.result.password).toBeUndefined()
  })
})

describe('quên mật khẩu', () => {
  it('đặt lại mật khẩu bằng token rồi đăng nhập bằng mật khẩu mới', async () => {
    const { email } = await createUser()
    const forgot = await api.post('/users/forgot-password').send({ email })
    expect(forgot.status).toBe(200)
    //token được tạo ở chạy nền sau khi đã trả response
    await expect
      .poll(async () => (await prisma.user.findUniqueOrThrow({ where: { email } })).forgot_password_token)
      .not.toBe('')
    const { forgot_password_token } = await prisma.user.findUniqueOrThrow({ where: { email } })
    const reset = await api
      .post('/users/reset-password')
      .send({ forgot_password_token, password: 'New@12345', confirm_password: 'New@12345' })
    expect(reset.status).toBe(200)
    await expect(login(email, 'New@12345')).resolves.toBeTruthy()
    await expect(login(email)).rejects.toThrow()
  })

  it('email không tồn tại trả y hệt email có thật (không lộ email nào đã đăng ký)', async () => {
    const { email } = await createUser()
    const real = await api.post('/users/forgot-password').send({ email })
    const fake = await api.post('/users/forgot-password').send({ email: 'khong-co@test.com' })
    expect(fake.status).toBe(200)
    expect(fake.status).toBe(real.status)
    expect(fake.body).toEqual(real.body)
    expect(await prisma.user.count({ where: { email: 'khong-co@test.com' } })).toBe(0)
  })
})

describe('refresh token & khoá tài khoản', () => {
  it('refresh token dùng 1 lần: lần sau với token cũ bị từ chối', async () => {
    const user = await createUser()
    const { refresh_token } = await login(user.email)
    const first = await api.post('/users/refresh-token').send({ refresh_token })
    expect(first.status).toBe(200)
    const replay = await api.post('/users/refresh-token').send({ refresh_token })
    expect(replay.status).not.toBe(200)
  })

  it('tài khoản bị khoá không đăng nhập / refresh được', async () => {
    const user = await createUser()
    const { refresh_token } = await login(user.email)
    await prisma.user.update({ where: { id: user.id }, data: { verify: UserVerifyStatus.Banned } })
    const res = await api.post('/users/login').send({ email: user.email, password: PASSWORD })
    expect(res.status).toBe(403)
    const refresh = await api.post('/users/refresh-token').send({ refresh_token })
    expect(refresh.status).toBe(403)
  })
})

describe('phân quyền', () => {
  it('user thường không vào được khu admin, không có token thì 401', async () => {
    const customer = await createSession()
    expect((await api.get('/admin/orders').set(customer.auth)).status).toBe(403)
    expect((await api.get('/admin/orders')).status).toBe(401)
  })

  it('đổi role có hiệu lực ngay với access token đang dùng', async () => {
    const admin = await createSession({ role: USER_ROLE.Admin })
    const user = await createSession()
    expect((await api.get('/admin/orders').set(user.auth)).status).toBe(403)
    const promote = await api.patch(`/admin/users/${user.id}/role`).set(admin.auth).send({ role: USER_ROLE.Staff })
    expect(promote.status).toBe(200)
    expect((await api.get('/admin/orders').set(user.auth)).status).toBe(200) //cùng 1 token cũ
    //Staff vẫn chưa được xem thống kê / quản lý user
    expect((await api.get('/admin/users').set(user.auth)).status).toBe(403)
  })
})
