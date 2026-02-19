import { useState } from 'react'
import { Check, ChevronDown } from 'lucide-react'

export default function MultiSelectUbicaciones({ ubicaciones, selected, onChange }) {
  const [isOpen, setIsOpen] = useState(false)

  const toggleUbicacion = (ubicacionId) => {
    if (selected.includes(ubicacionId)) {
      onChange(selected.filter(id => id !== ubicacionId))
    } else {
      onChange([...selected, ubicacionId])
    }
  }

  const selectAll = () => {
    onChange(ubicaciones.map(u => u.id))
  }

  const clearAll = () => {
    onChange([])
  }

  const selectedNames = selected.length === 0 
    ? 'Seleccionar...'
    : selected.length === ubicaciones.length
    ? 'Todas las ubicaciones'
    : `${selected.length} seleccionada(s)`

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-2 text-left bg-white border border-slate-300 rounded-lg shadow-sm hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      >
        <div className="flex items-center justify-between">
          <span className={selected.length === 0 ? 'text-slate-400' : 'text-slate-900'}>
            {selectedNames}
          </span>
          <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute z-20 w-full mt-2 bg-white border border-slate-200 rounded-lg shadow-lg max-h-80 overflow-y-auto">
            <div className="sticky top-0 bg-slate-50 border-b border-slate-200 px-3 py-2 flex gap-2">
              <button
                type="button"
                onClick={selectAll}
                className="flex-1 px-3 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded"
              >
                Seleccionar todas
              </button>
              <button
                type="button"
                onClick={clearAll}
                className="flex-1 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded"
              >
                Limpiar
              </button>
            </div>
            
            <div className="py-1">
              {ubicaciones.map(ubicacion => (
                <label
                  key={ubicacion.id}
                  className="flex items-center px-4 py-2.5 hover:bg-slate-50 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selected.includes(ubicacion.id)}
                    onChange={() => toggleUbicacion(ubicacion.id)}
                    className="sr-only"
                  />
                  <div className={`w-5 h-5 mr-3 border-2 rounded flex items-center justify-center ${
                    selected.includes(ubicacion.id)
                      ? 'bg-blue-600 border-blue-600'
                      : 'border-slate-300'
                  }`}>
                    {selected.includes(ubicacion.id) && (
                      <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />
                    )}
                  </div>
                  <span className="text-sm text-slate-700">{ubicacion.nombre}</span>
                </label>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
