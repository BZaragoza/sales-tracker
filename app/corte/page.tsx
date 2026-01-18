'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import toast from 'react-hot-toast'

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

export default function CortePage() {
  const COST_PER_PIECE = 22
  const [todayProduction, setTodayProduction] = useState<DailyProduction[]>([])
  const [cashRegister, setCashRegister] = useState<CashRegister | null>(null)
  const [loading, setLoading] = useState(true)
  const [actualAmount, setActualAmount] = useState<string>('')
  const [notes, setNotes] = useState<string>('')

  const today = format(new Date(), 'yyyy-MM-dd')

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
const [productionRes, registerRes] = await Promise.all([
        fetch(`/api/production?date=${today}`),
        fetch(`/api/cash-register?date=${today}`)
      ])
      
      const productionData = await productionRes.json()
      const registerData = await registerRes.json()
      
      setTodayProduction(productionData)
      if (registerData) {
        setCashRegister(registerData)
        setActualAmount(registerData.actualAmount?.toString() || '')
        setNotes(registerData.notes || '')
      }
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

const handleSaveCorte = async () => {
    const totalProduction = todayProduction.reduce((sum, prod) => sum + prod.quantity, 0)
    const expectedAmount = totalProduction * COST_PER_PIECE

    const actual = parseFloat(actualAmount) || 0

    try {
      const url = cashRegister 
        ? `/api/cash-register/${cashRegister.id}`
        : '/api/cash-register'
      
      const method = cashRegister ? 'PUT' : 'POST'
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          totalProduction,
          expectedAmount,
          actualAmount: actual,
          notes: notes || null,
          date: today
        })
      })

if (response.ok) {
        const message = cashRegister 
          ? 'Corte actualizado exitosamente'
          : 'Corte guardado exitosamente'
        
        toast.success(message)
        loadData()
      }
    } catch (error) {
      console.error('Error saving corte:', error)
      toast.error('Error al guardar el corte')
    }
  }

const totalProduction = todayProduction.reduce((sum, prod) => sum + prod.quantity, 0)
  const totalExpected = totalProduction * COST_PER_PIECE

  const difference = cashRegister?.actualAmount 
    ? cashRegister.actualAmount - totalExpected
    : null

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
        <Link href="/" className="btn btn-secondary">
          ← Volver
        </Link>
      </header>

{/* Resumen de producción */}
      <div className="card mb-4">
        <h2 className="text-xl font-bold mb-4">Resumen de Producción</h2>
        <div className="flex flex-col gap-2">
          <div className="flex justify-between">
            <span className="text-gray-600">Total de items producidos:</span>
            <span className="font-bold">
              {totalProduction}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Costo por pieza:</span>
            <span className="font-bold">${COST_PER_PIECE.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Monto esperado:</span>
            <span className="font-bold text-lg">${totalExpected.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Alerta si los montos esperados no coinciden */}
      {cashRegister && Math.abs(cashRegister.expectedAmount - totalExpected) > 0.01 && (
        <div className="card mb-4 bg-yellow-50 border-yellow-200">
          <h2 className="text-xl font-bold mb-4 text-yellow-800">⚠️ Actualización Requerida</h2>
          <div className="flex flex-col gap-2">
            <p className="text-yellow-700 text-sm">
              La producción ha sido actualizada desde el último corte guardado. 
              Los montos esperados no coinciden.
            </p>
            <div className="flex flex-col gap-1 bg-white p-3 rounded border border-yellow-300">
              <div className="flex justify-between">
                <span className="text-gray-600">Monto esperado actual:</span>
                <span className="font-bold text-green-600">${totalExpected.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Monto esperado guardado:</span>
                <span className="font-bold text-yellow-600">${cashRegister.expectedAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold">
                <span className="text-gray-600">Diferencia:</span>
                <span className={`${(totalExpected - cashRegister.expectedAmount) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  ${(totalExpected - cashRegister.expectedAmount).toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Corte guardado previamente */}
      {cashRegister && (
        <div className="card mb-4 bg-blue-50 border-blue-200">
          <h2 className="text-xl font-bold mb-4">Corte Guardado</h2>
          <div className="flex flex-col gap-2">
            <div className="flex justify-between">
              <span className="text-gray-600">Producción registrada:</span>
              <span className="font-bold">{cashRegister.totalProduction}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Monto esperado guardado:</span>
              <span className={`font-bold ${Math.abs(cashRegister.expectedAmount - totalExpected) > 0.01 ? 'text-yellow-600' : ''}`}>
                ${cashRegister.expectedAmount.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Monto real:</span>
              <span className="font-bold">
                {cashRegister.actualAmount ? `$${cashRegister.actualAmount.toFixed(2)}` : 'No registrado'}
              </span>
            </div>
            {cashRegister.notes && (
              <div className="flex flex-col gap-1">
                <span className="text-gray-600">Notas:</span>
                <p className="text-sm text-gray-700">{cashRegister.notes}</p>
              </div>
            )}
          </div>
        </div>
      )}

{/* Detalle por producción */}
      <div className="card mb-4">
        <h2 className="text-xl font-bold mb-4">Detalle por Producción</h2>
        {todayProduction.length === 0 ? (
          <p className="text-gray-600 text-center py-4">
            No hay producción registrada hoy
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {todayProduction.map((prod) => (
              <div
                key={prod.id}
                className="flex justify-between items-center p-3 border-b border-gray-200 last:border-b-0"
              >
                <div className="flex-1">
                  <p className="font-bold text-gray-900">{prod.variety}</p>
                  <p className="text-gray-600 text-sm">
                    {prod.quantity} x ${COST_PER_PIECE.toFixed(2)}
                  </p>
                </div>
                <p className="font-bold text-gray-900">
                  ${(prod.quantity * COST_PER_PIECE).toFixed(2)}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Formulario de corte */}
      <div className="card mb-4">
        <h2 className="text-xl font-bold mb-4">Registrar Corte</h2>
        <div className="flex flex-col gap-4">
          <div>
            <label className="block text-gray-600 mb-2 font-medium">
              Monto en caja (real) *
            </label>
            <input
              type="number"
              step="0.01"
              className="input"
              value={actualAmount}
              onChange={(e) => setActualAmount(e.target.value)}
              placeholder="0.00"
            />
          </div>
          <div>
            <label className="block text-gray-600 mb-2 font-medium">
              Notas (opcional)
            </label>
            <textarea
              className="input resize-y"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Observaciones sobre el corte..."
              rows={3}
            />
          </div>
          {difference !== null && (
            <div className={`p-3 rounded-lg ${difference >= 0 ? 'bg-green-100' : 'bg-red-100'}`}>
              <div className="flex justify-between">
                <span className="font-bold">Diferencia:</span>
                <span className={`font-bold ${difference >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                  {difference >= 0 ? '+' : ''}${difference.toFixed(2)}
                </span>
              </div>
            </div>
          )}
          <button
            className="btn btn-success w-full"
            onClick={handleSaveCorte}
            disabled={!actualAmount}
          >
            Guardar Corte
          </button>
        </div>
      </div>
    </div>
  )
}

