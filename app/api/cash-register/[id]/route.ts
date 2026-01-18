import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const { totalProduction, expectedAmount, actualAmount, notes } = body

    if (totalProduction === undefined || expectedAmount === undefined || actualAmount === undefined) {
      return NextResponse.json(
        { error: 'Producción total, monto esperado y monto real son requeridos' },
        { status: 400 }
      )
    }

    const cashRegister = await prisma.cashRegister.update({
      where: { id: params.id },
      data: {
        totalProduction: parseInt(totalProduction),
        expectedAmount: parseFloat(expectedAmount),
        actualAmount: parseFloat(actualAmount),
        notes: notes || null
      }
    })

    return NextResponse.json(cashRegister)
  } catch (error) {
    console.error('Error updating cash register:', error)
    return NextResponse.json(
      { error: 'Error al actualizar corte de caja' },
      { status: 500 }
    )
  }
}

