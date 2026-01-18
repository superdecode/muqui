import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import Button from '../common/Button'
import Modal from '../common/Modal'
import Alert from '../common/Alert'
import LoadingSpinner from '../common/LoadingSpinner'
import { Package, CheckCircle, AlertCircle } from 'lucide-react'
import dataService from '../../services/dataService'

export default function ConteoExecute({ conteo, onClose, onSave, isLoading: isSaving = false }) {
  const [productosConteo, setProductosConteo] = useState([])
  const [error, setError] = useState('')

  // Cargar inventario de la ubicación del conteo
  const { data: inventario = [], isLoading } = useQuery({
    queryKey: ['inventario', conteo.ubicacion_id],
    queryFn: () => dataService.getInventario(conteo.ubicacion_id),
    enabled: !!conteo.ubicacion_id
  })

  // Inicializar productos cuando se carga el inventario
  useEffect(() => {
    if (inventario.length > 0) {
      const productosIniciales = inventario.map(item => ({
        producto_id: item.producto_id,
        nombre: item.producto,
        stock_sistema: item.stock_actual,
        stock_fisico: '',
        unidad_medida: item.unidad_medida
      }))
      setProductosConteo(productosIniciales)
    }
  }, [inventario])

  const handleStockChange = (index, value) => {
    const newProductos = [...productosConteo]
    newProductos[index].stock_fisico = value === '' ? '' : parseInt(value)
    setProductosConteo(newProductos)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    // Validar que todos los productos tengan stock físico
    const allFilled = productosConteo.every(p => p.stock_fisico !== '' && p.stock_fisico !== null)
    if (!allFilled) {
      setError('Por favor ingresa el stock físico de todos los productos antes de completar el conteo')
      return
    }

    // Validar que los valores sean números válidos
    const invalidValues = productosConteo.filter(p => isNaN(p.stock_fisico) || p.stock_fisico < 0)
    if (invalidValues.length > 0) {
      setError('Los valores de stock físico deben ser números positivos')
      return
    }

    // Preparar datos para enviar
    const datosConteo = {
      productos: productosConteo.map(p => ({
        producto_id: p.producto_id,
        cantidad_sistema: p.stock_sistema,
        cantidad_fisica: p.stock_fisico
      }))
    }

    try {
      await onSave(datosConteo)
    } catch (err) {
      setError('Error al completar el conteo. Por favor intenta nuevamente.')
    }
  }

  const getDiferencia = (producto) => {
    if (producto.stock_fisico === '' || producto.stock_fisico === null) return null
    return producto.stock_fisico - producto.stock_sistema
  }

  if (isLoading) {
    return (
      <Modal onClose={onClose}>
        <div className="max-w-4xl w-full p-12 bg-white rounded-2xl">
          <LoadingSpinner text="Cargando productos para conteo..." />
        </div>
      </Modal>
    )
  }

  if (productosConteo.length === 0) {
    return (
      <Modal onClose={onClose}>
        <div className="max-w-2xl w-full p-8 bg-white rounded-2xl">
          <div className="text-center">
            <Package size={64} className="mx-auto text-slate-300 mb-4" />
            <h3 className="text-xl font-semibold text-slate-900 mb-2">
              No hay productos en esta ubicación
            </h3>
            <p className="text-slate-600 mb-6">
              No se encontraron productos en el inventario de {conteo.ubicacion || 'esta ubicación'}.
            </p>
            <Button variant="outline" onClick={onClose}>
              Cerrar
            </Button>
          </div>
        </div>
      </Modal>
    )
  }

  return (
    <Modal onClose={onClose}>
      <div className="max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-light-blue p-6 rounded-t-2xl">
          <h2 className="text-2xl font-bold text-white">Ejecutar Conteo</h2>
          <p className="text-white/90">{conteo.ubicacion || conteo.ubicacion_id} - {conteo.tipo_conteo}</p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6 bg-white rounded-b-2xl">
          {/* Error Alert */}
          {error && (
            <Alert type="error" className="mb-4">
              <div className="flex items-center gap-2">
                <AlertCircle size={18} />
                {error}
              </div>
            </Alert>
          )}

          {/* Instrucciones */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="text-blue-600 flex-shrink-0 mt-0.5" size={20} />
              <div>
                <p className="font-semibold text-blue-900">Instrucciones</p>
                <p className="text-sm text-blue-700 mt-1">
                  Ingresa el stock físico contado para cada producto. El sistema calculará automáticamente las diferencias.
                </p>
              </div>
            </div>
          </div>

          {/* Lista de Productos */}
          <div className="space-y-4">
            <h3 className="font-semibold text-slate-900 flex items-center gap-2">
              <Package size={20} className="text-primary-600" />
              Productos a Contar ({productosConteo.length})
            </h3>

            <div className="max-h-96 overflow-y-auto space-y-3">
              {productosConteo.map((producto, index) => {
                const diferencia = getDiferencia(producto)
                return (
                  <div key={index} className="border border-slate-200 rounded-xl p-4">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                      {/* Nombre del producto */}
                      <div className="md:col-span-1">
                        <p className="font-medium text-slate-900">{producto.nombre}</p>
                        <p className="text-xs text-slate-500">{producto.unidad_medida}</p>
                      </div>

                      {/* Stock Sistema */}
                      <div className="text-center">
                        <p className="text-xs text-slate-600 mb-1">Stock Sistema</p>
                        <p className="text-lg font-bold text-slate-900">{producto.stock_sistema}</p>
                      </div>

                      {/* Stock Físico (Input) */}
                      <div>
                        <label className="text-xs text-slate-600 mb-1 block">Stock Físico</label>
                        <input
                          type="number"
                          min="0"
                          value={producto.stock_fisico}
                          onChange={(e) => handleStockChange(index, e.target.value)}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-center text-lg font-bold focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                          placeholder="0"
                          required
                        />
                      </div>

                      {/* Diferencia */}
                      <div className="text-center">
                        <p className="text-xs text-slate-600 mb-1">Diferencia</p>
                        {diferencia !== null ? (
                          <div className="flex items-center justify-center gap-2">
                            {diferencia === 0 ? (
                              <CheckCircle className="text-green-600" size={20} />
                            ) : (
                              <AlertCircle className="text-yellow-600" size={20} />
                            )}
                            <p className={`text-lg font-bold ${
                              diferencia === 0 ? 'text-green-600' :
                              diferencia > 0 ? 'text-blue-600' : 'text-red-600'
                            }`}>
                              {diferencia > 0 ? '+' : ''}{diferencia}
                            </p>
                          </div>
                        ) : (
                          <p className="text-slate-400">-</p>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Resumen */}
          <div className="bg-slate-50 rounded-xl p-4">
            <h4 className="font-semibold text-slate-900 mb-3">Resumen del Conteo</h4>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-sm text-slate-600">Total Productos</p>
                <p className="text-2xl font-bold text-slate-900">{productosConteo.length}</p>
              </div>
              <div>
                <p className="text-sm text-slate-600">Con Diferencias</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {productosConteo.filter(p => {
                    const diff = getDiferencia(p)
                    return diff !== null && diff !== 0
                  }).length}
                </p>
              </div>
              <div>
                <p className="text-sm text-slate-600">Coinciden</p>
                <p className="text-2xl font-bold text-green-600">
                  {productosConteo.filter(p => getDiferencia(p) === 0).length}
                </p>
              </div>
            </div>
          </div>

          {/* Botones */}
          <div className="flex justify-end gap-4 pt-4 border-t border-slate-200">
            <Button variant="outline" onClick={onClose} disabled={isSaving}>
              Cancelar
            </Button>
            <Button type="submit" variant="success" loading={isSaving}>
              <CheckCircle size={20} className="mr-2" />
              {isSaving ? 'Completando...' : 'Completar Conteo'}
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  )
}
