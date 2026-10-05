import { beforeAll, describe, expect, it } from 'vitest'
import { USER_ROLE } from '~/constants/enums'
import ordersServices from '~/services/orders.services'
import { api, createCatalog, createSession, prisma, resetDb, shipping } from './helpers'

type Session = Awaited<ReturnType<typeof createSession>>
let admin: Session
let catalog: Awaited<ReturnType<typeof createCatalog>>

beforeAll(async () => {
  await resetDb()
  admin = await createSession({ role: USER_ROLE.Admin })
  catalog = await createCatalog(admin.auth)
})

const variantStock = async (id: string) => (await prisma.productVariant.findUniqueOrThrow({ where: { id } })).stock
const productStock = async (id: string) => (await prisma.product.findUniqueOrThrow({ where: { id } })).stock

const addToCart = (user: Session, body: object) => api.post('/cart/items').set(user.auth).send(body)
const placeOrder = (user: Session, body: object = shipping) => api.post('/orders').set(user.auth).send(body)

describe('sản phẩm có biến thể', () => {
  it('price = giá thấp nhất, stock = tổng tồn kho, has_variants phân biệt sản phẩm có tuỳ chọn', async () => {
    const shirt = await api.get(`/products/${catalog.shirt.id}`)
    expect(shirt.body.result).toMatchObject({ price: 100000, stock: 8, has_variants: true })
    const simple = await api.get(`/products/${catalog.simple.id}`)
    expect(simple.body.result).toMatchObject({ price: 50000, stock: 10, has_variants: false })
    expect(simple.body.result.variants).toHaveLength(1)
  })

  it('tạo sản phẩm thiếu price lẫn variants, hoặc tên biến thể trùng (không phân biệt hoa/thường) trả 422', async () => {
    const base = { category_id: catalog.category_id, name: 'X' }
    expect((await api.post('/products').set(admin.auth).send(base)).status).toBe(422)
    const dup = await api
      .post('/products')
      .set(admin.auth)
      .send({
        ...base,
        variants: [
          { name: 'S', price: 1 },
          { name: 's', price: 1 }
        ]
      })
    expect(dup.status).toBe(422)
  })

  it('PATCH price trên sản phẩm có biến thể bị chặn (409), sửa giá biến thể thì giá sản phẩm tự cập nhật', async () => {
    expect((await api.patch(`/products/${catalog.shirt.id}`).set(admin.auth).send({ price: 1 })).status).toBe(409)
    const res = await api
      .patch(`/products/${catalog.shirt.id}/variants/${catalog.shirt.M}`)
      .set(admin.auth)
      .send({ price: 90000 })
    expect(res.body.result.price).toBe(90000)
    await api.patch(`/products/${catalog.shirt.id}/variants/${catalog.shirt.M}`).set(admin.auth).send({ price: 120000 })
  })

  it('sản phẩm luôn phải còn ít nhất 1 biến thể', async () => {
    expect(
      (await api.delete(`/products/${catalog.simple.id}/variants/${catalog.simple.variant}`).set(admin.auth)).status
    ).toBe(409)
  })
})

