import { Prisma } from '@prisma/client'
import { VARIETIES } from '@/lib/constants'
import { dayRange } from '@/lib/date'

export const SALES_LOCK_KEY = 727374

export interface VarietyAvailability {
  variety: string
  produced: number
  sold: number
  remaining: number
}

interface AvailabilityRow {
  variety: string
  produced: number | bigint
  sold: number | bigint
}

export async function getAvailability(
  db: Prisma.TransactionClient,
  dateKey: string
): Promise<VarietyAvailability[]> {
  const { gte, lte } = dayRange(dateKey)

  const rows = await db.$queryRaw<AvailabilityRow[]>`
    SELECT p."name" AS variety,
      COALESCE((
        SELECT SUM(dp."quantity") FROM "DailyProduction" dp
        WHERE dp."variety" = p."name" AND dp."date" >= ${gte}::timestamp AND dp."date" <= ${lte}::timestamp
      ), 0)::int AS produced,
      COALESCE((
        SELECT SUM(si."quantity") FROM "SaleItem" si
        JOIN "Sale" s ON s."id" = si."saleId"
        WHERE si."productId" = p."id" AND s."date" >= ${gte}::timestamp AND s."date" <= ${lte}::timestamp
      ), 0)::int AS sold
    FROM "Product" p
  `

  const totals = new Map<string, { produced: number; sold: number }>()
  for (const row of rows) {
    const current = totals.get(row.variety) ?? { produced: 0, sold: 0 }
    current.produced += Number(row.produced)
    current.sold += Number(row.sold)
    totals.set(row.variety, current)
  }

  return VARIETIES.map((variety) => {
    const totalsForVariety = totals.get(variety) ?? { produced: 0, sold: 0 }
    return {
      variety,
      produced: totalsForVariety.produced,
      sold: totalsForVariety.sold,
      remaining: Math.max(0, totalsForVariety.produced - totalsForVariety.sold)
    }
  })
}