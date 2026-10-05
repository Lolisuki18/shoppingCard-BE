import { beforeAll, describe, expect, it } from 'vitest'
import { USER_ROLE, UserVerifyStatus } from '~/constants/enums'
import { api, createSession, createUser, login, PASSWORD, prisma, resetDb } from './helpers'

let admin: Awaited<ReturnType<typeof createSession>>

beforeAll(async () => {
  await resetDb()
  admin = await createSession({ role: USER_ROLE.Admin })
})

describe('quản lý người dùng', () => {
  it('danh sách có lọc / tìm kiếm và không bao giờ trả mật khẩu hay token', async () => {
    const target = await createUser({ name: 'Nguyen Tim Thay' })
    const res = await api.get('/admin/users').query({ search: 'Tim Thay', role: USER_ROLE.User }).set(admin.auth)
    expect(res.status).toBe(200)
    expect(res.body.result.total).toBe(1)
    const user = res.body.result.items[0]
    expect(user.email).toBe(target.email)
    for (const secret of ['password', 'email_verify_token', 'forgot_password_token'])
      expect(user[secret]).toBeUndefined()
    expect(user._count.orders).toBe(0)
  })

  it('khoá: không đăng nhập được, mọi refresh token bị xoá; mở khoá thì đăng nhập lại', async () => {
    const target = await createSession()
    const ban = await api.post(`/admin/users/${target.id}/ban`).set(admin.auth)
    expect(ban.body.result.verify).toBe(UserVerifyStatus.Banned)
    expect(await prisma.refreshToken.count({ where: { user_id: target.id } })).toBe(0)
    expect((await api.post('/users/login').send({ email: target.email, password: PASSWORD })).status).toBe(403)
    expect((await api.get('/cart').set(target.auth)).status).toBe(403) //access token cũ cũng không dùng được nữa
    expect((await api.post(`/admin/users/${target.id}/ban`).set(admin.auth)).status).toBe(409)

    const unban = await api.post(`/admin/users/${target.id}/unban`).set(admin.auth)
    expect(unban.body.result.verify).toBe(UserVerifyStatus.Verified)
    await expect(login(target.email)).resolves.toBeTruthy()
  })

  it('mở khoá người CHƯA xác thực email thì về Unverified, không được bỏ qua bước xác thực', async () => {
    const target = await createUser({ verify: UserVerifyStatus.Unverified })
    await api.post(`/admin/users/${target.id}/ban`).set(admin.auth)
    const unban = await api.post(`/admin/users/${target.id}/unban`).set(admin.auth)
    expect(unban.body.result.verify).toBe(UserVerifyStatus.Unverified)
  })

  it('Admin không tự khoá / đổi role của chính mình', async () => {
    expect((await api.post(`/admin/users/${admin.id}/ban`).set(admin.auth)).status).toBe(409)
    expect(
      (await api.patch(`/admin/users/${admin.id}/role`).set(admin.auth).send({ role: USER_ROLE.User })).status
    ).toBe(409)
  })

  it('Staff không quản lý được user và không xem được thống kê doanh thu', async () => {
    const staff = await createSession({ role: USER_ROLE.Staff })
    expect((await api.get('/admin/users').set(staff.auth)).status).toBe(403)
    expect((await api.get('/admin/stats/overview').set(staff.auth)).status).toBe(403)
    expect((await api.get('/admin/orders').set(staff.auth)).status).toBe(200)
  })
})

describe('thống kê', () => {
  it('kiểm tra tham số: from phải trước to, group_by hợp lệ, khoảng thời gian không quá dài', async () => {
    expect(
      (await api.get('/admin/stats/revenue').query({ from: '2026-10-05', to: '2026-10-01' }).set(admin.auth)).status
    ).toBe(422)
    expect((await api.get('/admin/stats/revenue').query({ group_by: 'year' }).set(admin.auth)).status).toBe(422)
    expect(
      (await api.get('/admin/stats/revenue').query({ from: '2020-01-01', to: '2026-01-01' }).set(admin.auth)).status
    ).toBe(422)
  })

  it('doanh thu theo ngày (giờ VN) luôn trả đủ các ngày trong khoảng, ngày không có đơn = 0', async () => {
    const res = await api
      .get('/admin/stats/revenue')
      .query({ from: '2026-01-01T00:00:00+07:00', to: '2026-01-11T00:00:00+07:00' })
      .set(admin.auth)
    expect(res.body.result.items).toHaveLength(10)
    expect(res.body.result.items.every((i: { revenue: number }) => i.revenue === 0)).toBe(true)
  })
})
