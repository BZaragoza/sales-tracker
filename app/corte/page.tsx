'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import toast from 'react-hot-toast'
import { COST_PER_PIECE } from '@/lib/constants'
import { businessTodayKey } from '@/lib/date'

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
  items: SaleItem[]
}

const money = (value: number) => `$${value.toFixed(2)}`

const saleTotal = (sale: Sale) =>
  sale.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0)

export default function CortePage() {
  const [todayProduction, setTodayProduction] = useState<DailyProduction[]>([])
  const [cashRegister, setCashRegister] = useState<CashRegister | null>(null)
  const [sales, setSales] = useState<Sale[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [actualAmount, setActualAmount] = useState<string>('')
  const [notes, setNotes] = useState<string>('')
  const [showProductionDetail, setShowProductionDetail] = useState(false)

  const today = businessTodayKey()

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const [productionRes, registerRes, salesRes] = await Promise.all([
        fetch(`/api/production?date=${today}`),
        fetch(`/api/cash-register?date=${today}`),
        fetch(`/api/sales?date=${today}`)
      ])

      const productionData = await productionRes.json()
      const registerData = await registerRes.json()
      const salesData = await salesRes.json()

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
      toast.error('Error al cargar los datos del corte')
    } finally {
      setLoading(false)
    }
  }

  const handleSaveCorte = async () => {
    if (saving) return

    const parsedActual = parseFloat(actualAmount)
    if (Number.isNaN(parsedActual) || parsedActual < 0) {
      toast.error('Ingresa un monto de caja válido')
      return
    }

    const totalProduction = todayProduction.reduce((sum, prod) => sum + prod.quantity, 0)
    const expectedAmount = totalProduction * COST_PER_PIECE

    setSaving(true)
    try {
      const url = cashRegister ? `/api/cash-register/${cashRegister.id}` : '/api/cash-register'
      const method = cashRegister ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          totalProduction,
          expectedAmount,
          actualAmount: parsedActual,
          notes: notes || null,
          date: today
        })
      })

      if (!response.ok) {
        toast.error('Error al guardar el corte')
        return
      }

      toast.success(cashRegister ? 'Corte actualizado exitosamente' : 'Corte guardado exitosamente')
      await loadData()
    } catch (error) {
      console.error('Error saving corte:', error)
      toast.error('Error al guardar el corte')
    } finally {
      setSaving(false)
    }
  }

  const totalProduction = todayProduction.reduce((sum, prod) => sum + prod.quantity, 0)
  const totalExpected = totalProduction * COST_PER_PIECE
  const totalItemsSold = sales.reduce(
    (sum, sale) => sum + sale.items.reduce((itemSum, item) => itemSum + item.quantity, 0),
    0
  )
  const totalSoldAmount = sales.reduce(
    (sum, sale) =>
      sum + sale.items.reduce((itemSum, item) => itemSum + item.quantity * item.unitPrice, 0),
    0
  )

  const cashAmount = sales
    .filter((sale) => sale.paymentMethod === 'CASH')
    .reduce((sum, sale) => sum + saleTotal(sale), 0)
  const transferAmount = sales
    .filter((sale) => sale.paymentMethod === 'TRANSFER')
    .reduce((sum, sale) => sum + saleTotal(sale), 0)

  const reportedAmount = cashRegister?.actualAmount ?? null
  const difference = reportedAmount !== null ? reportedAmount - totalExpected : null
  const differenceLabel =
    difference === null
      ? 'Sin registrar'
      : Math.abs(difference) < 0.005
        ? 'Cuadra'
        : difference < 0
          ? 'Faltante'
          : 'Sobrante'
  const differenceClasses =
    difference === null
      ? 'text-gray-500'
      : Math.abs(difference) < 0.005
        ? 'text-green-700'
        : difference < 0
          ? 'text-red-700'
          : 'text-amber-700'
  const expectedMismatch = cashRegister
    ? Math.abs(cashRegister.expectedAmount - totalExpected) > 0.01
    : false

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
        <h1 className="text-2xl md:text-3xl font-bold mb-2">Corte de Caja</h1>
        <p className="text-gray-600 mb-4">
          {format(new Date(), "EEEE, d 'de' MMMM", { locale: es })}
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link href="/" className="btn btn-secondary text-sm py-2 px-4">
            ← Volver
          </Link>
          <Link href="/historial" className="btn btn-secondary text-sm py-2 px-4">
            Historial
          </Link>
        </div>
      </header>

      {/* Modal detalle de producción */}
      {showProductionDetail && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowProductionDetail(false)}
        >
          <div
            className="card max-w-md w-full mb-0 max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-xl font-bold">Detalle de Producción</h2>
                <p className="text-gray-600 text-sm">
                  {format(new Date(), "EEEE, d 'de' MMMM", { locale: es })}
                </p>
              </div>
              <button
                type="button"
                className="text-gray-500 hover:text-gray-800 text-2xl leading-none"
                onClick={() => setShowProductionDetail(false)}
                aria-label="Cerrar"
              >
                ×
              </button>
            </div>

            {todayProduction.length === 0 ? (
              <p className="text-gray-600 text-center py-4">
                No hay producción registrada hoy
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                {todayProduction.map((prod) => (
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
              </div>
            )}

            <div className="flex justify-between items-center mt-4 pt-3 border-t-2 border-gray-200">
              <span className="text-lg font-bold">Total producido</span>
              <span className="text-2xl font-bold text-green-600">{totalProduction}</span>
            </div>
            <p className="text-xs text-gray-500 text-right mt-1">
              Monto esperado: {money(totalExpected)}
            </p>
          </div>
        </div>
      )}

      {/* Resumen de producción (abre el detalle) */}
      <button
        type="button"
        onClick={() => setShowProductionDetail(true)}
        aria-haspopup="dialog"
        aria-expanded={showProductionDetail}
        className="card w-full text-left hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow"
      >
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-xl font-bold">Resumen de Producción</h2>
            <p className="text-gray-500 text-sm">Toca para ver el detalle por variedad</p>
          </div>
          <span className="text-2xl text-gray-400" aria-hidden="true">
            ›
          </span>
        </div>
        <div className="flex flex-col gap-2">
          <div className="flex justify-between">
            <span className="text-gray-600">Total de items producidos:</span>
            <span className="font-bold">{totalProduction}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Costo por pieza:</span>
            <span className="font-bold">{money(COST_PER_PIECE)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Monto esperado:</span>
            <span className="font-bold text-lg">{money(totalExpected)}</span>
          </div>
        </div>
      </button>

      {/* Resumen de ventas */}
      <div className="card">
        <h2 className="text-xl font-bold mb-4">Resumen de Ventas</h2>
        {sales.length === 0 ? (
          <p className="text-gray-600 text-center py-4">No hay ventas registradas hoy</p>
        ) : (
          <div className="flex flex-col gap-2">
            <div className="flex justify-between">
              <span className="text-gray-600">Piezas vendidas:</span>
              <span className="font-bold">{totalItemsSold}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Monto en efectivo:</span>
              <span className="font-bold">{money(cashAmount)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Monto en transferencia:</span>
              <span className="font-bold">{money(transferAmount)}</span>
            </div>
            <div className="flex justify-between border-t border-gray-100 pt-2">
              <span className="text-gray-600">Monto total vendido:</span>
              <span className="font-bold text-green-600">{money(totalSoldAmount)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Ventas registradas:</span>
              <span className="font-bold">{sales.length}</span>
            </div>
          </div>
        )}
      </div>

      {/* Resultado del corte */}
      {cashRegister && (
        <div className="card">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="text-xl font-bold">Resultado del Corte</h2>
              <p className="text-gray-500 text-sm">
                {format(parseISO(cashRegister.date.slice(0, 10)), "d 'de' MMMM", { locale: es })}
              </p>
            </div>
            <span className="text-xs font-semibold text-gray-500 bg-gray-100 rounded-full px-3 py-1">
              Corte guardado
            </span>
          </div>

          <div className="flex flex-col divide-y divide-gray-100">
            <div className="flex justify-between items-center py-3">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Monto total esperado
                </p>
                <p className="text-xs text-gray-400">
                  {totalProduction} piezas × {money(COST_PER_PIECE)}
                </p>
              </div>
              <span className="text-xl font-bold text-gray-900">{money(totalExpected)}</span>
            </div>

            <div className="flex justify-between items-center py-3">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Monto reportado
                </p>
                <p className="text-xs text-gray-400">Monto registrado en el corte</p>
              </div>
              <span className="text-xl font-bold text-gray-900">
                {reportedAmount !== null ? money(reportedAmount) : 'No registrado'}
              </span>
            </div>

            <div className="flex justify-between items-center py-4">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Diferencia
                </p>
                <p className={`text-sm font-bold ${differenceClasses}`}>{differenceLabel}</p>
              </div>
              <span className={`text-2xl font-bold ${differenceClasses}`}>
                {difference !== null
                  ? `${difference > 0 ? '+' : difference < 0 ? '-' : ''}${money(Math.abs(difference))}`
                  : '—'}
              </span>
            </div>
          </div>

          {expectedMismatch && (
            <div className="mt-4 rounded-lg bg-yellow-50 border border-yellow-200 p-3 text-sm text-yellow-800">
              El corte guardado usó un monto esperado de {money(cashRegister.expectedAmount)} (
              {cashRegister.totalProduction} piezas). La producción actual es de {totalProduction}{' '}
              piezas ({money(totalExpected)}).
            </div>
          )}

          {cashRegister.notes && (
            <div className="mt-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                Notas del corte
              </p>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{cashRegister.notes}</p>
            </div>
          )}
        </div>
      )}

      {/* Registrar / actualizar corte */}
      <div className="card">
        <h2 className="text-xl font-bold mb-4">
          {cashRegister ? 'Actualizar Corte' : 'Registrar Corte'}
        </h2>
        <div className="flex flex-col gap-4">
          <div>
            <label className="block text-gray-600 mb-2 font-medium">Monto reportado (real) *</label>
            <input
              type="number"
              step="0.01"
              inputMode="decimal"
              className="input"
              value={actualAmount}
              onChange={(e) => setActualAmount(e.target.value)}
              placeholder="0.00"
            />
            <p className="text-xs text-gray-500 mt-1">Monto total esperado: {money(totalExpected)}</p>
          </div>
          <div>
            <label className="block text-gray-600 mb-2 font-medium">Notas (opcional)</label>
            <textarea
              className="input resize-y"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Observaciones sobre el corte..."
              rows={3}
            />
          </div>
          <button
            className="btn btn-success w-full"
            onClick={handleSaveCorte}
            disabled={!actualAmount || saving}
          >
            {saving ? 'Guardando...' : cashRegister ? 'Actualizar Corte' : 'Guardar Corte'}
          </button>
        </div>
      </div>
    </div>
  )
}