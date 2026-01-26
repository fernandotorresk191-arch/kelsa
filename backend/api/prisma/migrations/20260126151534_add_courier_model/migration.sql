-- CreateTable
CREATE TABLE "Courier" (
    "id" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "login" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "carBrand" TEXT,
    "carNumber" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Courier_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Courier_login_key" ON "Courier"("login");
