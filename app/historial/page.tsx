'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import toast from 'react-hot-toast'
import { COST_PER_PIECE } from '@/lib/constants'

interface HistoryProduction {
  hasRecord: boolean
  total: number
  records: number
  byVariety: { variety: string; quantity: number }[]
}

interface HistorySales {
  hasRecord: boolean
  items: number
  amount: number
  cashAmount: number
  transferAmount: number
  operations: number
}

interface HistoryCashRegister {
  hasRecord: boolean
  expectedAmount: number | null
  actualAmount: number | null
  difference: number | null
  result: 'Cuadra' | 'Faltante' | 'Sobrante' | null
  notes: string | null
  date: string | null
  productionChanged: boolean
}

interface HistoryDay {
  dateKey: string
  production: HistoryProduction
  sales: HistorySales
  cashRegister: HistoryCashRegister
}

interface SaleItem {
  id: string
  quantity: number
  unitPrice: number
  product: { name: string }
}

interface Sale {
  id: string
  date: string
  createdAt: string
  paymentMethod: 'CASH' | 'TRANSFER'
  items: SaleItem[]
}

interface DailyProduction {
  id: string
  variety: string
  quantity: number
  date: string
}

interface CashRegister {
  id: string
  date: string
  totalProduction: number
  expectedAmount: number
  actualAmount: number | null
  notes: string | null
}

const PAGE_SIZE = 10

const money = (value: number) => `$${value.toFixed(2)}`

const formatDayLabel = (dateKey: string) =>
  format(new Date(`${dateKey}T12:00:00`), "EEEE, d 'de' MMMM 'de' yyyy", { locale: es })

const resultClasses = (result: HistoryCashRegister['result']) =>
  result === 'Cuadra'
    ? 'text-green-700'
    : result === 'Faltante'
      ? 'text-red-700'
      : result === 'Sobrante'
        ? 'text-amber-700'
        : 'text-gray-500'

const saleItemCount = (sale: Sale) => sale.items.reduce((sum, item) => sum + item.quantity, 0)
const saleTotal = (sale: Sale) =>
  sale.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0)

