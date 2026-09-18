import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAvailability } from '@/lib/availability'

export async function GET() {
  try {
    const items = await getAvailability(prisma)
    return NextResponse.json({ items })
  } catch (error) {
    console.error('Error fetching availability:', error)
    return NextResponse.json(
      { error: 'Error al obtener la disponibilidad' },
      { status: 500 }
    )
  }
}