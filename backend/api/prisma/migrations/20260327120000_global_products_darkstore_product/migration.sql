-- =====================================================
-- Migration: Global Products + DarkstoreProduct
-- 
-- Converts Product from per-darkstore to global model.
-- Creates DarkstoreProduct join table for per-darkstore
-- pricing, stock, cell numbers, and categories.
--
-- ROLLBACK: See bottom of file for rollback SQL.
-- =====================================================

-- 1. Create DarkstoreProduct table
CREATE TABLE "DarkstoreProduct" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "darkstoreId" TEXT NOT NULL,
    "price" INTEGER NOT NULL DEFAULT 0,
    "oldPrice" INTEGER,
    "purchasePrice" INTEGER,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "cellNumber" TEXT,
    "categoryId" TEXT,
    "subcategoryId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DarkstoreProduct_pkey" PRIMARY KEY ("id")
);

-- 2. Populate DarkstoreProduct from existing Product data (preserve all per-darkstore data)
INSERT INTO "DarkstoreProduct" ("id", "productId", "darkstoreId", "price", "oldPrice", "purchasePrice", "stock", "cellNumber", "categoryId", "subcategoryId", "isActive", "createdAt", "updatedAt")
SELECT 
    gen_random_uuid()::text,
    "id",
    "darkstoreId",
    "price",
    "oldPrice",
    "purchasePrice",
    "stock",
    "cellNumber",
    "categoryId",
    "subcategoryId",
    "isActive",
    "createdAt",
    "updatedAt"
FROM "Product";

-- 3. Create unique constraint on DarkstoreProduct
CREATE UNIQUE INDEX "DarkstoreProduct_productId_darkstoreId_key" ON "DarkstoreProduct"("productId", "darkstoreId");

-- 4. Create foreign keys for DarkstoreProduct
ALTER TABLE "DarkstoreProduct" ADD CONSTRAINT "DarkstoreProduct_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DarkstoreProduct" ADD CONSTRAINT "DarkstoreProduct_darkstoreId_fkey" FOREIGN KEY ("darkstoreId") REFERENCES "Darkstore"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DarkstoreProduct" ADD CONSTRAINT "DarkstoreProduct_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "DarkstoreProduct" ADD CONSTRAINT "DarkstoreProduct_subcategoryId_fkey" FOREIGN KEY ("subcategoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- 5. Drop the old composite unique index on Product (slug, darkstoreId)
DROP INDEX IF EXISTS "Product_slug_darkstoreId_key";

-- 6. Handle duplicate slugs before adding unique constraint
-- For products with duplicate slugs (across darkstores), keep the first one and rename others
-- This is a safety measure — with current data (one darkstore) there should be no duplicates
DO $$
DECLARE
    rec RECORD;
    counter INTEGER;
BEGIN
    FOR rec IN (
        SELECT slug, array_agg(id ORDER BY "createdAt" ASC) AS ids
        FROM "Product"
        GROUP BY slug
        HAVING COUNT(*) > 1
    ) LOOP
        counter := 1;
        -- Skip first (oldest), rename the rest
        FOR i IN 2..array_length(rec.ids, 1) LOOP
            UPDATE "Product" SET slug = rec.slug || '-' || counter WHERE id = rec.ids[i];
            counter := counter + 1;
        END LOOP;
    END LOOP;
END $$;

-- 7. Create unique index on Product.slug (now globally unique)
CREATE UNIQUE INDEX "Product_slug_key" ON "Product"("slug");

-- 8. Drop per-darkstore columns from Product (now in DarkstoreProduct)
ALTER TABLE "Product" DROP COLUMN IF EXISTS "price";
ALTER TABLE "Product" DROP COLUMN IF EXISTS "oldPrice";
ALTER TABLE "Product" DROP COLUMN IF EXISTS "purchasePrice";
ALTER TABLE "Product" DROP COLUMN IF EXISTS "stock";
ALTER TABLE "Product" DROP COLUMN IF EXISTS "cellNumber";

-- 9. Drop darkstoreId foreign key and column from Product
ALTER TABLE "Product" DROP CONSTRAINT IF EXISTS "Product_darkstoreId_fkey";
ALTER TABLE "Product" DROP COLUMN IF EXISTS "darkstoreId";

-- =====================================================
-- ROLLBACK SQL (run manually if needed):
-- =====================================================
-- 
-- -- Re-add columns to Product
-- ALTER TABLE "Product" ADD COLUMN "price" INTEGER NOT NULL DEFAULT 0;
-- ALTER TABLE "Product" ADD COLUMN "oldPrice" INTEGER;
-- ALTER TABLE "Product" ADD COLUMN "purchasePrice" INTEGER;
-- ALTER TABLE "Product" ADD COLUMN "stock" INTEGER NOT NULL DEFAULT 0;
-- ALTER TABLE "Product" ADD COLUMN "cellNumber" TEXT;
-- ALTER TABLE "Product" ADD COLUMN "darkstoreId" TEXT;
--
-- -- Restore data from DarkstoreProduct (takes first entry per product)
-- UPDATE "Product" p SET 
--   "price" = dp."price",
--   "oldPrice" = dp."oldPrice", 
--   "purchasePrice" = dp."purchasePrice",
--   "stock" = dp."stock",
--   "cellNumber" = dp."cellNumber",
--   "darkstoreId" = dp."darkstoreId"
-- FROM (
--   SELECT DISTINCT ON ("productId") * 
--   FROM "DarkstoreProduct" 
--   ORDER BY "productId", "createdAt" ASC
-- ) dp WHERE p.id = dp."productId";
--
-- -- Set darkstoreId NOT NULL and re-add FK
-- UPDATE "Product" SET "darkstoreId" = (SELECT id FROM "Darkstore" LIMIT 1) WHERE "darkstoreId" IS NULL;
-- ALTER TABLE "Product" ALTER COLUMN "darkstoreId" SET NOT NULL;
-- ALTER TABLE "Product" ADD CONSTRAINT "Product_darkstoreId_fkey" FOREIGN KEY ("darkstoreId") REFERENCES "Darkstore"("id") ON DELETE CASCADE ON UPDATE CASCADE;
--
-- -- Re-create composite unique index
-- DROP INDEX IF EXISTS "Product_slug_key";
-- CREATE UNIQUE INDEX "Product_slug_darkstoreId_key" ON "Product"("slug", "darkstoreId");
--
-- -- Drop DarkstoreProduct table
-- DROP TABLE IF EXISTS "DarkstoreProduct";
