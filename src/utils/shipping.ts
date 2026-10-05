//phí vận chuyển cấu hình bằng biến môi trường (VND):
//  SHIPPING_FEE             phí giao hàng chuẩn (mặc định 30000, đặt 0 = luôn miễn phí)
//  FREE_SHIPPING_THRESHOLD  tiền hàng (sau khi trừ giảm giá) từ mức này trở lên được miễn phí ship (mặc định 500000)
const intFromEnv = (name: string, fallback: number) => {
  const raw = process.env[name]
  if (raw === undefined || raw.trim() === '') return fallback
  const value = Number(raw)
  return Number.isInteger(value) && value >= 0 ? value : fallback
}

export const getShippingConfig = () => ({
  fee: intFromEnv('SHIPPING_FEE', 30000),
  free_shipping_threshold: intFromEnv('FREE_SHIPPING_THRESHOLD', 500000)
})

//goodsAmount = tiền hàng đã trừ giảm giá (coupon giảm hết tiền hàng thì khách vẫn trả phí ship). Giỏ trống: caller tự trả 0
export const calculateShippingFee = (goodsAmount: number) => {
  const { fee, free_shipping_threshold } = getShippingConfig()
  return goodsAmount >= free_shipping_threshold ? 0 : fee
}
