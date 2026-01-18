-- CreateTable
CREATE TABLE "DailyProduction" (
    "id" TEXT NOT NULL,
    "variety" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DailyProduction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "category" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailySale" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DailySale_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CashRegister" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "totalProduction" INTEGER NOT NULL DEFAULT 0,
    "expectedAmount" DOUBLE PRECISION NOT NULL,
    "actualAmount" DOUBLE PRECISION,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CashRegister_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DailyProduction_date_idx" ON "DailyProduction"("date");

-- CreateIndex
CREATE UNIQUE INDEX "DailyProduction_variety_date_key" ON "DailyProduction"("variety", "date");

-- CreateIndex
CREATE INDEX "DailySale_date_idx" ON "DailySale"("date");

-- CreateIndex
CREATE INDEX "DailySale_productId_idx" ON "DailySale"("productId");

-- CreateIndex
CREATE INDEX "CashRegister_date_idx" ON "CashRegister"("date");

-- AddForeignKey
ALTER TABLE "DailySale" ADD CONSTRAINT "DailySale_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
