'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { COST_PER_PIECE, VARIETIES } from '@/lib/constants'
import { businessTodayKey } from '@/lib/date'
import { money } from '@/lib/money'
import { PageHeader } from '@/app/components/PageHeader'

interface Product {
  id: string
  name: string
  price: number
  category: string | null
}

interface SaleItem {
  id: string
  quantity: number
  unitPrice: number
  product: Product
}

interface Sale {
  id: string
  date: string
  createdAt: string
  paymentMethod: PaymentMethod
  depositAmount: number
  depositPaymentMethod: PaymentMethod | null
  orderId: string | null
  order: { id: string; customerName: string; status: string } | null
  items: SaleItem[]
}

type PaymentMethod = 'CASH' | 'TRANSFER'

const PAYMENT_METHOD_OPTIONS: { value: PaymentMethod; label: string }[] = [
  { value: 'CASH', label: 'Efectivo' },
  { value: 'TRANSFER', label: 'Transferencia' }
]

const paymentMethodLabel = (method: PaymentMethod) =>
  method === 'TRANSFER' ? 'Transferencia' : 'Efectivo'

interface VarietyAvailability {
  variety: string
  produced: number
  sold: number
  reserved: number
  remaining: number
}

const saleItemCount = (sale: Sale) => sale.items.reduce((sum, item) => sum + item.quantity, 0)
const saleTotal = (sale: Sale) => sale.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0)

