import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const VALID_VARIETIES = ['Rojo', 'Rajas', 'Verde', 'Prensado', 'Frijoles', 'Dulce']
const COST_PER_PIECE = 22

async function updateCashRegisterExpectedAmount(date: Date) {
  const startOfDay = new Date(date)
  startOfDay.setHours(0, 0, 0, 0)
  const endOfDay = new Date(date)
  endOfDay.setHours(23, 59, 59, 999)

  // Get all production for the date
  const productions = await prisma.dailyProduction.findMany({
    where: {
      date: {
        gte: startOfDay,
        lte: endOfDay
      }
    }
  })

  // Calculate total production and expected amount
  const totalProduction = productions.reduce((sum, prod) => sum + prod.quantity, 0)
  const expectedAmount = totalProduction * COST_PER_PIECE

  // Update existing cash register if exists
  const existingCashRegister = await prisma.cashRegister.findFirst({
    where: {
      date: {
        gte: startOfDay,
        lte: endOfDay
      }
    }
  })

  if (existingCashRegister) {
    return await prisma.cashRegister.update({
      where: { id: existingCashRegister.id },
      data: {
        totalProduction,
        expectedAmount
      }
    })
  }

  return null
}

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

    const productions = await prisma.dailyProduction.findMany({
      where,
      orderBy: [
        { variety: 'asc' }
      ]
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
      return NextResponse.json(
        { error: 'Variedad inválida' },
        { status: 400 }
      )
    }

    if (quantity === undefined || quantity < 0) {
      return NextResponse.json(
        { error: 'Cantidad inválida' },
        { status: 400 }
      )
    }

    const productionDate = date ? new Date(date) : new Date()
    const startOfDay = new Date(productionDate)
    startOfDay.setHours(0, 0, 0, 0)
    const endOfDay = new Date(productionDate)
    endOfDay.setHours(23, 59, 59, 999)

    // Buscar si ya existe un registro para esta variedad y fecha
    const existing = await prisma.dailyProduction.findFirst({
      where: {
        variety,
        date: {
          gte: startOfDay,
          lte: endOfDay
        }
      }
    })

let production
    if (existing) {
      // Actualizar cantidad existente
      production = await prisma.dailyProduction.update({
        where: { id: existing.id },
        data: {
          quantity: parseInt(quantity)
        }
      })
    } else {
      // Crear nuevo registro
      production = await prisma.dailyProduction.create({
        data: {
          variety,
          quantity: parseInt(quantity),
          date: productionDate
        }
      })
    }

    // Update cash register expected amount if exists
    await updateCashRegisterExpectedAmount(productionDate)

    return NextResponse.json(production, { status: 201 })
  } catch (error) {
    console.error('Error creating/updating production:', error)
    return NextResponse.json(
      { error: 'Error al guardar producción' },
      { status: 500 }
    )
  }
}

