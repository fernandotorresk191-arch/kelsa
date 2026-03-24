-- CreateTable
CREATE TABLE "DeliveryZone" (
    "id" TEXT NOT NULL,
    "settlement" "Settlement" NOT NULL,
    "deliveryFee" INTEGER NOT NULL DEFAULT 150,
    "freeDeliveryFrom" INTEGER NOT NULL DEFAULT 1500,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DeliveryZone_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DeliveryZone_settlement_key" ON "DeliveryZone"("settlement");

-- AlterTable: Add order economics fields
ALTER TABLE "Order" ADD COLUMN "purchaseCost" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Order" ADD COLUMN "courierCost" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Order" ADD COLUMN "profit" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Order" ADD COLUMN "settlement" TEXT;

-- AlterTable: Remove deliveryRate from Courier
ALTER TABLE "Courier" DROP COLUMN IF EXISTS "deliveryRate";

-- DropTable
DROP TABLE IF EXISTS "DeliverySettings";
