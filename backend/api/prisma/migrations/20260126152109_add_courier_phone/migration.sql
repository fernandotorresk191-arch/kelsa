/*
  Warnings:

  - Added the required column `phone` to the `Courier` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Courier" ADD COLUMN     "phone" TEXT NOT NULL;
