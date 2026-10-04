export type PaymentMethod = 'CASH' | 'TRANSFER'

export interface SaleAmountInput {
  paymentMethod: PaymentMethod
  depositAmount?: number | null
  depositPaymentMethod?: PaymentMethod | null
  items: { quantity: number; unitPrice: number }[]
}

export const saleItemCount = (sale: { items: { quantity: number }[] }): number =>
  sale.items.reduce((sum, item) => sum + item.quantity, 0)

export const saleTotal = (sale: { items: { quantity: number; unitPrice: number }[] }): number =>
  sale.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0)

/**
 * Splits the full sale value into the money actually collected by payment
 * method. A sale may have been partially covered by an order deposit received
 * earlier, so the final payment only covers the remaining balance. For normal
 * sales (no deposit) this reduces to the sale's paymentMethod, preserving the
 * previous behavior.
 */
export function saleBreakdown(sale: SaleAmountInput): {
  total: number
  deposit: number
  remainder: number
  cash: number
  transfer: number
} {
  const total = saleTotal(sale)
  const deposit = Math.max(0, Math.min(sale.depositAmount ?? 0, total))
  const remainder = Math.max(0, total - deposit)

  const cash =
    (sale.depositPaymentMethod === 'CASH' ? deposit : 0) +
    (sale.paymentMethod === 'CASH' ? remainder : 0)
  const transfer =
    (sale.depositPaymentMethod === 'TRANSFER' ? deposit : 0) +
    (sale.paymentMethod === 'TRANSFER' ? remainder : 0)

  return { total, deposit, remainder, cash, transfer }
}
