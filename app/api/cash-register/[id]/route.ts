import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { getDayCashSummary } from '@/lib/cash'

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const { actualAmount, notes } = body

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

    const existing = await prisma.cashRegister.findUnique({ where: { id: params.id } })
    if (!existing) {
      return NextResponse.json({ error: 'Corte no encontrado' }, { status: 404 })
    }

    const summary = await getDayCashSummary(prisma, existing.date.toISOString().slice(0, 10))

    const cashRegister = await prisma.cashRegister.update({
      where: { id: params.id },
      data: {
        totalProduction: summary.totalProduction,
        expectedAmount: summary.expectedCash,
        actualAmount: parsedActual,
        notes: notes || null
      }
    })

    return NextResponse.json(cashRegister)
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      return NextResponse.json({ error: 'Corte no encontrado' }, { status: 404 })
    }
    console.error('Error updating cash register:', error)
    return NextResponse.json({ error: 'Error al actualizar corte de caja' }, { status: 500 })
  }
}