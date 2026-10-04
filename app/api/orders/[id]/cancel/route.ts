import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { lockInventory } from '@/lib/sales'

const ORDER_INCLUDE = {
  items: { include: { product: true } },
  sale: { select: { id: true, createdAt: true } }
} satisfies Prisma.OrderInclude

class OrderNotFoundError extends Error {}
class NotCancellableError extends Error {}

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

        // Idempotent: cancelling an already cancelled order is a no-op.
        if (existing.status === 'CANCELLED') return existing
        if (existing.status === 'COMPLETED') throw new NotCancellableError()

        // Cancelling a fulfilled order simply drops it from the availability
        // query (which only counts FULFILLED), releasing the reserved pieces.
        return tx.order.update({
          where: { id: existing.id },
          data: { status: 'CANCELLED', cancelledAt: new Date() },
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
    if (error instanceof NotCancellableError) {
      return NextResponse.json(
        { error: 'Un pedido completado no puede cancelarse', code: 'INVALID_STATE' },
        { status: 409 }
      )
    }
    console.error('Error cancelling order:', error)
    return NextResponse.json({ error: 'Error al cancelar el pedido' }, { status: 500 })
  }
}
