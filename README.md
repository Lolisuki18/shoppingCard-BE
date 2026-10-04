# shoppingCard-BE

Backend Node.js + Express + TypeScript, database PostgreSQL (Prisma).

## Chạy local

```bash
npm install                 # tự chạy prisma generate
cp .env.example .env        # rồi điền các secret (PASSWORD_SECRET, JWT_SECRET_*)
npm run db:up               # bật PostgreSQL bằng Docker (cổng 5433)
npm run db:migrate          # tạo bảng
npm run dev                 # http://localhost:3000
```

## Lệnh DB

| Lệnh                        | Việc                                             |
| --------------------------- | ------------------------------------------------ |
| `npm run db:up` / `db:down` | Bật / tắt container Postgres                     |
| `npm run db:migrate`        | Tạo + áp dụng migration mới (sau khi sửa schema) |
| `npm run db:deploy`         | Áp dụng migration có sẵn (production)            |
| `npm run db:studio`         | Mở giao diện xem dữ liệu                         |

Schema nằm ở `prisma/schema.prisma`.
