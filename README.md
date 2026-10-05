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

## Vận hành

- **Log:** `production` in mỗi log một dòng JSON (`LOG_LEVEL=debug|info|warn|error`). `LOG_REQUESTS=true` (mặc định ở production) ghi mỗi request: `request_id, method, url (bỏ query), status, duration_ms, user_id`. Mỗi response có header `X-Request-Id` (dùng lại id từ proxy nếu hợp lệ), cũng có trong log lỗi 500 để lần theo.
- **Healthcheck:** `GET /health` (200 / 503 khi mất database). Tắt êm khi nhận `SIGTERM`/`SIGINT`.
- **Ảnh upload:** URL ảnh/video dựng từ `API_URL`. Xoá sản phẩm hoặc gỡ ảnh khỏi sản phẩm thì file ảnh trong `uploads/images` được xoá nếu không còn nơi nào dùng (sản phẩm khác, avatar/cover của user, hoặc bản chụp trong đơn hàng cũ thì được giữ lại). Ảnh upload nhưng quá `ORPHAN_UPLOAD_MAX_AGE_HOURS` giờ (mặc định 24, `0` = tắt) chưa gắn vào sản phẩm, avatar/cover hay đơn hàng nào sẽ bị job (chạy mỗi giờ) xoá, cùng file lỗi trong thư mục tạm; so khớp theo tên file nên đổi `API_URL` không làm xoá nhầm. Video không bị tự xoá (DB không lưu video nào đang dùng).

## Test

Test tích hợp chạy trên PostgreSQL thật (vitest + supertest), phủ đăng ký/đăng nhập, phân quyền, giỏ hàng, biến thể, đặt hàng, coupon, huỷ đơn, tự huỷ quá hạn, chống bán quá tồn kho khi đặt song song, thống kê, bảo mật và việc docs OpenAPI khớp với route thật.

```bash
createdb shoppingcard_test   # hoặc: docker compose exec postgres createdb -U shoppingcard shoppingcard_test
npm run lint                 # ESLint (flat config, kèm kiểm tra định dạng prettier); lint:fix để tự sửa
npm test                     # dùng TEST_DATABASE_URL, mặc định postgresql://shoppingcard:shoppingcard@localhost:5433/shoppingcard_test
```

**Database test bị xoá sạch dữ liệu mỗi lần chạy** nên không được trỏ `TEST_DATABASE_URL` vào database thật. Migration được áp dụng tự động trước khi chạy.

## Bảo mật & lỗi

- `helmet`, CORS theo `CORS_ORIGIN` (mặc định `CLIENT_URL`), body JSON tối đa 100kb.
- Giới hạn tần suất theo IP (`express-rate-limit`, đếm trong bộ nhớ): toàn API 300 req/phút; đăng nhập 10 lần sai/15 phút; đăng ký 10/giờ; quên mật khẩu / gửi lại mail / reset mật khẩu 5/15 phút. Trả `429`. Sau reverse proxy đặt `TRUST_PROXY`.
- Lỗi 500 chỉ trả `{ message: "Internal server error" }`, chi tiết ghi vào log (đặt `DEBUG_ERRORS=true` khi dev nếu muốn thấy). Đường dẫn không tồn tại trả 404, JSON sai cú pháp trả 400, body quá lớn trả 413.
- `POST /users/forgot-password` luôn trả 200 dù email có đăng ký hay không (không cho dò email); việc tạo token + gửi mail chạy nền. Lưu ý đăng ký trùng email vẫn trả 409 nên không tránh được hoàn toàn việc dò email qua form đăng ký.
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

Tài liệu tương tác (Swagger UI) tại **`/docs`**, đặc tả OpenAPI tại `/docs/openapi.json` (nguồn: `docs/openapi.yaml`; import được vào Postman/Insomnia). Mặc định bật khi không phải production, production đặt `ENABLE_DOCS=true` nếu muốn mở. `GET /health` kiểm tra server + database (200/503) cho load balancer.

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
| `POST /products`, `PATCH /products/:id`          | Admin, Staff | `images` là mảng URL (lấy từ `POST /medias/upload-image`). Tạo sản phẩm: truyền `price` (+`stock`) hoặc `variants` (xem bên dưới)                |
| `DELETE /products/:id`                           | Admin        | Đơn cũ vẫn giữ tên/giá nhờ bản chụp trong `order_items`                                                                                          |
| `GET /admin/products`, `GET /admin/products/:id` | Admin, Staff | Thấy cả sản phẩm đang ẩn (`is_active=false`)                                                                                                     |

