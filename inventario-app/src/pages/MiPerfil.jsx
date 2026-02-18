import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import Card from '../components/common/Card'
import Button from '../components/common/Button'
import Input from '../components/common/Input'
import LoadingSpinner from '../components/common/LoadingSpinner'
import { User, Mail, Shield, Building2, MapPin, Lock, Save, Eye, EyeOff } from 'lucide-react'
import { useAuthStore } from '../stores/authStore'
import { useToastStore } from '../stores/toastStore'
import dataService from '../services/dataService'
import { getUserAllowedUbicacionIds, getUserAllowedEmpresaIds } from '../utils/userFilters'

export default function MiPerfil() {
  const { user } = useAuthStore()
  const toast = useToastStore()
  const [isEditing, setIsEditing] = useState(false)
  const [showPasswordForm, setShowPasswordForm] = useState(false)
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)

  const [formData, setFormData] = useState({
    nombre: user?.nombre || '',
    email: user?.email || ''
  })

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })

  // Cargar empresas
  const { data: empresas = [] } = useQuery({
    queryKey: ['empresas'],
    queryFn: () => dataService.getEmpresas()
  })

  // Cargar ubicaciones
  const { data: ubicaciones = [] } = useQuery({
    queryKey: ['ubicaciones'],
    queryFn: () => dataService.getUbicaciones()
  })

  // Obtener empresas asignadas usando utilidad
  const getEmpresasAsignadas = () => {
    if (user?.rol === 'ADMIN_GLOBAL') return empresas
    const empresaIds = getUserAllowedEmpresaIds(user)
    return empresas.filter(empresa => empresaIds.includes(empresa.id))
  }

  // Obtener ubicaciones asignadas usando utilidad
  const getUbicacionesAsignadas = () => {
    if (user?.rol === 'ADMIN_GLOBAL') return ubicaciones
    const ubicacionIds = getUserAllowedUbicacionIds(user, ubicaciones, empresas)
    return ubicaciones.filter(ubicacion => ubicacionIds.includes(ubicacion.id))
  }

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

  const handleSaveProfile = async () => {
    try {
      // Aquí iría la lógica para actualizar el perfil
      toast.success('Perfil Actualizado', 'Los cambios se han guardado correctamente')
      setIsEditing(false)
    } catch (error) {
      toast.error('Error', 'No se pudo actualizar el perfil')
    }
  }

  const handleChangePassword = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('Error', 'Las contraseñas no coinciden')
      return
    }

    if (passwordData.newPassword.length < 6) {
      toast.error('Error', 'La contraseña debe tener al menos 6 caracteres')
      return
    }

    try {
      // Aquí iría la lógica para cambiar la contraseña
      toast.success('Contraseña Cambiada', 'Tu contraseña se ha actualizado correctamente')
      setShowPasswordForm(false)
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' })
    } catch (error) {
      toast.error('Error', 'No se pudo cambiar la contraseña')
    }
  }

  const empresasAsignadas = getEmpresasAsignadas()
  const ubicacionesAsignadas = getUbicacionesAsignadas()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-ocean p-6 shadow-card">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-32 -mt-32"></div>
        <div className="relative z-10">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-full bg-white flex items-center justify-center text-primary-600 font-bold text-3xl shadow-lg">
              {user?.nombre?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">{user?.nombre}</h1>
              <p className="text-white/90 mt-1">{user?.email}</p>
              <div className="mt-2">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-white/20 text-white">
                  <Shield size={14} className="mr-1" />
                  {getRoleLabel(user?.rol)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Información Personal */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <User size={24} className="text-primary-600" />
                Información Personal
              </h2>
              {!isEditing && (
                <Button size="sm" onClick={() => setIsEditing(true)}>
                  Editar
                </Button>
              )}
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="ID de Usuario"
                  value={user?.id || ''}
                  disabled
                  icon={User}
                />
                <Input
                  label="Rol"
                  value={getRoleLabel(user?.rol)}
                  disabled
                  icon={Shield}
                />
              </div>

              <Input
                label="Nombre Completo"
                value={formData.nombre}
                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                disabled={!isEditing}
                icon={User}
              />

              <Input
                label="Correo Electrónico"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                disabled={!isEditing}
                icon={Mail}
              />

              {isEditing && (
                <div className="flex gap-3 pt-2">
                  <Button onClick={handleSaveProfile} className="flex-1">
                    <Save size={18} className="mr-2" />
                    Guardar Cambios
                  </Button>
                  <Button variant="ghost" onClick={() => setIsEditing(false)} className="flex-1">
                    Cancelar
                  </Button>
                </div>
              )}
            </div>
          </Card>

          {/* Cambiar Contraseña */}
          <Card>
            <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Lock size={24} className="text-primary-600" />
              Seguridad
            </h2>

            {!showPasswordForm ? (
              <div className="text-center py-6">
                <Lock size={48} className="mx-auto text-slate-300 mb-3" />
                <p className="text-slate-600 mb-4">Actualiza tu contraseña periódicamente para mantener tu cuenta segura</p>
                <Button onClick={() => setShowPasswordForm(true)}>
                  Cambiar Contraseña
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="relative">
                  <Input
                    label="Contraseña Actual"
                    type={showCurrentPassword ? 'text' : 'password'}
                    value={passwordData.currentPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                    icon={Lock}
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-3 top-9 text-slate-400 hover:text-slate-600"
                  >
                    {showCurrentPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>

                <div className="relative">
                  <Input
                    label="Nueva Contraseña"
                    type={showNewPassword ? 'text' : 'password'}
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                    icon={Lock}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-9 text-slate-400 hover:text-slate-600"
                  >
                    {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>

                <Input
                  label="Confirmar Nueva Contraseña"
                  type="password"
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                  icon={Lock}
                />

                <div className="flex gap-3">
                  <Button onClick={handleChangePassword} className="flex-1">
                    Actualizar Contraseña
                  </Button>
                  <Button variant="ghost" onClick={() => setShowPasswordForm(false)} className="flex-1">
                    Cancelar
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </div>

        {/* Sidebar - Empresas y Ubicaciones */}
        <div className="space-y-6">
          {/* Empresas Asignadas */}
          <Card>
            <h2 className="text-lg font-bold text-slate-900 mb-3 flex items-center gap-2">
              <Building2 size={20} className="text-primary-600" />
              Empresas
              {empresasAsignadas.length > 0 && (
                <span className="text-sm font-normal text-slate-600">({empresasAsignadas.length})</span>
              )}
            </h2>

            {empresasAsignadas.length === 0 ? (
              <div className="text-center py-6 bg-slate-50 rounded-xl">
                <Building2 size={40} className="mx-auto text-slate-300 mb-2" />
                <p className="text-slate-600 text-sm">No hay empresas asignadas</p>
              </div>
            ) : (
              <div className="space-y-2">
                {empresasAsignadas.map((empresa) => (
                  <div key={empresa.id} className="bg-slate-50 rounded-lg p-3">
                    <div className="flex items-center gap-2">
                      <Building2 size={16} className="text-primary-600 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-slate-900 text-sm truncate">{empresa.nombre}</p>
                        <p className="text-xs text-slate-600">ID: {empresa.id}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Ubicaciones Asignadas */}
          <Card>
            <h2 className="text-lg font-bold text-slate-900 mb-3 flex items-center gap-2">
              <MapPin size={20} className="text-primary-600" />
              Ubicaciones
              {ubicacionesAsignadas.length > 0 && (
                <span className="text-sm font-normal text-slate-600">({ubicacionesAsignadas.length})</span>
              )}
            </h2>

            {ubicacionesAsignadas.length === 0 ? (
              <div className="text-center py-6 bg-slate-50 rounded-xl">
                <MapPin size={40} className="mx-auto text-slate-300 mb-2" />
                <p className="text-slate-600 text-sm">No hay ubicaciones asignadas</p>
              </div>
            ) : (
              <div className="space-y-2">
                {ubicacionesAsignadas.map((ubicacion) => (
                  <div key={ubicacion.id} className="bg-slate-50 rounded-lg p-3">
                    <div className="flex items-center gap-2">
                      <MapPin size={16} className="text-purple-600 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-slate-900 text-sm truncate">{ubicacion.nombre}</p>
                        <p className="text-xs text-slate-600">{ubicacion.tipo}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}
