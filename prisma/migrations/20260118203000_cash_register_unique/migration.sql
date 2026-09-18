-- DropIndex
DROP INDEX "CashRegister_date_idx";

-- CreateIndex
CREATE UNIQUE INDEX "CashRegister_date_key" ON "CashRegister"("date");
