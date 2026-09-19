import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { COST_PER_PIECE } from '@/lib/constants'
import { isValidDateKey, startOfDay, endOfDay } from '@/lib/date'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const DEFAULT_PAGE_SIZE = 10
const MAX_PAGE_SIZE = 50

function toDateKey(date: Date): string {
  return date.toISOString().slice(0, 10)
}

function parsePositiveInt(value: string | null, fallback: number): number {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback
}

interface DaySummary {
  dateKey: string
  production: {
    hasRecord: boolean
    total: number
    records: number
    byVariety: { variety: string; quantity: number }[]
  }
  sales: {
    hasRecord: boolean
    items: number
    amount: number
    operations: number
  }
  cashRegister: {
    hasRecord: boolean
    expectedAmount: number | null
    actualAmount: number | null
    difference: number | null
    result: 'Cuadra' | 'Faltante' | 'Sobrante' | null
    notes: string | null
    date: string | null
    productionChanged: boolean
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const fromParam = searchParams.get('from')
    const toParam = searchParams.get('to')
    const from = isValidDateKey(fromParam) ? startOfDay(fromParam) : undefined
    const to = isValidDateKey(toParam) ? endOfDay(toParam) : undefined

    const page = parsePositiveInt(searchParams.get('page'), 1)
    const pageSize = Math.min(
      parsePositiveInt(searchParams.get('pageSize'), DEFAULT_PAGE_SIZE),
      MAX_PAGE_SIZE
    )

    const dateFilter =
      from || to ? { date: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } : {}

    const [productionDates, saleDates, cashRegisterDates] = await Promise.all([
      prisma.dailyProduction.findMany({
        where: dateFilter,
        select: { date: true },
        distinct: ['date']
      }),
      prisma.sale.findMany({
        where: dateFilter,
        select: { date: true },
        distinct: ['date']
      }),
      prisma.cashRegister.findMany({
        where: dateFilter,
        select: { date: true }
      })
    ])

    const allKeys = new Set<string>()
    for (const row of productionDates) allKeys.add(toDateKey(row.date))
    for (const row of saleDates) allKeys.add(toDateKey(row.date))
    for (const row of cashRegisterDates) allKeys.add(toDateKey(row.date))

    const sortedKeys = Array.from(allKeys).sort((a, b) => b.localeCompare(a))
    const total = sortedKeys.length
    const start = (page - 1) * pageSize
    const pageKeys = sortedKeys.slice(start, start + pageSize)
    const hasMore = start + pageSize < total

    if (pageKeys.length === 0) {
      return NextResponse.json({ days: [], total, hasMore: false })
    }

    const dayDates = pageKeys.map((key) => startOfDay(key))

    const [productions, sales, cashRegisters] = await Promise.all([
      prisma.dailyProduction.findMany({
        where: { date: { in: dayDates } },
        orderBy: [{ variety: 'asc' }]
      }),
      prisma.sale.findMany({
        where: { date: { in: dayDates } },
        include: { items: true },
        orderBy: { createdAt: 'asc' }
      }),
      prisma.cashRegister.findMany({
        where: { date: { in: dayDates } }
      })
    ])

    const productionByDay = new Map<string, typeof productions>()
    for (const production of productions) {
      const key = toDateKey(production.date)
      const list = productionByDay.get(key) ?? []
      list.push(production)
      productionByDay.set(key, list)
    }

    const salesByDay = new Map<string, typeof sales>()
    for (const sale of sales) {
      const key = toDateKey(sale.date)
      const list = salesByDay.get(key) ?? []
      list.push(sale)
      salesByDay.set(key, list)
    }

    const cashRegisterByDay = new Map<string, (typeof cashRegisters)[number]>()
    for (const cashRegister of cashRegisters) {
      cashRegisterByDay.set(toDateKey(cashRegister.date), cashRegister)
    }

    const days: DaySummary[] = pageKeys.map((dateKey) => {
      const dayProduction = productionByDay.get(dateKey) ?? []
      const daySales = salesByDay.get(dateKey) ?? []
      const cashRegister = cashRegisterByDay.get(dateKey)

      const productionTotal = dayProduction.reduce((sum, row) => sum + row.quantity, 0)
      const totalItems = daySales.reduce(
        (sum, sale) => sum + sale.items.reduce((itemSum, item) => itemSum + item.quantity, 0),
        0
      )
      const totalAmount = daySales.reduce(
        (sum, sale) =>
          sum + sale.items.reduce((itemSum, item) => itemSum + item.quantity * item.unitPrice, 0),
        0
      )

      const expectedAmount = cashRegister ? cashRegister.expectedAmount : null
      const actualAmount = cashRegister ? cashRegister.actualAmount : null
      const difference =
        actualAmount !== null && expectedAmount !== null ? actualAmount - expectedAmount : null
      const result =
        difference === null
          ? null
          : Math.abs(difference) < 0.005
            ? 'Cuadra'
            : difference < 0
              ? 'Faltante'
              : 'Sobrante'

      const currentExpected = productionTotal * COST_PER_PIECE
      const productionChanged = cashRegister
        ? cashRegister.totalProduction !== productionTotal ||
          Math.abs(cashRegister.expectedAmount - currentExpected) > 0.01
        : false

      return {
        dateKey,
        production: {
          hasRecord: dayProduction.length > 0,
          total: productionTotal,
          records: dayProduction.length,
          byVariety: dayProduction.map((row) => ({
            variety: row.variety,
            quantity: row.quantity
          }))
        },
        sales: {
          hasRecord: daySales.length > 0,
          items: totalItems,
          amount: totalAmount,
          operations: daySales.length
        },
        cashRegister: {
          hasRecord: !!cashRegister,
          expectedAmount,
          actualAmount,
          difference,
          result,
          notes: cashRegister?.notes ?? null,
          date: cashRegister ? cashRegister.date.toISOString() : null,
          productionChanged
        }
      }
    })

    return NextResponse.json({ days, total, hasMore })
  } catch (error) {
    console.error('Error fetching history:', error)
    return NextResponse.json({ error: 'Error al obtener el historial' }, { status: 500 })
  }
}