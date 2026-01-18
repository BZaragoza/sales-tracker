'use client'

import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import Link from 'next/link'
import toast from 'react-hot-toast'

const VARIETIES = ['Rojo', 'Rajas', 'Verde', 'Prensado', 'Frijoles', 'Dulce']

interface DailyProduction {
  id: string
  variety: string
  quantity: number
  date: string
}

export default function Home() {
  const [productions, setProductions] = useState<DailyProduction[]>([])
  const [loading, setLoading] = useState(true)
  const [editingVariety, setEditingVariety] = useState<string | null>(null)
  const [editValue, setEditValue] = useState<string>('')
  const [incrementValues, setIncrementValues] = useState<Record<string, string>>({})

  const today = format(new Date(), 'yyyy-MM-dd')

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const response = await fetch(`/api/production?date=${today}`)
      const data = await response.json()
      setProductions(data)
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  const getQuantityForVariety = (variety: string): number => {
    const production = productions.find(p => p.variety === variety)
    return production?.quantity || 0
  }

  const handleIncrement = async (variety: string, increment: number) => {
    if (increment === 0) return

    // Actualización optimista
    const currentQuantity = getQuantityForVariety(variety)
    const newQuantity = currentQuantity + increment
    
    setProductions(prev => {
      const existing = prev.find(p => p.variety === variety)
      if (existing) {
        return prev.map(p => 
          p.variety === variety 
            ? { ...p, quantity: newQuantity }
            : p
        )
      } else {
        return [...prev, {
          id: `temp-${variety}`,
          variety,
          quantity: newQuantity,
          date: today
        }]
      }
    })

    // Limpiar input
    setIncrementValues(prev => ({ ...prev, [variety]: '' }))

    try {
      const response = await fetch('/api/production/increment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          variety,
          increment,
          date: today
        })
      })

      if (response.ok) {
        const updated = await response.json()
        // Actualizar con los datos reales del servidor
        setProductions(prev => {
          const filtered = prev.filter(p => p.variety !== variety || !p.id.startsWith('temp-'))
          return [...filtered, updated]
        })
      } else {
        // Revertir en caso de error
        loadData()
      }
    } catch (error) {
      console.error('Error incrementing:', error)
      // Revertir en caso de error
      loadData()
    }
  }

  const handleSetTotal = async (variety: string) => {
    const quantity = parseInt(editValue)
    if (isNaN(quantity) || quantity < 0) {
      toast.error('Por favor ingresa un número válido')
      return
    }

    // Actualización optimista
    setProductions(prev => {
      const existing = prev.find(p => p.variety === variety)
      if (existing) {
        return prev.map(p => 
          p.variety === variety 
            ? { ...p, quantity }
            : p
        )
      } else {
        return [...prev, {
          id: `temp-${variety}`,
          variety,
          quantity,
          date: today
        }]
      }
    })

    setEditingVariety(null)
    setEditValue('')

    try {
      const response = await fetch('/api/production', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          variety,
          quantity,
          date: today
        })
      })

      if (response.ok) {
        const updated = await response.json()
        // Actualizar con los datos reales del servidor
        setProductions(prev => {
          const filtered = prev.filter(p => p.variety !== variety || !p.id.startsWith('temp-'))
          return [...filtered, updated]
        })
      } else {
        // Revertir en caso de error
        loadData()
      }
    } catch (error) {
      console.error('Error setting total:', error)
      // Revertir en caso de error
      loadData()
    }
  }

  const startEdit = (variety: string) => {
    setEditingVariety(variety)
    setEditValue(getQuantityForVariety(variety).toString())
  }

  const cancelEdit = () => {
    setEditingVariety(null)
    setEditValue('')
  }

  const handleIncrementInputChange = (variety: string, value: string) => {
    setIncrementValues(prev => ({ ...prev, [variety]: value }))
  }

  const handleIncrementSubmit = (variety: string, e?: React.FormEvent) => {
    if (e) {
      e.preventDefault()
    }
    const value = incrementValues[variety] || ''
    const increment = parseInt(value)
    if (!isNaN(increment) && increment > 0) {
      handleIncrement(variety, increment)
    }
  }

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
        <h1 className="text-2xl md:text-3xl font-bold mb-2">Registro de Producción</h1>
        <p className="text-gray-600 mb-4">
          {format(new Date(), "EEEE, d 'de' MMMM", { locale: es })}
        </p>
        <div className="flex justify-center gap-4">
          <Link href="/venta" className="btn btn-primary text-sm py-2 px-4">
            Ir a Ventas →
          </Link>
          <Link href="/corte" className="btn btn-secondary text-sm py-2 px-4">
            Corte
          </Link>
        </div>
      </header>

      {/* Modal para editar cantidad total */}
      {editingVariety && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={cancelEdit}
        >
          <div 
            className="card max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-bold mb-4">Editar {editingVariety}</h2>
            <form onSubmit={(e) => {
              e.preventDefault()
              handleSetTotal(editingVariety)
            }}>
              <div className="mb-4">
                <label className="block text-gray-600 mb-2 font-medium">
                  Cantidad total:
                </label>
                <input
                  type="number"
                  min="0"
                  className="input"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  placeholder="0"
                  autoFocus
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="btn btn-secondary flex-1"
                  onClick={cancelEdit}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn btn-primary flex-1"
                >
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Lista de variedades */}
      <div className="card overflow-hidden p-0">
        <table className="w-full">
          <colgroup>
            <col className="w-auto" />
            <col className="w-20" />
            <col className="w-14" />
            <col className="w-28" />
          </colgroup>
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-3 py-3 text-left text-xs md:text-sm font-semibold text-gray-700">Variedad</th>
              <th className="px-2 py-3 text-center text-xs md:text-sm font-semibold text-gray-700">Cantidad</th>
              <th className="px-1 py-3 text-center text-xs md:text-sm font-semibold text-gray-700">Editar</th>
              <th className="px-2 py-3 text-center text-xs md:text-sm font-semibold text-gray-700">Agregar</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {VARIETIES.map((variety) => {
              const currentQuantity = getQuantityForVariety(variety)
              const incrementValue = incrementValues[variety] || ''

              return (
                <tr key={variety} className="hover:bg-gray-50 transition-colors">
                  <td className="px-3 py-3">
                    <span className="font-semibold text-gray-900 text-sm md:text-base whitespace-nowrap">{variety}</span>
                  </td>
                  <td className="px-2 py-3 text-center">
                    <span className="text-lg md:text-xl font-bold text-blue-600">{currentQuantity}</span>
                  </td>
                  <td className="px-1 py-3 text-center">
                    <button
                      type="button"
                      className="btn btn-secondary p-1.5 min-w-0 text-base"
                      onClick={() => startEdit(variety)}
                      title="Editar cantidad total"
                    >
                      ✏️
                    </button>
                  </td>
                  <td className="px-2 py-3">
                    <form 
                      onSubmit={(e) => handleIncrementSubmit(variety, e)}
                      className="flex gap-1 items-center"
                    >
                      <input
                        type="number"
                        min="1"
                        className="input text-sm py-1.5 px-2 w-14"
                        value={incrementValue}
                        onChange={(e) => handleIncrementInputChange(variety, e.target.value)}
                        placeholder="0"
                      />
                      <button
                        type="submit"
                        className="btn btn-success px-2.5 py-1.5 text-sm min-w-0 flex-shrink-0"
                        disabled={!incrementValue || isNaN(parseInt(incrementValue)) || parseInt(incrementValue) <= 0}
                      >
                        +
                      </button>
                    </form>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Resumen */}
      <div className="card mt-6">
        <h2 className="text-xl font-bold mb-4">Resumen del Día</h2>
        <div className="flex justify-between items-center">
          <span className="text-gray-600">Total producido:</span>
          <span className="text-2xl font-bold text-green-600">
            {productions.reduce((sum, p) => sum + p.quantity, 0)}
          </span>
        </div>
      </div>
    </div>
  )
}
