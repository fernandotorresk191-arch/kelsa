-- CreateTable: Darkstore
CREATE TABLE "Darkstore" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Darkstore_pkey" PRIMARY KEY ("id")
);

-- CreateTable: AdminUserDarkstore (many-to-many)
CREATE TABLE "AdminUserDarkstore" (
    "id" TEXT NOT NULL,
    "adminUserId" TEXT NOT NULL,
    "darkstoreId" TEXT NOT NULL,
    CONSTRAINT "AdminUserDarkstore_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AdminUserDarkstore_adminUserId_darkstoreId_key" ON "AdminUserDarkstore"("adminUserId", "darkstoreId");

-- AddForeignKey: AdminUserDarkstore
ALTER TABLE "AdminUserDarkstore" ADD CONSTRAINT "AdminUserDarkstore_adminUserId_fkey" FOREIGN KEY ("adminUserId") REFERENCES "AdminUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AdminUserDarkstore" ADD CONSTRAINT "AdminUserDarkstore_darkstoreId_fkey" FOREIGN KEY ("darkstoreId") REFERENCES "Darkstore"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 1) Create a default darkstore and assign all existing data to it
INSERT INTO "Darkstore" ("id", "name", "address", "isActive", "createdAt", "updatedAt")
VALUES ('default-darkstore', 'Основной даркстор', NULL, true, NOW(), NOW());

-- 2) Add darkstoreId columns as NULLABLE first
ALTER TABLE "Category" ADD COLUMN "darkstoreId" TEXT;
ALTER TABLE "Product" ADD COLUMN "darkstoreId" TEXT;
ALTER TABLE "Promotion" ADD COLUMN "darkstoreId" TEXT;
ALTER TABLE "Cart" ADD COLUMN "darkstoreId" TEXT;
ALTER TABLE "Order" ADD COLUMN "darkstoreId" TEXT;
ALTER TABLE "DeliveryZone" ADD COLUMN "darkstoreId" TEXT;
ALTER TABLE "Purchase" ADD COLUMN "darkstoreId" TEXT;
ALTER TABLE "Courier" ADD COLUMN "darkstoreId" TEXT;

-- 3) Backfill all existing records to the default darkstore
UPDATE "Category" SET "darkstoreId" = 'default-darkstore' WHERE "darkstoreId" IS NULL;
UPDATE "Product" SET "darkstoreId" = 'default-darkstore' WHERE "darkstoreId" IS NULL;
UPDATE "Promotion" SET "darkstoreId" = 'default-darkstore' WHERE "darkstoreId" IS NULL;
UPDATE "Order" SET "darkstoreId" = 'default-darkstore' WHERE "darkstoreId" IS NULL;
UPDATE "DeliveryZone" SET "darkstoreId" = 'default-darkstore' WHERE "darkstoreId" IS NULL;
UPDATE "Purchase" SET "darkstoreId" = 'default-darkstore' WHERE "darkstoreId" IS NULL;
UPDATE "Courier" SET "darkstoreId" = 'default-darkstore' WHERE "darkstoreId" IS NULL;

-- 4) Now make darkstoreId NOT NULL (except Cart which stays nullable)
ALTER TABLE "Category" ALTER COLUMN "darkstoreId" SET NOT NULL;
ALTER TABLE "Product" ALTER COLUMN "darkstoreId" SET NOT NULL;
ALTER TABLE "Promotion" ALTER COLUMN "darkstoreId" SET NOT NULL;
ALTER TABLE "Order" ALTER COLUMN "darkstoreId" SET NOT NULL;
ALTER TABLE "DeliveryZone" ALTER COLUMN "darkstoreId" SET NOT NULL;
ALTER TABLE "Purchase" ALTER COLUMN "darkstoreId" SET NOT NULL;
ALTER TABLE "Courier" ALTER COLUMN "darkstoreId" SET NOT NULL;

-- 5) Drop old unique indexes and create new composite ones
DROP INDEX "Category_slug_key";
DROP INDEX "Product_slug_key";
CREATE UNIQUE INDEX "Category_slug_darkstoreId_key" ON "Category"("slug", "darkstoreId");
CREATE UNIQUE INDEX "Product_slug_darkstoreId_key" ON "Product"("slug", "darkstoreId");

-- 6) Add foreign keys
ALTER TABLE "Category" ADD CONSTRAINT "Category_darkstoreId_fkey" FOREIGN KEY ("darkstoreId") REFERENCES "Darkstore"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Product" ADD CONSTRAINT "Product_darkstoreId_fkey" FOREIGN KEY ("darkstoreId") REFERENCES "Darkstore"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Promotion" ADD CONSTRAINT "Promotion_darkstoreId_fkey" FOREIGN KEY ("darkstoreId") REFERENCES "Darkstore"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Cart" ADD CONSTRAINT "Cart_darkstoreId_fkey" FOREIGN KEY ("darkstoreId") REFERENCES "Darkstore"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Order" ADD CONSTRAINT "Order_darkstoreId_fkey" FOREIGN KEY ("darkstoreId") REFERENCES "Darkstore"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DeliveryZone" ADD CONSTRAINT "DeliveryZone_darkstoreId_fkey" FOREIGN KEY ("darkstoreId") REFERENCES "Darkstore"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Purchase" ADD CONSTRAINT "Purchase_darkstoreId_fkey" FOREIGN KEY ("darkstoreId") REFERENCES "Darkstore"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Courier" ADD CONSTRAINT "Courier_darkstoreId_fkey" FOREIGN KEY ("darkstoreId") REFERENCES "Darkstore"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 7) Assign all existing admin users to the default darkstore
INSERT INTO "AdminUserDarkstore" ("id", "adminUserId", "darkstoreId")
SELECT gen_random_uuid()::text, "id", 'default-darkstore' FROM "AdminUser";
