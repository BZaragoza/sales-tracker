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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { variety, increment, date } = body

    if (!variety || !VALID_VARIETIES.includes(variety)) {
      return NextResponse.json(
        { error: 'Variedad inválida' },
        { status: 400 }
      )
    }

    if (increment === undefined || increment === 0) {
      return NextResponse.json(
        { error: 'Incremento inválido' },
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
      // Incrementar cantidad existente
      const newQuantity = Math.max(0, existing.quantity + parseInt(increment))
      production = await prisma.dailyProduction.update({
        where: { id: existing.id },
        data: {
          quantity: newQuantity
        }
      })
    } else {
      // Crear nuevo registro con el incremento
      const initialQuantity = Math.max(0, parseInt(increment))
      production = await prisma.dailyProduction.create({
        data: {
          variety,
          quantity: initialQuantity,
          date: productionDate
        }
      })
    }

    // Update cash register expected amount if exists
    await updateCashRegisterExpectedAmount(productionDate)

    return NextResponse.json(production, { status: 200 })
  } catch (error) {
    console.error('Error incrementing production:', error)
    return NextResponse.json(
      { error: 'Error al incrementar producción' },
      { status: 500 }
    )
  }
}

