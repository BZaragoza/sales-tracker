import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const dateParam = searchParams.get('date')

    if (!dateParam) {
      return NextResponse.json(
        { error: 'Fecha es requerida' },
        { status: 400 }
      )
    }

    const date = new Date(dateParam)
    const startOfDay = new Date(date)
    startOfDay.setHours(0, 0, 0, 0)
    const endOfDay = new Date(date)
    endOfDay.setHours(23, 59, 59, 999)

    const cashRegister = await prisma.cashRegister.findFirst({
      where: {
        date: {
          gte: startOfDay,
          lte: endOfDay
        }
      }
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

    const cashRegister = await prisma.cashRegister.create({
      data: {
        totalProduction: parseInt(totalProduction),
        expectedAmount: parseFloat(expectedAmount),
        actualAmount: parseFloat(actualAmount),
        notes: notes || null,
        date: date ? new Date(date) : new Date()
      }
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

