import path from 'path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: { alias: { '~': path.resolve(import.meta.dirname, 'src') } },
  test: {
    include: ['tests/**/*.test.ts'],
    globalSetup: ['tests/globalSetup.ts'],
    setupFiles: ['tests/setupEnv.ts'],
    //các file test dùng chung 1 database nên chạy lần lượt, mỗi file tự dọn dữ liệu ở đầu
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 120_000
  }
})
