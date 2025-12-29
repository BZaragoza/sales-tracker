'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

interface DailySale {
  id: string
  product: {
    id: string
    name: string
    price: number
    category: string | null
  }
  quantity: number
  date: string
}

interface CashRegister {
  id: string
  date: string
  expectedAmount: number
  actualAmount: number | null
  notes: string | null
}

export default function CortePage() {
  const [todaySales, setTodaySales] = useState<DailySale[]>([])
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
      const [salesRes, registerRes] = await Promise.all([
        fetch(`/api/sales?date=${today}`),
        fetch(`/api/cash-register?date=${today}`)
      ])
      
      const salesData = await salesRes.json()
      const registerData = await registerRes.json()
      
      setTodaySales(salesData)
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
    const expectedAmount = todaySales.reduce((sum, sale) => {
      return sum + (sale.product.price * sale.quantity)
    }, 0)

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
          expectedAmount,
          actualAmount: actual,
          notes: notes || null
        })
      })

      if (response.ok) {
        alert('Corte guardado exitosamente')
        loadData()
      }
    } catch (error) {
      console.error('Error saving corte:', error)
      alert('Error al guardar el corte')
    }
  }

  const totalExpected = todaySales.reduce((sum, sale) => {
    return sum + (sale.product.price * sale.quantity)
  }, 0)

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

      {/* Resumen de ventas */}
      <div className="card mb-4">
        <h2 className="text-xl font-bold mb-4">Resumen de Ventas</h2>
        <div className="flex flex-col gap-2">
          <div className="flex justify-between">
            <span className="text-gray-600">Total de items vendidos:</span>
            <span className="font-bold">
              {todaySales.reduce((sum, sale) => sum + sale.quantity, 0)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Monto esperado:</span>
            <span className="font-bold text-lg">${totalExpected.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Detalle por producto */}
      <div className="card mb-4">
        <h2 className="text-xl font-bold mb-4">Detalle por Producto</h2>
        {todaySales.length === 0 ? (
          <p className="text-gray-600 text-center py-4">
            No hay ventas registradas hoy
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {todaySales.map((sale) => (
              <div
                key={sale.id}
                className="flex justify-between items-center p-3 border-b border-gray-200 last:border-b-0"
              >
                <div className="flex-1">
                  <p className="font-bold text-gray-900">{sale.product.name}</p>
                  <p className="text-gray-600 text-sm">
                    {sale.quantity} x ${sale.product.price.toFixed(2)}
                  </p>
                </div>
                <p className="font-bold text-gray-900">
                  ${(sale.product.price * sale.quantity).toFixed(2)}
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

