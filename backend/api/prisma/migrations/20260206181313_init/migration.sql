-- CreateEnum
CREATE TYPE "CanceledBy" AS ENUM ('CLIENT', 'COURIER', 'MANAGER');

-- CreateEnum
CREATE TYPE "CourierStatus" AS ENUM ('OFF_DUTY', 'AVAILABLE', 'ACCEPTED', 'DELIVERING');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "OrderStatus" ADD VALUE 'ASSIGNED_TO_COURIER';
ALTER TYPE "OrderStatus" ADD VALUE 'ACCEPTED_BY_COURIER';

-- AlterTable
ALTER TABLE "Courier" ADD COLUMN     "deliveryRate" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "pushSubscription" TEXT,
ADD COLUMN     "status" "CourierStatus" NOT NULL DEFAULT 'AVAILABLE';

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "cancelReason" TEXT,
ADD COLUMN     "canceledBy" "CanceledBy",
ADD COLUMN     "courierId" TEXT;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_courierId_fkey" FOREIGN KEY ("courierId") REFERENCES "Courier"("id") ON DELETE SET NULL ON UPDATE CASCADE;
