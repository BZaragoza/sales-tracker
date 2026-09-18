import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { dayRange, resolveDateKey, startOfDay } from '@/lib/date'
import { COST_PER_PIECE, VARIETIES } from '@/lib/constants'

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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { variety, increment, date } = body

    if (!variety || !VARIETIES.includes(variety)) {
      return NextResponse.json({ error: 'Variedad inválida' }, { status: 400 })
    }

    const parsedIncrement = Number(increment)
    if (!Number.isInteger(parsedIncrement) || parsedIncrement === 0) {
      return NextResponse.json({ error: 'Incremento inválido' }, { status: 400 })
    }

    const dateKey = resolveDateKey(date)
    const day = startOfDay(dateKey)

    const existing = await prisma.dailyProduction.findUnique({
      where: { variety_date: { variety, date: day } }
    })

    let production
    if (existing) {
      production = await prisma.dailyProduction.update({
        where: { id: existing.id },
        data: { quantity: Math.max(0, existing.quantity + parsedIncrement) }
      })
    } else {
      production = await prisma.dailyProduction.create({
        data: { variety, quantity: Math.max(0, parsedIncrement), date: day }
      })
    }

    await recalcCashRegister(dateKey)

    return NextResponse.json(production, { status: 200 })
  } catch (error) {
    console.error('Error incrementing production:', error)
    return NextResponse.json(
      { error: 'Error al incrementar producción' },
      { status: 500 }
    )
  }
}