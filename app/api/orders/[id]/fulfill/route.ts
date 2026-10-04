import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { getAvailability } from '@/lib/availability'
import { businessTodayKey } from '@/lib/date'
import { InsufficientStockError, findShortages, lockInventory } from '@/lib/sales'

const ORDER_INCLUDE = {
  items: { include: { product: true } },
  sale: { select: { id: true, createdAt: true } }
} satisfies Prisma.OrderInclude

class OrderNotFoundError extends Error {}
class InvalidOrderStateError extends Error {
  constructor(readonly status: string) {
    super('Invalid order state')
  }
}
class FutureOrderError extends Error {
  constructor(readonly dateKey: string) {
    super('Order date is in the future')
  }
}

const toDateKey = (date: Date) => date.toISOString().slice(0, 10)

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const order = await prisma.$transaction(
      async (tx) => {
        await lockInventory(tx)

        const existing = await tx.order.findUnique({
          where: { id: params.id },
          include: ORDER_INCLUDE
        })
        if (!existing) throw new OrderNotFoundError()

        // Idempotent: revisiting an already fulfilled order is a no-op.
        if (existing.status === 'FULFILLED') return existing
        if (existing.status !== 'PENDING') throw new InvalidOrderStateError(existing.status)

        // A future order cannot be fulfilled early: pieces are prepared on the
        // day the customer is coming, against that day's production.
        const orderDateKey = toDateKey(existing.date)
        if (orderDateKey > businessTodayKey()) throw new FutureOrderError(orderDateKey)

        const availability = await getAvailability(tx, orderDateKey)
        const shortages = findShortages(
          existing.items.map((item) => ({
            variety: item.product.name,
            quantity: item.quantity
          })),
          availability
        )
        if (shortages.length > 0) throw new InsufficientStockError(shortages)

        return tx.order.update({
          where: { id: existing.id },
          data: { status: 'FULFILLED', fulfilledAt: new Date() },
          include: ORDER_INCLUDE
        })
      },
      { maxWait: 15000, timeout: 15000 }
    )

    return NextResponse.json(order)
  } catch (error) {
    if (error instanceof OrderNotFoundError) {
      return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 })
    }
    if (error instanceof InvalidOrderStateError) {
      return NextResponse.json(
        { error: 'El pedido ya no puede surtirse', code: 'INVALID_STATE', status: error.status },
        { status: 409 }
      )
    }
    if (error instanceof FutureOrderError) {
      return NextResponse.json(
        {
          error: `Aún no llega la fecha del pedido (${error.dateKey}). Podrás surtirlo ese día.`,
          code: 'ORDER_NOT_DUE'
        },
        { status: 409 }
      )
    }
    if (error instanceof InsufficientStockError) {
      return NextResponse.json(
        {
          error: 'No hay suficiente producción disponible para surtir el pedido',
          code: 'INSUFFICIENT_STOCK',
          shortages: error.shortages
        },
        { status: 409 }
      )
    }
    console.error('Error fulfilling order:', error)
    return NextResponse.json({ error: 'Error al surtir el pedido' }, { status: 500 })
  }
}