describe('giỏ hàng', () => {
  it('sản phẩm nhiều biến thể bắt buộc variant_id; sản phẩm đơn giản thì không cần', async () => {
    const user = await createSession()
    expect((await addToCart(user, { product_id: catalog.shirt.id, quantity: 1 })).status).toBe(422)
    expect(
      (await addToCart(user, { product_id: catalog.shirt.id, variant_id: catalog.shirt.S, quantity: 1 })).status
    ).toBe(200)
    expect((await addToCart(user, { product_id: catalog.simple.id, quantity: 1 })).status).toBe(200)
  })

  it('cộng dồn số lượng, không cho vượt tồn kho', async () => {
    const user = await createSession()
    const body = { product_id: catalog.shirt.id, variant_id: catalog.shirt.M, quantity: 2 }
    await addToCart(user, body)
    expect((await addToCart(user, body)).status).toBe(409) //2 + 2 > tồn kho 3
    const cart = await api.get('/cart').set(user.auth)
    expect(cart.body.result.items[0].quantity).toBe(2)
  })

  it('phí ship: dưới ngưỡng thu 30000, từ 500000 miễn phí', async () => {
    const user = await createSession()
    await addToCart(user, { product_id: catalog.simple.id, quantity: 1 })
    expect((await api.get('/cart').set(user.auth)).body.result.shipping_fee).toBe(30000)
    await addToCart(user, { product_id: catalog.simple.id, quantity: 9 }) //10 x 50000 = 500000
    expect((await api.get('/cart').set(user.auth)).body.result.shipping_fee).toBe(0)
  })

  it('gộp giỏ khách vãng lai: lấy số lượng lớn hơn, bỏ qua dòng lỗi, hạ xuống theo tồn kho, gọi lại không nhân đôi', async () => {
    const user = await createSession()
    const payload = {
      items: [
        { product_id: catalog.simple.id, quantity: 2 },
        { product_id: catalog.simple.id, quantity: 1 }, //trùng dòng -> cộng trong payload = 3
        { product_id: catalog.shirt.id, quantity: 1 }, //thiếu variant_id
        { product_id: '00000000-0000-0000-0000-000000000000', quantity: 1 },
        { product_id: catalog.shirt.id, variant_id: catalog.shirt.M, quantity: 99 } //vượt tồn kho 3
      ]
    }
    const first = await api.post('/cart/merge').set(user.auth).send(payload)
    expect(first.status).toBe(200)
    expect(first.body.result.skipped.map((s: { reason: string }) => s.reason).sort()).toEqual([
      'not_available',
      'variant_required'
    ])
    expect(first.body.result.adjusted).toHaveLength(1)
    const quantities = Object.fromEntries(
      first.body.result.cart.items.map((i: { variant: { id: string }; quantity: number }) => [i.variant.id, i.quantity])
    )
    expect(quantities[catalog.simple.variant]).toBe(3)
    expect(quantities[catalog.shirt.M]).toBe(3)
    const again = await api.post('/cart/merge').set(user.auth).send(payload)
    expect(again.body.result.cart.total_quantity).toBe(first.body.result.cart.total_quantity)
  })
})

