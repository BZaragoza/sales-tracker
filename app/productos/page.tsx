'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface Product {
  id: string
  name: string
  price: number
  category: string | null
}

export default function ProductosPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    price: '',
    category: ''
  })

  useEffect(() => {
    loadProducts()
  }, [])

  const loadProducts = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/products')
      const data = await response.json()
      setProducts(data)
    } catch (error) {
      console.error('Error loading products:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name || !formData.price) {
      alert('Por favor completa todos los campos requeridos')
      return
    }

    try {
      const url = editingProduct 
        ? `/api/products/${editingProduct.id}`
        : '/api/products'
      
      const method = editingProduct ? 'PUT' : 'POST'
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          price: parseFloat(formData.price),
          category: formData.category || null
        })
      })

      if (response.ok) {
        setShowForm(false)
        setEditingProduct(null)
        setFormData({ name: '', price: '', category: '' })
        loadProducts()
      }
    } catch (error) {
      console.error('Error saving product:', error)
    }
  }

  const handleEdit = (product: Product) => {
    setEditingProduct(product)
    setFormData({
      name: product.name,
      price: product.price.toString(),
      category: product.category || ''
    })
    setShowForm(true)
  }

  const handleDelete = async (productId: string) => {
    if (!confirm('¿Eliminar este producto?')) return

    try {
      const response = await fetch(`/api/products/${productId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        loadProducts()
      }
    } catch (error) {
      console.error('Error deleting product:', error)
    }
  }

  const handleCancel = () => {
    setShowForm(false)
    setEditingProduct(null)
    setFormData({ name: '', price: '', category: '' })
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
        <h1 className="text-2xl md:text-3xl font-bold mb-4">Productos</h1>
        <Link href="/" className="btn btn-secondary">
          ← Volver
        </Link>
      </header>

      {!showForm ? (
        <>
          <div className="card mb-4">
            <button
              className="btn btn-primary w-full"
              onClick={() => setShowForm(true)}
            >
              + Agregar Producto
            </button>
          </div>

          <div className="card">
            <h2 className="text-xl font-bold mb-4">Lista de Productos</h2>
            {products.length === 0 ? (
              <p className="text-gray-600 text-center py-4">
                No hay productos registrados
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                {products.map((product) => (
                  <div
                    key={product.id}
                    className="flex justify-between items-center p-3 border-b border-gray-200 last:border-b-0"
                  >
                    <div className="flex-1">
                      <p className="font-bold text-gray-900">{product.name}</p>
                      <p className="text-gray-600 text-sm">
                        ${product.price.toFixed(2)}
                        {product.category && ` • ${product.category}`}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        className="btn btn-secondary px-3 py-2 text-sm"
                        onClick={() => handleEdit(product)}
                      >
                        Editar
                      </button>
                      <button
                        className="btn btn-danger px-3 py-2 text-sm"
                        onClick={() => handleDelete(product.id)}
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="card">
          <h2 className="text-xl font-bold mb-4">
            {editingProduct ? 'Editar Producto' : 'Nuevo Producto'}
          </h2>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="block text-gray-600 mb-2 font-medium">
                Nombre del Producto *
              </label>
              <input
                type="text"
                className="input"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                placeholder="Ej: Pizza Margarita"
              />
            </div>
            <div>
              <label className="block text-gray-600 mb-2 font-medium">
                Precio *
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                className="input"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                required
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="block text-gray-600 mb-2 font-medium">
                Categoría (opcional)
              </label>
              <input
                type="text"
                className="input"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                placeholder="Ej: Pizzas, Bebidas, etc."
              />
            </div>
            <div className="flex gap-2 mt-2">
              <button
                type="button"
                className="btn btn-secondary flex-1"
                onClick={handleCancel}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="btn btn-primary flex-1"
              >
                {editingProduct ? 'Guardar' : 'Crear'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}

