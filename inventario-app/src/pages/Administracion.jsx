import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Shield, Users, Building2, MapPin, Lock,
  Plus, Edit2, Trash2, Search, X, Save,
  CheckCircle, XCircle, ChevronDown, ChevronRight
} from 'lucide-react'
import Card from '../components/common/Card'
import Button from '../components/common/Button'
import LoadingSpinner from '../components/common/LoadingSpinner'
import { useToastStore } from '../stores/toastStore'
import { useAuthStore } from '../stores/authStore'
import dataService from '../services/dataService'
import { formatLabel } from '../utils/formatters'

// ========== CONSTANTS ==========
const ROLES = [
  { value: 'ADMIN_GLOBAL', label: 'Admin Global', color: 'bg-red-100 text-red-800' },
  { value: 'ADMIN_EMPRESA', label: 'Admin Empresa', color: 'bg-orange-100 text-orange-800' },
  { value: 'GERENTE_OPERATIVO', label: 'Gerente', color: 'bg-blue-100 text-blue-800' },
  { value: 'JEFE_PUNTO', label: 'Jefe Punto', color: 'bg-purple-100 text-purple-800' },
  { value: 'OPERADOR', label: 'Operador', color: 'bg-green-100 text-green-800' },
  { value: 'CONSULTA', label: 'Consulta', color: 'bg-slate-100 text-slate-800' }
]

// Opciones de color disponibles para roles (clases completas para que Tailwind las incluya en el bundle)
const COLOR_OPTIONS = [
  { label: 'Rojo',    value: 'bg-red-100 text-red-800' },
  { label: 'Naranja', value: 'bg-orange-100 text-orange-800' },
  { label: 'Azul',    value: 'bg-blue-100 text-blue-800' },
  { label: 'Púrpura', value: 'bg-purple-100 text-purple-800' },
  { label: 'Verde',   value: 'bg-green-100 text-green-800' },
  { label: 'Gris',    value: 'bg-slate-100 text-slate-800' }
]

const MODULOS = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'productos', label: 'Productos' },
  { id: 'conteos', label: 'Conteos' },
  { id: 'movimientos', label: 'Movimientos' },
  { id: 'reportes', label: 'Reportes' },
  { id: 'configuracion', label: 'Configuración' },
  { id: 'administracion', label: 'Administración' }
]

const NIVELES_ACCESO = [
  { value: 'total', label: 'Total', color: 'bg-green-100 text-green-800' },
  { value: 'escritura', label: 'Escritura', color: 'bg-blue-100 text-blue-800' },
  { value: 'lectura', label: 'Lectura', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'sin_acceso', label: 'Sin Acceso', color: 'bg-red-100 text-red-800' }
]

const PERMISOS_PLANTILLA = {
  'Admin Global': { dashboard: 'total', productos: 'total', conteos: 'total', movimientos: 'total', reportes: 'total', configuracion: 'total', administracion: 'total' },
  'Admin Empresa': { dashboard: 'total', productos: 'total', conteos: 'total', movimientos: 'total', reportes: 'total', configuracion: 'escritura', administracion: 'lectura' },
  'Gerente': { dashboard: 'lectura', productos: 'escritura', conteos: 'escritura', movimientos: 'escritura', reportes: 'escritura', configuracion: 'lectura', administracion: 'sin_acceso' },
  'Jefe Punto': { dashboard: 'lectura', productos: 'lectura', conteos: 'escritura', movimientos: 'escritura', reportes: 'lectura', configuracion: 'sin_acceso', administracion: 'sin_acceso' },
  'Operador': { dashboard: 'lectura', productos: 'lectura', conteos: 'escritura', movimientos: 'lectura', reportes: 'sin_acceso', configuracion: 'sin_acceso', administracion: 'sin_acceso' },
  'Consulta': { dashboard: 'lectura', productos: 'lectura', conteos: 'sin_acceso', movimientos: 'sin_acceso', reportes: 'lectura', configuracion: 'sin_acceso', administracion: 'sin_acceso' }
}

// ========== MODAL ==========
function Modal({ isOpen, onClose, title, children, size = 'md' }) {
  if (!isOpen) return null
  const sc = size === 'xl' ? 'max-w-4xl' : size === 'lg' ? 'max-w-3xl' : size === 'sm' ? 'max-w-md' : 'max-w-xl'
  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className={`bg-white dark:bg-slate-800 rounded-2xl shadow-xl ${sc} w-full max-h-[90vh] overflow-hidden`}>
        <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-700">
          <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">{title}</h3>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"><X size={20} className="text-slate-500 dark:text-slate-400" /></button>
        </div>
        <div className="p-5 overflow-y-auto max-h-[calc(90vh-80px)]">{children}</div>
      </div>
    </div>
  )
}