describe('đặt hàng, coupon, huỷ đơn', () => {
  it('đặt hàng: trừ kho theo biến thể, cập nhật tồn kho sản phẩm, chốt giá, có mã đơn + lịch sử, xoá giỏ', async () => {
    const user = await createSession()
    const before = { S: await variantStock(catalog.shirt.S), product: await productStock(catalog.shirt.id) }
    await addToCart(user, { product_id: catalog.shirt.id, variant_id: catalog.shirt.S, quantity: 2 })
    const res = await placeOrder(user)
    expect(res.status).toBe(201)
    const order = res.body.result
    expect(order.code).toMatch(/^DH\d{6}-[A-Z0-9]{5}$/)
    expect(order).toMatchObject({ status: 'Pending', shipping_fee: 30000, total_amount: 230000, discount_amount: 0 })
    expect(order.items[0]).toMatchObject({ variant_name: 'S', unit_price: 100000, quantity: 2 })
    expect(order.history.map((h: { to_status: string }) => h.to_status)).toEqual(['Pending'])
    expect(await variantStock(catalog.shirt.S)).toBe(before.S - 2)
    expect(await productStock(catalog.shirt.id)).toBe(before.product - 2)
    expect((await api.get('/cart').set(user.auth)).body.result.items).toHaveLength(0)
    //đặt tiếp khi giỏ trống
    expect((await placeOrder(user)).status).toBe(422)
    //huỷ: trả kho, ghi lý do
    const cancel = await api.post(`/orders/${order.id}/cancel`).set(user.auth).send({ reason: 'Đặt nhầm' })
    expect(cancel.body.result).toMatchObject({ status: 'Cancelled', cancel_reason: 'Đặt nhầm' })
    expect(cancel.body.result.history.map((h: { to_status: string }) => h.to_status)).toEqual(['Pending', 'Cancelled'])
    expect(await variantStock(catalog.shirt.S)).toBe(before.S)
    expect(await productStock(catalog.shirt.id)).toBe(before.product)
    //không huỷ lần 2
    expect((await api.post(`/orders/${order.id}/cancel`).set(user.auth).send({})).status).toBe(409)
  })

  it('mã giảm giá: xem trước, áp vào đơn, giới hạn mỗi khách, huỷ đơn thì trả lượt dùng', async () => {
    const created = await api.post('/admin/coupons').set(admin.auth).send({
      code: 'sale10',
      discount_type: 'Percent',
      discount_value: 10,
      usage_limit: 100,
      per_user_limit: 1
    })
    expect(created.body.result.code).toBe('SALE10')
    const user = await createSession()
    await addToCart(user, { product_id: catalog.shirt.id, variant_id: catalog.shirt.S, quantity: 2 }) //200000
    const preview = await api.post('/coupons/validate').set(user.auth).send({ code: 'Sale10' })
    expect(preview.body.result).toMatchObject({
      subtotal_amount: 200000,
      discount_amount: 20000,
      shipping_fee: 30000,
      total_amount: 210000
    })
    const order = await placeOrder(user, { ...shipping, coupon_code: 'sale10' })
    expect(order.body.result).toMatchObject({ discount_amount: 20000, total_amount: 210000, coupon_code: 'SALE10' })
    expect((await prisma.coupon.findUniqueOrThrow({ where: { code: 'SALE10' } })).used_count).toBe(1)

    await addToCart(user, { product_id: catalog.simple.id, quantity: 1 })
    const second = await placeOrder(user, { ...shipping, coupon_code: 'SALE10' })
    expect(second.status).toBe(422) //đã dùng hết lượt của khách này
    await api.post(`/orders/${order.body.result.id}/cancel`).set(user.auth).send({})
    expect((await prisma.coupon.findUniqueOrThrow({ where: { code: 'SALE10' } })).used_count).toBe(0)
    expect((await placeOrder(user, { ...shipping, coupon_code: 'SALE10' })).status).toBe(201) //được dùng lại
  })

  it('coupon hết hạn / chưa đủ giá trị tối thiểu bị từ chối', async () => {
    await api
      .post('/admin/coupons')
      .set(admin.auth)
      .send({ code: 'OLD', discount_type: 'Fixed', discount_value: 1000, expires_at: '2020-01-01T00:00:00Z' })
    await api
      .post('/admin/coupons')
      .set(admin.auth)
      .send({ code: 'BIG', discount_type: 'Fixed', discount_value: 1000, min_order_amount: 10000000 })
    const user = await createSession()
    await addToCart(user, { product_id: catalog.simple.id, quantity: 1 })
    expect((await api.post('/coupons/validate').set(user.auth).send({ code: 'OLD' })).status).toBe(422)
    expect((await api.post('/coupons/validate').set(user.auth).send({ code: 'BIG' })).status).toBe(422)
    expect((await api.post('/coupons/validate').set(user.auth).send({ code: 'NOPE' })).status).toBe(404)
  })

  it('không bán quá tồn kho khi nhiều người đặt cùng lúc', async () => {
    //biến thể M còn 3, mỗi người mua 2 -> chỉ 1 đơn thành công
    const buyers = await Promise.all(Array.from({ length: 4 }, () => createSession()))
    await Promise.all(
      buyers.map((b) => addToCart(b, { product_id: catalog.shirt.id, variant_id: catalog.shirt.M, quantity: 2 }))
    )
    const stockBefore = await variantStock(catalog.shirt.M)
    const results = await Promise.all(buyers.map((b) => placeOrder(b)))
    const ok = results.filter((r) => r.status === 201).length
    expect(ok).toBe(Math.floor(stockBefore / 2))
    expect(results.filter((r) => r.status === 409)).toHaveLength(4 - ok)
    expect(await variantStock(catalog.shirt.M)).toBe(stockBefore - ok * 2)
    //tồn kho tổng của sản phẩm khớp tổng các biến thể
    const variants = await prisma.productVariant.findMany({ where: { product_id: catalog.shirt.id } })
    expect(await productStock(catalog.shirt.id)).toBe(variants.reduce((sum, v) => sum + v.stock, 0))
  })

  it('đơn Pending quá hạn bị tự huỷ: trả kho và ghi lịch sử do hệ thống', async () => {
    const user = await createSession()
    await addToCart(user, { product_id: catalog.simple.id, quantity: 3 })
    const before = await variantStock(catalog.simple.variant)
    const order = (await placeOrder(user)).body.result
    expect(await variantStock(catalog.simple.variant)).toBe(before - 3)
    await prisma.order.update({
      where: { id: order.id },
      data: { created_at: new Date(Date.now() - 72 * 3600 * 1000) }
    })
    const count = await ordersServices.cancelExpiredPending(48)
    expect(count).toBeGreaterThanOrEqual(1)
    const after = await prisma.order.findUniqueOrThrow({ where: { id: order.id }, include: { history: true } })
    expect(after.status).toBe('Cancelled')
    expect(after.history.at(-1)).toMatchObject({ to_status: 'Cancelled', changed_by: null })
    expect(await variantStock(catalog.simple.variant)).toBe(before)
  })
})

