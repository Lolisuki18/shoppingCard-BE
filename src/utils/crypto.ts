import bcrypt from 'bcryptjs'

//số vòng băm của bcrypt: càng cao càng chậm (và càng khó brute-force), 10-12 là mức phổ biến
const SALT_ROUNDS = 10

//hàm nhận vào password và băm bằng bcrypt (tự thêm salt ngẫu nhiên, nên cùng 1 password sẽ ra các hash khác nhau)
export function hashPassword(password: string) {
  return bcrypt.hash(password, SALT_ROUNDS)
}

//so sánh password người dùng nhập với hash đã lưu trong database
export function comparePassword(password: string, hash: string) {
  return bcrypt.compare(password, hash)
}
