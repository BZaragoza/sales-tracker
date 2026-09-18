import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { dayRange, isValidDateKey, resolveDateKey, startOfDay } from '@/lib/date'
import { COST_PER_PIECE, VARIETIES } from '@/lib/constants'

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

async function resolveProducts(varieties: string[]) {
  const products = await prisma.product.findMany({ where: { name: { in: varieties } } })
  const byName = new Map(products.map((product) => [product.name, product]))

  for (const variety of varieties) {
    if (!byName.has(variety)) {
      const created = await prisma.product.create({
        data: { name: variety, price: COST_PER_PIECE }
      })
      byName.set(variety, created)
    }
  }

  return byName
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
  let body: { items?: unknown; date?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Cuerpo de la solicitud inválido' }, { status: 400 })
  }

  const items = normalizeItems(body?.items)

  if (!items) {
    return NextResponse.json(
      { error: 'La venta debe incluir al menos una variedad con cantidad válida' },
      { status: 400 }
    )
  }

  try {
    const dateKey = resolveDateKey(typeof body?.date === 'string' ? body.date : undefined)
    const products = await resolveProducts(items.map((item) => item.variety))

    const sale = await prisma.sale.create({
      data: {
        date: startOfDay(dateKey),
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

    return NextResponse.json(sale, { status: 201 })
  } catch (error) {
    return errorResponse(error, 'Error al registrar la venta')
  }
}