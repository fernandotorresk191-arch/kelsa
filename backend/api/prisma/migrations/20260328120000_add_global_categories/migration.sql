-- =====================================================
-- Migration: Global Categories + DarkstoreCategory
--
-- Converts Category from per-darkstore to global model.
-- Creates DarkstoreCategory join table for per-darkstore
-- activation (on/off per darkstore).
-- =====================================================

-- 1. Create DarkstoreCategory table
CREATE TABLE "DarkstoreCategory" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "darkstoreId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sort" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DarkstoreCategory_pkey" PRIMARY KEY ("id")
);

-- 2. Unique index: one record per category+darkstore
CREATE UNIQUE INDEX "DarkstoreCategory_categoryId_darkstoreId_key"
    ON "DarkstoreCategory"("categoryId", "darkstoreId");

-- 3. Foreign keys
ALTER TABLE "DarkstoreCategory" ADD CONSTRAINT "DarkstoreCategory_categoryId_fkey"
    FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "DarkstoreCategory" ADD CONSTRAINT "DarkstoreCategory_darkstoreId_fkey"
    FOREIGN KEY ("darkstoreId") REFERENCES "Darkstore"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 4. Populate DarkstoreCategory from existing per-darkstore categories
--    Each existing Category already belongs to a darkstore — create one DarkstoreCategory per row.
INSERT INTO "DarkstoreCategory" ("id", "categoryId", "darkstoreId", "isActive", "sort", "createdAt", "updatedAt")
SELECT
    gen_random_uuid()::text,
    c."id",
    c."darkstoreId",
    c."isActive",
    c."sort",
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "Category" c;

-- 5. Handle potential slug duplicates across darkstores before making slug globally unique.
--    For each group of categories sharing the same slug, keep the earliest (by createdAt) unchanged
--    and append -2, -3, ... to the rest.
WITH ranked AS (
    SELECT
        id,
        slug,
        ROW_NUMBER() OVER (PARTITION BY slug ORDER BY "createdAt") AS rn
    FROM "Category"
    WHERE slug IN (
        SELECT slug FROM "Category" GROUP BY slug HAVING COUNT(*) > 1
    )
),
to_update AS (
    SELECT id, slug || '-' || rn AS new_slug
    FROM ranked
    WHERE rn > 1
)
UPDATE "Category"
SET slug = to_update.new_slug
FROM to_update
WHERE "Category".id = to_update.id;

-- 6. Drop old composite unique constraint
ALTER TABLE "Category" DROP CONSTRAINT IF EXISTS "Category_slug_darkstoreId_key";

-- 7. Add new globally-unique constraint on slug
CREATE UNIQUE INDEX "Category_slug_key" ON "Category"("slug");

-- 8. Drop darkstoreId column from Category (relation no longer needed)
ALTER TABLE "Category" DROP COLUMN "darkstoreId";