// ========== TAB: USUARIOS ==========
function TabUsuarios({ usuarios, empresas, ubicaciones, isLoading, canWrite = true, canDelete = true }) {
  const toast = useToastStore()
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingUser, setEditingUser] = useState(null)
  const [form, setForm] = useState({ nombre: '', email: '', rol: '', empresas_asignadas: [], ubicaciones_asignadas: [], estado: 'ACTIVO', password: '' })

  const { data: rolesDB = [] } = useQuery({ queryKey: ['admin-roles'], queryFn: () => dataService.getRoles() })

  const createMut = useMutation({ mutationFn: d => dataService.createUsuario(d), onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-usuarios'] }); toast.success('Creado', 'Usuario creado'); setShowModal(false) }, onError: e => toast.error('Error', e.message) })
  const updateMut = useMutation({ 
    mutationFn: ({ id, data }) => dataService.updateUsuario(id, data), 
    onSuccess: (updatedUser, variables) => {
      qc.invalidateQueries({ queryKey: ['admin-usuarios'] })
      
      // If updating current user, update auth store
      const { user } = useAuthStore.getState()
      if (user && user.id === variables.id) {
        useAuthStore.getState().updateUser(updatedUser)
      }
      
      toast.success('Actualizado', 'Usuario actualizado')
      setShowModal(false)
    }, 
    onError: e => toast.error('Error', e.message) 
  })
  const hardDeleteMut = useMutation({ mutationFn: id => dataService.hardDeleteUsuario(id), onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-usuarios'] }); toast.success('Eliminado', 'Usuario eliminado permanentemente') }, onError: e => toast.error('Error', e.message) })
  const toggleEstadoMut = useMutation({ mutationFn: ({ id, data }) => dataService.updateUsuario(id, data), onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-usuarios'] }); toast.success('Actualizado', 'Estado del usuario actualizado') }, onError: e => toast.error('Error', e.message) })

  const openCreate = () => { setEditingUser(null); setForm({ nombre: '', email: '', rol: '', empresas_asignadas: [], ubicaciones_asignadas: [], estado: 'ACTIVO', password: '' }); setShowModal(true) }
  const openEdit = (u) => {
    setEditingUser(u)
    setForm({
      nombre: u.nombre || '', email: u.email || '', rol: u.rol || '',
      empresas_asignadas: Array.isArray(u.empresas_asignadas) ? u.empresas_asignadas : (u.empresa_id ? [u.empresa_id] : []),
      ubicaciones_asignadas: Array.isArray(u.ubicaciones_asignadas) ? u.ubicaciones_asignadas : [],
      estado: u.estado || 'ACTIVO', password: ''
    })
    setShowModal(true)
  }
  const handleRolChange = (r) => { setForm(prev => ({ ...prev, rol: r })) }
  const toggleEmpresa = (empId) => {
    setForm(prev => {
      const ne = prev.empresas_asignadas.includes(empId) ? prev.empresas_asignadas.filter(id => id !== empId) : [...prev.empresas_asignadas, empId]
      const badUbs = (ubicaciones || []).filter(u => !ne.includes(u.empresa_id)).map(u => u.id)
      return { ...prev, empresas_asignadas: ne, ubicaciones_asignadas: prev.ubicaciones_asignadas.filter(id => !badUbs.includes(id)) }
    })
  }
  const toggleAllEmpresas = () => {
    setForm(prev => {
      const allEmpIds = (empresas || []).filter(e => e.estado !== 'INACTIVO').map(e => e.id)
      const allSelected = allEmpIds.every(id => prev.empresas_asignadas.includes(id))
      const newEmpresas = allSelected ? [] : allEmpIds
      const newUbicaciones = allSelected ? [] : (ubicaciones || []).filter(u => newEmpresas.includes(u.empresa_id)).map(u => u.id)
      return { ...prev, empresas_asignadas: newEmpresas, ubicaciones_asignadas: newUbicaciones }
    })
  }
  const toggleUbicacion = (ubId) => setForm(prev => ({ ...prev, ubicaciones_asignadas: prev.ubicaciones_asignadas.includes(ubId) ? prev.ubicaciones_asignadas.filter(id => id !== ubId) : [...prev.ubicaciones_asignadas, ubId] }))
  const toggleAllUbicaciones = () => {
    setForm(prev => {
      const allUbIds = ubicacionesFiltradas.filter(u => u.estado !== 'INACTIVO').map(u => u.id)
      const allSelected = allUbIds.every(id => prev.ubicaciones_asignadas.includes(id))
      return { ...prev, ubicaciones_asignadas: allSelected ? [] : allUbIds }
    })
  }
  const ubicacionesFiltradas = (ubicaciones || []).filter(u => form.empresas_asignadas.length === 0 || form.empresas_asignadas.includes(u.empresa_id))
  const handleSave = () => { if (!form.nombre || !form.email) { toast.error('Requerido', 'Nombre y email obligatorios'); return }; const d = { ...form }; if (!d.password) delete d.password; editingUser ? updateMut.mutate({ id: editingUser.id, data: d }) : createMut.mutate(d) }
  const filtered = (usuarios || []).filter(u => u.nombre?.toLowerCase().includes(search.toLowerCase()) || u.email?.toLowerCase().includes(search.toLowerCase()) || u.rol?.toLowerCase().includes(search.toLowerCase()))
  const getRolBadge = (rol) => {
    // Si el rol es un ID largo (Firestore), buscar por ID
    if (rol && typeof rol === 'string' && rol.length > 20) {
      const r = rolesDB.find(x => x.id === rol)
      if (r) {
        const colorClass = (r.color || 'bg-slate-100 text-slate-800').toLowerCase()
        return <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${colorClass}`}>{r.nombre || r.label}</span>
      }
    }
    
    // Try exact match first, then case-insensitive match
    const r = rolesDB.find(x => (x.nombre || x.label) === rol) || 
            rolesDB.find(x => x.id === rol) ||
            rolesDB.find(x => (x.nombre || x.label)?.toLowerCase() === rol?.toLowerCase()) ||
            rolesDB.find(x => x.id?.toLowerCase() === rol?.toLowerCase())
    
    if (r) {
      // Ensure color is lowercase for Tailwind
      const colorClass = (r.color || 'bg-slate-100 text-slate-800').toLowerCase()
      return <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${colorClass}`}>{r.nombre || r.label}</span>
    }
    
    // Si no se encuentra, mostrar el rol formateado (para IDs largos mostrar versión corta)
    if (rol && typeof rol === 'string' && rol.length > 20) {
      return <span className="text-xs text-slate-500">{rol.substring(0, 8)}...</span>
    }
    
    return <span className="text-xs text-slate-500">{rol || '-'}</span>
  }

  if (isLoading) return <div className="py-12"><LoadingSpinner /></div>

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md"><Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar usuarios..." className="w-full pl-10 pr-4 py-2.5 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-xl text-sm" /></div>
        {canWrite && <Button onClick={openCreate}><Plus size={18} className="mr-1.5" />Nuevo Usuario</Button>}
      </div>
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-700"><tr>
              <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">Nombre</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">Email</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">Rol</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">Ubicaciones</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">Estado</th>
              {canWrite && <th className="px-4 py-3 text-right font-semibold text-slate-700 dark:text-slate-300">Acciones</th>}
            </tr></thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {filtered.length === 0 ? <tr><td colSpan={6} className="px-4 py-12 text-center text-slate-500">No se encontraron usuarios</td></tr> : filtered.map(u => (
                <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                  <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100">{u.nombre || '-'}</td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-400 text-xs">{u.email || '-'}</td>
                  <td className="px-4 py-3">{getRolBadge(u.rol)}</td>
                  <td className="px-4 py-3"><span className="text-xs text-slate-500">{Array.isArray(u.ubicaciones_asignadas) ? u.ubicaciones_asignadas.length : 0} asignadas</span></td>
                  <td className="px-4 py-3"><span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${u.estado === 'ACTIVO' || !u.estado ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{u.estado === 'ACTIVO' || !u.estado ? <CheckCircle size={12} /> : <XCircle size={12} />}{u.estado || 'ACTIVO'}</span></td>
                  {canWrite && <td className="px-4 py-3 text-right"><div className="flex items-center justify-end gap-1">
                    <button onClick={() => openEdit(u)} className="p-1.5 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg text-blue-600" title="Editar"><Edit2 size={16} /></button>
                    {/* Admin Global: eliminación permanente */}
                    {canDelete && (
                      <button
                        onClick={() => { if (window.confirm(`⚠️ ¿ELIMINAR PERMANENTEMENTE a "${u.nombre}"?\n\nEsta acción no se puede deshacer.`)) hardDeleteMut.mutate(u.id) }}
                        className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg text-red-600"
                        title="Eliminar permanentemente"
                        disabled={hardDeleteMut.isPending}
                      ><Trash2 size={16} /></button>
                    )}
                    {/* Admin Empresa (escritura, sin eliminar): solo activar/desactivar */}
                    {!canDelete && (
                      <button
                        onClick={() => {
                          const nuevoEstado = u.estado === 'ACTIVO' ? 'INACTIVO' : 'ACTIVO'
                          const accion = nuevoEstado === 'ACTIVO' ? 'activar' : 'desactivar'
                          if (window.confirm(`¿${accion.charAt(0).toUpperCase() + accion.slice(1)} a "${u.nombre}"?`)) {
                            toggleEstadoMut.mutate({ id: u.id, data: { estado: nuevoEstado } })
                          }
                        }}
                        className={`p-1.5 rounded-lg transition-colors ${u.estado === 'ACTIVO' ? 'text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/30' : 'text-green-600 hover:bg-green-50 dark:hover:bg-green-900/30'}`}
                        title={u.estado === 'ACTIVO' ? 'Desactivar usuario' : 'Activar usuario'}
                        disabled={toggleEstadoMut.isPending}
                      >{u.estado === 'ACTIVO' ? <XCircle size={16} /> : <CheckCircle size={16} />}</button>
                    )}
                  </div></td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editingUser ? 'Editar Usuario' : 'Nuevo Usuario'} size="xl">
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nombre *</label><input value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} className="w-full px-3 py-2.5 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-xl text-sm" /></div>
            <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Email *</label><input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="w-full px-3 py-2.5 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-xl text-sm" /></div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Rol</label><select value={form.rol || ''} onChange={e => handleRolChange(e.target.value)} className="w-full px-3 py-2.5 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-xl text-sm"><option value="">Seleccione...</option>{rolesDB.map(r => <option key={r.id} value={r.nombre || r.label}>{r.nombre || r.label}</option>)}</select><p className="text-xs text-slate-400 mt-1">Los permisos se heredan del rol asignado</p></div>
            <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Estado</label><select value={form.estado} onChange={e => setForm({ ...form, estado: e.target.value })} className="w-full px-3 py-2.5 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-xl text-sm"><option value="ACTIVO">Activo</option><option value="INACTIVO">Inactivo</option></select></div>
            <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Contraseña {editingUser ? '(vacío=no cambiar)' : '*'}</label><input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} className="w-full px-3 py-2.5 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-xl text-sm" /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-bold text-slate-900 dark:text-slate-100">Empresas/Sedes</label>
                <button 
                  onClick={toggleAllEmpresas}
                  className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors"
                >
                  {form.empresas_asignadas.length === (empresas || []).filter(e => e.estado !== 'INACTIVO').length ? 'Deseleccionar todas' : 'Seleccionar todas'}
                </button>
              </div>
              <div className="max-h-36 overflow-y-auto p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1">
                {(empresas || []).filter(e => e.estado !== 'INACTIVO').map(emp => (
                  <label key={emp.id} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-white dark:hover:bg-slate-600 p-1.5 rounded-lg">
                    <input 
                      type="checkbox" 
                      checked={form.empresas_asignadas.includes(emp.id)} 
                      onChange={() => toggleEmpresa(emp.id)} 
                      className="rounded border-slate-300 text-primary-600" 
                    />
                    <span className="text-slate-700 dark:text-slate-300">{emp.nombre}</span>
                  </label>
                ))}
                {(empresas || []).filter(e => e.estado !== 'INACTIVO').length === 0 && 
                  <p className="text-xs text-slate-400">No hay empresas</p>
                }
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-bold text-slate-900 dark:text-slate-100">Ubicaciones</label>
                <button 
                  onClick={toggleAllUbicaciones}
                  className="text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded-md hover:bg-purple-200 transition-colors"
                >
                  {form.ubicaciones_asignadas.length === ubicacionesFiltradas.filter(u => u.estado !== 'INACTIVO').length ? 'Deseleccionar todas' : 'Seleccionar todas'}
                </button>
              </div>
              <div className="max-h-36 overflow-y-auto p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1">
                {ubicacionesFiltradas.filter(u => u.estado !== 'INACTIVO').map(ub => { 
                  const emp = (empresas || []).find(e => e.id === ub.empresa_id)
                  return (
                    <label key={ub.id} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-white dark:hover:bg-slate-600 p-1.5 rounded-lg">
                      <input 
                        type="checkbox" 
                        checked={form.ubicaciones_asignadas.includes(ub.id)} 
                        onChange={() => toggleUbicacion(ub.id)} 
                        className="rounded border-slate-300 text-primary-600" 
                      />
                      <span className="text-slate-700 dark:text-slate-300">{ub.nombre}</span>
                      {emp && <span className="text-xs text-slate-400 ml-auto">({emp.nombre})</span>}
                    </label>
                  )
                })}
                {ubicacionesFiltradas.filter(u => u.estado !== 'INACTIVO').length === 0 && 
                  <p className="text-xs text-slate-400">Selecciona empresas primero</p>
                }
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200"><Button variant="outline" onClick={() => setShowModal(false)}>Cancelar</Button><Button onClick={handleSave} disabled={createMut.isPending || updateMut.isPending}><Save size={16} className="mr-1.5" />{createMut.isPending || updateMut.isPending ? 'Guardando...' : 'Guardar'}</Button></div>
        </div>
      </Modal>
    </div>
  )
}

// ========== TAB: SEDES ==========
function TabSedes({ empresas, ubicaciones, isLoading, canWrite = true, canDelete = true }) {
  const toast = useToastStore()
  const qc = useQueryClient()
  const [searchSede, setSearchSede] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ nombre: '', direccion: '', telefono: '', responsable: '', estado: 'ACTIVO' })
  const [isUpdatingSede, setIsUpdatingSede] = useState(false)
  const createMut = useMutation({ mutationFn: d => dataService.createEmpresa(d), onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-empresas'] }); qc.invalidateQueries({ queryKey: ['empresas'] }); toast.success('Creada', 'Sede creada'); setShowModal(false) }, onError: e => toast.error('Error', e.message) })
  const updateMut = useMutation({ mutationFn: ({ id, data }) => dataService.updateEmpresa(id, data), onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-empresas'] }); qc.invalidateQueries({ queryKey: ['empresas'] }); toast.success('Actualizada', 'Sede actualizada'); setShowModal(false) }, onError: e => toast.error('Error', e.message) })
  const deleteMut = useMutation({ mutationFn: id => dataService.deleteEmpresa(id), onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-empresas'] }); qc.invalidateQueries({ queryKey: ['empresas'] }); toast.success('Desactivada', 'Sede desactivada') }, onError: e => toast.error('Error', e.message) })
  
  // Mutación para actualizar múltiples ubicaciones
  const updateUbicacionesMut = useMutation({
    mutationFn: async ({ ubicacionesIds, estado }) => {
      const promises = ubicacionesIds.map(id => 
        dataService.updateUbicacion(id, { estado })
      )
      return await Promise.all(promises)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-ubicaciones'] })
      qc.invalidateQueries({ queryKey: ['ubicaciones'] })
    },
    onError: e => toast.error('Error', 'Error al actualizar ubicaciones')
  })
  const openCreate = () => { setEditing(null); setForm({ nombre: '', direccion: '', telefono: '', responsable: '', estado: 'ACTIVO' }); setShowModal(true) }
  const openEdit = (item) => { setEditing(item); setForm({ nombre: item.nombre || '', direccion: item.direccion || '', telefono: item.telefono || '', responsable: item.responsable || '', estado: item.estado || 'ACTIVO' }); setShowModal(true) }
  
  // Función para activar/desactivar sede
  const toggleSedeEstado = async (emp) => {
    const nuevoEstado = emp.estado === 'ACTIVO' ? 'INACTIVO' : 'ACTIVO'
    const accion = nuevoEstado === 'ACTIVO' ? 'activar' : 'desactivar'
    
    console.log('toggleSedeEstado - Iniciando:', { empId: emp.id, empNombre: emp.nombre, estadoActual: emp.estado, nuevoEstado })
    
    // Obtener ubicaciones asociadas a esta sede
    const ubicacionesAsociadas = ubicaciones.filter(ub => ub.empresa_id === emp.id)
    console.log('toggleSedeEstado - Ubicaciones asociadas:', ubicacionesAsociadas.length)
    
    // Mensaje de confirmación más detallado si hay ubicaciones afectadas
    let mensajeConfirmacion = `¿${accion.charAt(0).toUpperCase() + accion.slice(1)} "${emp.nombre}"?`
    if (ubicacionesAsociadas.length > 0 && nuevoEstado === 'INACTIVO') {
      mensajeConfirmacion += `\n\nTambién se desactivarán ${ubicacionesAsociadas.length} ubicación(es) asociada(s).`
    }
    
    if (window.confirm(mensajeConfirmacion)) {
      setIsUpdatingSede(true)
      try {
        // Actualizar sede
        console.log('toggleSedeEstado - Actualizando sede...')
        await updateMut.mutateAsync({ 
          id: emp.id, 
          data: { ...emp, estado: nuevoEstado }
        })
        
        // Invalidar queries de empresas para asegurar que se actualice la lista
        console.log('toggleSedeEstado - Invalidando queries de empresas...')
        qc.invalidateQueries({ queryKey: ['admin-empresas'] })
        qc.invalidateQueries({ queryKey: ['empresas'] })
        
        // Si se está desactivando la sede, también desactivar las ubicaciones
        if (nuevoEstado === 'INACTIVO' && ubicacionesAsociadas.length > 0) {
          const ubicacionesIds = ubicacionesAsociadas.map(ub => ub.id)
          await updateUbicacionesMut.mutateAsync({ 
            ubicacionesIds, 
            estado: 'INACTIVO' 
          })
          
          toast.success(
            'Sede y ubicaciones desactivadas', 
            `${emp.nombre} y ${ubicacionesAsociadas.length} ubicación(es) han sido desactivadas.`
          )
        } else {
          toast.success(
            'Sede actualizada', 
            `Sede "${emp.nombre}" ha sido ${accion}da.`
          )
        }
        
        console.log('toggleSedeEstado - Operación completada')
      } catch (error) {
        console.error('Error al actualizar sede y ubicaciones:', error)
      } finally {
        setIsUpdatingSede(false)
      }
    }
  }
  if (isLoading) return <div className="py-12"><LoadingSpinner /></div>
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md"><Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input value={searchSede} onChange={e => setSearchSede(e.target.value)} placeholder="Buscar sedes..." className="w-full pl-10 pr-4 py-2.5 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-xl text-sm" /></div>
        {canWrite && <Button onClick={openCreate}><Plus size={18} className="mr-1.5" />Nueva Sede</Button>}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {(empresas || []).filter(emp => !searchSede || emp.nombre?.toLowerCase().includes(searchSede.toLowerCase()) || emp.direccion?.toLowerCase().includes(searchSede.toLowerCase()) || emp.responsable?.toLowerCase().includes(searchSede.toLowerCase())).length === 0 ? <div className="col-span-full text-center py-12 text-slate-500"><Building2 size={48} className="mx-auto mb-3 text-slate-300" /><p>No hay sedes</p></div> : (empresas || []).filter(emp => !searchSede || emp.nombre?.toLowerCase().includes(searchSede.toLowerCase()) || emp.direccion?.toLowerCase().includes(searchSede.toLowerCase()) || emp.responsable?.toLowerCase().includes(searchSede.toLowerCase())).map(emp => (
          <div key={emp.id} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-3"><div className="p-2.5 bg-blue-100 rounded-xl"><Building2 size={20} className="text-blue-600" /></div><span className={`px-2 py-1 rounded-full text-xs font-semibold ${emp.estado === 'ACTIVO' || !emp.estado ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{emp.estado || 'ACTIVO'}</span></div>
            <h4 className="font-bold text-slate-900 dark:text-slate-100 mb-1">{emp.nombre}</h4>
            {emp.direccion && <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">{emp.direccion}</p>}
            {emp.responsable && <p className="text-xs text-slate-500 mt-2">Responsable: {emp.responsable}</p>}
            {canWrite && <div className="flex gap-2 mt-4 pt-3 border-t border-slate-100 dark:border-slate-700">
              <button onClick={() => openEdit(emp)} className="flex-1 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg">Editar</button>
              {canDelete && <button onClick={() => toggleSedeEstado(emp)} disabled={isUpdatingSede} className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${emp.estado === 'ACTIVO' ? 'text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20' : 'text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20'} ${isUpdatingSede ? 'opacity-50 cursor-not-allowed' : ''}`}>
                {isUpdatingSede ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                    Procesando...
                  </span>
                ) : (
                  emp.estado === 'ACTIVO' ? 'Desactivar' : 'Activar'
                )}
              </button>}
            </div>}
          </div>
        ))}
      </div>
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editing ? 'Editar Sede' : 'Nueva Sede'}>
        <div className="space-y-4">
          <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nombre *</label><input value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} className="w-full px-3 py-2.5 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-xl text-sm" /></div>
          <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Dirección</label><input value={form.direccion} onChange={e => setForm({ ...form, direccion: e.target.value })} className="w-full px-3 py-2.5 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-xl text-sm" /></div>
          <div className="grid grid-cols-2 gap-4"><div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Teléfono</label><input value={form.telefono} onChange={e => setForm({ ...form, telefono: e.target.value })} className="w-full px-3 py-2.5 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-xl text-sm" /></div><div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Responsable</label><input value={form.responsable} onChange={e => setForm({ ...form, responsable: e.target.value })} className="w-full px-3 py-2.5 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-xl text-sm" /></div></div>
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200"><Button variant="outline" onClick={() => setShowModal(false)}>Cancelar</Button><Button onClick={() => { if (!form.nombre) { toast.error('Requerido', 'Nombre obligatorio'); return }; editing ? updateMut.mutate({ id: editing.id, data: form }) : createMut.mutate(form) }} disabled={createMut.isPending || updateMut.isPending}><Save size={16} className="mr-1.5" />Guardar</Button></div>
        </div>
      </Modal>
    </div>
  )
}

// ========== TAB: UBICACIONES (GROUPED BY EMPRESA) ==========
function TabUbicaciones({ ubicaciones, empresas, isLoading, canWrite = true, canDelete = true }) {
  const toast = useToastStore()
  const qc = useQueryClient()
  const [collapsed, setCollapsed] = useState({})
  const [searchUb, setSearchUb] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ nombre: '', tipo: 'BODEGA', empresa_id: '', direccion: '', estado: 'ACTIVO' })
  const createMut = useMutation({ mutationFn: d => dataService.createUbicacion(d), onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-ubicaciones'] }); qc.invalidateQueries({ queryKey: ['ubicaciones'] }); toast.success('Creada', 'Ubicación creada'); setShowModal(false) }, onError: e => toast.error('Error', e.message) })
  const updateMut = useMutation({ mutationFn: ({ id, data }) => dataService.updateUbicacion(id, data), onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-ubicaciones'] }); qc.invalidateQueries({ queryKey: ['ubicaciones'] }); toast.success('Actualizada', 'Ubicación actualizada'); setShowModal(false) }, onError: e => toast.error('Error', e.message) })
  const deleteMut = useMutation({ mutationFn: id => dataService.deleteUbicacion(id), onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-ubicaciones'] }); qc.invalidateQueries({ queryKey: ['ubicaciones'] }); toast.success('Desactivada', 'Ubicación desactivada') }, onError: e => toast.error('Error', e.message) })
  const openCreate = () => { setEditing(null); setForm({ nombre: '', tipo: 'BODEGA', empresa_id: '', direccion: '', estado: 'ACTIVO' }); setShowModal(true) }
  const openEdit = (item) => { setEditing(item); setForm({ nombre: item.nombre || '', tipo: item.tipo || 'BODEGA', empresa_id: item.empresa_id || '', direccion: item.direccion || '', estado: item.estado || 'ACTIVO' }); setShowModal(true) }
  const toggleCollapse = (key) => setCollapsed(prev => ({ ...prev, [key]: !prev[key] }))

  if (isLoading) return <div className="py-12"><LoadingSpinner /></div>

  // Filter and group ubicaciones by empresa
  const searchLower = searchUb.toLowerCase()
  const filteredUbicaciones = (ubicaciones || []).filter(ub => {
    if (!searchLower) return true
    const empName = (empresas || []).find(e => e.id === ub.empresa_id)?.nombre || ''
    return ub.nombre?.toLowerCase().includes(searchLower) || empName.toLowerCase().includes(searchLower)
  })
  const groups = {}
  const sinEmpresa = []
  filteredUbicaciones.forEach(ub => {
    if (ub.empresa_id) {
      if (!groups[ub.empresa_id]) groups[ub.empresa_id] = []
      groups[ub.empresa_id].push(ub)
    } else {
      sinEmpresa.push(ub)
    }
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md"><Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input value={searchUb} onChange={e => setSearchUb(e.target.value)} placeholder="Buscar por empresa o ubicación..." className="w-full pl-10 pr-4 py-2.5 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-xl text-sm" /></div>
        {canWrite && <Button onClick={openCreate}><Plus size={18} className="mr-1.5" />Nueva Ubicación</Button>}
      </div>
      {Object.keys(groups).length === 0 && sinEmpresa.length === 0 && <div className="text-center py-12 text-slate-500"><MapPin size={48} className="mx-auto mb-3 text-slate-300" /><p>No hay ubicaciones</p></div>}
      {Object.entries(groups).map(([empId, ubs]) => {
        const emp = (empresas || []).find(e => e.id === empId)
        const isCollapsed = collapsed[empId]
        return (
          <div key={empId} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            <button onClick={() => toggleCollapse(empId)} className="w-full flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
              <div className="flex items-center gap-3">
                {isCollapsed ? <ChevronRight size={20} className="text-slate-400" /> : <ChevronDown size={20} className="text-slate-400" />}
                <Building2 size={20} className="text-blue-600" />
                <span className="font-bold text-slate-900 dark:text-slate-100">{emp?.nombre || empId}</span>
                <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-700 rounded-full text-xs text-slate-600 dark:text-slate-400">{ubs.length} ubicaciones</span>
              </div>
            </button>
            {!isCollapsed && (
              <div className="border-t border-slate-200 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-700">
                {ubs.map(ub => (
                  <div key={ub.id} className="flex items-center justify-between px-6 py-3 hover:bg-slate-50 dark:hover:bg-slate-700/50">
                    <div className="flex items-center gap-3">
                      <MapPin size={16} className="text-purple-500" />
                      <div>
                        <p className="font-medium text-slate-900 dark:text-slate-100 text-sm">{ub.nombre}</p>
                        <p className="text-xs text-slate-500">{formatLabel(ub.tipo || 'BODEGA')}{ub.direccion ? ` · ${ub.direccion}` : ''}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${ub.estado === 'ACTIVO' || !ub.estado ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{ub.estado || 'ACTIVO'}</span>
                      {canWrite && <button onClick={() => openEdit(ub)} className="p-1.5 hover:bg-blue-50 rounded-lg text-blue-600"><Edit2 size={14} /></button>}
                      {canDelete && <button onClick={() => { if (window.confirm(`¿Desactivar "${ub.nombre}"?`)) deleteMut.mutate(ub.id) }} className="p-1.5 hover:bg-red-50 rounded-lg text-red-600"><Trash2 size={14} /></button>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })}
      {sinEmpresa.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <button onClick={() => toggleCollapse('_none')} className="w-full flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-700/50">
            <div className="flex items-center gap-3">{collapsed['_none'] ? <ChevronRight size={20} className="text-slate-400" /> : <ChevronDown size={20} className="text-slate-400" />}<span className="font-bold text-slate-500">Sin empresa asignada</span><span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-700 rounded-full text-xs text-slate-600 dark:text-slate-400">{sinEmpresa.length}</span></div>
          </button>
          {!collapsed['_none'] && <div className="border-t border-slate-200 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-700">{sinEmpresa.map(ub => (
            <div key={ub.id} className="flex items-center justify-between px-6 py-3 hover:bg-slate-50 dark:hover:bg-slate-700/50">
              <div className="flex items-center gap-3"><MapPin size={16} className="text-purple-500" /><div><p className="font-medium text-slate-900 dark:text-slate-100 text-sm">{ub.nombre}</p><p className="text-xs text-slate-500">{formatLabel(ub.tipo || 'BODEGA')}</p></div></div>
              <div className="flex items-center gap-2">{canWrite && <button onClick={() => openEdit(ub)} className="p-1.5 hover:bg-blue-50 rounded-lg text-blue-600"><Edit2 size={14} /></button>}{canDelete && <button onClick={() => { if (window.confirm(`¿Desactivar "${ub.nombre}"?`)) deleteMut.mutate(ub.id) }} className="p-1.5 hover:bg-red-50 rounded-lg text-red-600"><Trash2 size={14} /></button>}</div>
            </div>
          ))}</div>}
        </div>
      )}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editing ? 'Editar Ubicación' : 'Nueva Ubicación'}>
        <div className="space-y-4">
          <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nombre *</label><input value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} className="w-full px-3 py-2.5 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-xl text-sm" /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Tipo</label><select value={form.tipo} onChange={e => setForm({ ...form, tipo: e.target.value })} className="w-full px-3 py-2.5 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-xl text-sm"><option value="BODEGA">Bodega</option><option value="PUNTO VENTA">Punto de Venta</option><option value="OFICINA">Oficina</option></select></div>
            <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Sede</label><select value={form.empresa_id} onChange={e => setForm({ ...form, empresa_id: e.target.value })} className="w-full px-3 py-2.5 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-xl text-sm"><option value="">Sin asignar</option>{(empresas || []).filter(e => e.estado !== 'INACTIVO').map(e => <option key={e.id} value={e.id}>{e.nombre}</option>)}</select></div>
          </div>
          <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Dirección</label><input value={form.direccion} onChange={e => setForm({ ...form, direccion: e.target.value })} className="w-full px-3 py-2.5 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-xl text-sm" /></div>
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200"><Button variant="outline" onClick={() => setShowModal(false)}>Cancelar</Button><Button onClick={() => { if (!form.nombre) { toast.error('Requerido', 'Nombre obligatorio'); return }; editing ? updateMut.mutate({ id: editing.id, data: form }) : createMut.mutate(form) }} disabled={createMut.isPending || updateMut.isPending}><Save size={16} className="mr-1.5" />Guardar</Button></div>
        </div>
      </Modal>
    </div>
  )
}

// ========== TAB: ROLES ==========
function TabRoles({ canWrite = true, canDelete = true }) {
  const toast = useToastStore()
  const qc = useQueryClient()
  const [searchRol, setSearchRol] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ nombre: '', color: '', permisos: {} })

  const { data: rolesDB = [], isLoading } = useQuery({ queryKey: ['admin-roles'], queryFn: () => dataService.getRoles() })

  const createMut = useMutation({ mutationFn: d => dataService.createRol(d), onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-roles'] }); toast.success('Creado', 'Rol creado'); setShowModal(false) }, onError: e => toast.error('Error', e.message) })
  const updateMut = useMutation({ mutationFn: ({ id, data }) => dataService.updateRol(id, data), onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-roles'] }); toast.success('Actualizado', 'Rol actualizado'); setShowModal(false) }, onError: e => toast.error('Error', e.message) })
  const deleteMut = useMutation({ mutationFn: id => dataService.deleteRol(id), onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-roles'] }); toast.success('Eliminado', 'Rol eliminado') }, onError: e => toast.error('Error', e.message) })

  // Merge DB roles with hardcoded defaults for display - ensure all roles have a color
  const getRolesWithColors = (roles) => roles.map(r => {
    const defaultRole = ROLES.find(dr => dr.label === (r.nombre || r.label))
    return {
      ...r,
      color: (r.color || defaultRole?.color || 'bg-slate-100 text-slate-800').toLowerCase()
    }
  })

  const displayRoles = rolesDB.length > 0
    ? getRolesWithColors(rolesDB)
    : ROLES.map(r => ({ id: r.value, nombre: r.label, color: r.color, permisos: PERMISOS_PLANTILLA[r.label] || {} }))

  const openCreate = () => {
    setEditing(null)
    const defaultPermisos = {}
    MODULOS.forEach(m => { defaultPermisos[m.id] = '' })
    setForm({ nombre: '', color: '', permisos: defaultPermisos })
    setShowModal(true)
  }
  const openEdit = (rol) => {
    setEditing(rol)
    const permisos = {}
    MODULOS.forEach(m => { permisos[m.id] = (rol.permisos && rol.permisos[m.id]) || '' })
    setForm({ nombre: rol.nombre || rol.label || '', color: rol.color || 'bg-blue-100 text-blue-800', permisos })
    setShowModal(true)
  }
  const handlePermisoChange = (mod, val) => setForm(prev => ({ ...prev, permisos: { ...prev.permisos, [mod]: val } }))
  const handleSave = () => {
    if (!form.nombre) { toast.error('Requerido', 'Nombre obligatorio'); return }
    if (!form.color) { toast.error('Requerido', 'Color obligatorio'); return }
    const data = { ...form }
    if (editing) {
      updateMut.mutate({ id: editing.id, data })
    } else {
      createMut.mutate(data)
    }
  }
  const isAdminRol = (rol) => (rol.nombre || rol.label) === 'ADMIN_GLOBAL'

  if (isLoading) return <div className="py-12"><LoadingSpinner /></div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md"><Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input value={searchRol} onChange={e => setSearchRol(e.target.value)} placeholder="Buscar roles..." className="w-full pl-10 pr-4 py-2.5 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-xl text-sm" /></div>
        {canWrite && <Button onClick={openCreate}><Plus size={18} className="mr-1.5" />Nuevo Rol</Button>}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {displayRoles.filter(rol => !searchRol || (rol.nombre || rol.label || '').toLowerCase().includes(searchRol.toLowerCase())).map(rol => {
          const permisos = rol.permisos || PERMISOS_PLANTILLA[rol.nombre || rol.label] || {}
          const totalModulos = MODULOS.length
          const conAcceso = Object.values(permisos).filter(v => v && v !== '').length
          return (
            <div key={rol.id || rol.nombre || rol.label} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
              <div className="flex items-start justify-between mb-3">
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${(rol.color || 'bg-slate-100 text-slate-800').toLowerCase()}`}>{rol.nombre || rol.label}</span>
                {canWrite && <div className="flex items-center gap-1">
                  <button onClick={() => openEdit(rol)} className="p-1 hover:bg-blue-50 rounded-lg text-blue-600"><Edit2 size={14} /></button>
                  {canDelete && !isAdminRol(rol) && <button onClick={() => { if (window.confirm(`¿Eliminar rol "${rol.nombre || rol.label}"?`)) deleteMut.mutate(rol.id) }} className="p-1 hover:bg-red-50 rounded-lg text-red-600"><Trash2 size={14} /></button>}
                </div>}
              </div>
              <div className="mb-3"><div className="flex justify-between text-xs text-slate-600 dark:text-slate-400 mb-1"><span>Acceso a módulos</span><span>{conAcceso}/{totalModulos}</span></div><div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-2"><div className="bg-primary-500 h-2 rounded-full" style={{ width: `${(conAcceso / totalModulos) * 100}%` }}></div></div></div>
              <div className="space-y-1">
                {MODULOS.map(mod => {
                  const val = permisos[mod.id]

                  // Si val es un objeto (permisos granulares), convertir a string legible
                  let displayValue = val
                  let displayColor = 'bg-slate-100 text-slate-600'

                  if (!val || val === '') {
                    // Sin asignar
                    displayValue = 'Sin asignar'
                    displayColor = 'bg-slate-100 text-slate-500'
                  } else if (typeof val === 'object' && val !== null) {
                    // Es un objeto granular, contar permisos activos
                    const activePerms = Object.entries(val).filter(([_, v]) => v === true).length
                    if (activePerms === 0) {
                      displayValue = 'Sin acceso'
                      displayColor = 'bg-red-100 text-red-800'
                    } else if (activePerms === 5) {
                      displayValue = 'Total'
                      displayColor = 'bg-green-100 text-green-800'
                    } else {
                      displayValue = `${activePerms}/5`
                      displayColor = 'bg-blue-100 text-blue-800'
                    }
                  } else {
                    // Es un string (total, escritura, lectura, sin_acceso)
                    const niv = NIVELES_ACCESO.find(n => n.value === val)
                    displayValue = niv?.label || val
                    displayColor = niv?.color || 'bg-slate-100 text-slate-600'
                  }
                  
                  return <div key={mod.id} className="flex items-center justify-between text-xs"><span className="text-slate-600 dark:text-slate-400">{mod.label}</span><span className={`px-1.5 py-0.5 rounded text-xs font-semibold ${displayColor}`}>{displayValue}</span></div>
                })}
              </div>
            </div>
          )
        })}
      </div>
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editing ? 'Editar Rol' : 'Nuevo Rol'} size="lg">
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nombre *</label><input value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} className="w-full px-3 py-2.5 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-xl text-sm" placeholder="Ej: Supervisor" disabled={editing && isAdminRol(editing)} /></div>
            <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Color</label><select value={form.color || ''} onChange={e => setForm({ ...form, color: e.target.value })} className={`w-full px-3 py-2.5 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-xl text-sm ${!form.color ? 'text-slate-500' : ''}`}><option value="" disabled>Seleccionar color</option>{COLOR_OPTIONS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}</select></div>
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-900 dark:text-slate-100 mb-2">Matriz de Permisos por Módulo</label>
            <p className="text-xs text-slate-500 mb-3">Define el nivel de acceso para cada módulo del sistema.</p>
            <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
              <div className="grid grid-cols-[1fr_auto] gap-0">
                {MODULOS.map(mod => (
                  <div key={mod.id} className="contents">
                    <div className="px-4 py-2.5 border-b border-slate-200 dark:border-slate-600 flex items-center"><span className="text-sm font-medium text-slate-700 dark:text-slate-300">{mod.label}</span></div>
                    <div className="px-4 py-2 border-b border-slate-200 dark:border-slate-600">
                      <select value={form.permisos[mod.id] || ''} onChange={e => handlePermisoChange(mod.id, e.target.value)} className={`px-2 py-1 rounded-lg text-xs font-semibold border-0 cursor-pointer ${NIVELES_ACCESO.find(n => n.value === form.permisos[mod.id])?.color || 'bg-slate-100 text-slate-500'}`} disabled={editing && isAdminRol(editing)}>
                        <option value="" disabled>Seleccionar</option>
                        {NIVELES_ACCESO.map(n => <option key={n.value} value={n.value}>{n.label}</option>)}
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            {editing && isAdminRol(editing) && <p className="text-xs text-amber-600 mt-2">El rol Admin Global tiene acceso total y no puede modificarse.</p>}
          </div>
          <div className="flex flex-wrap gap-3 text-xs">{NIVELES_ACCESO.map(n => <span key={n.value} className={`px-2 py-1 rounded-full font-semibold ${n.color}`}>{n.label}</span>)}</div>
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200"><Button variant="outline" onClick={() => setShowModal(false)}>Cancelar</Button><Button onClick={handleSave} disabled={createMut.isPending || updateMut.isPending}><Save size={16} className="mr-1.5" />{createMut.isPending || updateMut.isPending ? 'Guardando...' : 'Guardar'}</Button></div>
        </div>
      </Modal>
    </div>
  )
}

// ========== MAIN ==========
const TABS = [
  { id: 'usuarios', label: 'Usuarios', icon: Users },
  { id: 'sedes', label: 'Sedes', icon: Building2 },
  { id: 'ubicaciones', label: 'Ubicaciones', icon: MapPin },
  { id: 'roles', label: 'Roles', icon: Shield }
]

export default function Administracion() {
  const [activeTab, setActiveTab] = useState('usuarios')
  const { user } = useAuthStore()
  const { data: usuarios = [], isLoading: loadingUsuarios } = useQuery({ queryKey: ['admin-usuarios'], queryFn: () => dataService.getUsuarios() })
  const { data: empresas = [], isLoading: loadingEmpresas } = useQuery({ queryKey: ['admin-empresas'], queryFn: () => dataService.getEmpresas() })
  const { data: ubicaciones = [], isLoading: loadingUbicaciones } = useQuery({ queryKey: ['admin-ubicaciones'], queryFn: () => dataService.getUbicaciones() })

  // Debug: Log permisos del usuario actual
  const { getPermissionLevel, canWrite, canDelete } = useAuthStore()
  const adminLevel = getPermissionLevel('administracion')
  const canWriteAdmin = adminLevel === 'escritura' || adminLevel === 'total'
  const canDeleteAdmin = adminLevel === 'total'
  
  console.log('Administracion - Debug permisos:', {
    user: user?.nombre,
    rol: user?.rol,
    rol_id: user?.rol_id,
    permisos: user?.permisos,
    cachedRole: user?.roleData,
    adminLevel,
    canWriteAdmin,
    canDeleteAdmin
  })

  if (adminLevel === 'sin_acceso') return (<div className="flex flex-col items-center justify-center h-96 gap-4"><Shield className="text-red-400" size={64} /><h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200">Acceso Denegado</h2><p className="text-slate-600 dark:text-slate-400 text-center max-w-md">No tienes permisos para acceder al panel de administración.</p></div>)

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-800 to-slate-900 p-6 shadow-card">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -mr-32 -mt-32"></div>
        <div className="relative z-10 flex items-center gap-3"><Shield className="text-primary-400" size={32} /><div><h1 className="text-3xl font-bold text-white">Administración del Sistema</h1><p className="text-white/70 mt-1">Usuarios, sedes, ubicaciones y roles del sistema</p></div></div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <button onClick={() => setActiveTab('usuarios')} className="text-left"><Card className={`bg-gradient-to-br from-blue-50 to-white dark:from-blue-900/20 dark:to-slate-800 border-blue-100 dark:border-blue-900/30 cursor-pointer hover:shadow-md transition-shadow ${activeTab === 'usuarios' ? 'ring-2 ring-blue-500' : ''}`}><div className="flex items-center justify-between"><div><p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Usuarios</p><p className="text-3xl font-bold text-blue-600">{usuarios.length}</p></div><div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center"><Users className="text-blue-600" size={24} /></div></div></Card></button>
        <button onClick={() => setActiveTab('sedes')} className="text-left"><Card className={`bg-gradient-to-br from-green-50 to-white dark:from-green-900/20 dark:to-slate-800 border-green-100 dark:border-green-900/30 cursor-pointer hover:shadow-md transition-shadow ${activeTab === 'sedes' ? 'ring-2 ring-green-500' : ''}`}><div className="flex items-center justify-between"><div><p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Sedes</p><p className="text-3xl font-bold text-green-600">{empresas.length}</p></div><div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center"><Building2 className="text-green-600" size={24} /></div></div></Card></button>
        <button onClick={() => setActiveTab('ubicaciones')} className="text-left"><Card className={`bg-gradient-to-br from-purple-50 to-white dark:from-purple-900/20 dark:to-slate-800 border-purple-100 dark:border-purple-900/30 cursor-pointer hover:shadow-md transition-shadow ${activeTab === 'ubicaciones' ? 'ring-2 ring-purple-500' : ''}`}><div className="flex items-center justify-between"><div><p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Ubicaciones</p><p className="text-3xl font-bold text-purple-600">{ubicaciones.length}</p></div><div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center"><MapPin className="text-purple-600" size={24} /></div></div></Card></button>
        <button onClick={() => setActiveTab('roles')} className="text-left"><Card className={`bg-gradient-to-br from-amber-50 to-white dark:from-amber-900/20 dark:to-slate-800 border-amber-100 dark:border-amber-900/30 cursor-pointer hover:shadow-md transition-shadow ${activeTab === 'roles' ? 'ring-2 ring-amber-500' : ''}`}><div className="flex items-center justify-between"><div><p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Roles</p><p className="text-3xl font-bold text-amber-600">{ROLES.length}</p></div><div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center"><Lock className="text-amber-600" size={24} /></div></div></Card></button>
      </div>
      <Card>
        <div className="border-b border-slate-200 dark:border-slate-700"><nav className="flex gap-1 px-2 overflow-x-auto">{TABS.map(tab => { const Icon = tab.icon; return (<button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex items-center gap-2 py-3.5 px-4 border-b-2 font-medium text-sm transition-colors whitespace-nowrap ${activeTab === tab.id ? 'border-primary-600 text-primary-600' : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:border-slate-300'}`}><Icon size={18} />{tab.label}</button>) })}</nav></div>
        <div className="p-6">
          {activeTab === 'usuarios' && <TabUsuarios usuarios={usuarios} empresas={empresas} ubicaciones={ubicaciones} isLoading={loadingUsuarios} canWrite={canWriteAdmin} canDelete={canDeleteAdmin} />}
          {activeTab === 'sedes' && <TabSedes empresas={empresas} ubicaciones={ubicaciones} isLoading={loadingEmpresas} canWrite={canWriteAdmin} canDelete={canDeleteAdmin} />}
          {activeTab === 'ubicaciones' && <TabUbicaciones ubicaciones={ubicaciones} empresas={empresas} isLoading={loadingUbicaciones} canWrite={canWriteAdmin} canDelete={canDeleteAdmin} />}
          {activeTab === 'roles' && <TabRoles canWrite={canWriteAdmin} canDelete={canDeleteAdmin} />}
        </div>
      </Card>
    </div>
  )
}
