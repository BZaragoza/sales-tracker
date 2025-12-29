import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const dateParam = searchParams.get('date')

    let where: any = {}
    
    if (dateParam) {
      const date = new Date(dateParam)
      const startOfDay = new Date(date)
      startOfDay.setHours(0, 0, 0, 0)
      const endOfDay = new Date(date)
      endOfDay.setHours(23, 59, 59, 999)
      
      where.date = {
        gte: startOfDay,
        lte: endOfDay
      }
    }

    const sales = await prisma.dailySale.findMany({
      where,
      include: {
        product: true
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json(sales)
  } catch (error) {
    console.error('Error fetching sales:', error)
    return NextResponse.json(
      { error: 'Error al obtener ventas' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { productId, quantity } = body

    if (!productId || !quantity || quantity < 1) {
      return NextResponse.json(
        { error: 'Producto y cantidad son requeridos' },
        { status: 400 }
      )
    }

    const sale = await prisma.dailySale.create({
      data: {
        productId,
        quantity: parseInt(quantity),
        date: new Date()
      },
      include: {
        product: true
      }
    })

    return NextResponse.json(sale, { status: 201 })
  } catch (error) {
    console.error('Error creating sale:', error)
    return NextResponse.json(
      { error: 'Error al crear venta' },
      { status: 500 }
    )
  }
}

