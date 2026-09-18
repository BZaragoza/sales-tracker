import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { dayRange, isValidDateKey, resolveDateKey, startOfDay } from '@/lib/date'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const dateParam = searchParams.get('date')

    const where = isValidDateKey(dateParam) ? { date: dayRange(dateParam) } : {}

    const sales = await prisma.dailySale.findMany({
      where,
      include: { product: true },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json(sales)
  } catch (error) {
    console.error('Error fetching sales:', error)
    return NextResponse.json({ error: 'Error al obtener ventas' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { productId, quantity, date } = body

    const parsedQuantity = Number(quantity)
    if (!productId || !Number.isInteger(parsedQuantity) || parsedQuantity < 1) {
      return NextResponse.json(
        { error: 'Producto y cantidad son requeridos' },
        { status: 400 }
      )
    }

    const product = await prisma.product.findUnique({ where: { id: productId } })
    if (!product) {
      return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 })
    }

    const sale = await prisma.dailySale.create({
      data: {
        productId,
        quantity: parsedQuantity,
        date: startOfDay(resolveDateKey(date))
      },
      include: { product: true }
    })

    return NextResponse.json(sale, { status: 201 })
  } catch (error) {
    console.error('Error creating sale:', error)
    return NextResponse.json({ error: 'Error al crear venta' }, { status: 500 })
  }
}