describe('xử lý đơn (Admin/Staff), đánh giá, thống kê', () => {
  it('chỉ chuyển trạng thái đúng thứ tự; ghi vận đơn; Delivered mới được đánh giá; doanh thu tính theo ngày giao', async () => {
    const user = await createSession()
    await addToCart(user, { product_id: catalog.simple.id, quantity: 1 })
    const order = (await placeOrder(user)).body.result
    const status = (to: string, extra: object = {}) =>
      api
        .patch(`/admin/orders/${order.id}/status`)
        .set(admin.auth)
        .send({ status: to, ...extra })

    expect((await status('Delivered')).status).toBe(409) //không nhảy cóc
    expect((await status('Confirmed', { tracking_code: 'X' })).status).toBe(422) //vận đơn chỉ đi với Shipping
    expect((await status('Confirmed', { note: 'Đã gọi xác nhận' })).status).toBe(200)
    expect((await status('Shipping', { carrier: 'GHN', tracking_code: 'GHN123' })).body.result).toMatchObject({
      carrier: 'GHN',
      tracking_code: 'GHN123'
    })

    //chưa giao thì chưa được đánh giá
    const early = await api.post(`/products/${catalog.simple.id}/reviews`).set(user.auth).send({ rating: 5 })
    expect(early.status).toBe(403)

    const delivered = await status('Delivered')
    expect(delivered.body.result.delivered_at).toBeTruthy()
    expect(delivered.body.result.history.map((h: { to_status: string }) => h.to_status)).toEqual([
      'Pending',
      'Confirmed',
      'Shipping',
      'Delivered'
    ])
    //khách chỉ thấy dòng thời gian, không thấy ai thực hiện
    const mine = await api.get(`/orders/${order.id}`).set(user.auth)
    expect(mine.body.result.history[0].changed_by).toBeUndefined()

    //đánh giá: 1 lần / sản phẩm, điểm trung bình tự cập nhật
    const review = await api
      .post(`/products/${catalog.simple.id}/reviews`)
      .set(user.auth)
      .send({ rating: 4, comment: 'Tốt' })
    expect(review.status).toBe(201)
    expect((await api.post(`/products/${catalog.simple.id}/reviews`).set(user.auth).send({ rating: 5 })).status).toBe(
      409
    )
    const product = await api.get(`/products/${catalog.simple.id}`)
    expect(product.body.result).toMatchObject({ rating_avg: 4, rating_count: 1 })

    //doanh thu
    const overview = await api.get('/admin/stats/overview').set(admin.auth)
    expect(overview.body.result.revenue).toBeGreaterThanOrEqual(80000) //50000 + ship 30000
    const revenue = await api.get('/admin/stats/revenue').set(admin.auth)
    expect(revenue.body.result.items.at(-1).revenue).toBeGreaterThanOrEqual(80000)
  })

  it('khách không xem được đơn của người khác (404), Admin xem được kèm thông tin khách', async () => {
    const owner = await createSession()
    const other = await createSession()
    await addToCart(owner, { product_id: catalog.simple.id, quantity: 1 })
    const order = (await placeOrder(owner)).body.result
    expect((await api.get(`/orders/${order.id}`).set(other.auth)).status).toBe(404)
    expect((await api.post(`/orders/${order.id}/cancel`).set(other.auth).send({})).status).toBe(404)
    const adminView = await api.get(`/admin/orders/${order.id}`).set(admin.auth)
    expect(adminView.body.result.user.email).toBe(owner.email)
    const search = await api.get('/admin/orders').query({ search: order.code }).set(admin.auth)
    expect(search.body.result.total).toBe(1)
  })
})

