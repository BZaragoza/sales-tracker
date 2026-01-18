'use client'

import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import Link from 'next/link'
import toast from 'react-hot-toast'

const VARIETIES = ['Rojo', 'Rajas', 'Verde', 'Prensado', 'Frijoles', 'Dulce']

interface Product {
  id: string
  name: string
  price: number
  category: string | null
}

interface DailySale {
  id: string
  productId: string
  quantity: number
  date: string
  product: Product
}

export default function VentaPage() {
  const [sales, setSales] = useState<DailySale[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [incrementValues, setIncrementValues] = useState<Record<string, string>>({})
  const [addingState, setAddingState] = useState<Record<string, boolean>>({})

  const today = format(new Date(), 'yyyy-MM-dd')

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const [salesRes, productsRes] = await Promise.all([
        fetch(`/api/sales?date=${today}`),
        fetch('/api/products')
      ])

      const salesData = await salesRes.json()
      const productsData = await productsRes.json()

      console.log(salesData)
      console.log(productsData)

      console.log(salesData)
      setSales(salesData)
      setProducts(productsData)
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  const getProductForVariety = (variety: string): Product | undefined => {
    return products.find(p => p.name.toLowerCase() === variety.toLowerCase())
  }

  const getQuantityForVariety = (variety: string): number => {
    const product = getProductForVariety(variety)
    if (!product) return 0
    
    return sales
      .filter(s => s.productId === product.id)
      .reduce((sum, s) => sum + s.quantity, 0)
  }

  const handleIncrementInputChange = (variety: string, value: string) => {
    setIncrementValues(prev => ({ ...prev, [variety]: value }))
  }

  const handleAddSale = async (variety: string, e?: React.FormEvent) => {
    if (e) e.preventDefault()
    
    const value = incrementValues[variety] || ''
    const quantity = parseInt(value)
    
    if (isNaN(quantity) || quantity <= 0) return

const product = getProductForVariety(variety)
    if (!product) {
      toast.error(`No se encontró el producto para la variedad: ${variety}`)
      return
    }

    setAddingState(prev => ({ ...prev, [variety]: true }))

    try {
      const response = await fetch('/api/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: product.id,
          quantity
        })
      })

if (response.ok) {
        const newSale = await response.json()
        setSales(prev => [newSale, ...prev])
        setIncrementValues(prev => ({ ...prev, [variety]: '' }))
        toast.success('Venta registrada exitosamente')
      } else {
        toast.error('Error al registrar la venta')
      }
    } catch (error) {
      console.error('Error adding sale:', error)
      toast.error('Error al registrar la venta')
    } finally {
      setAddingState(prev => ({ ...prev, [variety]: false }))
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

  const totalSales = sales?.reduce((sum, s) => sum + s.quantity, 0)
  const totalAmount = sales?.reduce((sum, s) => sum + (s.quantity * s.product.price), 0)

  return (
    <div className="w-full max-w-full mx-auto px-4 py-4 md:max-w-2xl md:px-6">
      <header className="text-center mb-6">
        <h1 className="text-2xl md:text-3xl font-bold mb-2">Registro de Ventas</h1>
        <p className="text-gray-600 mb-4">
          {format(new Date(), "EEEE, d 'de' MMMM", { locale: es })}
        </p>
        <div className="flex justify-center gap-4">
            <Link href="/" className="btn btn-secondary text-sm py-2 px-4">
            ← Producción
            </Link>
            <Link href="/corte" className="btn btn-secondary text-sm py-2 px-4">
            Corte →
            </Link>
        </div>
      </header>

      {/* Lista de variedades */}
      <div className="card overflow-hidden p-0">
        <table className="w-full">
          <colgroup>
            <col className="w-auto" />
            <col className="w-20" />
            <col className="w-28" />
          </colgroup>
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-3 py-3 text-left text-xs md:text-sm font-semibold text-gray-700">Variedad</th>
              <th className="px-2 py-3 text-center text-xs md:text-sm font-semibold text-gray-700">Vendidos</th>
              <th className="px-2 py-3 text-center text-xs md:text-sm font-semibold text-gray-700">Agregar</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {VARIETIES.map((variety) => {
              const currentQuantity = getQuantityForVariety(variety)
              const incrementValue = incrementValues[variety] || ''
              const isAdding = addingState[variety]
              const product = getProductForVariety(variety)

              return (
                <tr key={variety} className="hover:bg-gray-50 transition-colors">
                  <td className="px-3 py-3">
                    <span className="font-semibold text-gray-900 text-sm md:text-base whitespace-nowrap">{variety}</span>
                    {!product && <span className="text-xs text-red-500 block">Producto no encontrado</span>}
                  </td>
                  <td className="px-2 py-3 text-center">
                    <span className="text-lg md:text-xl font-bold text-blue-600">{currentQuantity}</span>
                  </td>
                  <td className="px-2 py-3">
                    <form 
                      onSubmit={(e) => handleAddSale(variety, e)}
                      className="flex gap-1 items-center justify-center"
                    >
                      <input
                        type="number"
                        min="1"
                        className="input text-sm py-1.5 px-2 w-16"
                        value={incrementValue}
                        onChange={(e) => handleIncrementInputChange(variety, e.target.value)}
                        placeholder="0"
                        disabled={!product || isAdding}
                      />
                      <button
                        type="submit"
                        className="btn btn-success px-2.5 py-1.5 text-sm min-w-0 flex-shrink-0"
                        disabled={!incrementValue || isNaN(parseInt(incrementValue)) || parseInt(incrementValue) <= 0 || !product || isAdding}
                      >
                        {isAdding ? '...' : '+'}
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
        <h2 className="text-xl font-bold mb-4">Resumen de Ventas</h2>
        <div className="flex flex-col gap-2">
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Total vendidos:</span>
            <span className="text-2xl font-bold text-blue-600">
              {totalSales}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Monto total:</span>
            <span className="text-2xl font-bold text-green-600">
              ${totalAmount.toFixed(2)}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
