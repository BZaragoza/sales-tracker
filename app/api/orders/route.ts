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
  normalizeOptionalPaymentMethod,
  parseMoney,
  resolveProducts
} from '@/lib/sales'

const ORDER_INCLUDE = {
  items: { include: { product: true } },
  sale: { select: { id: true, createdAt: true } }
} satisfies Prisma.OrderInclude

function errorResponse(error: unknown, message: string, status = 500) {
  const code = error instanceof Prisma.PrismaClientKnownRequestError ? error.code : undefined
  console.error(message, error)
  return NextResponse.json({ error: message, code }, { status })
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const dateParam = searchParams.get('date')
    const statusParam = searchParams.get('status')

    const where: Prisma.OrderWhereInput = {}
    if (isValidDateKey(dateParam)) where.date = dayRange(dateParam)
    if (
      statusParam === 'PENDING' ||
      statusParam === 'FULFILLED' ||
      statusParam === 'COMPLETED' ||
      statusParam === 'CANCELLED'
    ) {
      where.status = statusParam
    }

    const orders = await prisma.order.findMany({
      where,
      include: ORDER_INCLUDE,
      orderBy: { createdAt: 'asc' }
    })

    return NextResponse.json(orders)
  } catch (error) {
    return errorResponse(error, 'Error al obtener pedidos')
  }
}

export async function POST(request: NextRequest) {
  let body: {
    customerName?: unknown
    customerPhone?: unknown
    date?: unknown
    items?: unknown
    depositAmount?: unknown
    depositPaymentMethod?: unknown
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Cuerpo de la solicitud inválido' }, { status: 400 })
  }

  const customerName = typeof body?.customerName === 'string' ? body.customerName.trim() : ''
  if (!customerName) {
    return NextResponse.json({ error: 'El nombre del cliente es requerido' }, { status: 400 })
  }

  const customerPhone =
    typeof body?.customerPhone === 'string' && body.customerPhone.trim()
      ? body.customerPhone.trim()
      : null

  const items = normalizeItems(body?.items)
  if (!items) {
    return NextResponse.json(
      { error: 'El pedido debe incluir al menos una variedad con cantidad válida' },
      { status: 400 }
    )
  }

  const depositAmount = parseMoney(body?.depositAmount ?? 0)
  if (depositAmount === null) {
    return NextResponse.json({ error: 'El anticipo debe ser un monto válido' }, { status: 400 })
  }

  const depositPaymentMethod = normalizeOptionalPaymentMethod(body?.depositPaymentMethod)
  if (depositAmount > 0 && !depositPaymentMethod) {
    return NextResponse.json(
      { error: 'Selecciona el método de pago del anticipo' },
      { status: 400 }
    )
  }

  try {
    const dateKey = resolveDateKey(typeof body?.date === 'string' ? body.date : undefined)
    const products = await resolveProducts(prisma, items.map((item) => item.variety))

    const pricedItems = items.map((item) => {
      const product = products.get(item.variety)!
      const unitPrice = product.price
      return {
        productId: product.id,
        quantity: item.quantity,
        unitPrice,
        subtotal: Math.round(unitPrice * item.quantity * 100) / 100
      }
    })

    const total = Math.round(pricedItems.reduce((sum, item) => sum + item.subtotal, 0) * 100) / 100

    if (depositAmount > total) {
      return NextResponse.json(
        { error: 'El anticipo no puede ser mayor al total del pedido' },
        { status: 400 }
      )
    }

    const order = await prisma.$transaction(
      async (tx) => {
        await lockInventory(tx)

        // A pending order does not reserve pieces, but we still refuse to
        // register one that cannot possibly be fulfilled with current stock.
        const availability = await getAvailability(tx, dateKey)
        const shortages = findShortages(items, availability)
        if (shortages.length > 0) throw new InsufficientStockError(shortages)

        return tx.order.create({
          data: {
            customerName,
            customerPhone,
            date: startOfDay(dateKey),
            total,
            depositAmount,
            depositPaymentMethod: depositAmount > 0 ? depositPaymentMethod : null,
            items: { create: pricedItems }
          },
          include: ORDER_INCLUDE
        })
      },
      { maxWait: 15000, timeout: 15000 }
    )

    return NextResponse.json(order, { status: 201 })
  } catch (error) {
    if (error instanceof InsufficientStockError) {
      return NextResponse.json(
        {
          error: 'No hay suficiente producción disponible para ese pedido',
          code: 'INSUFFICIENT_STOCK',
          shortages: error.shortages
        },
        { status: 409 }
      )
    }
    return errorResponse(error, 'Error al registrar el pedido')
  }
}
