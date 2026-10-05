import { execSync } from 'child_process'
import { TEST_DATABASE_URL } from './testEnv'

//chạy 1 lần trước toàn bộ test: áp dụng migration lên database test (tạo bảng nếu chưa có)
export default function setup() {
  try {
    execSync('npx prisma migrate deploy', {
      stdio: 'pipe',
      env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL }
    })
  } catch (error: any) {
    throw new Error(
      `Không áp dụng được migration lên database test (${TEST_DATABASE_URL.replace(/:[^:@/]*@/, ':***@')}).\n` +
        `Hãy tạo database này (vd: createdb shoppingcard_test) hoặc đặt TEST_DATABASE_URL.\n${error.stderr?.toString() ?? error.message}`
    )
  }
}