### Biến thể sản phẩm (size, màu...)

Giá và tồn kho nằm ở **biến thể**. Mọi sản phẩm có ít nhất 1 biến thể; sản phẩm không có tuỳ chọn chỉ có 1 biến thể mặc định tên rỗng (`has_variants: false`), nên FE cũ vẫn dùng `price`/`stock` như trước. `price` của sản phẩm = giá thấp nhất, `stock` = tổng tồn kho các biến thể đang bán (tự cập nhật, dùng để lọc/sắp xếp). Khách chỉ thấy biến thể `is_active`.

- Tạo sản phẩm có size: `POST /products {category_id, name, variants: [{name: "S", price, stock?, sku?, is_active?}, ...]}` (tên không trùng nhau, không phân biệt hoa/thường; `sku` duy nhất).
- `PATCH /products/:id` có `price`/`stock` chỉ dùng được với sản phẩm không có tuỳ chọn (409 nếu có biến thể → sửa ở biến thể).
- `POST /products/:id/variants`, `PATCH /products/:id/variants/:variant_id`, `DELETE /products/:id/variants/:variant_id` (Admin, Staff). Thêm biến thể đầu tiên vào sản phẩm không có tuỳ chọn thì biến thể mặc định bị thay thế (giỏ hàng đang chứa nó bị xoá khỏi giỏ, đơn cũ giữ nguyên). Sản phẩm luôn phải còn ít nhất 1 biến thể.
- Đơn hàng lưu `variant_id`, `variant_name` (bản chụp) cho mỗi dòng.

### Giỏ hàng — `/cart` (cần đăng nhập + đã verify email)

`GET /cart`, `DELETE /cart`, `POST /cart/items {product_id, variant_id?, quantity}` (cộng dồn), `PATCH /cart/items/:product_id {variant_id?, quantity}`, `DELETE /cart/items/:product_id?variant_id=`. `variant_id` bắt buộc khi sản phẩm có nhiều biến thể (422 nếu thiếu); mỗi dòng trong giỏ trả thêm `variant`.

**Giỏ hàng khách vãng lai:** FE giữ giỏ tạm ở localStorage, sau khi đăng nhập gọi `POST /cart/merge {items: [{product_id, variant_id?, quantity}]}` (1 - 50 dòng) rồi xoá giỏ tạm. Dòng đã có trong giỏ tài khoản thì lấy số lượng **lớn hơn** của hai bên (không cộng dồn, nên gọi lại không bị nhân đôi). Trả `{cart, skipped, adjusted}`: `skipped` là các dòng bỏ qua (`not_available`, `variant_required`, `out_of_stock`), `adjusted` là các dòng bị hạ xuống bằng tồn kho.

### Đơn hàng — `/orders` (cần đăng nhập + đã verify email)

| Method & path                                | Việc                                                                                                                                                                                                                                           |
| -------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `POST /orders`                               | Tạo đơn từ giỏ: `{shipping_name, shipping_phone, shipping_address, note?, coupon_code?}`. Trừ kho, xoá giỏ                                                                                                                                     |
| `GET /orders`, `GET /orders/:id`             | Đơn của chính mình (`?status=` để lọc)                                                                                                                                                                                                         |
| `POST /orders/:id/cancel {reason?}`          | Khách tự huỷ khi đơn còn `Pending`, hoàn kho                                                                                                                                                                                                   |
| `GET /admin/orders`, `GET /admin/orders/:id` | Admin/Staff xem mọi đơn (kèm thông tin khách và `changed_by` trong lịch sử). `?search=` theo mã đơn, tên, SĐT người nhận                                                                                                                       |
| `PATCH /admin/orders/:id/status`             | Admin/Staff đổi trạng thái: `Pending → Confirmed → Shipping → Delivered`; huỷ được từ `Pending`/`Confirmed`. Body `{status, note?, carrier?, tracking_code?}` (`note` khi huỷ là lý do huỷ; `carrier`/`tracking_code` chỉ khi sang `Shipping`) |
| `PATCH /admin/orders/:id/tracking`           | Sửa `carrier`/`tracking_code` khi đơn đang `Shipping`                                                                                                                                                                                          |

Chưa có thanh toán online (đơn mặc định là thanh toán khi nhận hàng).

