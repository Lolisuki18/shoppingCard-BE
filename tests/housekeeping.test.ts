import fs from 'fs'
import path from 'path'
import { beforeAll, describe, expect, it } from 'vitest'
import { UPLOAD_IMAGE_DIR } from '~/constants/dir'
import { USER_ROLE } from '~/constants/enums'
import { localImageFilename } from '~/services/medias.services'
import { apiUrl } from '~/utils/publicUrl'
import { api, createCatalog, createSession, resetDb, shipping } from './helpers'

let admin: Awaited<ReturnType<typeof createSession>>
let catalog: Awaited<ReturnType<typeof createCatalog>>

beforeAll(async () => {
  await resetDb()
  fs.mkdirSync(UPLOAD_IMAGE_DIR, { recursive: true })
  admin = await createSession({ role: USER_ROLE.Admin })
  catalog = await createCatalog(admin.auth)
})

//tạo 1 file ảnh giả trong thư mục upload và trả về URL công khai của nó
const fakeUpload = () => {
  const name = `test-${Date.now()}-${Math.random().toString(36).slice(2)}.jpeg`
  fs.writeFileSync(path.join(UPLOAD_IMAGE_DIR, name), 'x')
  return { name, file: path.join(UPLOAD_IMAGE_DIR, name), url: `${apiUrl()}/static/image/${name}` }
}
const waitGone = (file: string) => expect.poll(() => fs.existsSync(file), { timeout: 3000 }).toBe(false)
const newProduct = (images: string[]) =>
  api
    .post('/products')
    .set(admin.auth)
    .send({ category_id: catalog.category_id, name: `P ${Math.random()}`, price: 10000, stock: 5, images })

describe('dọn ảnh upload không còn dùng', () => {
  it('xoá sản phẩm thì xoá file ảnh của nó', async () => {
    const img = fakeUpload()
    const product = await newProduct([img.url])
    expect(fs.existsSync(img.file)).toBe(true)
    await api.delete(`/products/${product.body.result.id}`).set(admin.auth)
    await waitGone(img.file)
  })

  it('gỡ ảnh khỏi sản phẩm thì xoá file, ảnh còn giữ lại thì không bị đụng tới', async () => {
    const keep = fakeUpload()
    const drop = fakeUpload()
    const product = await newProduct([keep.url, drop.url])
    await api
      .patch(`/products/${product.body.result.id}`)
      .set(admin.auth)
      .send({ images: [keep.url] })
    await waitGone(drop.file)
    expect(fs.existsSync(keep.file)).toBe(true)
    fs.unlinkSync(keep.file)
  })

  it('ảnh đang được sản phẩm khác dùng thì không xoá', async () => {
    const shared = fakeUpload()
    const a = await newProduct([shared.url])
    await newProduct([shared.url])
    await api.delete(`/products/${a.body.result.id}`).set(admin.auth)
    await new Promise((resolve) => setTimeout(resolve, 300))
    expect(fs.existsSync(shared.file)).toBe(true)
    fs.unlinkSync(shared.file)
  })

  it('ảnh đã nằm trong đơn hàng cũ thì giữ lại để lịch sử đơn không vỡ ảnh', async () => {
    const img = fakeUpload()
    const product = await newProduct([img.url])
    const buyer = await createSession()
    await api.post('/cart/items').set(buyer.auth).send({ product_id: product.body.result.id, quantity: 1 })
    expect((await api.post('/orders').set(buyer.auth).send(shipping)).status).toBe(201)
    await api.delete(`/products/${product.body.result.id}`).set(admin.auth)
    await new Promise((resolve) => setTimeout(resolve, 300))
    expect(fs.existsSync(img.file)).toBe(true)
    fs.unlinkSync(img.file)
  })

  it('chỉ nhận URL ảnh do chính server này phục vụ (URL ngoài, tên file lạ bị bỏ qua)', () => {
    expect(localImageFilename(`${apiUrl()}/static/image/a.jpeg`)).toBe('a.jpeg')
    expect(localImageFilename('https://cdn.example.com/static/image/a.jpeg')).toBeUndefined()
    expect(localImageFilename(`${apiUrl()}/static/image/..%2F..%2Fpackage.json`)).toBeUndefined()
    expect(localImageFilename(`${apiUrl()}/static/video/a.mp4`)).toBeUndefined()
    expect(localImageFilename('không phải url')).toBeUndefined()
  })
})

describe('request id', () => {
  it('mỗi response có X-Request-Id; dùng lại id hợp lệ do proxy gửi, id lạ thì tạo mới', async () => {
    const generated = await api.get('/health')
    expect(generated.headers['x-request-id']).toMatch(/^[0-9a-f-]{36}$/)
    const forwarded = await api.get('/health').set('X-Request-Id', 'abc-123')
    expect(forwarded.headers['x-request-id']).toBe('abc-123')
    const bad = await api.get('/health').set('X-Request-Id', 'bad id with spaces!')
    expect(bad.headers['x-request-id']).not.toBe('bad id with spaces!')
  })
})
