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

## Email

Gửi qua SMTP (nodemailer): xác thực email, quên mật khẩu, xác nhận đơn, đổi trạng thái đơn. Cấu hình `SMTP_*`, `MAIL_FROM`, `API_URL`, `CLIENT_URL` trong `.env` (xem `.env.example`). Để trống `SMTP_HOST` thì nội dung mail chỉ được in ra log (tiện khi dev). Gửi mail lỗi chỉ ghi log, không làm request thất bại.

## Bảo mật & lỗi

- `helmet`, CORS theo `CORS_ORIGIN` (mặc định `CLIENT_URL`), body JSON tối đa 100kb.
- Giới hạn tần suất theo IP (`express-rate-limit`, đếm trong bộ nhớ): toàn API 300 req/phút; đăng nhập 10 lần sai/15 phút; đăng ký 10/giờ; quên mật khẩu / gửi lại mail / reset mật khẩu 5/15 phút. Trả `429`. Sau reverse proxy đặt `TRUST_PROXY`.
- Lỗi 500 chỉ trả `{ message: "Internal server error" }`, chi tiết ghi vào log (đặt `DEBUG_ERRORS=true` khi dev nếu muốn thấy). Đường dẫn không tồn tại trả 404, JSON sai cú pháp trả 400, body quá lớn trả 413.
- `/static/*` chỉ phục vụ file nằm trực tiếp trong thư mục upload (đã chặn path traversal).

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

| Method & path                                    | Quyền        | Ghi chú                                                                                                                                          |
| ------------------------------------------------ | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `GET /categories`, `GET /categories/:id`         | public       | Kèm `product_count`                                                                                                                              |
| `POST /categories`, `PATCH /categories/:id`      | Admin, Staff |                                                                                                                                                  |
| `DELETE /categories/:id`                         | Admin        | 409 nếu còn sản phẩm                                                                                                                             |
| `GET /products`                                  | public       | Query: `page, limit, search, category_id, min_price, max_price, sort` (`newest`/`price_asc`/`price_desc`/`name`/`rating`). Chỉ sản phẩm đang bán |
| `GET /products/:id`                              | public       |                                                                                                                                                  |
| `POST /products`, `PATCH /products/:id`          | Admin, Staff | `images` là mảng URL (lấy từ `POST /medias/upload-image`)                                                                                        |
| `DELETE /products/:id`                           | Admin        | Đơn cũ vẫn giữ tên/giá nhờ bản chụp trong `order_items`                                                                                          |
| `GET /admin/products`, `GET /admin/products/:id` | Admin, Staff | Thấy cả sản phẩm đang ẩn (`is_active=false`)                                                                                                     |

### Giỏ hàng — `/cart` (cần đăng nhập + đã verify email)

`GET /cart`, `DELETE /cart`, `POST /cart/items {product_id, quantity}` (cộng dồn), `PATCH /cart/items/:product_id {quantity}`, `DELETE /cart/items/:product_id`

### Đơn hàng — `/orders` (cần đăng nhập + đã verify email)

| Method & path                                | Việc                                                                                                        |
| -------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `POST /orders`                               | Tạo đơn từ giỏ: `{shipping_name, shipping_phone, shipping_address, note?, coupon_code?}`. Trừ kho, xoá giỏ  |
| `GET /orders`, `GET /orders/:id`             | Đơn của chính mình (`?status=` để lọc)                                                                      |
| `POST /orders/:id/cancel`                    | Khách tự huỷ khi đơn còn `Pending`, hoàn kho                                                                |
| `GET /admin/orders`, `GET /admin/orders/:id` | Admin/Staff xem mọi đơn                                                                                     |
| `PATCH /admin/orders/:id/status`             | Admin/Staff đổi trạng thái: `Pending → Confirmed → Shipping → Delivered`; huỷ được từ `Pending`/`Confirmed` |

Chưa có thanh toán online (đơn mặc định là thanh toán khi nhận hàng).

### Mã giảm giá

