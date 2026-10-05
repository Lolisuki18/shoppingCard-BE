import { Prisma } from '@prisma/client'

//Product.price / Product.stock là số liệu tổng hợp từ các biến thể (để lọc, sắp xếp, hiển thị danh sách nhanh):
//  price = giá thấp nhất trong các biến thể đang bán (không biến thể nào đang bán thì lấy giá thấp nhất của tất cả)
//  stock = tổng tồn kho các biến thể đang bán
//Gọi trong cùng transaction với thay đổi biến thể / tồn kho.
export const aggregateVariants = (variants: { price: number; stock: number; is_active: boolean }[]) => {
  const active = variants.filter((variant) => variant.is_active)
  const priced = active.length > 0 ? active : variants
  return {
    price: priced.length > 0 ? Math.min(...priced.map((variant) => variant.price)) : 0,
    stock: active.reduce((sum, variant) => sum + variant.stock, 0)
  }
}

export const syncProductAggregates = async (tx: Prisma.TransactionClient, product_id: string) => {
  //khoá dòng product TRƯỚC khi đọc biến thể: transaction đến sau phải chờ transaction trước commit rồi mới đọc,
  //nên không ghi đè bằng số liệu cũ (lost update) khi nhiều đơn hàng cùng trừ kho 1 sản phẩm
  await tx.$queryRaw`SELECT id FROM products WHERE id = ${product_id}::uuid FOR UPDATE`
  const variants = await tx.productVariant.findMany({
    where: { product_id },
    select: { price: true, stock: true, is_active: true }
  })
  if (variants.length === 0) return
  await tx.product.update({ where: { id: product_id }, data: aggregateVariants(variants) })
}
