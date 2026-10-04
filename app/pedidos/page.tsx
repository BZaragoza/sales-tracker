'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { COST_PER_PIECE, VARIETIES } from '@/lib/constants'
import { businessTodayKey } from '@/lib/date'

type PaymentMethod = 'CASH' | 'TRANSFER'
type OrderStatus = 'PENDING' | 'FULFILLED' | 'COMPLETED' | 'CANCELLED'

interface Product {
  id: string
  name: string
  price: number
}

interface OrderItem {
  id: string
  quantity: number
  unitPrice: number
  subtotal: number
  product: { id: string; name: string }
}

interface Order {
  id: string
  customerName: string
  customerPhone: string | null
  date: string
  status: OrderStatus
  total: number
  depositAmount: number
  depositPaymentMethod: PaymentMethod | null
  createdAt: string
  fulfilledAt: string | null
  completedAt: string | null
  cancelledAt: string | null
  items: OrderItem[]
  sale: { id: string; createdAt: string } | null
}

interface VarietyAvailability {
  variety: string
  produced: number
  sold: number
  reserved: number
  remaining: number
}

const PAYMENT_METHOD_OPTIONS: { value: PaymentMethod; label: string }[] = [
  { value: 'CASH', label: 'Efectivo' },
  { value: 'TRANSFER', label: 'Transferencia' }
]

const paymentMethodLabel = (method: PaymentMethod | null) =>
  method === 'TRANSFER' ? 'Transferencia' : method === 'CASH' ? 'Efectivo' : '—'

const money = (value: number) => `$${value.toFixed(2)}`

const STATUS_META: Record<OrderStatus, { label: string; classes: string }> = {
  PENDING: { label: 'Pendiente', classes: 'bg-yellow-100 text-yellow-800' },
  FULFILLED: { label: 'Surtido', classes: 'bg-blue-100 text-blue-800' },
  COMPLETED: { label: 'Vendido', classes: 'bg-green-100 text-green-800' },
  CANCELLED: { label: 'Cancelado', classes: 'bg-gray-200 text-gray-600' }
}

const orderItemCount = (order: Order) => order.items.reduce((sum, item) => sum + item.quantity, 0)
const orderRemaining = (order: Order) => Math.max(0, order.total - order.depositAmount)