Đơn có thêm `coupon_code`, `discount_amount`; `total_amount` là số tiền khách phải trả (đã trừ giảm giá). Mã không phân biệt hoa/thường. Huỷ đơn thì trả lại lượt dùng mã.

| Method & path                                                          | Quyền        | Ghi chú                                                                                                                                                                                                  |
| ---------------------------------------------------------------------- | ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `POST /coupons/validate {code}`                                        | Đã đăng nhập | Xem trước với giỏ hiện tại: `{coupon, subtotal_amount, discount_amount, total_amount}`. 404 nếu không có mã, 422 nếu không dùng được (hết hạn, hết lượt, chưa đủ tối thiểu...)                           |
| `GET /admin/coupons` (`?search=&is_active=`), `GET /admin/coupons/:id` | Admin, Staff |                                                                                                                                                                                                          |
| `POST /admin/coupons`, `PATCH /admin/coupons/:id`                      | Admin, Staff | `code, discount_type (Percent/Fixed), discount_value, min_order_amount?, max_discount_amount?, usage_limit?, per_user_limit? (mặc định 1), starts_at?, expires_at?, is_active?`. `null` = không giới hạn |
| `DELETE /admin/coupons/:id`                                            | Admin        | Đơn cũ vẫn giữ `coupon_code`/`discount_amount`                                                                                                                                                           |

### Đánh giá & yêu thích

Sản phẩm có thêm `rating_avg` (0 nếu chưa có đánh giá) và `rating_count`.

| Method & path                                       | Quyền        | Ghi chú                                                                                                   |
| --------------------------------------------------- | ------------ | --------------------------------------------------------------------------------------------------------- |
| `GET /products/:id/reviews`                         | public       | Phân trang; kèm `rating_avg`, `rating_count`                                                              |
| `POST /products/:id/reviews {rating 1-5, comment?}` | Đã đăng nhập | Chỉ khi đã có đơn `Delivered` chứa sản phẩm (403 nếu chưa). Mỗi khách 1 đánh giá/sản phẩm (409 nếu trùng) |
| `PATCH /reviews/:id`, `DELETE /reviews/:id`         | Đã đăng nhập | Chủ đánh giá; Admin/Staff xoá được mọi đánh giá                                                           |
| `GET /wishlist`, `POST /wishlist {product_id}`      | Đã đăng nhập | Thêm lần nữa không lỗi; sản phẩm đang ẩn không hiện trong danh sách                                       |
| `DELETE /wishlist/:product_id`                      | Đã đăng nhập | 404 nếu không có trong danh sách                                                                          |

### Thống kê (dashboard) — `/admin/stats`, chỉ Admin

Doanh thu tính trên đơn `Delivered`, theo ngày tạo đơn; ngày/tháng cắt theo giờ Việt Nam (`Asia/Ho_Chi_Minh`). `from` tính, `to` không tính (`from <= created_at < to`), định dạng ISO 8601 (vd `2026-10-01`).

| Method & path                                     | Ghi chú                                                                                                                                                              |
| ------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /admin/stats/overview?from&to`               | `revenue, discount_total, average_order_value, orders_total, orders_by_status, new_users, users_total, products_total, products_active`. Bỏ trống = từ trước đến nay |
| `GET /admin/stats/revenue?from&to&group_by`       | `group_by=day` (mặc định) hoặc `month`; mặc định 30 ngày gần nhất, tối đa 366 ngày / 60 tháng. Kỳ không có đơn vẫn trả về với `0`                                    |
| `GET /admin/stats/top-products?from&to&limit`     | Bán chạy theo số lượng (`limit` mặc định 10, tối đa 50). `revenue` là tiền hàng, chưa trừ mã giảm giá                                                                |
| `GET /admin/stats/low-stock?threshold&page&limit` | Sản phẩm đang bán có `stock <= threshold` (mặc định 5), ít hàng nhất lên đầu                                                                                         |

### Phân quyền

Role lưu trong DB (`0` Admin, `1` Staff, `2` User) và được kiểm tra mỗi request, nên đổi role hay khoá tài khoản có hiệu lực ngay.
