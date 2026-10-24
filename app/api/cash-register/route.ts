import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getDayCashSummary } from '@/lib/cash'
import { isValidDateKey, resolveDateKey, startOfDay } from '@/lib/date'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const dateParam = searchParams.get('date')

    if (!isValidDateKey(dateParam)) {
      return NextResponse.json({ error: 'Fecha es requerida' }, { status: 400 })
    }

    const cashRegister = await prisma.cashRegister.findUnique({
      where: { date: startOfDay(dateParam) }
    })

    return NextResponse.json(cashRegister)
  } catch (error) {
    console.error('Error fetching cash register:', error)
    return NextResponse.json(
      { error: 'Error al obtener corte de caja' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { actualAmount, notes, date } = body

    if (actualAmount === undefined) {
      return NextResponse.json(
        { error: 'El monto real es requerido' },
        { status: 400 }
      )
    }

    const parsedActual = parseFloat(actualAmount)
    if (Number.isNaN(parsedActual) || parsedActual < 0) {
      return NextResponse.json({ error: 'Monto real inválido' }, { status: 400 })
    }

    const dateKey = resolveDateKey(date)
    const day = startOfDay(dateKey)
    const summary = await getDayCashSummary(prisma, dateKey)

    const data = {
      totalProduction: summary.totalProduction,
      expectedAmount: summary.expectedCash,
      actualAmount: parsedActual,
      notes: notes || null
    }

    const cashRegister = await prisma.cashRegister.upsert({
      where: { date: day },
      update: data,
      create: { ...data, date: day }
    })

    return NextResponse.json(cashRegister, { status: 201 })
  } catch (error) {
    console.error('Error creating cash register:', error)
    return NextResponse.json(
      { error: 'Error al crear corte de caja' },
      { status: 500 }
    )
  }
}