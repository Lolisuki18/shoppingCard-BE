import fs from 'fs'
import path from 'path'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import databaseService from '~/services/database.services'
import { api, createUser, PASSWORD, resetDb } from './helpers'

beforeAll(resetDb)
afterEach(() => vi.restoreAllMocks())

describe('/static: chặn đọc file ngoài thư mục upload', () => {
  const secret = path.resolve('uploads/videos/../../package.json')
  it('path traversal qua tên file bị từ chối (video + ảnh)', async () => {
    expect(fs.existsSync(secret)).toBe(true)
    const video = await api.get('/static/video/..%2F..%2Fpackage.json').set('Range', 'bytes=0-')
    expect(video.status).toBe(404)
    expect(video.text).not.toContain('shoppingcardbe')
    const image = await api.get('/static/image/..%2F..%2Fpackage.json')
    expect(image.status).toBe(404)
  })
  it('file không tồn tại trả 404 thay vì 500', async () => {
    const res = await api.get('/static/video/khong-co.mp4').set('Range', 'bytes=0-')
    expect(res.status).toBe(404)
  })
})

describe('xử lý lỗi', () => {
  it('đường dẫn lạ 404, JSON sai cú pháp 400, body quá lớn 413', async () => {
    expect((await api.get('/khong-co')).status).toBe(404)
    const bad = await api.post('/users/login').set('Content-Type', 'application/json').send('{bad')
    expect(bad.status).toBe(400)
    const big = await api.post('/users/login').send({ a: 'x'.repeat(200_000) })
    expect(big.status).toBe(413)
  })

  it('lỗi không lường trước trả 500 chung chung, KHÔNG lộ chi tiết nội bộ', async () => {
    vi.spyOn(databaseService, 'products', 'get').mockReturnValue({
      findMany: () => Promise.reject(new Error('relation "products" does not exist /secret/path')),
      count: () => Promise.resolve(0)
    } as any)
    const res = await api.get('/products')
    expect(res.status).toBe(500)
    expect(res.body).toEqual({ message: 'Internal server error' })
  })

  it('thiếu header Authorization trả 401 (không phải 422)', async () => {
    expect((await api.get('/cart')).status).toBe(401)
    expect((await api.get('/cart').set('Authorization', 'Bearer')).status).toBe(401)
    expect((await api.get('/cart').set('Authorization', 'Bearer abc')).status).toBe(401)
  })
})

describe('header bảo mật & CORS', () => {
  it('có header của helmet, không lộ X-Powered-By', async () => {
    const res = await api.get('/health')
    expect(res.headers['x-content-type-options']).toBe('nosniff')
    expect(res.headers['x-powered-by']).toBeUndefined()
  })
  it('chỉ origin trong CORS_ORIGIN / CLIENT_URL được phép', async () => {
    const allowed = await api.get('/health').set('Origin', 'http://localhost:8000')
    expect(allowed.headers['access-control-allow-origin']).toBe('http://localhost:8000')
    const evil = await api.get('/health').set('Origin', 'http://evil.test')
    expect(evil.headers['access-control-allow-origin']).toBeUndefined()
  })
})

describe('giới hạn tần suất', () => {
  it('đăng nhập sai quá 10 lần thì bị chặn 429, đăng nhập đúng không bị tính', async () => {
    process.env.RATE_LIMIT_DISABLED = 'false'
    try {
      const user = await createUser()
      const statuses: number[] = []
      for (let i = 0; i < 12; i++) {
        statuses.push((await api.post('/users/login').send({ email: user.email, password: 'Wrong@12345' })).status)
      }
      expect(statuses.slice(0, 10).every((s) => s === 422)).toBe(true)
      expect(statuses.slice(10)).toEqual([429, 429])
      //đã bị chặn thì kể cả mật khẩu đúng cũng chưa vào được
      expect((await api.post('/users/login').send({ email: user.email, password: PASSWORD })).status).toBe(429)
    } finally {
      process.env.RATE_LIMIT_DISABLED = 'true'
    }
  })
})

describe('/health', () => {
  it('200 khi database ổn, 503 khi mất kết nối', async () => {
    expect((await api.get('/health')).body).toMatchObject({ status: 'ok', database: 'up' })
    vi.spyOn(databaseService, '$queryRaw', 'get').mockReturnValue((() => Promise.reject(new Error('down'))) as any)
    const down = await api.get('/health')
    expect(down.status).toBe(503)
    expect(down.body).toEqual({ status: 'error', database: 'down' })
  })
})
