# shoppingCard-BE

Backend Node.js + Express + TypeScript, database PostgreSQL (Prisma).

## Chạy local

```bash
npm install                 # tự chạy prisma generate
cp .env.example .env        # rồi điền JWT_SECRET_*, ADMIN_EMAIL, ADMIN_PASSWORD
npm run db:up               # bật PostgreSQL bằng Docker (cổng 5433)
npm run db:migrate          # tạo bảng
npm run db:seed             # tạo tài khoản Admin + vài sản phẩm mẫu
npm run dev                 # http://localhost:3000
```

## Lệnh DB

| Lệnh                        | Việc                                                     |
| --------------------------- | -------------------------------------------------------- |
| `npm run db:up` / `db:down` | Bật / tắt container Postgres                             |
| `npm run db:migrate`        | Tạo + áp dụng migration mới (sau khi sửa schema)         |
| `npm run db:deploy`         | Áp dụng migration có sẵn (production)                    |
| `npm run db:seed`           | Tạo Admin (từ `.env`) + dữ liệu mẫu nếu chưa có category |
| `npm run db:studio`         | Mở giao diện xem dữ liệu                                 |

Schema nằm ở `prisma/schema.prisma`.

## API

Mọi response có dạng `{ message, result }`. Header đăng nhập: `Authorization: Bearer <access_token>`.
Giá tiền là số nguyên (VND). Danh sách phân trang trả `result: { items, page, limit, total, total_pages }`.

### Users — `/users`

`POST /register`, `POST /login`, `POST /logout`, `GET /verify-email`, `POST /resend-verify-email`, `POST /forgot-password`, `POST /verify-forgot-password`, `POST /reset-password`, `POST /me`, `PATCH /me`, `PUT /change-password`, `POST /refresh-token`

### Danh mục & sản phẩm (public xem, Admin/Staff quản lý)

| Method & path                                    | Quyền        | Ghi chú                                                                                                                                 |
| ------------------------------------------------ | ------------ | --------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /categories`, `GET /categories/:id`         | public       | Kèm `product_count`                                                                                                                     |
| `POST /categories`, `PATCH /categories/:id`      | Admin, Staff |                                                                                                                                         |
| `DELETE /categories/:id`                         | Admin        | 409 nếu còn sản phẩm                                                                                                                    |
| `GET /products`                                  | public       | Query: `page, limit, search, category_id, min_price, max_price, sort` (`newest`/`price_asc`/`price_desc`/`name`). Chỉ sản phẩm đang bán |
| `GET /products/:id`                              | public       |                                                                                                                                         |
| `POST /products`, `PATCH /products/:id`          | Admin, Staff | `images` là mảng URL (lấy từ `POST /medias/upload-image`)                                                                               |
| `DELETE /products/:id`                           | Admin        | Đơn cũ vẫn giữ tên/giá nhờ bản chụp trong `order_items`                                                                                 |
| `GET /admin/products`, `GET /admin/products/:id` | Admin, Staff | Thấy cả sản phẩm đang ẩn (`is_active=false`)                                                                                            |

### Giỏ hàng — `/cart` (cần đăng nhập + đã verify email)

`GET /cart`, `DELETE /cart`, `POST /cart/items {product_id, quantity}` (cộng dồn), `PATCH /cart/items/:product_id {quantity}`, `DELETE /cart/items/:product_id`

### Đơn hàng — `/orders` (cần đăng nhập + đã verify email)

| Method & path                                | Việc                                                                                                        |
| -------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `POST /orders`                               | Tạo đơn từ giỏ: `{shipping_name, shipping_phone, shipping_address, note?}`. Trừ kho, xoá giỏ                |
| `GET /orders`, `GET /orders/:id`             | Đơn của chính mình (`?status=` để lọc)                                                                      |
| `POST /orders/:id/cancel`                    | Khách tự huỷ khi đơn còn `Pending`, hoàn kho                                                                |
| `GET /admin/orders`, `GET /admin/orders/:id` | Admin/Staff xem mọi đơn                                                                                     |
| `PATCH /admin/orders/:id/status`             | Admin/Staff đổi trạng thái: `Pending → Confirmed → Shipping → Delivered`; huỷ được từ `Pending`/`Confirmed` |

Chưa có thanh toán online (đơn mặc định là thanh toán khi nhận hàng).

### Phân quyền

Role lưu trong DB (`0` Admin, `1` Staff, `2` User) và được kiểm tra mỗi request, nên đổi role hay khoá tài khoản có hiệu lực ngay.