export default function VentaPage() {
  const [sales, setSales] = useState<Sale[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [availability, setAvailability] = useState<VarietyAvailability[]>([])
  const [pendingOrders, setPendingOrders] = useState(0)
  const [ticket, setTicket] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const submittingRef = useRef(false)
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null)
  const [showConfirm, setShowConfirm] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH')

  const today = businessTodayKey()

  const loadData = useCallback(async () => {
    try {
      const [salesRes, productsRes, availabilityRes, ordersRes] = await Promise.all([
        fetch(`/api/sales?date=${today}`),
        fetch('/api/products'),
        fetch(`/api/availability?date=${today}`),
        fetch(`/api/orders?date=${today}&status=PENDING`)
      ])

      const salesData = await salesRes.json()
      const productsData = await productsRes.json()
      const availabilityData = await availabilityRes.json()
      const pendingData = await ordersRes.json()

      setSales(Array.isArray(salesData) ? salesData : [])
      setProducts(Array.isArray(productsData) ? productsData : [])
      setAvailability(Array.isArray(availabilityData?.items) ? availabilityData.items : [])
      setPendingOrders(Array.isArray(pendingData) ? pendingData.length : 0)
    } catch (error) {
      console.error('Error loading data:', error)
      toast.error('Error al cargar los datos')
    }
  }, [today])

  useEffect(() => {
    let active = true
    loadData().finally(() => {
      if (active) setLoading(false)
    })
    const interval = setInterval(loadData, 7000)
    return () => {
      active = false
      clearInterval(interval)
    }
  }, [loadData])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || saving) return
      setSelectedSale(null)
      setShowConfirm(false)
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [saving])

  const priceFor = (variety: string): number => {
    const product = products.find(p => p.name.toLowerCase() === variety.toLowerCase())
    return product?.price ?? COST_PER_PIECE
  }

  const availabilityFor = (variety: string) =>
    availability.find(entry => entry.variety === variety)

  const ticketItems = VARIETIES.filter(variety => (ticket[variety] ?? 0) > 0).map(variety => ({
    variety,
    quantity: ticket[variety],
    unitPrice: priceFor(variety)
  }))

  const ticketCount = ticketItems.reduce((sum, item) => sum + item.quantity, 0)
  const ticketTotal = ticketItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0)

  const overLimitItems = ticketItems.filter(item => {
    const remaining = availabilityFor(item.variety)?.remaining ?? 0
    return item.quantity > remaining
  })

  const addToTicket = (variety: string) => {
    const remaining = availabilityFor(variety)?.remaining ?? 0
    const current = ticket[variety] ?? 0

    if (remaining <= 0) {
      toast.error(`${variety} está agotado`)
      return
    }
    if (current >= remaining) {
      toast.error(`Solo quedan ${remaining} piezas disponibles de ${variety}`)
      return
    }

    setTicket(prev => ({ ...prev, [variety]: (prev[variety] ?? 0) + 1 }))
  }

  const removeFromTicket = (variety: string) => {
    setTicket(prev => {
      const next = (prev[variety] ?? 0) - 1
      if (next <= 0) {
        const { [variety]: _removed, ...rest } = prev
        return rest
      }
      return { ...prev, [variety]: next }
    })
  }

  const registerSale = async (method: PaymentMethod): Promise<boolean> => {
    if (ticketCount === 0 || saving || submittingRef.current) return false
    if (overLimitItems.length > 0) {
      toast.error('Ajusta las cantidades: superan la disponibilidad actual')
      return false
    }

    submittingRef.current = true
    setSaving(true)
    try {
      const response = await fetch('/api/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: today,
          paymentMethod: method,
          items: ticketItems.map(item => ({ variety: item.variety, quantity: item.quantity }))
        })
      })

      if (!response.ok) {
        const data = await response.json().catch(() => null)
        if (data?.code === 'INSUFFICIENT_STOCK') {
          const detail = Array.isArray(data.shortages)
            ? data.shortages
                .map((shortage: { variety: string; remaining: number }) => `${shortage.variety}: quedan ${shortage.remaining}`)
                .join(', ')
            : ''
          toast.error(detail ? `Sin existencia: ${detail}` : 'Sin existencia suficiente')
          await loadData()
          return false
        }
        const detail = data?.code ? ` (${data.code})` : ''
        toast.error(`${data?.error || 'Error al registrar la venta'}${detail}`)
        return false
      }

      const newSale: Sale = await response.json()
      if (!newSale?.id || !Array.isArray(newSale.items)) {
        toast.error('Respuesta inesperada del servidor')
        return false
      }

      setTicket({})
      setPaymentMethod('CASH')
      toast.success('Venta registrada exitosamente')
      await loadData()
      return true
    } catch (error) {
      console.error('Error registering sale:', error)
      toast.error('Error al registrar la venta')
      return false
    } finally {
      submittingRef.current = false
      setSaving(false)
    }
  }

  const confirmOrder = async () => {
    const success = await registerSale(paymentMethod)
    if (success) setShowConfirm(false)
  }

  const totalSold = sales.reduce((sum, sale) => sum + saleItemCount(sale), 0)
  const totalAmount = sales.reduce((sum, sale) => sum + saleTotal(sale), 0)
  const selectedSaleNumber = selectedSale ? sales.indexOf(selectedSale) + 1 : 0

  if (loading) {
    return (
      <div className="page-stack">
        <div className="card text-center">
          <p className="text-gray-600">Cargando…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="page-stack">
      <PageHeader
        title="Registro de ventas"
        description="Arma la comanda, confirma el pago y registra la venta del mostrador."
      />

      {/* Recordatorio de pedidos pendientes de surtir */}
      {pendingOrders > 0 && (
        <Link
          href="/pedidos"
          className="card flex items-center justify-between gap-3 border border-amber-200 bg-amber-50 shadow-none transition-shadow hover:shadow-md"
        >
          <div className="flex items-center gap-2">
            <svg
              className="h-5 w-5 shrink-0 text-amber-700"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.8}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M12 4 21 20H3L12 4Z" />
              <path d="M12 10v4" />
              <path d="M12 17h.01" />
            </svg>
            <span className="font-semibold text-amber-900">
              Pedidos pendientes de surtir: {pendingOrders}
            </span>
          </div>
          <span className="btn btn-primary text-sm py-2 px-4 pointer-events-none">
            Revisar pedidos
          </span>
        </Link>
      )}

      {/* Modal detalle de venta */}
      {selectedSale && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setSelectedSale(null)}
        >
          <div
            className="card max-h-[85vh] w-full max-w-md overflow-y-auto"
            role="dialog"
            aria-modal="true"
            aria-labelledby="detalle-venta-titulo"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-start mb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h2 id="detalle-venta-titulo" className="text-xl font-bold">Venta #{selectedSaleNumber}</h2>
                  {selectedSale.orderId && (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
                      Pedido
                    </span>
                  )}
                </div>
                <p className="text-gray-600 text-sm">
                  {format(new Date(selectedSale.createdAt), "d 'de' MMMM, HH:mm", { locale: es })}
                </p>
              </div>
              <button
                type="button"
                className="text-gray-500 hover:text-gray-800 text-2xl leading-none"
                onClick={() => setSelectedSale(null)}
                aria-label="Cerrar"
              >
                ×
              </button>
            </div>

            <div className="flex flex-col gap-2">
              {selectedSale.items.map(item => (
                <div key={item.id} className="flex justify-between items-center border-b border-gray-100 pb-2 last:border-b-0">
                  <p className="font-semibold text-gray-900">{item.product.name}</p>
                  <p className="text-lg font-bold text-blue-600">{item.quantity}</p>
                </div>
              ))}
            </div>

            <div className="flex justify-between items-center mt-3 text-sm">
              <span className="text-gray-600">Total de piezas</span>
              <span className="text-base font-bold text-blue-600">
                {saleItemCount(selectedSale)}
              </span>
            </div>

            <div className="flex justify-between items-center mt-3 text-sm">
              <span className="text-gray-600">Método de pago</span>
              <span className="font-semibold text-gray-900">
                {paymentMethodLabel(selectedSale.paymentMethod)}
              </span>
            </div>

            <div className="flex justify-between items-center mt-3 pt-3 border-t-2 border-gray-200">
              <span className="text-lg font-bold">Total</span>
              <span className="text-2xl font-bold text-green-700">{money(saleTotal(selectedSale))}</span>
            </div>
          </div>
        </div>
      )}

      {/* Modal confirmar orden (vista previa, solo lectura) */}
      {showConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setShowConfirm(false)}
        >
          <div
            className="card max-h-[85vh] w-full max-w-md overflow-y-auto"
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirmar-orden-titulo"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 id="confirmar-orden-titulo" className="text-xl font-bold">Confirmar venta</h2>
                <p className="text-gray-600 text-sm">Revisa la comanda antes de registrarla</p>
              </div>
              <button
                type="button"
                className="text-gray-500 hover:text-gray-800 text-2xl leading-none"
                onClick={() => setShowConfirm(false)}
                aria-label="Cerrar"
              >
                ×
              </button>
            </div>

            <div className="flex flex-col gap-2">
              {ticketItems.map(item => (
                <div key={item.variety} className="flex justify-between items-center border-b border-gray-100 pb-2 last:border-b-0">
                  <p className="font-semibold text-gray-900">{item.variety}</p>
                  <p className="text-lg font-bold text-blue-600">{item.quantity}</p>
                </div>
              ))}
            </div>

            <div className="flex justify-between items-center mt-4 text-sm">
              <span className="text-gray-600">Total de piezas</span>
              <span className="text-base font-bold text-blue-600">{ticketCount}</span>
            </div>

            <div className="flex justify-between items-center mt-3 pt-3 border-t-2 border-gray-200">
              <span className="text-lg font-bold">Total a pagar</span>
              <span className="text-2xl font-bold text-green-700">{money(ticketTotal)}</span>
            </div>

            <div className="mt-5">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Método de pago
              </p>
              <div className="flex gap-1 rounded-lg bg-gray-100 p-1" role="radiogroup" aria-label="Método de pago">
                {PAYMENT_METHOD_OPTIONS.map(option => {
                  const selected = paymentMethod === option.value
                  return (
                    <button
                      key={option.value}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      className={`flex-1 rounded-md py-2 text-sm font-semibold transition-colors ${
                        selected ? 'bg-white text-blue-600 shadow' : 'text-gray-600 hover:text-gray-900'
                      }`}
                      onClick={() => setPaymentMethod(option.value)}
                      disabled={saving}
                    >
                      {option.label}
                    </button>
                  )
                })}
              </div>
            </div>

            {overLimitItems.length > 0 && (
              <p className="text-sm text-red-600 mt-4">
                La disponibilidad cambió. Modifica la orden antes de registrar la venta.
              </p>
            )}

            <div className="flex gap-2 mt-5">
              <button
                type="button"
                className="btn btn-secondary flex-1"
                onClick={() => setShowConfirm(false)}
                disabled={saving}
              >
                Modificar orden
              </button>
              <button
                type="button"
                className="btn btn-success flex-1"
                onClick={confirmOrder}
                disabled={saving || overLimitItems.length > 0}
              >
                {saving ? 'Registrando...' : 'Registrar venta'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Armado de la venta */}
      <div className="card card-flush">
        <div className="px-4 pt-4 pb-2">
          <h2 className="text-lg font-bold">Nueva venta</h2>
          <p className="text-gray-600 text-sm">Agrega las variedades de esta comanda</p>
        </div>
        <table className="w-full">
          <colgroup>
            <col className="w-auto" />
            <col className="w-32" />
          </colgroup>
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-3 py-3 text-left text-xs md:text-sm font-semibold text-gray-700">Variedad</th>
              <th className="px-2 py-3 text-center text-xs md:text-sm font-semibold text-gray-700">Cantidad</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {VARIETIES.map(variety => {
              const quantity = ticket[variety] ?? 0
              const info = availabilityFor(variety)
              const produced = info?.produced ?? 0
              const sold = info?.sold ?? 0
              const remaining = info?.remaining ?? 0
              const soldOut = remaining <= 0
              return (
                <tr
                  key={variety}
                  className={`transition-colors ${soldOut ? 'bg-red-50/50' : 'hover:bg-gray-50'}`}
                >
                  <td className="px-3 py-3">
                    <div className="flex flex-col">
                      <span className={`font-semibold text-sm md:text-base whitespace-nowrap ${soldOut ? 'text-gray-500' : 'text-gray-900'}`}>
                        {variety}
                      </span>
                      <span className="text-xs text-gray-500">
                        Producción {produced} · Vendidas {sold} ·{' '}
                        <span className={soldOut ? 'font-semibold text-red-600' : 'font-semibold text-green-700'}>
                          {soldOut ? 'Agotado' : `Disponible ${remaining}`}
                        </span>
                      </span>
                    </div>
                  </td>
                  <td className="px-2 py-3">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        type="button"
                        className="btn btn-secondary p-1.5 min-w-0 text-lg leading-none"
                        onClick={() => removeFromTicket(variety)}
                        disabled={quantity === 0}
                        aria-label={`Quitar ${variety}`}
                      >
                        −
                      </button>
                      <span className="text-lg font-bold text-blue-600 w-6 text-center">{quantity}</span>
                      <button
                        type="button"
                        className="btn btn-success p-1.5 min-w-0 text-lg leading-none"
                        onClick={() => addToTicket(variety)}
                        disabled={soldOut}
                        aria-label={`Agregar ${variety}`}
                      >
                        +
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Total de la venta en curso */}
      <div className="card">
        {ticketCount === 0 ? (
          <p className="text-gray-600 text-center">Agrega variedades para armar la venta</p>
        ) : (
          <>
            <div className="flex flex-col gap-2 mb-4">
              {ticketItems.map(item => (
                <div key={item.variety} className="flex justify-between text-sm">
                  <span className="text-gray-600">{item.variety}</span>
                  <span className="text-base font-bold text-blue-600">{item.quantity}</span>
                </div>
              ))}
            </div>
            <div className="flex justify-between items-center border-t border-gray-200 pt-3 mb-4">
              <span className="text-lg font-bold">Total de piezas</span>
              <span className="text-lg font-bold text-blue-600">{ticketCount}</span>
            </div>
            <div className="flex justify-between items-center border-t border-gray-200 pt-3 mb-4">
              <span className="text-lg font-bold">Total a cobrar</span>
              <span className="text-2xl font-bold text-green-700">{money(ticketTotal)}</span>
            </div>
            {overLimitItems.length > 0 && (
              <p className="text-sm text-red-600 mb-3">
                La disponibilidad cambió. Ajusta las cantidades antes de registrar la venta.
              </p>
            )}
            <div className="flex gap-2">
              <button
                type="button"
                className="btn btn-secondary flex-1"
                onClick={() => setTicket({})}
                disabled={saving}
              >
                Limpiar
              </button>
              <button
                type="button"
                className="btn btn-success flex-1"
                onClick={() => setShowConfirm(true)}
                disabled={overLimitItems.length > 0}
              >
                Confirmar venta
              </button>
            </div>
          </>
        )}
      </div>

      {/* Resumen y lista de ventas del día */}
      <div className="card">
        <div className="section-heading">
          <div>
            <h2 className="section-title">Ventas del día</h2>
            <p className="section-note mt-1">Toca una venta para revisar su detalle.</p>
          </div>
          <span className="status-pill status-pill-neutral">
            {sales.length} {sales.length === 1 ? 'venta' : 'ventas'}
          </span>
        </div>

        <dl className="mt-4 grid grid-cols-2 gap-4 border-b border-gray-100 pb-4">
          <div>
            <dt className="day-metric-label">Total vendidos</dt>
            <dd className="mt-1 text-2xl font-bold text-blue-600">{totalSold}</dd>
          </div>
          <div className="text-right">
            <dt className="day-metric-label">Monto total</dt>
            <dd className="mt-1 text-2xl font-bold text-green-700">{money(totalAmount)}</dd>
          </div>
        </dl>

        {sales.length === 0 ? (
          <p className="py-4 text-center text-gray-600">No hay ventas registradas hoy.</p>
        ) : (
          <div className="mt-2 flex flex-col">
            {sales.map((sale, index) => (
              <button
                key={sale.id}
                type="button"
                onClick={() => setSelectedSale(sale)}
                className="flex flex-col gap-2 py-3 border-b border-gray-100 last:border-b-0 text-left hover:bg-gray-50 transition-colors"
              >
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-gray-900">Venta #{index + 1}</p>
                    {sale.orderId && (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
                        Pedido
                      </span>
                    )}
                  </div>
                  <span className="text-gray-500 text-sm">
                    {format(new Date(sale.createdAt), 'HH:mm')}
                  </span>
                </div>
                <div className="flex flex-col gap-1">
                  {sale.items.map(item => (
                    <div key={item.id} className="flex justify-between text-sm">
                      <span className="text-gray-600">{item.product.name}</span>
                      <span className="text-base font-bold text-blue-600">{item.quantity}</span>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between items-center border-t border-gray-100 pt-2 text-sm">
                  <span className="text-gray-600">Total de piezas</span>
                  <span className="text-base font-bold text-blue-600">{saleItemCount(sale)}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600">Total</span>
                  <span className="font-bold text-green-700">{money(saleTotal(sale))}</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