export default function PedidosPage() {
  const today = businessTodayKey()

  const [selectedDate, setSelectedDate] = useState(today)
  const [orders, setOrders] = useState<Order[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [onlyPending, setOnlyPending] = useState(false)

  const [formCustomer, setFormCustomer] = useState('')
  const [formPhone, setFormPhone] = useState('')
  const [formDate, setFormDate] = useState(today)
  const [formTicket, setFormTicket] = useState<Record<string, number>>({})
  const [formDeposit, setFormDeposit] = useState('')
  const [formDepositMethod, setFormDepositMethod] = useState<PaymentMethod | null>(null)
  const [formAvailability, setFormAvailability] = useState<VarietyAvailability[]>([])
  const [savingForm, setSavingForm] = useState(false)
  const formSubmittingRef = useRef(false)

  const [busyOrderId, setBusyOrderId] = useState<string | null>(null)
  const actionRef = useRef(false)

  const [sellOrder, setSellOrder] = useState<Order | null>(null)
  const [sellPaymentMethod, setSellPaymentMethod] = useState<PaymentMethod>('CASH')
  const [selling, setSelling] = useState(false)

  const loadOrders = useCallback(async (date: string) => {
    try {
      const response = await fetch(`/api/orders?date=${date}`)
      const data = await response.json()
      setOrders(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Error loading orders:', error)
      toast.error('Error al cargar los pedidos')
    }
  }, [])

  const loadAvailability = useCallback(async (date: string) => {
    try {
      const response = await fetch(`/api/availability?date=${date}`)
      const data = await response.json()
      setFormAvailability(Array.isArray(data?.items) ? data.items : [])
    } catch (error) {
      console.error('Error loading availability:', error)
    }
  }, [])

  const loadProducts = useCallback(async () => {
    try {
      const response = await fetch('/api/products')
      const data = await response.json()
      setProducts(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Error loading products:', error)
    }
  }, [])

  useEffect(() => {
    let active = true
    loadOrders(selectedDate).finally(() => {
      if (active) setLoading(false)
    })
    const interval = setInterval(() => loadOrders(selectedDate), 7000)
    return () => {
      active = false
      clearInterval(interval)
    }
  }, [selectedDate, loadOrders])

  useEffect(() => {
    loadProducts()
  }, [loadProducts])

  useEffect(() => {
    loadAvailability(formDate)
  }, [formDate, loadAvailability])

  const priceFor = useCallback(
    (variety: string) => {
      const product = products.find((p) => p.name.toLowerCase() === variety.toLowerCase())
      return product?.price ?? COST_PER_PIECE
    },
    [products]
  )

  const availabilityFor = (variety: string) =>
    formAvailability.find((entry) => entry.variety === variety)

  const formTicketItems = VARIETIES.filter((variety) => (formTicket[variety] ?? 0) > 0).map(
    (variety) => ({
      variety,
      quantity: formTicket[variety],
      unitPrice: priceFor(variety)
    })
  )

  const formTicketCount = formTicketItems.reduce((sum, item) => sum + item.quantity, 0)
  const formTicketTotal = formTicketItems.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice,
    0
  )

  const parsedDeposit = Math.round((Number(formDeposit) || 0) * 100) / 100
  const formDepositAmount = formDepositMethod ? Math.max(0, parsedDeposit) : 0
  const formRemaining = Math.max(0, formTicketTotal - formDepositAmount)

  const addToTicket = (variety: string) => {
    const remaining = availabilityFor(variety)?.remaining ?? 0
    const current = formTicket[variety] ?? 0
    if (remaining <= 0) {
      toast.error(`${variety} está agotado`)
      return
    }
    if (current >= remaining) {
      toast.error(`Solo quedan ${remaining} piezas disponibles de ${variety}`)
      return
    }
    setFormTicket((prev) => ({ ...prev, [variety]: (prev[variety] ?? 0) + 1 }))
  }

  const removeFromTicket = (variety: string) => {
    setFormTicket((prev) => {
      const next = (prev[variety] ?? 0) - 1
      if (next <= 0) {
        const { [variety]: _removed, ...rest } = prev
        return rest
      }
      return { ...prev, [variety]: next }
    })
  }

  const resetForm = () => {
    setFormCustomer('')
    setFormPhone('')
    setFormDate(today)
    setFormTicket({})
    setFormDeposit('')
    setFormDepositMethod(null)
  }

  const refresh = async () => {
    await Promise.all([loadOrders(selectedDate), loadAvailability(formDate), loadProducts()])
  }

  const createOrder = async () => {
    if (formSubmittingRef.current || savingForm) return

    if (!formCustomer.trim()) {
      toast.error('Ingresa el nombre del cliente')
      return
    }
    if (formTicketCount === 0) {
      toast.error('Agrega al menos una variedad')
      return
    }
    if (formDepositMethod && parsedDeposit > formTicketTotal) {
      toast.error('El anticipo no puede ser mayor al total')
      return
    }
    if (formDepositMethod && !formDeposit) {
      toast.error('Ingresa el monto del anticipo')
      return
    }

    formSubmittingRef.current = true
    setSavingForm(true)
    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: formCustomer.trim(),
          customerPhone: formPhone.trim() || null,
          date: formDate,
          items: formTicketItems.map((item) => ({ variety: item.variety, quantity: item.quantity })),
          depositAmount: formDepositAmount,
          depositPaymentMethod: formDepositMethod
        })
      })

      if (!response.ok) {
        const data = await response.json().catch(() => null)
        if (data?.code === 'INSUFFICIENT_STOCK' && Array.isArray(data.shortages)) {
          const detail = data.shortages
            .map((s: { variety: string; remaining: number }) => `${s.variety}: quedan ${s.remaining}`)
            .join(', ')
          toast.error(`Sin existencia: ${detail}`)
        } else {
          toast.error(data?.error || 'No se pudo registrar el pedido')
        }
        await refresh()
        return
      }

      toast.success('Pedido registrado')
      resetForm()
      await refresh()
    } catch (error) {
      console.error('Error creating order:', error)
      toast.error('Error al registrar el pedido')
    } finally {
      formSubmittingRef.current = false
      setSavingForm(false)
    }
  }

  const fulfillOrder = async (order: Order) => {
    if (actionRef.current) return
    actionRef.current = true
    setBusyOrderId(order.id)
    try {
      const response = await fetch(`/api/orders/${order.id}/fulfill`, { method: 'POST' })
      if (!response.ok) {
        const data = await response.json().catch(() => null)
        if (data?.code === 'INSUFFICIENT_STOCK' && Array.isArray(data.shortages)) {
          const detail = data.shortages
            .map((s: { variety: string; remaining: number }) => `${s.variety}: quedan ${s.remaining}`)
            .join(', ')
          toast.error(`Sin existencia: ${detail}`)
        } else {
          toast.error(data?.error || 'No se pudo surtir el pedido')
        }
        await refresh()
        return
      }
      toast.success('Pedido surtido')
      await refresh()
    } catch (error) {
      console.error('Error fulfilling order:', error)
      toast.error('Error al surtir el pedido')
    } finally {
      actionRef.current = false
      setBusyOrderId(null)
    }
  }

  const openSell = (order: Order) => {
    setSellOrder(order)
    setSellPaymentMethod('CASH')
  }

  const confirmSell = async () => {
    if (!sellOrder || selling) return
    setSelling(true)
    try {
      const response = await fetch(`/api/orders/${sellOrder.id}/sell`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentMethod: sellPaymentMethod })
      })
      if (!response.ok) {
        const data = await response.json().catch(() => null)
        toast.error(data?.error || 'No se pudo registrar la venta')
        await refresh()
        return
      }
      toast.success('Pedido vendido')
      setSellOrder(null)
      await refresh()
    } catch (error) {
      console.error('Error selling order:', error)
      toast.error('Error al registrar la venta')
    } finally {
      setSelling(false)
    }
  }

  const cancelOrder = async (order: Order) => {
    if (actionRef.current) return
    actionRef.current = true
    setBusyOrderId(order.id)
    try {
      const response = await fetch(`/api/orders/${order.id}/cancel`, { method: 'POST' })
      if (!response.ok) {
        const data = await response.json().catch(() => null)
        toast.error(data?.error || 'No se pudo cancelar el pedido')
        await refresh()
        return
      }
      toast.success('Pedido cancelado')
      await refresh()
    } catch (error) {
      console.error('Error cancelling order:', error)
      toast.error('Error al cancelar el pedido')
    } finally {
      actionRef.current = false
      setBusyOrderId(null)
    }
  }

  const visibleOrders = onlyPending
    ? orders.filter((order) => order.status === 'PENDING')
    : orders

  if (loading) {
    return (
      <div className="w-full max-w-full mx-auto px-4 md:max-w-2xl md:px-6">
        <div className="card text-center">
          <p className="text-gray-600">Cargando...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full max-w-full mx-auto px-4 py-4 md:max-w-2xl md:px-6">
      <header className="text-center mb-6">
        <h1 className="text-2xl md:text-3xl font-bold mb-2">Pedidos</h1>
        <p className="text-gray-600 mb-4">
          {format(new Date(), "EEEE, d 'de' MMMM", { locale: es })}
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link href="/" className="btn btn-secondary text-sm py-2 px-4">
            ← Producción
          </Link>
          <Link href="/venta" className="btn btn-secondary text-sm py-2 px-4">
            Ventas
          </Link>
          <Link href="/corte" className="btn btn-secondary text-sm py-2 px-4">
            Corte
          </Link>
          <Link href="/historial" className="btn btn-secondary text-sm py-2 px-4">
            Historial
          </Link>
        </div>
      </header>

      {/* Selección de fecha para la lista */}
      <div className="card">
        <label className="block text-gray-600 mb-2 font-medium">Fecha de pedidos</label>
        <input
          type="date"
          className="input"
          value={selectedDate}
          onChange={(e) => e.target.value && setSelectedDate(e.target.value)}
        />
        <label className="mt-3 flex items-center gap-2 text-sm text-gray-600">
          <input
            type="checkbox"
            checked={onlyPending}
            onChange={(e) => setOnlyPending(e.target.checked)}
          />
          Mostrar solo pendientes de surtir
        </label>
      </div>

      {/* Nuevo pedido */}
      <div className="card">
        <h2 className="text-lg font-bold mb-1">Nuevo pedido</h2>
        <p className="text-gray-600 text-sm mb-4">Aparta productos para que el cliente los recoja</p>

        <div className="flex flex-col gap-4">
          <div>
            <label className="block text-gray-600 mb-1 text-sm font-medium">Cliente *</label>
            <input
              className="input"
              value={formCustomer}
              onChange={(e) => setFormCustomer(e.target.value)}
              placeholder="Nombre del cliente"
            />
          </div>
          <div>
            <label className="block text-gray-600 mb-1 text-sm font-medium">Teléfono</label>
            <input
              className="input"
              inputMode="tel"
              value={formPhone}
              onChange={(e) => setFormPhone(e.target.value)}
              placeholder="Opcional"
            />
          </div>
          <div>
            <label className="block text-gray-600 mb-1 text-sm font-medium">Fecha del pedido</label>
            <input
              type="date"
              className="input"
              value={formDate}
              onChange={(e) => {
                if (!e.target.value) return
                setFormDate(e.target.value)
                setFormTicket({})
              }}
            />
          </div>

          {/* Productos */}
          <div className="overflow-hidden rounded-lg border border-gray-200">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">
                    Variedad
                  </th>
                  <th className="px-2 py-2 text-center text-xs font-semibold text-gray-700">
                    Cantidad
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {VARIETIES.map((variety) => {
                  const quantity = formTicket[variety] ?? 0
                  const info = availabilityFor(variety)
                  const remaining = info?.remaining ?? 0
                  const soldOut = remaining <= 0
                  return (
                    <tr key={variety} className={soldOut ? 'bg-red-50/50' : ''}>
                      <td className="px-3 py-2">
                        <div className="flex flex-col">
                          <span
                            className={`font-semibold text-sm ${soldOut ? 'text-gray-400' : 'text-gray-900'}`}
                          >
                            {variety}
                          </span>
                          <span className="text-xs text-gray-500">
                            Disponible{' '}
                            <span className={soldOut ? 'font-semibold text-red-600' : 'font-semibold text-green-600'}>
                              {remaining}
                            </span>
                            {info && info.reserved > 0 ? ` · Apartadas ${info.reserved}` : ''}
                          </span>
                        </div>
                      </td>
                      <td className="px-2 py-2">
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
                          <span className="text-lg font-bold text-blue-600 w-6 text-center">
                            {quantity}
                          </span>
                          <button
                            type="button"
                            className="btn btn-success p-1.5 min-w-0 text-lg leading-none"
                            onClick={() => addToTicket(variety)}
                            disabled={soldOut || savingForm}
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

          {/* Anticipo */}
          <div>
            <p className="text-sm font-semibold text-gray-600 mb-2">Anticipo</p>
            <div className="flex gap-1 rounded-lg bg-gray-100 p-1" role="radiogroup" aria-label="Anticipo">
              <button
                type="button"
                className={`flex-1 rounded-md py-2 text-sm font-semibold transition-colors ${
                  formDepositMethod === null ? 'bg-white text-blue-600 shadow' : 'text-gray-600'
                }`}
                onClick={() => {
                  setFormDepositMethod(null)
                  setFormDeposit('')
                }}
              >
                Sin anticipo
              </button>
              {PAYMENT_METHOD_OPTIONS.map((option) => {
                const selected = formDepositMethod === option.value
                return (
                  <button
                    key={option.value}
                    type="button"
                    className={`flex-1 rounded-md py-2 text-sm font-semibold transition-colors ${
                      selected ? 'bg-white text-blue-600 shadow' : 'text-gray-600'
                    }`}
                    onClick={() => setFormDepositMethod(option.value)}
                  >
                    {option.label}
                  </button>
                )
              })}
            </div>
            {formDepositMethod && (
              <input
                type="number"
                min="0"
                step="0.01"
                inputMode="decimal"
                className="input mt-2"
                value={formDeposit}
                onChange={(e) => setFormDeposit(e.target.value)}
                placeholder="Monto del anticipo"
              />
            )}
          </div>

          {/* Totales */}
          <div className="border-t border-gray-200 pt-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Total</span>
              <span className="text-lg font-bold text-green-600">{money(formTicketTotal)}</span>
            </div>
            <div className="flex justify-between text-sm mt-1">
              <span className="text-gray-600">Anticipo</span>
              <span className="font-semibold">{money(formDepositAmount)}</span>
            </div>
            <div className="flex justify-between text-sm mt-1">
              <span className="text-gray-600">Saldo pendiente</span>
              <span className="font-bold text-blue-600">{money(formRemaining)}</span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {formTicketCount} {formTicketCount === 1 ? 'pieza' : 'piezas'}
            </p>
          </div>

          <button
            type="button"
            className="btn btn-primary w-full"
            onClick={createOrder}
            disabled={savingForm || formTicketCount === 0 || !formCustomer.trim()}
          >
            {savingForm ? 'Registrando...' : 'Registrar pedido'}
          </button>
        </div>
      </div>

      {/* Lista de pedidos */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Pedidos del día</h2>
          <span className="text-sm text-gray-500">
            {format(new Date(`${selectedDate}T12:00:00`), "d 'de' MMMM", { locale: es })}
          </span>
        </div>

        {visibleOrders.length === 0 ? (
          <p className="text-gray-600 text-center py-4">No hay pedidos registrados</p>
        ) : (
          <div className="flex flex-col gap-3">
            {visibleOrders.map((order) => {
              const meta = STATUS_META[order.status]
              const busy = busyOrderId === order.id
              return (
                <div key={order.id} className="rounded-lg border border-gray-100 p-3">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-semibold text-gray-900">{order.customerName}</p>
                      <p className="text-xs text-gray-500">
                        {format(new Date(order.createdAt), 'HH:mm')}
                        {order.customerPhone ? ` · ${order.customerPhone}` : ''}
                      </p>
                    </div>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${meta.classes}`}>
                      {meta.label}
                    </span>
                  </div>

                  <div className="flex flex-col gap-1">
                    {order.items.map((item) => (
                      <div key={item.id} className="flex justify-between text-sm">
                        <span className="text-gray-600">{item.product.name}</span>
                        <span className="text-base font-bold text-blue-600">{item.quantity}</span>
                      </div>
                    ))}
                  </div>

                  <div className="mt-2 pt-2 border-t border-gray-100 flex flex-col gap-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Total</span>
                      <span className="font-bold text-green-600">{money(order.total)}</span>
                    </div>
                    {order.depositAmount > 0 && (
                      <>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">
                            Anticipo ({paymentMethodLabel(order.depositPaymentMethod)})
                          </span>
                          <span className="font-semibold">{money(order.depositAmount)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Saldo pendiente</span>
                          <span className="font-bold text-blue-600">
                            {money(orderRemaining(order))}
                          </span>
                        </div>
                      </>
                    )}
                    {order.sale && (
                      <p className="text-xs text-amber-700 mt-1">
                        Venta #{order.sale.id.slice(0, 6)} registrada
                      </p>
                    )}
                  </div>

                  {(order.status === 'PENDING' || order.status === 'FULFILLED') && (
                    <div className="flex gap-2 mt-3">
                      {order.status === 'PENDING' ? (
                        <button
                          type="button"
                          className="btn btn-primary flex-1 text-sm py-2"
                          onClick={() => fulfillOrder(order)}
                          disabled={busy}
                        >
                          {busy ? 'Surtiendo...' : 'Surtir'}
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="btn btn-success flex-1 text-sm py-2"
                          onClick={() => openSell(order)}
                          disabled={busy}
                        >
                          Vender
                        </button>
                      )}
                      <button
                        type="button"
                        className="btn btn-secondary text-sm py-2 px-4"
                        onClick={() => cancelOrder(order)}
                        disabled={busy}
                      >
                        Cancelar
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Modal vender pedido */}
      {sellOrder && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => !selling && setSellOrder(null)}
        >
          <div
            className="card max-w-md w-full mb-0 max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-xl font-bold">Vender pedido</h2>
                <p className="text-gray-600 text-sm">Cliente: {sellOrder.customerName}</p>
              </div>
              <button
                type="button"
                className="text-gray-500 hover:text-gray-800 text-2xl leading-none"
                onClick={() => !selling && setSellOrder(null)}
                aria-label="Cerrar"
              >
                ×
              </button>
            </div>

            <div className="flex flex-col gap-2">
              {sellOrder.items.map((item) => (
                <div
                  key={item.id}
                  className="flex justify-between items-center border-b border-gray-100 pb-2 last:border-b-0"
                >
                  <p className="font-semibold text-gray-900">{item.product.name}</p>
                  <p className="text-lg font-bold text-blue-600">{item.quantity}</p>
                </div>
              ))}
            </div>

            <div className="flex justify-between items-center mt-3 text-sm">
              <span className="text-gray-600">Total de piezas</span>
              <span className="text-base font-bold text-blue-600">{orderItemCount(sellOrder)}</span>
            </div>

            <div className="mt-4 pt-3 border-t-2 border-gray-200 flex flex-col gap-1">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Total del pedido</span>
                <span className="font-bold">{money(sellOrder.total)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Anticipo</span>
                <span className="font-semibold">{money(sellOrder.depositAmount)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Saldo pendiente</span>
                <span className="text-lg font-bold text-green-600">
                  {money(orderRemaining(sellOrder))}
                </span>
              </div>
            </div>

            <div className="mt-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Método de pago del saldo
              </p>
              <div className="flex gap-1 rounded-lg bg-gray-100 p-1" role="radiogroup">
                {PAYMENT_METHOD_OPTIONS.map((option) => {
                  const selected = sellPaymentMethod === option.value
                  return (
                    <button
                      key={option.value}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      className={`flex-1 rounded-md py-2 text-sm font-semibold transition-colors ${
                        selected ? 'bg-white text-blue-600 shadow' : 'text-gray-600'
                      }`}
                      onClick={() => setSellPaymentMethod(option.value)}
                      disabled={selling}
                    >
                      {option.label}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="flex gap-2 mt-5">
              <button
                type="button"
                className="btn btn-secondary flex-1"
                onClick={() => setSellOrder(null)}
                disabled={selling}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="btn btn-success flex-1"
                onClick={confirmSell}
                disabled={selling}
              >
                {selling ? 'Registrando...' : 'Confirmar venta'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
