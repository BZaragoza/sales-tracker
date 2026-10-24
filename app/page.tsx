'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { VARIETIES } from '@/lib/constants'
import { businessTodayKey } from '@/lib/date'
import { money } from '@/lib/money'
import { saleBreakdown } from '@/lib/saleMath'
import { PageHeader } from '@/app/components/PageHeader'

interface DailyProduction {
  id: string
  variety: string
  quantity: number
  date: string
}

interface SaleItem {
  id: string
  quantity: number
  unitPrice: number
}

interface Sale {
  id: string
  createdAt: string
  paymentMethod: 'CASH' | 'TRANSFER'
  depositAmount: number
  depositPaymentMethod: 'CASH' | 'TRANSFER' | null
  items: SaleItem[]
}

interface PendingOrder {
  id: string
  items: { quantity: number }[]
}

interface CashRegister {
  id: string
  expectedAmount: number
  actualAmount: number | null
  notes: string | null
}

interface VarietyAvailability {
  variety: string
  produced: number
  sold: number
  reserved: number
  remaining: number
}

interface DaySnapshot {
  productions: DailyProduction[]
  sales: Sale[]
  availability: VarietyAvailability[]
  pendingOrders: PendingOrder[]
  cashRegister: CashRegister | null
}

export default function Home() {
  const [data, setData] = useState<DaySnapshot | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  const [editingVariety, setEditingVariety] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [savingVariety, setSavingVariety] = useState<string | null>(null)
  const [incrementValues, setIncrementValues] = useState<Record<string, string>>({})

  const today = businessTodayKey()
  const loadingRef = useRef(false)
  const dataRef = useRef<DaySnapshot | null>(null)

  const loadData = useCallback(async () => {
    if (loadingRef.current) return
    loadingRef.current = true
    if (dataRef.current) setRefreshing(true)

    const controller = new AbortController()
    const timeout = window.setTimeout(() => controller.abort(), 12000)

    try {
      const [productionRes, salesRes, availabilityRes, ordersRes, registerRes] =
        await Promise.all([
          fetch(`/api/production?date=${today}`, { signal: controller.signal }),
          fetch(`/api/sales?date=${today}`, { signal: controller.signal }),
          fetch(`/api/availability?date=${today}`, { signal: controller.signal }),
          fetch(`/api/orders?date=${today}&status=PENDING`, { signal: controller.signal }),
          fetch(`/api/cash-register?date=${today}`, { signal: controller.signal })
        ])

      if (!productionRes.ok || !salesRes.ok || !availabilityRes.ok || !ordersRes.ok || !registerRes.ok) {
        throw new Error('No se pudo cargar el día')
      }

      const [productions, sales, availabilityData, pendingOrders, cashRegister] =
        await Promise.all([
          productionRes.json(),
          salesRes.json(),
          availabilityRes.json(),
          ordersRes.json(),
          registerRes.json()
        ])

      if (
        !Array.isArray(productions) ||
        !Array.isArray(sales) ||
        !Array.isArray(availabilityData?.items) ||
        !Array.isArray(pendingOrders)
      ) {
        throw new Error('Respuesta inesperada del servidor')
      }

      const snapshot: DaySnapshot = {
        productions,
        sales,
        availability: availabilityData.items,
        pendingOrders,
        cashRegister: cashRegister?.id ? cashRegister : null
      }

      dataRef.current = snapshot
      setData(snapshot)
      setError(null)
    } catch (loadError) {
      console.error('Error loading data:', loadError)
      setError('No pudimos cargar el estado del día. Revisa la conexión e inténtalo de nuevo.')
    } finally {
      window.clearTimeout(timeout)
      loadingRef.current = false
      setRefreshing(false)
      setLoading(false)
    }
  }, [today])

  useEffect(() => {
    loadData()
    const interval = setInterval(loadData, 7000)
    return () => clearInterval(interval)
  }, [loadData])

  const cancelEdit = useCallback(() => {
    setEditingVariety(null)
    setEditValue('')
  }, [])

  useEffect(() => {
    if (!editingVariety) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !savingVariety) cancelEdit()
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [editingVariety, savingVariety, cancelEdit])

  const productions = data?.productions ?? []
  const sales = data?.sales ?? []
  const availability = data?.availability ?? []
  const pendingOrders = data?.pendingOrders ?? []
  const cashRegister = data?.cashRegister ?? null

  const productionFor = (variety: string) =>
    productions.find((production) => production.variety === variety)

  const availabilityFor = (variety: string) =>
    availability.find((entry) => entry.variety === variety)

  const totalProduced = productions.reduce((sum, production) => sum + production.quantity, 0)
  const totalSold = sales.reduce(
    (sum, sale) => sum + sale.items.reduce((itemSum, item) => itemSum + item.quantity, 0),
    0
  )
  const totalRemaining = availability.reduce((sum, entry) => sum + entry.remaining, 0)
  const pendingPieces = pendingOrders.reduce(
    (sum, order) => sum + order.items.reduce((itemSum, item) => itemSum + item.quantity, 0),
    0
  )
  const cashCollected = sales.reduce((sum, sale) => sum + saleBreakdown(sale).cash, 0)
  const transferCollected = sales.reduce((sum, sale) => sum + saleBreakdown(sale).transfer, 0)
  const reportedAmount = cashRegister?.actualAmount ?? null
  const difference = reportedAmount !== null ? reportedAmount - cashCollected : null

  const closeLabel = !cashRegister
    ? 'Sin cerrar'
    : reportedAmount === null
      ? 'Sin reportar'
      : Math.abs(difference ?? 0) < 0.005
        ? 'Cuadra'
        : (difference ?? 0) < 0
          ? 'Faltante'
          : 'Sobrante'

  const closeTone = !cashRegister
    ? 'text-amber-700'
    : Math.abs(difference ?? 0) < 0.005
      ? 'text-green-700'
      : (difference ?? 0) < 0
        ? 'text-red-700'
        : 'text-amber-700'

  let nextAction = { label: 'Registrar producción', href: '#produccion' }
  if (totalProduced > 0 && pendingOrders.length > 0) {
    nextAction = {
      label: `Surtir ${pendingOrders.length} ${pendingOrders.length === 1 ? 'pedido' : 'pedidos'}`,
      href: '/pedidos'
    }
  } else if (totalProduced > 0 && totalSold === 0) {
    nextAction = { label: 'Registrar primera venta', href: '/venta' }
  } else if (totalProduced > 0 && !cashRegister) {
    nextAction = { label: 'Cerrar caja', href: '/corte' }
  } else if (cashRegister) {
    nextAction = { label: 'Ver corte', href: '/corte' }
  }

  const handleIncrement = async (variety: string) => {
    const value = incrementValues[variety] ?? ''
    const increment = Number.parseInt(value, 10)
    if (Number.isNaN(increment) || increment <= 0) return

    setSavingVariety(variety)
    try {
      const response = await fetch('/api/production/increment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ variety, increment, date: today })
      })

      if (!response.ok) {
        const payload = await response.json().catch(() => null)
        throw new Error(payload?.error || 'No se pudo agregar la producción')
      }

      const updated: DailyProduction = await response.json()
      setData((previous) =>
        previous
          ? {
              ...previous,
              productions: [
                ...previous.productions.filter((row) => row.variety !== variety),
                updated
              ]
            }
          : previous
      )
      dataRef.current = dataRef.current
        ? {
            ...dataRef.current,
            productions: [
              ...dataRef.current.productions.filter((row) => row.variety !== variety),
              updated
            ]
          }
        : dataRef.current
      setIncrementValues((previous) => ({ ...previous, [variety]: '' }))
      toast.success(`${variety}: +${increment} piezas`)
      await loadData()
    } catch (incrementError) {
      console.error('Error incrementing:', incrementError)
      toast.error(`No se guardó el cambio de ${variety}. Inténtalo de nuevo.`)
    } finally {
      setSavingVariety(null)
    }
  }

  const handleSetTotal = async (variety: string) => {
    const quantity = Number.parseInt(editValue, 10)
    if (Number.isNaN(quantity) || quantity < 0) {
      toast.error('Ingresa una cantidad válida')
      return
    }

    const availabilityRow = availabilityFor(variety)
    const minimum = (availabilityRow?.sold ?? 0) + (availabilityRow?.reserved ?? 0)
    if (quantity < minimum) {
      toast.error(`No puede ser menor a ${minimum}: ya hay piezas vendidas o apartadas.`)
      return
    }

    setSavingVariety(variety)
    try {
      const response = await fetch('/api/production', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ variety, quantity, date: today })
      })

      if (!response.ok) {
        const payload = await response.json().catch(() => null)
        throw new Error(payload?.error || 'No se pudo guardar el total')
      }

      const updated: DailyProduction = await response.json()
      setData((previous) =>
        previous
          ? {
              ...previous,
              productions: [
                ...previous.productions.filter((row) => row.variety !== variety),
                updated
              ]
            }
          : previous
      )
      dataRef.current = dataRef.current
        ? {
            ...dataRef.current,
            productions: [
              ...dataRef.current.productions.filter((row) => row.variety !== variety),
              updated
            ]
          }
        : dataRef.current
      setEditingVariety(null)
      setEditValue('')
      toast.success(`${variety}: total fijado en ${quantity}`)
      await loadData()
    } catch (totalError) {
      console.error('Error setting total:', totalError)
      toast.error(`No se guardó el total de ${variety}. El modal sigue abierto.`)
    } finally {
      setSavingVariety(null)
    }
  }

  if (loading && !data) {
    return (
      <div className="page-stack" aria-busy="true" aria-label="Cargando el día">
        <div className="card animate-pulse">
          <div className="h-3 w-20 rounded bg-gray-200" />
          <div className="mt-3 h-8 w-48 rounded bg-gray-200" />
          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="border-t border-gray-200 pt-3">
                <div className="h-2.5 w-16 rounded bg-gray-200" />
                <div className="mt-2 h-6 w-12 rounded bg-gray-200" />
              </div>
            ))}
          </div>
        </div>
        <div className="card animate-pulse">
          <div className="h-6 w-40 rounded bg-gray-200" />
          <div className="mt-5 space-y-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="h-12 rounded bg-gray-100" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="page-stack">
        <PageHeader
          title="Estado del día"
          description="Producción, ventas y cierre en un solo lugar."
        />
        <div className="state-note state-error" role="alert">
          <p>{error ?? 'No pudimos cargar el estado del día.'}</p>
          <button type="button" className="btn btn-primary btn-compact mt-3" onClick={loadData}>
            Reintentar
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="page-stack">
      <PageHeader
        title="Hoy"
        description="Producción, ventas y cierre del mostrador."
      />

      {error ? (
        <div className="state-note state-error flex flex-wrap items-center justify-between gap-3" role="alert">
          <span>Los datos no se pudieron actualizar. Se muestra la última lectura disponible.</span>
          <button type="button" className="btn btn-secondary btn-compact" onClick={loadData}>
            Reintentar
          </button>
        </div>
      ) : null}

      <section className="day-overview" aria-labelledby="resumen-dia">
        <div className="day-overview-head">
          <div>
            <h2 id="resumen-dia" className="text-xl font-bold text-gray-900">
              Estado del día
            </h2>
            <p className="section-note mt-1">
              {refreshing ? 'Actualizando…' : 'Lo que llevas del turno y lo que sigue.'}
            </p>
          </div>
          <Link href={nextAction.href} className="btn btn-primary">
            {nextAction.label}
          </Link>
        </div>

        <dl className="day-metrics">
          <div className="day-metric">
            <dt className="day-metric-label">Producido</dt>
            <dd className="day-metric-value">{totalProduced}</dd>
            <dd className="day-metric-note">piezas registradas</dd>
          </div>
          <div className="day-metric">
            <dt className="day-metric-label">Vendido</dt>
            <dd className="day-metric-value">{totalSold}</dd>
            <dd className="day-metric-note">piezas en {sales.length} ventas</dd>
          </div>
          <div className="day-metric">
            <dt className="day-metric-label">Por surtir</dt>
            <dd className="day-metric-value">{pendingPieces}</dd>
            <dd className="day-metric-note">
              {pendingOrders.length} {pendingOrders.length === 1 ? 'pedido pendiente' : 'pedidos pendientes'}
            </dd>
          </div>
          <div className="day-metric">
            <dt className="day-metric-label">Disponible</dt>
            <dd className="day-metric-value">{totalRemaining}</dd>
            <dd className="day-metric-note">piezas aún sin vender</dd>
          </div>
          <div className="day-metric">
            <dt className="day-metric-label">Efectivo</dt>
            <dd className="day-metric-value">{money(cashCollected)}</dd>
            <dd className="day-metric-note">transferencias {money(transferCollected)}</dd>
          </div>
          <div className="day-metric">
            <dt className="day-metric-label">Cierre</dt>
            <dd className={`day-metric-value ${closeTone}`}>{closeLabel}</dd>
            <dd className="day-metric-note">
              {reportedAmount !== null ? `Reportado ${money(reportedAmount)}` : `Esperado ${money(cashCollected)}`}
            </dd>
          </div>
        </dl>
      </section>

      <section id="produccion" className="card" aria-labelledby="produccion-titulo">
        <div className="section-heading mb-4">
          <div>
            <h2 id="produccion-titulo" className="section-title">
              Producción de hoy
            </h2>
            <p className="section-note mt-1">Toca la cantidad para fijar el total o agrega piezas.</p>
          </div>
          <span className="status-pill status-pill-neutral">{totalProduced} piezas</span>
        </div>

        <ul className="production-list">
          {VARIETIES.map((variety) => {
            const production = productionFor(variety)
            const quantity = production?.quantity ?? 0
            const row = availabilityFor(variety)
            const sold = row?.sold ?? 0
            const produced = row?.produced ?? 0
            const remaining = row?.remaining ?? 0
            const notProduced = produced === 0
            const soldOut = remaining <= 0
            const availabilityLabel = notProduced
              ? 'Sin producción'
              : soldOut
                ? 'Agotado'
                : `Disponibles ${remaining}`
            const availabilityTone = notProduced
              ? 'text-gray-600'
              : soldOut
                ? 'text-red-700'
                : 'text-green-700'
            const incrementValue = incrementValues[variety] ?? ''
            const saving = savingVariety === variety
            const inputId = `agregar-${variety.toLowerCase()}`

            return (
              <li key={variety} className="production-row">
                <div className="min-w-0">
                  <p className="production-name">{variety}</p>
                  <p className="production-meta">
                    Vendidas {sold} ·{' '}
                    <span className={`font-semibold ${availabilityTone}`}>{availabilityLabel}</span>
                  </p>
                </div>

                <button
                  type="button"
                  className="quantity-button"
                  onClick={() => {
                    setEditingVariety(variety)
                    setEditValue(String(quantity))
                  }}
                  aria-label={`Fijar el total de ${variety}. Ahora hay ${quantity} piezas.`}
                >
                  {quantity}
                </button>

                <form
                  className="production-add"
                  onSubmit={(event) => {
                    event.preventDefault()
                    handleIncrement(variety)
                  }}
                >
                  <label htmlFor={inputId} className="sr-only">
                    Piezas a agregar de {variety}
                  </label>
                  <input
                    id={inputId}
                    type="number"
                    min="1"
                    inputMode="numeric"
                    className="input input-compact"
                    value={incrementValue}
                    onChange={(event) =>
                      setIncrementValues((previous) => ({
                        ...previous,
                        [variety]: event.target.value
                      }))
                    }
                    placeholder="0"
                    disabled={saving}
                  />
                  <button
                    type="submit"
                    className="btn btn-success btn-compact flex-1 sm:flex-none"
                    disabled={saving || !incrementValue || Number.parseInt(incrementValue, 10) <= 0}
                  >
                    {saving ? 'Guardando…' : '+ Agregar'}
                  </button>
                </form>
              </li>
            )
          })}
        </ul>

        <div className="mt-5 flex items-center justify-between border-t border-gray-200 pt-4">
          <span className="text-sm font-semibold text-gray-600">Total producido</span>
          <span className="text-xl font-bold text-blue-600">{totalProduced}</span>
        </div>
      </section>

      {editingVariety ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => {
            if (!savingVariety) cancelEdit()
          }}
        >
          <div
            className="card w-full max-w-md"
            role="dialog"
            aria-modal="true"
            aria-labelledby="editar-total-titulo"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id="editar-total-titulo" className="text-xl font-bold text-gray-900">
                  Fijar total de {editingVariety}
                </h2>
                <p className="section-note mt-1">
                  El total no puede ser menor a las piezas ya vendidas o apartadas.
                </p>
              </div>
              <button
                type="button"
                className="text-2xl leading-none text-gray-500 hover:text-gray-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                onClick={cancelEdit}
                aria-label="Cerrar"
                disabled={Boolean(savingVariety)}
              >
                ×
              </button>
            </div>

            <form
              className="mt-5"
              onSubmit={(event) => {
                event.preventDefault()
                handleSetTotal(editingVariety)
              }}
            >
              <label htmlFor="total-produccion" className="mb-2 block text-sm font-semibold text-gray-600">
                Cantidad total
              </label>
              <input
                id="total-produccion"
                type="number"
                min="0"
                inputMode="numeric"
                className="input"
                value={editValue}
                onChange={(event) => setEditValue(event.target.value)}
                placeholder="0"
                autoFocus
                disabled={Boolean(savingVariety)}
              />
              <div className="mt-5 flex gap-2">
                <button
                  type="button"
                  className="btn btn-secondary flex-1"
                  onClick={cancelEdit}
                  disabled={Boolean(savingVariety)}
                >
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary flex-1" disabled={Boolean(savingVariety)}>
                  {savingVariety ? 'Guardando…' : 'Guardar total'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  )
}
