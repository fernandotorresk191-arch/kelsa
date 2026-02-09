-- AlterTable
ALTER TABLE "Batch" ADD COLUMN     "discountPercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "markupPercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "sellingPrice" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Category" ADD COLUMN     "markupPercent" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "deliveryFee" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "DeliverySettings" (
    "id" TEXT NOT NULL,
    "deliveryFee" INTEGER NOT NULL DEFAULT 150,
    "freeDeliveryFrom" INTEGER NOT NULL DEFAULT 1500,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DeliverySettings_pkey" PRIMARY KEY ("id")
);
