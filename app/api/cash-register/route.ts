import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
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
    const { totalProduction, expectedAmount, actualAmount, notes, date } = body

    if (totalProduction === undefined || expectedAmount === undefined || actualAmount === undefined) {
      return NextResponse.json(
        { error: 'Producción total, monto esperado y monto real son requeridos' },
        { status: 400 }
      )
    }

    const data = {
      totalProduction: parseInt(totalProduction),
      expectedAmount: parseFloat(expectedAmount),
      actualAmount: parseFloat(actualAmount),
      notes: notes || null
    }

    const day = startOfDay(resolveDateKey(date))

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