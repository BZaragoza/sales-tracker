import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { dayRange, isValidDateKey, resolveDateKey, startOfDay } from '@/lib/date'
import { COST_PER_PIECE, VARIETIES } from '@/lib/constants'
import { getAvailability, SALES_LOCK_KEY } from '@/lib/availability'

function errorResponse(error: unknown, message: string, status = 500) {
  const code =
    error instanceof Prisma.PrismaClientKnownRequestError ? error.code : undefined
  console.error(message, error)
  return NextResponse.json(
    {
      error: message,
      code,
      detail:
        process.env.NODE_ENV !== 'production' && error instanceof Error
          ? error.message
          : undefined
    },
    { status }
  )
}

type IncomingItem = { variety: string; quantity: number }
type IncomingPaymentMethod = 'CASH' | 'TRANSFER'

const PAYMENT_METHODS: readonly IncomingPaymentMethod[] = ['CASH', 'TRANSFER']

function normalizePaymentMethod(raw: unknown): IncomingPaymentMethod {
  return typeof raw === 'string' && (PAYMENT_METHODS as readonly string[]).includes(raw)
    ? (raw as IncomingPaymentMethod)
    : 'CASH'
}

function normalizeItems(raw: unknown): IncomingItem[] | null {
  if (!Array.isArray(raw) || raw.length === 0) return null

  const merged = new Map<string, number>()
  for (const entry of raw) {
    const variety = entry?.variety
    const quantity = Number(entry?.quantity)
    if (typeof variety !== 'string' || !VARIETIES.includes(variety)) return null
    if (!Number.isInteger(quantity) || quantity < 1) return null
    merged.set(variety, (merged.get(variety) ?? 0) + quantity)
  }

  return Array.from(merged, ([variety, quantity]) => ({ variety, quantity }))
}

async function resolveProducts(tx: Prisma.TransactionClient, varieties: string[]) {
  const products = await tx.product.findMany({ where: { name: { in: varieties } } })
  const byName = new Map(products.map((product) => [product.name, product]))

  for (const variety of varieties) {
    if (!byName.has(variety)) {
      const created = await tx.product.create({
        data: { name: variety, price: COST_PER_PIECE }
      })
      byName.set(variety, created)
    }
  }

  return byName
}

interface StockShortage {
  variety: string
  requested: number
  remaining: number
}

class InsufficientStockError extends Error {
  constructor(readonly shortages: StockShortage[]) {
    super('Insufficient stock')
    this.name = 'InsufficientStockError'
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const dateParam = searchParams.get('date')

    const where = isValidDateKey(dateParam) ? { date: dayRange(dateParam) } : {}

    const sales = await prisma.sale.findMany({
      where,
      include: { items: { include: { product: true } } },
      orderBy: { createdAt: 'asc' }
    })

    return NextResponse.json(sales)
  } catch (error) {
    return errorResponse(error, 'Error al obtener ventas')
  }
}

export async function POST(request: NextRequest) {
  let body: { items?: unknown; date?: unknown; paymentMethod?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Cuerpo de la solicitud inválido' }, { status: 400 })
  }

  const items = normalizeItems(body?.items)
  const paymentMethod = normalizePaymentMethod(body?.paymentMethod)

  if (!items) {
    return NextResponse.json(
      { error: 'La venta debe incluir al menos una variedad con cantidad válida' },
      { status: 400 }
    )
  }

  try {
    const dateKey = resolveDateKey(typeof body?.date === 'string' ? body.date : undefined)
    const products = await resolveProducts(prisma, items.map((item) => item.variety))

    const sale = await prisma.$transaction(
      async (tx) => {
        await tx.$queryRaw`SELECT 1 AS locked FROM (SELECT pg_advisory_xact_lock(${SALES_LOCK_KEY}::bigint)) AS lock`

        const availability = await getAvailability(tx, dateKey)
        const remainingByVariety = new Map(
          availability.map((entry) => [entry.variety, entry.remaining])
        )

        const shortages: StockShortage[] = items
          .map((item) => ({
            variety: item.variety,
            requested: item.quantity,
            remaining: Math.max(0, remainingByVariety.get(item.variety) ?? 0)
          }))
          .filter((entry) => entry.requested > entry.remaining)

        if (shortages.length > 0) {
          throw new InsufficientStockError(shortages)
        }

        return tx.sale.create({
          data: {
            date: startOfDay(dateKey),
            paymentMethod,
            items: {
              create: items.map((item) => {
                const product = products.get(item.variety)!
                return {
                  productId: product.id,
                  quantity: item.quantity,
                  unitPrice: product.price
                }
              })
            }
          },
          include: { items: { include: { product: true } } }
        })
      },
      { maxWait: 15000, timeout: 15000 }
    )

    return NextResponse.json(sale, { status: 201 })
  } catch (error) {
    if (error instanceof InsufficientStockError) {
      return NextResponse.json(
        {
          error: 'No hay suficiente producción disponible para completar la venta',
          code: 'INSUFFICIENT_STOCK',
          shortages: error.shortages
        },
        { status: 409 }
      )
    }
    return errorResponse(error, 'Error al registrar la venta')
  }
}