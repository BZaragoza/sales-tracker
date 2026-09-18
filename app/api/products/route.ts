import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const products = await prisma.product.findMany({
      orderBy: { name: 'asc' }
    })
    return NextResponse.json(products)
  } catch (error) {
    console.error('Error fetching products:', error)
    return NextResponse.json({ error: 'Error al obtener productos' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, price, category } = body

    const parsedPrice = Number(price)
    if (!name || typeof name !== 'string' || !Number.isFinite(parsedPrice) || parsedPrice < 0) {
      return NextResponse.json(
        { error: 'Nombre y precio válidos son requeridos' },
        { status: 400 }
      )
    }

    const product = await prisma.product.create({
      data: {
        name: name.trim(),
        price: parsedPrice,
        category: category || null
      }
    })

    return NextResponse.json(product, { status: 201 })
  } catch (error) {
    console.error('Error creating product:', error)
    return NextResponse.json({ error: 'Error al crear producto' }, { status: 500 })
  }
}