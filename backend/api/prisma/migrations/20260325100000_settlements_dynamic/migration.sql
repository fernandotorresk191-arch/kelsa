-- Convert Settlement enum columns to TEXT

-- 1. DeliveryZone.settlement: enum → text
ALTER TABLE "DeliveryZone" ALTER COLUMN "settlement" TYPE TEXT;

-- 2. User.settlement: enum → text
ALTER TABLE "User" ALTER COLUMN "settlement" TYPE TEXT;

-- 3. Drop the Settlement enum (no longer used)
DROP TYPE "Settlement";

-- 4. Add settlementTitle column to DeliveryZone
ALTER TABLE "DeliveryZone" ADD COLUMN "settlementTitle" TEXT NOT NULL DEFAULT '';
