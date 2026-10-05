import { randomInt } from 'crypto'

//bỏ các ký tự dễ nhầm (0/O, 1/I) để khách đọc/đánh máy mã qua điện thoại không sai
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

//vd DH261005-7K3M9: DH + ngày tạo (yymmdd) + 5 ký tự ngẫu nhiên
export const generateOrderCode = (date = new Date()) => {
  const yy = String(date.getFullYear()).slice(-2)
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  const suffix = Array.from({ length: 5 }, () => ALPHABET[randomInt(ALPHABET.length)]).join('')
  return `DH${yy}${mm}${dd}-${suffix}`
}
