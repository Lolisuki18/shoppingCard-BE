import { Coupon } from '@prisma/client'
import { afterEach, describe, expect, it } from 'vitest'
import { calculateDiscount } from '~/services/coupons.services'
import { generateOrderCode } from '~/utils/orderCode'
import { aggregateVariants } from '~/utils/productAggregates'
import { calculateShippingFee } from '~/utils/shipping'

const coupon = (overrides: Partial<Coupon>) =>
  ({ discount_type: 'Percent', discount_value: 10, max_discount_amount: null, ...overrides }) as Coupon

describe('calculateDiscount', () => {
  it('Percent: làm tròn xuống', () => {
    expect(calculateDiscount(coupon({ discount_value: 10 }), 99999)).toBe(9999)
  })
  it('Percent: bị chặn bởi max_discount_amount', () => {
    expect(calculateDiscount(coupon({ discount_value: 50, max_discount_amount: 20000 }), 1000000)).toBe(20000)
  })
  it('Fixed: không bao giờ vượt quá tiền hàng', () => {
    expect(calculateDiscount(coupon({ discount_type: 'Fixed', discount_value: 500000 }), 300000)).toBe(300000)
  })
})

describe('calculateShippingFee', () => {
  afterEach(() => {
    process.env.SHIPPING_FEE = '30000'
    process.env.FREE_SHIPPING_THRESHOLD = '500000'
  })
  it('thu phí khi dưới ngưỡng, miễn phí từ ngưỡng trở lên', () => {
    expect(calculateShippingFee(499999)).toBe(30000)
    expect(calculateShippingFee(500000)).toBe(0)
  })
  it('SHIPPING_FEE=0 là luôn miễn phí; giá trị sai thì dùng mặc định', () => {
    process.env.SHIPPING_FEE = '0'
    expect(calculateShippingFee(1)).toBe(0)
    process.env.SHIPPING_FEE = 'abc'
    expect(calculateShippingFee(1)).toBe(30000)
  })
})

describe('generateOrderCode', () => {
  it('đúng định dạng DHyymmdd-XXXXX, không có ký tự dễ nhầm, hiếm khi trùng', () => {
    const codes = Array.from({ length: 200 }, () => generateOrderCode(new Date(2026, 9, 5)))
    for (const code of codes) expect(code).toMatch(/^DH261005-[A-HJ-NP-Z2-9]{5}$/)
    expect(new Set(codes).size).toBeGreaterThan(195)
  })
})

describe('aggregateVariants', () => {
  it('giá thấp nhất + tổng tồn kho của biến thể đang bán', () => {
    expect(
      aggregateVariants([
        { price: 100, stock: 2, is_active: true },
        { price: 80, stock: 5, is_active: true },
        { price: 10, stock: 99, is_active: false }
      ])
    ).toEqual({ price: 80, stock: 7 })
  })
  it('không còn biến thể nào đang bán: tồn kho 0, giá lấy theo tất cả', () => {
    expect(aggregateVariants([{ price: 70, stock: 4, is_active: false }])).toEqual({ price: 70, stock: 0 })
  })
})
