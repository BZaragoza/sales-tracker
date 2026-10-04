import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { lockInventory, normalizePaymentMethod } from '@/lib/sales'

const SALE_INCLUDE = {
  items: { include: { product: true } },
  order: { select: { id: true, customerName: true, status: true } }
} satisfies Prisma.SaleInclude

class OrderNotFoundError extends Error {}
class InvalidOrderStateError extends Error {
  constructor(readonly status: string) {
    super('Invalid order state')
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  let body: { paymentMethod?: unknown }
  try {
    body = await request.json()
  } catch {
    body = {}
  }

  const paymentMethod = normalizePaymentMethod(body?.paymentMethod)

  try {
    const sale = await prisma.$transaction(
      async (tx) => {
        await lockInventory(tx)

        const order = await tx.order.findUnique({
          where: { id: params.id },
          include: { items: true }
        })
        if (!order) throw new OrderNotFoundError()

        // Idempotent: an already completed order returns its sale instead of
        // creating a second one, no matter how many times the request arrives.
        if (order.status === 'COMPLETED') {
          const existingSale = await tx.sale.findUnique({
            where: { orderId: order.id },
            include: SALE_INCLUDE
          })
          if (existingSale) return existingSale
          throw new InvalidOrderStateError(order.status)
        }

        if (order.status !== 'FULFILLED') throw new InvalidOrderStateError(order.status)

        const createdSale = await tx.sale.create({
          data: {
            date: order.date,
            paymentMethod,
            depositAmount: order.depositAmount,
            depositPaymentMethod: order.depositPaymentMethod,
            orderId: order.id,
            items: {
              create: order.items.map((item) => ({
                productId: item.productId,
                quantity: item.quantity,
                unitPrice: item.unitPrice
              }))
            }
          },
          include: SALE_INCLUDE
        })

        await tx.order.update({
          where: { id: order.id },
          data: { status: 'COMPLETED', completedAt: new Date() }
        })

        return createdSale
      },
      { maxWait: 15000, timeout: 15000 }
    )

    return NextResponse.json({ sale, order: { id: params.id, status: 'COMPLETED' } }, { status: 201 })
  } catch (error) {
    if (error instanceof OrderNotFoundError) {
      return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 })
    }
    if (error instanceof InvalidOrderStateError) {
      return NextResponse.json(
        {
          error:
            error.status === 'PENDING'
              ? 'El pedido debe surtirse antes de venderse'
              : 'El pedido ya no puede venderse',
          code: 'INVALID_STATE',
          status: error.status
        },
        { status: 409 }
      )
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      const existingSale = await prisma.sale.findUnique({
        where: { orderId: params.id },
        include: SALE_INCLUDE
      })
      if (existingSale) return NextResponse.json({ sale: existingSale }, { status: 200 })
    }
    console.error('Error selling order:', error)
    return NextResponse.json({ error: 'Error al registrar la venta del pedido' }, { status: 500 })
  }
}
