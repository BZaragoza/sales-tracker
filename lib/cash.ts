import type { Prisma, PrismaClient } from '@prisma/client'
import { dayRange } from './date'
import { saleBreakdown } from './saleMath'

type DbClient = PrismaClient | Prisma.TransactionClient

export interface DayCashSummary {
  totalProduction: number
  totalSales: number
  cash: number
  transfer: number
  expectedCash: number
  salesCount: number
}

/**
 * Cash expected in the drawer for a business day. Only money actually
 * collected in cash counts: cash sales plus cash deposits already applied to
 * sales. Transfers never enter the cash expected figure.
 */
export async function getDayCashSummary(
  db: DbClient,
  dateKey: string
): Promise<DayCashSummary> {
  const [productions, sales] = await Promise.all([
    db.dailyProduction.findMany({
      where: { date: dayRange(dateKey) },
      select: { quantity: true }
    }),
    db.sale.findMany({
      where: { date: dayRange(dateKey) },
      include: { items: true }
    })
  ])

  const totalProduction = productions.reduce((sum, row) => sum + row.quantity, 0)
  const totalSales = sales.reduce((sum, sale) => sum + saleBreakdown(sale).total, 0)
  const cash = sales.reduce((sum, sale) => sum + saleBreakdown(sale).cash, 0)
  const transfer = sales.reduce((sum, sale) => sum + saleBreakdown(sale).transfer, 0)

  return {
    totalProduction,
    totalSales,
    cash,
    transfer,
    expectedCash: cash,
    salesCount: sales.length
  }
}