describe('sổ địa chỉ & wishlist', () => {
  it('địa chỉ đầu tiên là mặc định, đổi mặc định, đặt hàng bằng address_id, không dùng địa chỉ của người khác', async () => {
    const user = await createSession()
    const other = await createSession()
    const a1 = await api.post('/addresses').set(user.auth).send({ name: 'Nhà', phone: '0901234567', address: '1 A' })
    expect(a1.body.result.is_default).toBe(true)
    const a2 = await api
      .post('/addresses')
      .set(user.auth)
      .send({ name: 'Cty', phone: '0901234568', address: '2 B', is_default: true })
    const list = await api.get('/addresses').set(user.auth)
    expect(list.body.result.map((a: { name: string; is_default: boolean }) => `${a.name}:${a.is_default}`)).toEqual([
      'Cty:true',
      'Nhà:false'
    ])

    await addToCart(user, { product_id: catalog.simple.id, quantity: 1 })
    const order = await placeOrder(user, { address_id: a2.body.result.id })
    expect(order.body.result).toMatchObject({ shipping_name: 'Cty', shipping_address: '2 B' })

    await addToCart(other, { product_id: catalog.simple.id, quantity: 1 })
    expect((await placeOrder(other, { address_id: a1.body.result.id })).status).toBe(404)
    expect((await api.patch(`/addresses/${a1.body.result.id}`).set(other.auth).send({ name: 'x' })).status).toBe(404)
    //xoá địa chỉ mặc định -> địa chỉ còn lại lên mặc định
    await api.delete(`/addresses/${a2.body.result.id}`).set(user.auth)
    expect((await api.get('/addresses').set(user.auth)).body.result[0].is_default).toBe(true)
  })

  it('wishlist: thêm hai lần không lỗi, sản phẩm bị ẩn thì không hiện', async () => {
    const user = await createSession()
    expect((await api.post('/wishlist').set(user.auth).send({ product_id: catalog.simple.id })).status).toBe(200)
    expect((await api.post('/wishlist').set(user.auth).send({ product_id: catalog.simple.id })).status).toBe(200)
    expect((await api.get('/wishlist').set(user.auth)).body.result.total).toBe(1)
    await api.patch(`/products/${catalog.simple.id}`).set(admin.auth).send({ is_active: false })
    expect((await api.get('/wishlist').set(user.auth)).body.result.total).toBe(0)
    await api.patch(`/products/${catalog.simple.id}`).set(admin.auth).send({ is_active: true })
  })
})
