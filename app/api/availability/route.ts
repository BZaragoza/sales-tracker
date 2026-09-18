import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAvailability } from '@/lib/availability'
import { resolveDateKey } from '@/lib/date'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const dateKey = resolveDateKey(searchParams.get('date'))
    const items = await getAvailability(prisma, dateKey)
    return NextResponse.json({ date: dateKey, items })
  } catch (error) {
    console.error('Error fetching availability:', error)
    return NextResponse.json(
      { error: 'Error al obtener la disponibilidad' },
      { status: 500 }
    )
  }
}