-- AlterTable: cột mới (code thêm ở dạng cho phép NULL, điền cho đơn cũ rồi mới đặt NOT NULL)
ALTER TABLE "orders" ADD COLUMN     "cancel_reason" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "cancelled_at" TIMESTAMP(3),
ADD COLUMN     "carrier" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "code" TEXT,
ADD COLUMN     "delivered_at" TIMESTAMP(3),
ADD COLUMN     "tracking_code" TEXT NOT NULL DEFAULT '';

-- CreateTable
CREATE TABLE "order_status_history" (
    "id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "from_status" "OrderStatus",
    "to_status" "OrderStatus" NOT NULL,
    "note" TEXT NOT NULL DEFAULT '',
    "changed_by" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_status_history_pkey" PRIMARY KEY ("id")
);

-- Backfill đơn cũ: mã đơn dạng DH<yymmdd>-<8 ký tự từ id> (duy nhất vì lấy từ id), mốc giao/huỷ lấy từ updated_at
UPDATE "orders" SET "code" = 'DH' || to_char("created_at", 'YYMMDD') || '-' || upper(substr(md5("id"::text), 1, 8));
UPDATE "orders" SET "delivered_at" = "updated_at" WHERE "status" = 'Delivered';
UPDATE "orders" SET "cancelled_at" = "updated_at" WHERE "status" = 'Cancelled';
ALTER TABLE "orders" ALTER COLUMN "code" SET NOT NULL;

-- Backfill lịch sử: dòng "tạo đơn" cho mọi đơn, thêm dòng trạng thái hiện tại nếu đơn không còn Pending
INSERT INTO "order_status_history" ("id", "order_id", "from_status", "to_status", "note", "created_at")
SELECT gen_random_uuid(), "id", NULL, 'Pending', '', "created_at" FROM "orders";
INSERT INTO "order_status_history" ("id", "order_id", "from_status", "to_status", "note", "created_at")
SELECT gen_random_uuid(), "id", 'Pending', "status", '', "updated_at" FROM "orders" WHERE "status" <> 'Pending';

-- CreateIndex
CREATE INDEX "order_status_history_order_id_created_at_idx" ON "order_status_history"("order_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "orders_code_key" ON "orders"("code");

-- CreateIndex
CREATE INDEX "orders_status_delivered_at_idx" ON "orders"("status", "delivered_at");

-- AddForeignKey
ALTER TABLE "order_status_history" ADD CONSTRAINT "order_status_history_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
