import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import LoadingSpinner from './LoadingSpinner'
import { Building2, MapPin, User, Shield, Calendar, X } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import dataService from '../../services/dataService'
import { getUserAllowedUbicacionIds, getUserAllowedEmpresaIds } from '../../utils/userFilters'

export default function UserProfileModal({ user, isOpen, onClose }) {
  // Cargar empresas desde la base de datos
  const { data: empresas = [], isLoading: isLoadingEmpresas } = useQuery({
    queryKey: ['empresas'],
    queryFn: () => dataService.getEmpresas(),
    enabled: isOpen
  })

  // Cargar ubicaciones desde la base de datos
  const { data: ubicaciones = [], isLoading: isLoadingUbicaciones } = useQuery({
    queryKey: ['ubicaciones'],
    queryFn: () => dataService.getUbicaciones(),
    enabled: isOpen
  })

  // Obtener empresas asignadas usando utilidad con memoización
  const empresasAsignadas = useMemo(() => {
    if (!empresas || empresas.length === 0) return []
    if (user?.rol === 'ADMIN_GLOBAL') return empresas
    const empresaIds = getUserAllowedEmpresaIds(user)
    return empresas.filter(empresa => empresaIds.includes(empresa.id))
  }, [user, empresas])

  // Obtener ubicaciones asignadas usando utilidad con memoización
  const ubicacionesAsignadas = useMemo(() => {
    if (!ubicaciones || ubicaciones.length === 0) return []
    if (user?.rol === 'ADMIN_GLOBAL') return ubicaciones
    const ubicacionIds = getUserAllowedUbicacionIds(user, ubicaciones, empresas)
    return ubicaciones.filter(ubicacion => ubicacionIds.includes(ubicacion.id))
  }, [user, ubicaciones, empresas])

  const getRoleLabel = (rol) => {
    const roles = {
      'ADMIN_GLOBAL': 'Administrador Global',
      'ADMIN_EMPRESA': 'Administrador de Empresa',
      'GERENTE_OPERATIVO': 'Gerente Operativo',
      'JEFE_PUNTO': 'Jefe de Punto',
      'OPERADOR': 'Operador'
    }
    return roles[rol] || rol
  }

  const formatDate = (dateString) => {
    if (!dateString) return '-'
    try {
      return format(new Date(dateString), "d 'de' MMMM, yyyy", { locale: es })
    } catch {
      return '-'
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl shadow-card-hover max-w-3xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="relative overflow-hidden bg-gradient-ocean p-6">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-16 -mt-16"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center text-primary-600 font-bold text-2xl shadow-lg">
                  {user?.nombre?.charAt(0)?.toUpperCase() || 'U'}
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">{user?.nombre}</h2>
                  <p className="text-white/90 mt-1">{user?.email}</p>
                  <div className="mt-2">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-white/20 text-white">
                      <Shield size={14} className="mr-1" />
                      {getRoleLabel(user?.rol)}
                    </span>
                  </div>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/20 rounded-xl transition-colors"
              >
                <X className="text-white" size={24} />
              </button>
            </div>
          </div>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)] space-y-6">
          {/* Información Personal */}
          <div>
            <h3 className="text-lg font-bold text-slate-900 mb-3 flex items-center gap-2">
              <User size={20} className="text-primary-600" />
              Información Personal
            </h3>
            <div className="bg-slate-50 rounded-xl p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-slate-600 mb-1">ID de Usuario</p>
                  <p className="font-semibold text-slate-900 text-sm">{user?.id || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-600 mb-1">Rol</p>
                  <p className="font-semibold text-slate-900 text-sm">{getRoleLabel(user?.rol)}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Empresas Asignadas */}
          <div>
            <h3 className="text-lg font-bold text-slate-900 mb-3 flex items-center gap-2">
              <Building2 size={20} className="text-primary-600" />
              Empresas {empresasAsignadas.length > 0 && `(${empresasAsignadas.length})`}
            </h3>

            {isLoadingEmpresas ? (
              <div className="py-6">
                <LoadingSpinner text="Cargando empresas..." />
              </div>
            ) : empresasAsignadas.length === 0 ? (
              <div className="text-center py-6 bg-slate-50 rounded-xl">
                <Building2 size={40} className="mx-auto text-slate-300 mb-2" />
                <p className="text-slate-600 text-sm">No hay empresas asignadas</p>
              </div>
            ) : (
              <div className="space-y-3">
                {empresasAsignadas.map((empresa) => (
                  <div key={empresa.id} className="bg-white border border-slate-200 rounded-lg p-3 hover:shadow-sm transition-shadow">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary-100 rounded-lg">
                        <Building2 size={16} className="text-primary-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-slate-900 text-sm truncate">{empresa.nombre}</h4>
                        <p className="text-xs text-slate-600">ID: {empresa.id}</p>
                      </div>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        empresa.estado === 'ACTIVO' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {empresa.estado || 'ACTIVO'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Ubicaciones Asignadas */}
          <div>
            <h3 className="text-lg font-bold text-slate-900 mb-3 flex items-center gap-2">
              <MapPin size={20} className="text-primary-600" />
              Ubicaciones {ubicacionesAsignadas.length > 0 && `(${ubicacionesAsignadas.length})`}
            </h3>

            {isLoadingUbicaciones ? (
              <div className="py-6">
                <LoadingSpinner text="Cargando ubicaciones..." />
              </div>
            ) : ubicacionesAsignadas.length === 0 ? (
              <div className="text-center py-6 bg-slate-50 rounded-xl">
                <MapPin size={40} className="mx-auto text-slate-300 mb-2" />
                <p className="text-slate-600 text-sm">No hay ubicaciones asignadas</p>
              </div>
            ) : (
              <div className="space-y-3">
                {ubicacionesAsignadas.map((ubicacion) => (
                  <div key={ubicacion.id} className="bg-white border border-slate-200 rounded-lg p-3 hover:shadow-sm transition-shadow">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-purple-100 rounded-lg">
                        <MapPin size={16} className="text-purple-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-slate-900 text-sm truncate">{ubicacion.nombre}</h4>
                        <p className="text-xs text-slate-600">ID: {ubicacion.id} • {ubicacion.tipo}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
