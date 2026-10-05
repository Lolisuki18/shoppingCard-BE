-- CreateTable
CREATE TABLE "product_variants" (
    "id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "name" TEXT NOT NULL DEFAULT '',
    "sku" TEXT,
    "price" INTEGER NOT NULL,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_variants_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "product_variants_sku_key" ON "product_variants"("sku");

-- CreateIndex
CREATE UNIQUE INDEX "product_variants_product_id_name_key" ON "product_variants"("product_id", "name");

-- AddForeignKey
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill: mỗi sản phẩm hiện có nhận 1 biến thể mặc định (name = '') mang giá + tồn kho của sản phẩm
INSERT INTO "product_variants" ("id", "product_id", "name", "price", "stock", "is_active", "updated_at")
SELECT gen_random_uuid(), "id", '', "price", "stock", true, CURRENT_TIMESTAMP FROM "products";

-- cart_items: gắn mỗi dòng giỏ hàng vào biến thể mặc định của sản phẩm rồi mới đặt NOT NULL
DROP INDEX "cart_items_user_id_product_id_key";
ALTER TABLE "cart_items" ADD COLUMN "variant_id" UUID;
UPDATE "cart_items" ci SET "variant_id" = pv."id" FROM "product_variants" pv WHERE pv."product_id" = ci."product_id" AND pv."name" = '';
ALTER TABLE "cart_items" ALTER COLUMN "variant_id" SET NOT NULL;
CREATE INDEX "cart_items_user_id_product_id_idx" ON "cart_items"("user_id", "product_id");
CREATE UNIQUE INDEX "cart_items_user_id_variant_id_key" ON "cart_items"("user_id", "variant_id");
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "product_variants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- order_items: đơn cũ trỏ về biến thể mặc định của sản phẩm (nếu sản phẩm còn)
ALTER TABLE "order_items" ADD COLUMN "variant_id" UUID, ADD COLUMN "variant_name" TEXT NOT NULL DEFAULT '';
UPDATE "order_items" oi SET "variant_id" = pv."id" FROM "product_variants" pv WHERE pv."product_id" = oi."product_id" AND pv."name" = '';
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "product_variants"("id") ON DELETE SET NULL ON UPDATE CASCADE;
