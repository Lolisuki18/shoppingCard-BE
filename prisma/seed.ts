//npm run db:seed : tạo tài khoản Admin (từ ADMIN_EMAIL / ADMIN_PASSWORD trong .env) + dữ liệu mẫu nếu chưa có
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import dotenv from 'dotenv'
dotenv.config()

const prisma = new PrismaClient()

const ADMIN_ROLE = 0 // USER_ROLE.Admin
const VERIFIED = 1 // UserVerifyStatus.Verified

async function seedAdmin() {
  const email = process.env.ADMIN_EMAIL
  const password = process.env.ADMIN_PASSWORD
  if (!email || !password) {
    console.log('Bỏ qua tạo admin: chưa đặt ADMIN_EMAIL / ADMIN_PASSWORD trong .env')
    return
  }
  const user = await prisma.user.upsert({
    where: { email },
    //chạy lại seed sẽ đặt lại mật khẩu + đảm bảo user này là Admin đã verify
    update: { password: await bcrypt.hash(password, 10), role: ADMIN_ROLE, verify: VERIFIED },
    create: {
      email,
      name: 'Admin',
      username: 'admin',
      password: await bcrypt.hash(password, 10),
      role: ADMIN_ROLE,
      verify: VERIFIED
    }
  })
  console.log(`Admin sẵn sàng: ${user.email}`)
}

async function seedCatalog() {
  if ((await prisma.category.count()) > 0) {
    console.log('Đã có category, bỏ qua dữ liệu mẫu')
    return
  }
  const clothes = await prisma.category.create({ data: { name: 'Thời trang', slug: 'thoi-trang' } })
  const phones = await prisma.category.create({ data: { name: 'Điện thoại', slug: 'dien-thoai' } })
  //sản phẩm có size thì khai báo variants; không có tuỳ chọn thì 1 biến thể mặc định (name rỗng)
  const sizes = (price: number) => ['S', 'M', 'L'].map((name) => ({ name, price, stock: 20 }))
  const products = [
    { category_id: clothes.id, name: 'Áo thun basic', slug: 'ao-thun-basic', variants: sizes(150000) },
    { category_id: clothes.id, name: 'Quần jean slim', slug: 'quan-jean-slim', variants: sizes(350000) },
    {
      category_id: phones.id,
      name: 'Điện thoại X1',
      slug: 'dien-thoai-x1',
      variants: [{ name: '', price: 7990000, stock: 10 }]
    },
    {
      category_id: phones.id,
      name: 'Ốp lưng X1',
      slug: 'op-lung-x1',
      variants: [{ name: '', price: 99000, stock: 100 }]
    }
  ]
  for (const { variants, ...product } of products) {
    await prisma.product.create({
      data: {
        ...product,
        //price/stock của sản phẩm là số liệu tổng hợp từ biến thể (giá thấp nhất, tổng tồn kho)
        price: Math.min(...variants.map((v) => v.price)),
        stock: variants.reduce((sum, v) => sum + v.stock, 0),
        variants: { create: variants }
      }
    })
  }
  console.log('Đã tạo 2 category và 4 sản phẩm mẫu')
}

async function main() {
  await seedAdmin()
  await seedCatalog()
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