Mỗi đơn có `code` dễ đọc (vd `DH261005-7K3M9`) để khách tra cứu, `delivered_at`, `cancelled_at`, `cancel_reason`, `carrier`, `tracking_code` và `history` (dòng thời gian đổi trạng thái: `from_status`, `to_status`, `note`, `created_at`; `changed_by` null = hệ thống, vd tự huỷ quá hạn). Doanh thu trong thống kê tính theo `delivered_at`.

Đơn `Pending` quá `ORDER_AUTO_CANCEL_HOURS` giờ (mặc định 48, `0` = tắt) chưa được xác nhận sẽ tự huỷ: trả hàng về kho, trả lượt dùng coupon và gửi mail cho khách. Job chạy mỗi 10 phút trong tiến trình server.

### Phí vận chuyển

Cấu hình bằng env: `SHIPPING_FEE` (mặc định 30000, `0` = luôn miễn phí) và `FREE_SHIPPING_THRESHOLD` (mặc định 500000: tiền hàng sau giảm giá từ mức này được miễn phí ship). `GET /cart` trả `shipping_fee` và `free_shipping_threshold` để FE hiện "mua thêm X để miễn phí ship". Đơn lưu `shipping_fee`; `total_amount` = tiền hàng − `discount_amount` + `shipping_fee` (doanh thu trong thống kê tính theo `total_amount`, tức đã gồm phí ship). `POST /coupons/validate` trả thêm `shipping_fee`, `total_amount` đã gồm phí ship.

### Sổ địa chỉ — `/addresses` (cần đăng nhập + đã verify email)

`GET /addresses` (mặc định lên đầu), `POST /addresses {name, phone, address, is_default?}`, `PATCH /addresses/:id`, `DELETE /addresses/:id`. Tối đa 10 địa chỉ; địa chỉ đầu tiên tự là mặc định; đặt `is_default: true` để đổi mặc định; xoá địa chỉ mặc định thì địa chỉ mới nhất còn lại lên làm mặc định. Khi đặt hàng truyền `address_id` thay cho 3 trường `shipping_*`.

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

Doanh thu tính trên đơn `Delivered`, theo ngày giao (`delivered_at`); ngày/tháng cắt theo giờ Việt Nam (`Asia/Ho_Chi_Minh`). `from` tính, `to` không tính (`from <= thời điểm < to`), định dạng ISO 8601. Ngày không kèm múi giờ (vd `2026-10-01`) được hiểu là 00:00 UTC; muốn tính theo ngày Việt Nam hãy truyền `2026-10-01T00:00:00+07:00`.

| Method & path                                     | Ghi chú                                                                                                                                                              |
| ------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /admin/stats/overview?from&to`               | `revenue, discount_total, average_order_value, orders_total, orders_by_status, new_users, users_total, products_total, products_active`. Bỏ trống = từ trước đến nay |
| `GET /admin/stats/revenue?from&to&group_by`       | `group_by=day` (mặc định) hoặc `month`; mặc định 30 ngày gần nhất, tối đa 366 ngày / 60 tháng. Kỳ không có đơn vẫn trả về với `0`                                    |
| `GET /admin/stats/top-products?from&to&limit`     | Bán chạy theo số lượng (`limit` mặc định 10, tối đa 50). `revenue` là tiền hàng, chưa trừ mã giảm giá                                                                |
| `GET /admin/stats/low-stock?threshold&page&limit` | Biến thể đang bán có `stock <= threshold` (mặc định 5), ít hàng nhất lên đầu (`variant_name` rỗng = sản phẩm không có tuỳ chọn)                                      |

### Quản lý người dùng — `/admin/users`, chỉ Admin

| Method & path                                              | Ghi chú                                                                                                                                           |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /admin/users` (`?search=&role=&verify=&page=&limit=`) | `search` theo tên/email/username. Không bao giờ trả mật khẩu hay token; kèm `_count.orders`                                                       |
| `GET /admin/users/:id`                                     |                                                                                                                                                   |
| `POST /admin/users/:id/ban`, `POST /admin/users/:id/unban` | Khoá: không đăng nhập/refresh/đặt hàng được, bị đăng xuất mọi thiết bị. Mở khoá: về `Verified` nếu đã từng xác thực email, không thì `Unverified` |
| `PATCH /admin/users/:id/role {role}`                       | `0` Admin, `1` Staff, `2` User; có hiệu lực ngay. Không tự khoá / đổi role của chính mình                                                         |

### Phân quyền

Role lưu trong DB (`0` Admin, `1` Staff, `2` User) và được kiểm tra mỗi request, nên đổi role hay khoá tài khoản có hiệu lực ngay.
