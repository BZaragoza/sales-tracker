'use client'

import { useEffect, useState } from 'react'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import toast from 'react-hot-toast'
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

interface CashRegister {
  id: string
  date: string
  totalProduction: number
  expectedAmount: number
  actualAmount: number | null
  notes: string | null
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
  depositAmount: number
  depositPaymentMethod: 'CASH' | 'TRANSFER' | null
  orderId: string | null
  items: SaleItem[]
}

const differenceLabelFor = (difference: number | null) =>
  difference === null
    ? 'Por capturar'
    : Math.abs(difference) < 0.005
      ? 'Cuadra'
      : difference < 0
        ? 'Faltante'
        : 'Sobrante'

const differenceToneFor = (difference: number | null) =>
  difference === null
    ? 'text-gray-600'
    : Math.abs(difference) < 0.005
      ? 'text-green-700'
      : difference < 0
        ? 'text-red-700'
        : 'text-amber-700'

export default function CortePage() {
  const [todayProduction, setTodayProduction] = useState<DailyProduction[]>([])
  const [cashRegister, setCashRegister] = useState<CashRegister | null>(null)
  const [sales, setSales] = useState<Sale[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [actualAmount, setActualAmount] = useState('')
  const [notes, setNotes] = useState('')
  const [showProductionDetail, setShowProductionDetail] = useState(false)

  const today = businessTodayKey()

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    if (!showProductionDetail) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setShowProductionDetail(false)
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [showProductionDetail])

  const loadData = async () => {
    try {
      const [productionRes, registerRes, salesRes] = await Promise.all([
        fetch(`/api/production?date=${today}`),
        fetch(`/api/cash-register?date=${today}`),
        fetch(`/api/sales?date=${today}`)
      ])

      if (!productionRes.ok || !registerRes.ok || !salesRes.ok) {
        throw new Error('No se pudo cargar el corte')
      }

      const [productionData, registerData, salesData] = await Promise.all([
        productionRes.json(),
        registerRes.json(),
        salesRes.json()
      ])

      setTodayProduction(Array.isArray(productionData) ? productionData : [])
      setSales(Array.isArray(salesData) ? salesData : [])

      if (registerData && registerData.id) {
        setCashRegister(registerData)
        setActualAmount(registerData.actualAmount?.toString() ?? '')
        setNotes(registerData.notes ?? '')
      } else {
        setCashRegister(null)
      }
    } catch (error) {
      console.error('Error loading data:', error)
      toast.error('No se pudieron cargar los datos del corte')
    } finally {
      setLoading(false)
    }
  }

  const totalProduction = todayProduction.reduce((sum, row) => sum + row.quantity, 0)
  const totalItemsSold = sales.reduce(
    (sum, sale) => sum + sale.items.reduce((itemSum, item) => itemSum + item.quantity, 0),
    0
  )
  const totalSoldAmount = sales.reduce(
    (sum, sale) =>
      sum + sale.items.reduce((itemSum, item) => itemSum + item.quantity * item.unitPrice, 0),
    0
  )

  const cashAmount = sales.reduce((sum, sale) => sum + saleBreakdown(sale).cash, 0)
  const transferAmount = sales.reduce((sum, sale) => sum + saleBreakdown(sale).transfer, 0)
  const totalExpected = cashAmount

  const draftActual = actualAmount.trim() === '' ? null : Number(actualAmount)
  const draftDifference =
    draftActual !== null && !Number.isNaN(draftActual) ? draftActual - totalExpected : null
  const draftLabel = differenceLabelFor(draftDifference)
  const draftTone = differenceToneFor(draftDifference)
  const notesRequired =
    draftDifference !== null && Math.abs(draftDifference) >= 0.005 && !notes.trim()

  const reportedAmount = cashRegister?.actualAmount ?? null
  const difference = reportedAmount !== null ? reportedAmount - totalExpected : null
  const differenceLabel = differenceLabelFor(difference)
  const differenceClasses = differenceToneFor(difference)
  const expectedMismatch = cashRegister
    ? Math.abs(cashRegister.expectedAmount - totalExpected) > 0.01
    : false

  const handleSaveCorte = async () => {
    if (saving) return

    const parsedActual = Number(actualAmount)
    if (actualAmount.trim() === '' || Number.isNaN(parsedActual) || parsedActual < 0) {
      toast.error('Ingresa un monto de caja válido')
      return
    }

    if (notesRequired) {
      toast.error('Explica la diferencia en las notas antes de guardar')
      return
    }

    setSaving(true)
    try {
      const url = cashRegister ? `/api/cash-register/${cashRegister.id}` : '/api/cash-register'
      const method = cashRegister ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actualAmount: parsedActual,
          notes: notes.trim() || null,
          date: today
        })
      })

      if (!response.ok) {
        const payload = await response.json().catch(() => null)
        throw new Error(payload?.error || 'Error al guardar el corte')
      }

      toast.success(cashRegister ? 'Corte actualizado' : 'Corte guardado')
      await loadData()
    } catch (error) {
      console.error('Error saving corte:', error)
      toast.error('No se guardó el corte. Inténtalo de nuevo.')
    } finally {
      setSaving(false)
    }
  }

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
        title="Corte de caja"
        description="Compara el efectivo esperado con lo que contaste y explica cualquier diferencia."
      />

      <section className="card" aria-labelledby="registrar-corte">
        <div className="section-heading">
          <div>
            <h2 id="registrar-corte" className="section-title">
              {cashRegister ? 'Actualizar corte' : 'Registrar corte'}
            </h2>
            <p className="section-note mt-1">
              Esperado = ventas y anticipos cobrados en efectivo hoy.
            </p>
          </div>
          {cashRegister ? (
            <span className="status-pill status-pill-success">Corte guardado</span>
          ) : (
            <span className="status-pill status-pill-warning">Sin cerrar</span>
          )}
        </div>

        <dl className="mt-5 rounded-lg bg-gray-50 p-4">
          <div className="flex items-center justify-between gap-4 py-1.5">
            <dt className="text-sm text-gray-600">Efectivo esperado</dt>
            <dd className="font-bold text-gray-900">{money(totalExpected)}</dd>
          </div>
          <div className="flex items-center justify-between gap-4 py-1.5">
            <dt className="text-sm text-gray-600">Monto reportado</dt>
            <dd className="font-bold text-gray-900">
              {draftActual !== null && !Number.isNaN(draftActual)
                ? money(draftActual)
                : 'Por capturar'}
            </dd>
          </div>
          <div className="mt-2 flex items-center justify-between gap-4 border-t border-gray-200 pt-3">
            <dt className="text-sm font-semibold text-gray-700">Diferencia</dt>
            <dd className={`text-xl font-bold ${draftTone}`}>
              {draftDifference !== null
                ? `${draftDifference > 0 ? '+' : draftDifference < 0 ? '-' : ''}${money(
                    Math.abs(draftDifference)
                  )}`
                : '—'}
              <span className="ml-2 text-xs font-semibold uppercase tracking-wide">{draftLabel}</span>
            </dd>
          </div>
        </dl>

        {expectedMismatch ? (
          <div className="mt-4 rounded-lg border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-800">
            El corte guardado usó un esperado de {money(cashRegister?.expectedAmount ?? 0)} (
            {cashRegister?.totalProduction ?? 0} piezas). Hoy hay {totalProduction} piezas y{' '}
            {money(totalExpected)} en efectivo.
          </div>
        ) : null}

        <div className="mt-5 flex flex-col gap-4">
          <div>
            <label htmlFor="monto-reportado" className="mb-2 block font-medium text-gray-600">
              Monto reportado (real) *
            </label>
            <input
              id="monto-reportado"
              type="number"
              step="0.01"
              inputMode="decimal"
              className="input"
              value={actualAmount}
              onChange={(event) => setActualAmount(event.target.value)}
              placeholder="0.00"
            />
          </div>
          <div>
            <label htmlFor="notas-corte" className="mb-2 block font-medium text-gray-600">
              Notas {notesRequired ? '*' : '(opcional)'}
            </label>
            <textarea
              id="notas-corte"
              className="input resize-y"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Observaciones sobre el corte…"
              rows={3}
            />
            {notesRequired ? (
              <p className="mt-1 text-sm font-medium text-amber-700">
                Hay una diferencia de {money(Math.abs(draftDifference ?? 0))}. Explica qué pasó antes de
                guardar.
              </p>
            ) : (
              <p className="mt-1 text-sm text-gray-600">
                Si el corte no cuadra, la nota es obligatoria.
              </p>
            )}
          </div>
          <button
            type="button"
            className="btn btn-success w-full"
            onClick={handleSaveCorte}
            disabled={!actualAmount || saving || notesRequired}
          >
            {saving ? 'Guardando…' : cashRegister ? 'Actualizar corte' : 'Guardar corte'}
          </button>
        </div>
      </section>

      {cashRegister ? (
        <section className="card" aria-labelledby="resultado-corte">
          <div className="section-heading">
            <div>
              <h2 id="resultado-corte" className="section-title">
                Resultado del corte
              </h2>
              <p className="section-note mt-1">
                {format(parseISO(cashRegister.date.slice(0, 10)), "d 'de' MMMM", { locale: es })}
              </p>
            </div>
            <span className="status-pill status-pill-neutral">Guardado</span>
          </div>

          <dl className="mt-4 divide-y divide-gray-100">
            <div className="flex items-center justify-between gap-4 py-3">
              <dt className="text-sm text-gray-600">Monto total esperado</dt>
              <dd className="font-bold text-gray-900">{money(cashRegister.expectedAmount)}</dd>
            </div>
            <div className="flex items-center justify-between gap-4 py-3">
              <dt className="text-sm text-gray-600">Monto reportado</dt>
              <dd className="font-bold text-gray-900">
                {reportedAmount !== null ? money(reportedAmount) : 'No registrado'}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-4 py-3">
              <dt className="text-sm font-semibold text-gray-700">Diferencia</dt>
              <dd className={`text-xl font-bold ${differenceClasses}`}>
                {difference !== null
                  ? `${difference > 0 ? '+' : difference < 0 ? '-' : ''}${money(
                      Math.abs(difference)
                    )}`
                  : '—'}
                <span className="ml-2 text-xs font-semibold uppercase tracking-wide">
                  {differenceLabel}
                </span>
              </dd>
            </div>
          </dl>

          {cashRegister.notes ? (
            <div className="mt-3 border-t border-gray-100 pt-3">
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-600">
                Notas del corte
              </p>
              <p className="whitespace-pre-wrap text-sm text-gray-700">{cashRegister.notes}</p>
            </div>
          ) : null}
        </section>
      ) : null}

      <section className="card" aria-labelledby="resumen-produccion">
        <div className="section-heading">
          <div>
            <h2 id="resumen-produccion" className="section-title">
              Resumen de producción
            </h2>
            <p className="section-note mt-1">Piezas registradas hoy, por variedad.</p>
          </div>
          <button
            type="button"
            className="btn btn-secondary btn-compact"
            onClick={() => setShowProductionDetail(true)}
            aria-haspopup="dialog"
            aria-expanded={showProductionDetail}
          >
            Ver detalle
          </button>
        </div>
        <div className="mt-4 flex items-center justify-between border-t border-gray-200 pt-4">
          <span className="text-sm text-gray-600">Total de piezas producidas</span>
          <span className="text-xl font-bold text-gray-900">{totalProduction}</span>
        </div>
      </section>

      <section className="card" aria-labelledby="resumen-ventas">
        <h2 id="resumen-ventas" className="section-title">
          Resumen de ventas
        </h2>
        {sales.length === 0 ? (
          <p className="mt-4 text-sm text-gray-600">No hay ventas registradas hoy.</p>
        ) : (
          <dl className="mt-4 flex flex-col gap-2">
            <div className="flex justify-between">
              <dt className="text-sm text-gray-600">Piezas vendidas</dt>
              <dd className="font-bold">{totalItemsSold}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-gray-600">Monto en efectivo</dt>
              <dd className="font-bold">{money(cashAmount)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-gray-600">Monto en transferencia</dt>
              <dd className="font-bold">{money(transferAmount)}</dd>
            </div>
            <div className="flex justify-between border-t border-gray-100 pt-2">
              <dt className="text-sm text-gray-600">Monto total vendido</dt>
              <dd className="font-bold text-green-700">{money(totalSoldAmount)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-gray-600">Ventas registradas</dt>
              <dd className="font-bold">{sales.length}</dd>
            </div>
          </dl>
        )}
      </section>

      {showProductionDetail ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setShowProductionDetail(false)}
        >
          <div
            className="card max-h-[85vh] w-full max-w-md overflow-y-auto"
            role="dialog"
            aria-modal="true"
            aria-labelledby="detalle-produccion-titulo"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id="detalle-produccion-titulo" className="text-xl font-bold text-gray-900">
                  Detalle de producción
                </h2>
                <p className="section-note mt-1">
                  {format(new Date(), "EEEE, d 'de' MMMM", { locale: es })}
                </p>
              </div>
              <button
                type="button"
                className="text-2xl leading-none text-gray-500 hover:text-gray-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                onClick={() => setShowProductionDetail(false)}
                aria-label="Cerrar"
              >
                ×
              </button>
            </div>

            {todayProduction.length === 0 ? (
              <p className="py-4 text-center text-gray-600">No hay producción registrada hoy.</p>
            ) : (
              <div className="mt-4 flex flex-col gap-2">
                {todayProduction.map((production) => (
                  <div
                    key={production.id}
                    className="flex items-center justify-between border-b border-gray-100 pb-2 last:border-b-0"
                  >
                    <p className="font-semibold text-gray-900">{production.variety}</p>
                    <p className="text-lg font-bold text-blue-600">{production.quantity}</p>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-4 flex items-center justify-between border-t-2 border-gray-200 pt-3">
              <span className="text-lg font-bold">Total producido</span>
              <span className="text-2xl font-bold text-gray-900">{totalProduction}</span>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
