import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { dayRange, isValidDateKey, resolveDateKey, startOfDay } from '@/lib/date'

const VALID_VARIETIES = ['Rojo', 'Rajas', 'Verde', 'Prensado', 'Frijoles', 'Dulce']
const COST_PER_PIECE = 22

async function recalcCashRegister(dateKey: string) {
  const productions = await prisma.dailyProduction.findMany({
    where: { date: dayRange(dateKey) }
  })

  const totalProduction = productions.reduce((sum, prod) => sum + prod.quantity, 0)
  const expectedAmount = totalProduction * COST_PER_PIECE

  await prisma.cashRegister.updateMany({
    where: { date: startOfDay(dateKey) },
    data: { totalProduction, expectedAmount }
  })
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const dateParam = searchParams.get('date')

    const where = isValidDateKey(dateParam) ? { date: dayRange(dateParam) } : {}

    const productions = await prisma.dailyProduction.findMany({
      where,
      orderBy: [{ variety: 'asc' }]
    })

    return NextResponse.json(productions)
  } catch (error) {
    console.error('Error fetching production:', error)
    return NextResponse.json(
      { error: 'Error al obtener producción' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { variety, quantity, date } = body

    if (!variety || !VALID_VARIETIES.includes(variety)) {
      return NextResponse.json({ error: 'Variedad inválida' }, { status: 400 })
    }

    const parsedQuantity = Number(quantity)
    if (!Number.isInteger(parsedQuantity) || parsedQuantity < 0) {
      return NextResponse.json({ error: 'Cantidad inválida' }, { status: 400 })
    }

    const dateKey = resolveDateKey(date)
    const day = startOfDay(dateKey)

    const production = await prisma.dailyProduction.upsert({
      where: { variety_date: { variety, date: day } },
      update: { quantity: parsedQuantity },
      create: { variety, quantity: parsedQuantity, date: day }
    })

    await recalcCashRegister(dateKey)

    return NextResponse.json(production, { status: 201 })
  } catch (error) {
    console.error('Error creating/updating production:', error)
    return NextResponse.json(
      { error: 'Error al guardar producción' },
      { status: 500 }
    )
  }
}