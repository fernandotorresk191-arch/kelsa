-- CreateTable
CREATE TABLE "SmsVerification" (
    "id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SmsVerification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SmsVerification_phone_code_idx" ON "SmsVerification"("phone", "code");
