import { Prisma } from '@prisma/client'
import { COST_PER_PIECE, VARIETIES } from '@/lib/constants'
import { SALES_LOCK_KEY, type VarietyAvailability } from '@/lib/availability'

export type IncomingPaymentMethod = 'CASH' | 'TRANSFER'

export const PAYMENT_METHODS: readonly IncomingPaymentMethod[] = ['CASH', 'TRANSFER']

export interface IncomingItem {
  variety: string
  quantity: number
}

export interface StockShortage {
  variety: string
  requested: number
  remaining: number
}

export class InsufficientStockError extends Error {
  constructor(readonly shortages: StockShortage[]) {
    super('Insufficient stock')
    this.name = 'InsufficientStockError'
  }
}

export function normalizePaymentMethod(raw: unknown): IncomingPaymentMethod {
  return typeof raw === 'string' && (PAYMENT_METHODS as readonly string[]).includes(raw)
    ? (raw as IncomingPaymentMethod)
    : 'CASH'
}

export function normalizeOptionalPaymentMethod(raw: unknown): IncomingPaymentMethod | null {
  return typeof raw === 'string' && (PAYMENT_METHODS as readonly string[]).includes(raw)
    ? (raw as IncomingPaymentMethod)
    : null
}

export function normalizeItems(raw: unknown): IncomingItem[] | null {
  if (!Array.isArray(raw) || raw.length === 0) return null

  const merged = new Map<string, number>()
  for (const entry of raw) {
    const variety = entry?.variety
    const quantity = Number(entry?.quantity)
    if (typeof variety !== 'string' || !VARIETIES.includes(variety)) return null
    if (!Number.isInteger(quantity) || quantity < 1) return null
    merged.set(variety, (merged.get(variety) ?? 0) + quantity)
  }

  return Array.from(merged, ([variety, quantity]) => ({ variety, quantity }))
}

export async function resolveProducts(tx: Prisma.TransactionClient, varieties: string[]) {
  const products = await tx.product.findMany({ where: { name: { in: varieties } } })
  const byName = new Map(products.map((product) => [product.name, product]))

  for (const variety of varieties) {
    if (!byName.has(variety)) {
      const created = await tx.product.create({
        data: { name: variety, price: COST_PER_PIECE }
      })
      byName.set(variety, created)
    }
  }

  return byName
}

/**
 * Serializes every operation that consumes or reserves inventory (normal sale,
 * fulfill order, sell order) on the same transaction-level advisory lock. This
 * is the backend source of truth against race conditions that the UI cannot
 * prevent.
 */
export async function lockInventory(tx: Prisma.TransactionClient): Promise<void> {
  await tx.$queryRaw`SELECT 1 AS locked FROM (SELECT pg_advisory_xact_lock(${SALES_LOCK_KEY}::bigint)) AS lock`
}

export function findShortages(
  items: IncomingItem[],
  availability: VarietyAvailability[]
): StockShortage[] {
  const remainingByVariety = new Map(availability.map((entry) => [entry.variety, entry.remaining]))

  return items
    .map((item) => ({
      variety: item.variety,
      requested: item.quantity,
      remaining: Math.max(0, remainingByVariety.get(item.variety) ?? 0)
    }))
    .filter((entry) => entry.requested > entry.remaining)
}

export function parseMoney(raw: unknown): number | null {
  const value = Number(raw)
  if (!Number.isFinite(value) || value < 0) return null
  return Math.round(value * 100) / 100
}
