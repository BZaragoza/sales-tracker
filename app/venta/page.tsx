'use client'

import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { COST_PER_PIECE, VARIETIES } from '@/lib/constants'

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
  items: SaleItem[]
}

const saleItemCount = (sale: Sale) => sale.items.reduce((sum, item) => sum + item.quantity, 0)
const saleTotal = (sale: Sale) => sale.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0)

export default function VentaPage() {
  const [sales, setSales] = useState<Sale[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [ticket, setTicket] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null)

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

      setSales(Array.isArray(salesData) ? salesData : [])
      setProducts(Array.isArray(productsData) ? productsData : [])
    } catch (error) {
      console.error('Error loading data:', error)
      toast.error('Error al cargar los datos')
    } finally {
      setLoading(false)
    }
  }

  const priceFor = (variety: string): number => {
    const product = products.find(p => p.name.toLowerCase() === variety.toLowerCase())
    return product?.price ?? COST_PER_PIECE
  }

  const ticketItems = VARIETIES.filter(variety => (ticket[variety] ?? 0) > 0).map(variety => ({
    variety,
    quantity: ticket[variety],
    unitPrice: priceFor(variety)
  }))

  const ticketCount = ticketItems.reduce((sum, item) => sum + item.quantity, 0)
  const ticketTotal = ticketItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0)

  const addToTicket = (variety: string) => {
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

  const registerSale = async () => {
    if (ticketCount === 0 || saving) return

    setSaving(true)
    try {
      const response = await fetch('/api/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: today,
          items: ticketItems.map(item => ({ variety: item.variety, quantity: item.quantity }))
        })
      })

      if (!response.ok) {
        const data = await response.json().catch(() => null)
        const detail = data?.code ? ` (${data.code})` : ''
        toast.error(`${data?.error || 'Error al registrar la venta'}${detail}`)
        return
      }

      const newSale: Sale = await response.json()
      if (!newSale?.id || !Array.isArray(newSale.items)) {
        toast.error('Respuesta inesperada del servidor')
        return
      }

      setSales(prev => [...prev, newSale])
      setTicket({})
      toast.success('Venta registrada exitosamente')
    } catch (error) {
      console.error('Error registering sale:', error)
      toast.error('Error al registrar la venta')
    } finally {
      setSaving(false)
    }
  }

  const totalSold = sales.reduce((sum, sale) => sum + saleItemCount(sale), 0)
  const totalAmount = sales.reduce((sum, sale) => sum + saleTotal(sale), 0)
  const selectedSaleNumber = selectedSale ? sales.indexOf(selectedSale) + 1 : 0

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

      {/* Modal detalle de venta */}
      {selectedSale && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedSale(null)}
        >
          <div
            className="card max-w-md w-full mb-0 max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-xl font-bold">Venta #{selectedSaleNumber}</h2>
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
                <div key={item.id} className="flex justify-between items-center border-b border-gray-100 pb-2">
                  <div>
                    <p className="font-semibold text-gray-900">{item.product.name}</p>
                    <p className="text-gray-600 text-sm">
                      {item.quantity} x ${item.unitPrice.toFixed(2)}
                    </p>
                  </div>
                  <p className="font-bold text-gray-900">
                    ${(item.quantity * item.unitPrice).toFixed(2)}
                  </p>
                </div>
              ))}
            </div>

            <div className="flex justify-between items-center mt-4 pt-3 border-t-2 border-gray-200">
              <span className="text-lg font-bold">Total</span>
              <span className="text-2xl font-bold text-green-600">${saleTotal(selectedSale).toFixed(2)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Armado de la venta */}
      <div className="card overflow-hidden p-0">
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
              return (
                <tr key={variety} className="hover:bg-gray-50 transition-colors">
                  <td className="px-3 py-3">
                    <span className="font-semibold text-gray-900 text-sm md:text-base whitespace-nowrap">{variety}</span>
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
      <div className="card mt-4">
        {ticketCount === 0 ? (
          <p className="text-gray-600 text-center">Agrega variedades para armar la venta</p>
        ) : (
          <>
            <div className="flex flex-col gap-2 mb-4">
              {ticketItems.map(item => (
                <div key={item.variety} className="flex justify-between text-sm">
                  <span className="text-gray-600">
                    {item.variety} <span className="text-gray-400">x{item.quantity}</span>
                  </span>
                  <span className="font-medium">${(item.quantity * item.unitPrice).toFixed(2)}</span>
                </div>
              ))}
            </div>
            <div className="flex justify-between items-center border-t border-gray-200 pt-3 mb-4">
              <span className="text-lg font-bold">Total a cobrar</span>
              <span className="text-2xl font-bold text-green-600">${ticketTotal.toFixed(2)}</span>
            </div>
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
                onClick={registerSale}
                disabled={saving}
              >
                {saving ? 'Registrando...' : 'Registrar venta'}
              </button>
            </div>
          </>
        )}
      </div>

      {/* Resumen del día */}
      <div className="card mt-6">
        <h2 className="text-xl font-bold mb-4">Resumen de Ventas</h2>
        <div className="flex flex-col gap-2">
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Total vendidos:</span>
            <span className="text-2xl font-bold text-blue-600">{totalSold}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Monto total:</span>
            <span className="text-2xl font-bold text-green-600">${totalAmount.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Lista de ventas del día */}
      <div className="card mt-4">
        <h2 className="text-xl font-bold mb-4">Ventas del día</h2>
        {sales.length === 0 ? (
          <p className="text-gray-600 text-center py-4">No hay ventas registradas hoy</p>
        ) : (
          <div className="flex flex-col">
            {sales.map((sale, index) => (
              <button
                key={sale.id}
                type="button"
                onClick={() => setSelectedSale(sale)}
                className="flex justify-between items-center py-3 border-b border-gray-100 last:border-b-0 text-left hover:bg-gray-50 transition-colors"
              >
                <div>
                  <p className="font-semibold text-gray-900">Venta #{index + 1}</p>
                  <p className="text-gray-600 text-sm">
                    {format(new Date(sale.createdAt), 'HH:mm')} · {saleItemCount(sale)} artículo{saleItemCount(sale) === 1 ? '' : 's'}
                  </p>
                </div>
                <span className="font-bold text-green-600">${saleTotal(sale).toFixed(2)}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}