export default function HistorialPage() {
  const [days, setDays] = useState<HistoryDay[]>([])
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)

  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')

  const [selectedDay, setSelectedDay] = useState<HistoryDay | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailProduction, setDetailProduction] = useState<DailyProduction[]>([])
  const [detailSales, setDetailSales] = useState<Sale[]>([])
  const [detailCashRegister, setDetailCashRegister] = useState<CashRegister | null>(null)

  const loadPage = useCallback(
    async (targetPage: number, reset: boolean) => {
      if (reset) {
        setLoading(true)
      } else {
        setLoadingMore(true)
      }

      try {
        const params = new URLSearchParams({
          page: String(targetPage),
          pageSize: String(PAGE_SIZE)
        })
        if (from) params.set('from', from)
        if (to) params.set('to', to)

        const response = await fetch(`/api/history?${params.toString()}`)
        if (!response.ok) {
          toast.error('Error al cargar el historial')
          return
        }

        const data = await response.json()
        const incoming: HistoryDay[] = Array.isArray(data?.days) ? data.days : []

        setDays((prev) => (reset ? incoming : [...prev, ...incoming]))
        setHasMore(Boolean(data?.hasMore))
        setTotal(Number(data?.total) || 0)
        setPage(targetPage)
      } catch (error) {
        console.error('Error loading history:', error)
        toast.error('Error al cargar el historial')
      } finally {
        setLoading(false)
        setLoadingMore(false)
      }
    },
    [from, to]
  )

  useEffect(() => {
    loadPage(1, true)
  }, [loadPage])

  const openDetail = async (day: HistoryDay) => {
    setSelectedDay(day)
    setDetailLoading(true)
    setDetailProduction([])
    setDetailSales([])
    setDetailCashRegister(null)

    try {
      const [productionRes, salesRes, registerRes] = await Promise.all([
        fetch(`/api/production?date=${day.dateKey}`),
        fetch(`/api/sales?date=${day.dateKey}`),
        fetch(`/api/cash-register?date=${day.dateKey}`)
      ])

      const productionData = await productionRes.json()
      const salesData = await salesRes.json()
      const registerData = await registerRes.json()

      setDetailProduction(Array.isArray(productionData) ? productionData : [])
      setDetailSales(Array.isArray(salesData) ? salesData : [])
      setDetailCashRegister(registerData && registerData.id ? registerData : null)
    } catch (error) {
      console.error('Error loading day detail:', error)
      toast.error('Error al cargar el detalle del día')
    } finally {
      setDetailLoading(false)
    }
  }

  const closeDetail = () => {
    setSelectedDay(null)
    setDetailProduction([])
    setDetailSales([])
    setDetailCashRegister(null)
  }

  const applyFilters = (event: React.FormEvent) => {
    event.preventDefault()
    loadPage(1, true)
  }

  const clearFilters = () => {
    setFrom('')
    setTo('')
  }

  const detailProductionTotal = detailProduction.reduce((sum, row) => sum + row.quantity, 0)
  const detailSoldItems = detailSales.reduce((sum, sale) => sum + saleItemCount(sale), 0)
  const detailSoldAmount = detailSales.reduce((sum, sale) => sum + saleTotal(sale), 0)
  const detailCashAmount = detailSales
    .filter((sale) => sale.paymentMethod === 'CASH')
    .reduce((sum, sale) => sum + saleTotal(sale), 0)
  const detailTransferAmount = detailSales
    .filter((sale) => sale.paymentMethod === 'TRANSFER')
    .reduce((sum, sale) => sum + saleTotal(sale), 0)
  const detailExpected =
    detailCashRegister?.expectedAmount ?? detailProductionTotal * COST_PER_PIECE
  const detailReported = detailCashRegister?.actualAmount ?? null
  const detailDifference = detailReported !== null ? detailReported - detailExpected : null
  const detailResult =
    detailDifference === null
      ? null
      : Math.abs(detailDifference) < 0.005
        ? 'Cuadra'
        : detailDifference < 0
          ? 'Faltante'
          : 'Sobrante'

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
        <h1 className="text-2xl md:text-3xl font-bold mb-2">Historial de días</h1>
        <p className="text-gray-600 mb-4">Consulta de producción, ventas y cortes anteriores</p>
        <div className="flex justify-center gap-4">
          <Link href="/" className="btn btn-secondary text-sm py-2 px-4">
            ← Producción
          </Link>
          <Link href="/venta" className="btn btn-secondary text-sm py-2 px-4">
            Ventas
          </Link>
          <Link href="/corte" className="btn btn-secondary text-sm py-2 px-4">
            Corte
          </Link>
        </div>
      </header>

      {/* Modal detalle del día */}
      {selectedDay && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={closeDetail}
        >
          <div
            className="card max-w-md w-full mb-0 max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-xl font-bold">Detalle del día</h2>
                <p className="text-gray-600 text-sm first-letter:uppercase">
                  {formatDayLabel(selectedDay.dateKey)}
                </p>
              </div>
              <button
                type="button"
                className="text-gray-500 hover:text-gray-800 text-2xl leading-none"
                onClick={closeDetail}
                aria-label="Cerrar"
              >
                ×
              </button>
            </div>

            {detailLoading ? (
              <p className="text-gray-600 text-center py-6">Cargando detalle...</p>
            ) : (
              <div className="flex flex-col gap-5">
                {/* Producción */}
                <section>
                  <h3 className="text-lg font-bold mb-2">Producción</h3>
                  {detailProduction.length === 0 ? (
                    <p className="text-gray-500 text-sm">Sin registro de producción</p>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {detailProduction.map((prod) => (
                        <div
                          key={prod.id}
                          className="flex justify-between items-center border-b border-gray-100 pb-2 last:border-b-0"
                        >
                          <div>
                            <p className="font-semibold text-gray-900">{prod.variety}</p>
                            <p className="text-gray-600 text-sm">
                              {prod.quantity} x {money(COST_PER_PIECE)}
                            </p>
                          </div>
                          <p className="font-bold text-gray-900">
                            {money(prod.quantity * COST_PER_PIECE)}
                          </p>
                        </div>
                      ))}
                      <div className="flex justify-between items-center pt-2">
                        <span className="font-bold">Total producido</span>
                        <span className="text-xl font-bold text-green-600">
                          {detailProductionTotal}
                        </span>
                      </div>
                    </div>
                  )}
                </section>

                {/* Ventas */}
                <section>
                  <h3 className="text-lg font-bold mb-2">Ventas</h3>
                  {detailSales.length === 0 ? (
                    <p className="text-gray-500 text-sm">Sin ventas registradas</p>
                  ) : (
                    <div className="flex flex-col gap-3">
                      <div className="flex flex-col gap-1">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Piezas vendidas</span>
                          <span className="font-bold">{detailSoldItems}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Monto en efectivo</span>
                          <span className="font-bold">{money(detailCashAmount)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Monto en transferencia</span>
                          <span className="font-bold">{money(detailTransferAmount)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Monto total</span>
                          <span className="font-bold text-green-600">{money(detailSoldAmount)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Ventas registradas</span>
                          <span className="font-bold">{detailSales.length}</span>
                        </div>
                      </div>
                      {detailSales.map((sale, index) => (
                        <div key={sale.id} className="rounded-lg border border-gray-100 p-3">
                          <div className="flex justify-between items-center mb-2">
                            <p className="font-semibold text-gray-900">Venta #{index + 1}</p>
                            <span className="text-sm text-gray-500">
                              {format(parseISO(sale.createdAt), 'HH:mm')}
                            </span>
                          </div>
                          <div className="flex flex-col gap-1">
                            {sale.items.map((item) => (
                              <div key={item.id} className="flex justify-between text-sm">
                                <span className="text-gray-600">
                                  {item.product.name} <span className="text-gray-400">x{item.quantity}</span>
                                </span>
                                <span className="font-medium">
                                  {money(item.quantity * item.unitPrice)}
                                </span>
                              </div>
                            ))}
                          </div>
                          <div className="flex justify-between items-center mt-2 pt-2 border-t border-gray-100">
                            <span className="text-sm font-semibold text-gray-700">Total</span>
                            <span className="font-bold text-green-600">{money(saleTotal(sale))}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>

                {/* Corte */}
                <section>
                  <h3 className="text-lg font-bold mb-2">Corte</h3>
                  {!detailCashRegister ? (
                    <p className="text-gray-500 text-sm">Sin corte registrado</p>
                  ) : (
                    <div className="flex flex-col gap-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Monto total esperado</span>
                        <span className="font-bold">{money(detailExpected)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Monto reportado</span>
                        <span className="font-bold">
                          {detailReported !== null ? money(detailReported) : 'No registrado'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="text-gray-600 text-sm">Diferencia</p>
                          <p className={`text-sm font-bold ${resultClasses(detailResult)}`}>
                            {detailResult ?? 'No registrado'}
                          </p>
                        </div>
                        <span className={`text-xl font-bold ${resultClasses(detailResult)}`}>
                          {detailDifference !== null
                            ? `${detailDifference > 0 ? '+' : detailDifference < 0 ? '-' : ''}${money(
                                Math.abs(detailDifference)
                              )}`
                            : '—'}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500">
                        Corte registrado el{' '}
                        {format(parseISO(detailCashRegister.date), "d 'de' MMMM 'de' yyyy, HH:mm", {
                          locale: es
                        })}
                      </p>
                      {detailCashRegister.notes && (
                        <div>
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                            Notas
                          </p>
                          <p className="text-sm text-gray-700 whitespace-pre-wrap">
                            {detailCashRegister.notes}
                          </p>
                        </div>
                      )}
                      {selectedDay.cashRegister.productionChanged && (
                        <div className="rounded-lg bg-yellow-50 border border-yellow-200 p-3 text-xs text-yellow-800">
                          La producción actual del día no coincide con la registrada al momento del
                          corte.
                        </div>
                      )}
                    </div>
                  )}
                </section>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Filtros */}
      <form onSubmit={applyFilters} className="card">
        <h2 className="text-lg font-bold mb-3">Filtrar por fecha</h2>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <label className="block text-gray-600 mb-1 text-sm font-medium">Desde</label>
            <input
              type="date"
              className="input"
              value={from}
              max={to || undefined}
              onChange={(e) => setFrom(e.target.value)}
            />
          </div>
          <div className="flex-1">
            <label className="block text-gray-600 mb-1 text-sm font-medium">Hasta</label>
            <input
              type="date"
              className="input"
              value={to}
              min={from || undefined}
              onChange={(e) => setTo(e.target.value)}
            />
          </div>
        </div>
        <div className="flex gap-2 mt-4">
          <button type="button" className="btn btn-secondary flex-1" onClick={clearFilters}>
            Limpiar
          </button>
          <button type="submit" className="btn btn-primary flex-1">
            Filtrar
          </button>
        </div>
      </form>

      <p className="text-sm text-gray-500 mb-3">
        {total} {total === 1 ? 'día registrado' : 'días registrados'}
      </p>

      {/* Lista de días */}
      {days.length === 0 ? (
        <div className="card text-center">
          <p className="text-gray-600">No hay días registrados</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {days.map((day) => (
            <button
              key={day.dateKey}
              type="button"
              onClick={() => openDetail(day)}
              aria-haspopup="dialog"
              className="card mb-0 w-full text-left hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow"
            >
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-bold first-letter:uppercase">
                  {formatDayLabel(day.dateKey)}
                </h2>
                <span className="text-2xl text-gray-400" aria-hidden="true">
                  ›
                </span>
              </div>

              <div className="flex flex-col gap-3">
                {/* Producción */}
                <div className="rounded-lg bg-gray-50 p-3">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                    Producción
                  </p>
                  {!day.production.hasRecord ? (
                    <p className="text-sm text-gray-500">Sin registro</p>
                  ) : (
                    <>
                      <div className="flex justify-between">
                        <span className="text-gray-600 text-sm">Total producido</span>
                        <span className="font-bold">{day.production.total}</span>
                      </div>
                      <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1">
                        {day.production.byVariety.map((row) => (
                          <span key={row.variety} className="text-xs text-gray-600">
                            {row.variety}: <span className="font-medium">{row.quantity}</span>
                          </span>
                        ))}
                      </div>
                    </>
                  )}
                </div>

                {/* Ventas */}
                <div className="rounded-lg bg-gray-50 p-3">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                    Ventas
                  </p>
                  {!day.sales.hasRecord ? (
                    <p className="text-sm text-gray-500">Sin registro</p>
                  ) : (
                    <>
                      <div className="flex justify-between">
                        <span className="text-gray-600 text-sm">Piezas vendidas</span>
                        <span className="font-bold">{day.sales.items}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 text-sm">Efectivo</span>
                        <span className="font-bold">{money(day.sales.cashAmount)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 text-sm">Transferencia</span>
                        <span className="font-bold">{money(day.sales.transferAmount)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 text-sm">Monto vendido</span>
                        <span className="font-bold text-green-600">{money(day.sales.amount)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 text-sm">Ventas registradas</span>
                        <span className="font-bold">{day.sales.operations}</span>
                      </div>
                    </>
                  )}
                </div>

                {/* Corte */}
                <div className="rounded-lg bg-gray-50 p-3">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                    Corte
                  </p>
                  {!day.cashRegister.hasRecord ? (
                    <p className="text-sm text-gray-500">Sin corte registrado</p>
                  ) : (
                    <>
                      <div className="flex justify-between">
                        <span className="text-gray-600 text-sm">Monto total esperado</span>
                        <span className="font-bold">
                          {day.cashRegister.expectedAmount !== null
                            ? money(day.cashRegister.expectedAmount)
                            : '—'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 text-sm">Monto reportado</span>
                        <span className="font-bold">
                          {day.cashRegister.actualAmount !== null
                            ? money(day.cashRegister.actualAmount)
                            : 'No registrado'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600 text-sm">
                          Diferencia
                          {day.cashRegister.result && (
                            <span
                              className={`ml-1 font-bold ${resultClasses(day.cashRegister.result)}`}
                            >
                              · {day.cashRegister.result}
                            </span>
                          )}
                        </span>
                        <span
                          className={`font-bold ${resultClasses(day.cashRegister.result)}`}
                        >
                          {day.cashRegister.difference !== null
                            ? `${day.cashRegister.difference > 0 ? '+' : day.cashRegister.difference < 0 ? '-' : ''}${money(
                                Math.abs(day.cashRegister.difference)
                              )}`
                            : '—'}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {hasMore && (
        <button
          type="button"
          className="btn btn-primary w-full mt-4"
          onClick={() => loadPage(page + 1, false)}
          disabled={loadingMore}
        >
          {loadingMore ? 'Cargando...' : 'Cargar más días'}
        </button>
      )}
    </div>
  )
}