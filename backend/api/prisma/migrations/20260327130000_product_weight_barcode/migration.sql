-- Rename weightGr -> weight, convert existing integer values to string
ALTER TABLE "Product" ADD COLUMN "weight" TEXT;
UPDATE "Product" SET "weight" = CONCAT("weightGr"::text, ' г') WHERE "weightGr" IS NOT NULL;
ALTER TABLE "Product" DROP COLUMN "weightGr";

-- Add barcode field
ALTER TABLE "Product" ADD COLUMN "barcode" TEXT;
