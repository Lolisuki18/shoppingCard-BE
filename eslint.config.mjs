import js from '@eslint/js'
import prettierRecommended from 'eslint-plugin-prettier/recommended'
import globals from 'globals'
import tseslint from 'typescript-eslint'

export default [
  { ignores: ['node_modules/', 'dist/', 'uploads/', 'coverage/'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  //định dạng code theo .prettierrc (eslint-config-prettier tắt các rule xung đột)
  prettierRecommended,
  {
    files: ['**/*.ts', '**/*.mts'],
    languageOptions: { globals: { ...globals.node } },
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      //biến/tham số không dùng chỉ cảnh báo; đặt tên bắt đầu bằng _ để báo cố ý bỏ qua (riêng `next` của Express được bỏ qua vì middleware lỗi bắt buộc đủ 4 tham số)
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^(_|next$)', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' }
      ],
      'no-console': 'warn' //dùng logger (src/utils/logger.ts) thay cho console
    }
  },
  {
    //logger là nơi duy nhất được phép dùng console; script seed in kết quả ra terminal
    files: ['src/utils/logger.ts', 'prisma/seed.ts'],
    rules: { 'no-console': 'off' }
  }
]
