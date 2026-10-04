import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { dayRange, isValidDateKey, resolveDateKey, startOfDay } from '@/lib/date'
import { getAvailability } from '@/lib/availability'
import {
  InsufficientStockError,
  findShortages,
  lockInventory,
  normalizeItems,
  normalizePaymentMethod,
  resolveProducts
} from '@/lib/sales'

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

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const dateParam = searchParams.get('date')

    const where = isValidDateKey(dateParam) ? { date: dayRange(dateParam) } : {}

    const sales = await prisma.sale.findMany({
      where,
      include: {
        items: { include: { product: true } },
        order: { select: { id: true, customerName: true, status: true } }
      },
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
        await lockInventory(tx)

        const availability = await getAvailability(tx, dateKey)
        const shortages = findShortages(items, availability)
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
