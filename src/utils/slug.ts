import { randomBytes } from 'crypto'

//đổi 'Áo Thun Nam' -> 'ao-thun-nam' (bỏ dấu tiếng Việt, đ -> d)
export const slugify = (text: string) => {
  const slug = text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return slug || 'item'
}

//tạo slug duy nhất: nếu slug đã có người dùng thì thêm hậu tố ngẫu nhiên
export const generateUniqueSlug = async (text: string, exists: (slug: string) => Promise<boolean>) => {
  const base = slugify(text)
  let slug = base
  while (await exists(slug)) {
    slug = `${base}-${randomBytes(3).toString('hex')}`
  }
  return slug
}
