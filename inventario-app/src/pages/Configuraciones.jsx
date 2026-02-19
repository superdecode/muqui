import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Card from '../components/common/Card'
import Button from '../components/common/Button'
import LoadingSpinner from '../components/common/LoadingSpinner'
import { Settings, Bell, Phone, Mail, MessageCircle, HelpCircle, Headphones, LogOut, Moon, Sun, Monitor, User, BookOpen, FileText, Video, Download, Package, Tag, Ruler, Plus, Edit2, Trash2, Save, X, Volume2, BellRing, Clock, Globe } from 'lucide-react'
import { useToastStore } from '../stores/toastStore'
import { useAuthStore } from '../stores/authStore'
import { usePermissions } from '../hooks/usePermissions'
import { useThemeStore } from '../stores/themeStore'
import dataService from '../services/dataService'
import { saveNotificationConfig, getNotificationConfig } from '../services/notificationService'

// ========== TOGGLE SWITCH ==========
function Toggle({ checked, onChange }) {
  return (
    <label className="relative inline-flex items-center cursor-pointer">
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} className="sr-only peer" />
      <div className="w-11 h-6 bg-slate-200 dark:bg-slate-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 dark:after:border-slate-500 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
    </label>
  )
}

// ========== TIMEZONE OPTIONS ==========
const TIMEZONES = [
  'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
  'America/Mexico_City', 'America/Bogota', 'America/Lima', 'America/Santiago',
  'America/Buenos_Aires', 'America/Sao_Paulo', 'America/Caracas',
  'Europe/London', 'Europe/Madrid', 'Europe/Paris', 'Europe/Berlin',
  'Asia/Tokyo', 'Asia/Shanghai', 'Asia/Kolkata', 'Asia/Dubai',
  'Australia/Sydney', 'Pacific/Auckland'
]

const DATE_FORMATS = [
  { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY (31/12/2025)' },
  { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY (12/31/2025)' },
  { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD (2025-12-31)' }
]

const TIME_FORMATS = [
  { value: '24', label: '24 horas (14:30)' },
  { value: '12', label: '12 horas (2:30 PM)' }
]

// ========== MINI MODAL ==========
function MiniModal({ isOpen, onClose, title, children }) {
  if (!isOpen) return null
  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl max-w-md w-full max-h-[80vh] overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
          <h3 className="font-bold text-slate-900 dark:text-slate-100">{title}</h3>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"><X size={18} className="text-slate-500 dark:text-slate-400" /></button>
        </div>
        <div className="p-4 overflow-y-auto max-h-[calc(80vh-60px)]">{children}</div>
      </div>
    </div>
  )
}

// ========== CRUD TABLE SECTION ==========
function CrudSection({ title, icon: Icon, iconColor, items, isLoading, fields, onCreate, onUpdate, onDelete, canDelete = true, canWrite = true }) {
  const toast = useToastStore()
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({})

  const openCreate = () => {
    setEditing(null)
    const empty = {}
    fields.forEach(f => { empty[f.key] = f.default || '' })
    setForm(empty)
    setShowModal(true)
  }

  const openEdit = (item) => {
    setEditing(item)
    const data = {}
    fields.forEach(f => { data[f.key] = item[f.key] || f.default || '' })
    setForm(data)
    setShowModal(true)
  }

  const handleSave = () => {
    const required = fields.filter(f => f.required)
    for (const f of required) {
      if (!form[f.key]) { toast.error('Campo Requerido', `${f.label} es obligatorio`); return }
    }
    if (editing) {
      onUpdate({ id: editing.id, data: form })
    } else {
      onCreate(form)
    }
    setShowModal(false)
  }

  const handleDelete = (item) => {
    if (window.confirm(`¿Desactivar "${item.nombre}"?`)) onDelete(item.id)
  }

  const activeItems = (items || []).filter(i => i.estado !== 'INACTIVO')

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon size={18} className={iconColor} />
          <h3 className="font-semibold text-slate-900 dark:text-slate-100">{title}</h3>
          <span className="text-xs bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded-full">{activeItems.length}</span>
        </div>
        {canWrite && (
          <button onClick={openCreate} className="flex items-center gap-1 text-sm font-medium text-primary-600 hover:text-primary-700 transition-colors">
            <Plus size={16} />Agregar
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="py-6 text-center"><LoadingSpinner /></div>
      ) : activeItems.length === 0 ? (
        <div className="py-8 text-center bg-slate-50 dark:bg-slate-700/50 rounded-xl border border-dashed border-slate-300 dark:border-slate-600">
          <Icon size={32} className="mx-auto text-slate-300 dark:text-slate-500 mb-2" />
          <p className="text-sm text-slate-500 dark:text-slate-400">No hay {title.toLowerCase()} registradas</p>
          <button onClick={openCreate} className="text-sm text-primary-600 font-medium mt-2 hover:underline">Crear primera</button>
        </div>
      ) : (
        <div className="space-y-2">
          {activeItems.map(item => (
            <div key={item.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-slate-900 dark:text-slate-100 text-sm truncate">{item.nombre}</p>
                {item.descripcion && <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{item.descripcion}</p>}
                {item.abreviatura && <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-mono">{item.abreviatura}</span>}
              </div>
              <div className="flex items-center gap-1 ml-2">
                {canWrite && <button onClick={() => openEdit(item)} className="p-1.5 hover:bg-blue-50 rounded-lg text-blue-600"><Edit2 size={14} /></button>}
                {canDelete && canWrite && <button onClick={() => handleDelete(item)} className="p-1.5 hover:bg-red-50 rounded-lg text-red-600"><Trash2 size={14} /></button>}
              </div>
            </div>
          ))}
        </div>
      )}

      <MiniModal isOpen={showModal} onClose={() => setShowModal(false)} title={editing ? `Editar ${title.slice(0, -1)}` : `Nueva ${title.slice(0, -1)}`}>
        <div className="space-y-3">
          {fields.map(f => (
            <div key={f.key}>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{f.label} {f.required && '*'}</label>
              {f.type === 'select' ? (
                <select value={form[f.key] || ''} onChange={e => setForm({ ...form, [f.key]: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-xl focus:ring-2 focus:ring-primary-500 text-sm">
                  {f.options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              ) : f.type === 'textarea' ? (
                <textarea value={form[f.key] || ''} onChange={e => setForm({ ...form, [f.key]: e.target.value })} rows={2}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-xl focus:ring-2 focus:ring-primary-500 text-sm" placeholder={f.placeholder || ''} />
              ) : (
                <input value={form[f.key] || ''} onChange={e => setForm({ ...form, [f.key]: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-xl focus:ring-2 focus:ring-primary-500 text-sm" placeholder={f.placeholder || ''} />
              )}
            </div>
          ))}
          <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-700">
            <Button variant="outline" size="sm" onClick={() => setShowModal(false)}>Cancelar</Button>
            <Button size="sm" onClick={handleSave}><Save size={14} className="mr-1" />Guardar</Button>
          </div>
        </div>
      </MiniModal>
    </div>
  )
}

// ========== MAIN COMPONENT ==========
export default function Configuraciones() {
  const navigate = useNavigate()
  const toast = useToastStore()
  const queryClient = useQueryClient()
  const logout = useAuthStore((state) => state.logout)
  const { user } = useAuthStore()
  const { canEdit: canEditPerm, canDelete: canDeletePerm } = usePermissions()

  const [activeTab, setActiveTab] = useState('general')
  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: true, inventoryAlerts: true, lowStockAlerts: true,
    movementNotifications: true, conteoReminder: true, conteoReminderTime: '08:00',
    browserNotifications: true, soundEnabled: true
  })
  const { theme, setTheme: setStoreTheme, timezone, setTimezone, dateFormat, setDateFormat, timeFormat, setTimeFormat } = useThemeStore()
  const [browserPermission, setBrowserPermission] = useState(
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  )
  const [savingNotifs, setSavingNotifs] = useState(false)

  // Load saved notification config on mount
  useEffect(() => {
    if (!user?.id) return
    getNotificationConfig(user.id).then(config => {
      if (config) {
        setNotificationSettings(prev => ({ ...prev, ...config }))
      }
    }).catch(err => console.warn('Error loading notification config:', err))
  }, [user?.id])

  const canWriteConfig = canEditPerm('configuracion')
  const canDeleteConfig = canDeletePerm('configuracion')

  // Productos config data
  const { data: categorias = [], isLoading: loadCat } = useQuery({ queryKey: ['config-categorias'], queryFn: () => dataService.getCategorias() })
  const { data: unidades = [], isLoading: loadUni } = useQuery({ queryKey: ['config-unidades'], queryFn: () => dataService.getUnidadesMedida() })

  // Mutations
  const catCreate = useMutation({ mutationFn: d => dataService.createCategoria(d), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['config-categorias'] }); toast.success('Creada', 'Categoría creada') } })
  const catUpdate = useMutation({ mutationFn: ({ id, data }) => dataService.updateCategoria(id, data), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['config-categorias'] }); toast.success('Actualizada', 'Categoría actualizada') } })
  const catDelete = useMutation({ mutationFn: id => dataService.deleteCategoria(id), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['config-categorias'] }); toast.success('Desactivada', 'Categoría desactivada') } })


  const uniCreate = useMutation({ mutationFn: d => dataService.createUnidadMedida(d), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['config-unidades'] }); toast.success('Creada', 'Unidad creada') } })
  const uniUpdate = useMutation({ mutationFn: ({ id, data }) => dataService.updateUnidadMedida(id, data), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['config-unidades'] }); toast.success('Actualizada', 'Unidad actualizada') } })
  const uniDelete = useMutation({ mutationFn: id => dataService.deleteUnidadMedida(id), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['config-unidades'] }); toast.success('Desactivada', 'Unidad desactivada') } })

  const handleLogout = () => {
    if (window.confirm('¿Cerrar sesión?')) { logout(); navigate('/login') }
  }

  const TABS = [
    { id: 'general', label: 'General', icon: Settings },
    { id: 'productos', label: 'Productos', icon: Package },
    { id: 'soporte', label: 'Soporte', icon: Headphones }
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-ocean p-6 shadow-card">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-32 -mt-32"></div>
        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <Settings className="text-white" size={32} />
            <div>
              <h1 className="text-3xl font-bold text-white">Configuraciones</h1>
              <p className="text-white/90 mt-1">Personaliza tu experiencia en el sistema</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-1">
        {TABS.map(tab => {
          const Icon = tab.icon
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${activeTab === tab.id ? 'bg-primary-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'}`}>
              <Icon size={16} />{tab.label}
            </button>
          )
        })}
      </div>

      {/* ========== TAB: GENERAL ========== */}
      {activeTab === 'general' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Notificaciones */}
          <div className="space-y-6">
            <Card>
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
                <Bell size={20} className="text-primary-600" />Notificaciones
              </h2>
              <div className="space-y-3">
                {[
                  { key: 'emailNotifications', label: 'Notificaciones por Email', desc: 'Recibe actualizaciones por correo' },
                  { key: 'inventoryAlerts', label: 'Alertas de Inventario', desc: 'Cambios en inventario' },
                  { key: 'lowStockAlerts', label: 'Stock Bajo', desc: 'Avisos de stock mínimo' },
                  { key: 'movementNotifications', label: 'Movimientos', desc: 'Transferencias y movimientos' }
                ].map(item => (
                  <div key={item.key} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl">
                    <div><p className="font-medium text-slate-900 dark:text-slate-100 text-sm">{item.label}</p><p className="text-xs text-slate-500 dark:text-slate-400">{item.desc}</p></div>
                    <Toggle checked={notificationSettings[item.key]} onChange={v => setNotificationSettings({ ...notificationSettings, [item.key]: v })} />
                  </div>
                ))}
                {/* Recordatorio de Conteo */}
                <div className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <div><p className="font-medium text-slate-900 dark:text-slate-100 text-sm flex items-center gap-1.5"><Clock size={14} className="text-purple-600" />Recordatorio de Conteo</p><p className="text-xs text-slate-500 dark:text-slate-400">Alerta diaria consolidada de productos por contar</p></div>
                    <Toggle checked={notificationSettings.conteoReminder} onChange={v => setNotificationSettings({ ...notificationSettings, conteoReminder: v })} />
                  </div>
                  {notificationSettings.conteoReminder && (
                    <div className="flex items-center gap-2 pl-5">
                      <label className="text-xs text-slate-600">Hora del recordatorio:</label>
                      <input type="time" value={notificationSettings.conteoReminderTime} onChange={e => setNotificationSettings({ ...notificationSettings, conteoReminderTime: e.target.value })} className="px-2 py-1 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-lg text-sm" />
                    </div>
                  )}
                </div>
                {/* Sonido */}
                <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl">
                  <div><p className="font-medium text-slate-900 dark:text-slate-100 text-sm flex items-center gap-1.5"><Volume2 size={14} className="text-amber-600" />Sonido en alertas críticas</p><p className="text-xs text-slate-500 dark:text-slate-400">Reproducir sonido en stock bajo y transferencias</p></div>
                  <Toggle checked={notificationSettings.soundEnabled} onChange={v => setNotificationSettings({ ...notificationSettings, soundEnabled: v })} />
                </div>
                {/* Notificaciones del navegador */}
                <div className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <div><p className="font-medium text-slate-900 dark:text-slate-100 text-sm flex items-center gap-1.5"><BellRing size={14} className="text-blue-600" />Notificaciones del Navegador</p><p className="text-xs text-slate-500 dark:text-slate-400">Recibe alertas aunque la pestaña no esté activa</p></div>
                    {browserPermission === 'granted' ? (
                      <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full font-semibold">Activadas</span>
                    ) : browserPermission === 'denied' ? (
                      <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded-full font-semibold">Bloqueadas</span>
                    ) : (
                      <Button size="sm" variant="outline" onClick={async () => {
                        if (typeof Notification === 'undefined') { toast.error('No soportado', 'Tu navegador no soporta notificaciones'); return }
                        const perm = await Notification.requestPermission()
                        setBrowserPermission(perm)
                        if (perm === 'granted') { toast.success('Activadas', 'Notificaciones del navegador activadas'); setNotificationSettings(prev => ({ ...prev, browserNotifications: true })) }
                        else { toast.error('Denegadas', 'Permiso de notificaciones denegado') }
                      }}>Activar</Button>
                    )}
                  </div>
                  {browserPermission === 'denied' && (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-2">
                      <p className="text-xs text-amber-800">Las notificaciones están bloqueadas. Para habilitarlas, haz clic en el ícono de candado en la barra de direcciones del navegador → Permisos → Notificaciones → Permitir.</p>
                    </div>
                  )}
                </div>
                <div className="flex justify-end pt-2">
                  <Button size="sm" loading={savingNotifs} onClick={async () => {
                    if (!user?.id) return
                    setSavingNotifs(true)
                    const result = await saveNotificationConfig(user.id, notificationSettings)
                    setSavingNotifs(false)
                    if (result.success) toast.success('Guardado', 'Preferencias de notificación actualizadas')
                    else toast.error('Error', 'No se pudieron guardar las preferencias')
                  }}>Guardar</Button>
                </div>
              </div>
            </Card>
          </div>

          {/* Preferencias */}
          <div className="space-y-6">
            <Card>
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
                <Globe size={20} className="text-primary-600" />Región y Formato
              </h2>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Zona Horaria</label>
                  <select value={timezone} onChange={e => { setTimezone(e.target.value); toast.success('Guardado', 'Zona horaria actualizada') }}
                    className="w-full px-3 py-2.5 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-xl text-sm">
                    {TIMEZONES.map(tz => <option key={tz} value={tz}>{tz.replace(/_/g, ' ')}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Formato de Fecha</label>
                  <select value={dateFormat} onChange={e => { setDateFormat(e.target.value); toast.success('Guardado', 'Formato de fecha actualizado') }}
                    className="w-full px-3 py-2.5 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-xl text-sm">
                    {DATE_FORMATS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Formato de Hora</label>
                  <select value={timeFormat} onChange={e => { setTimeFormat(e.target.value); toast.success('Guardado', 'Formato de hora actualizado') }}
                    className="w-full px-3 py-2.5 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-xl text-sm">
                    {TIME_FORMATS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                  </select>
                </div>
              </div>
            </Card>

            <Card>
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
                <Sun size={20} className="text-primary-600" />Apariencia
              </h2>
              <div className="grid grid-cols-3 gap-3">
                {[{ id: 'light', label: 'Claro', Icon: Sun }, { id: 'dark', label: 'Oscuro', Icon: Moon }, { id: 'system', label: 'Sistema', Icon: Monitor }].map(t => (
                  <button key={t.id} onClick={() => { setStoreTheme(t.id); toast.success('Tema', `Modo ${t.label} activado`) }}
                    className={`p-4 rounded-xl border-2 transition-all text-center ${theme === t.id ? 'border-primary-600 bg-primary-50 dark:bg-primary-900/30' : 'border-slate-200 dark:border-slate-600 hover:border-slate-300 dark:hover:border-slate-500'}`}>
                    <t.Icon className={`mx-auto mb-1 ${theme === t.id ? 'text-primary-600' : 'text-slate-500 dark:text-slate-400'}`} size={24} />
                    <p className={`text-sm font-semibold ${theme === t.id ? 'text-primary-600' : 'text-slate-700 dark:text-slate-300'}`}>{t.label}</p>
                  </button>
                ))}
              </div>
            </Card>

            <Card>
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
                <User size={20} className="text-primary-600" />Cuenta
              </h2>
              <div className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl mb-3">
                <p className="font-medium text-slate-900 dark:text-slate-100 text-sm">{user?.nombre || 'Usuario'}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{user?.email}</p>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Rol: {user?.rol}</p>
              </div>
              <Button variant="outline" className="w-full text-red-600 border-red-200 hover:bg-red-50" onClick={handleLogout}>
                <LogOut size={16} className="mr-2" />Cerrar Sesión
              </Button>
            </Card>
          </div>
        </div>
      )}

      {/* ========== TAB: PRODUCTOS ========== */}
      {activeTab === 'productos' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CrudSection
              title="Categorías" icon={Tag} iconColor="text-amber-600"
              items={categorias} isLoading={loadCat}
              canWrite={canWriteConfig}
              canDelete={canDeleteConfig}
              fields={[
                { key: 'nombre', label: 'Nombre', required: true, placeholder: 'Ej: Alimentos' },
                { key: 'descripcion', label: 'Descripción', type: 'textarea', placeholder: 'Descripción opcional' }
              ]}
              onCreate={d => catCreate.mutate(d)}
              onUpdate={d => catUpdate.mutate(d)}
              onDelete={id => catDelete.mutate(id)}
            />
          </Card>

          <Card>
            <CrudSection
              title="Unidades de Medida" icon={Ruler} iconColor="text-green-600"
              items={unidades} isLoading={loadUni}
              canWrite={canWriteConfig}
              canDelete={canDeleteConfig}
              fields={[
                { key: 'nombre', label: 'Nombre', required: true, placeholder: 'Ej: Kilogramo' },
                { key: 'abreviatura', label: 'Abreviatura', required: true, placeholder: 'Ej: kg' },
                { key: 'descripcion', label: 'Descripción', type: 'textarea', placeholder: 'Descripción opcional' }
              ]}
              onCreate={d => uniCreate.mutate(d)}
              onUpdate={d => uniUpdate.mutate(d)}
              onDelete={id => uniDelete.mutate(id)}
            />
          </Card>
        </div>
      )}

      {/* ========== TAB: SOPORTE ========== */}
      {activeTab === 'soporte' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
              <BookOpen size={20} className="text-primary-600" />Ayuda y Documentación
            </h2>
            <div className="space-y-3">
              {[
                { icon: FileText, color: 'blue', label: 'Guía de Usuario', desc: 'Manual completo' },
                { icon: Video, color: 'purple', label: 'Videotutoriales', desc: 'Aprende paso a paso' },
                { icon: Download, color: 'green', label: 'Manual PDF', desc: 'Guía offline' },
                { icon: HelpCircle, color: 'yellow', label: 'FAQ', desc: 'Preguntas frecuentes' }
              ].map((item, i) => (
                <button key={i} onClick={() => toast.info(item.label, `Abriendo ${item.label.toLowerCase()}...`)}
                  className="w-full p-3 bg-slate-50 dark:bg-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors text-left">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 bg-${item.color}-100 rounded-lg`}><item.icon size={18} className={`text-${item.color}-600`} /></div>
                    <div><p className="font-medium text-slate-900 dark:text-slate-100 text-sm">{item.label}</p><p className="text-xs text-slate-500 dark:text-slate-400">{item.desc}</p></div>
                  </div>
                </button>
              ))}
            </div>
          </Card>

          <Card>
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
              <Headphones size={20} className="text-primary-600" />Soporte Técnico
            </h2>
            <div className="space-y-3">
              <button onClick={() => toast.success('Chat', 'Conectando con soporte...')}
                className="w-full p-4 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-xl hover:shadow-md transition-all">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/20 rounded-lg"><MessageCircle size={18} /></div>
                  <div className="text-left"><p className="font-semibold text-sm">Chat en Vivo</p><p className="text-xs text-white/80">Respuesta inmediata</p></div>
                </div>
              </button>
              <div className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 rounded-lg"><Phone size={16} className="text-green-600" /></div>
                  <div><p className="font-medium text-slate-900 dark:text-slate-100 text-sm">Teléfono</p><p className="text-xs text-slate-500 dark:text-slate-400">Lun-Vie: 9AM-6PM</p></div>
                </div>
                <a href="tel:+51987654321" className="text-primary-600 font-semibold text-sm block text-center mt-2">+51 987 654 321</a>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg"><Mail size={16} className="text-blue-600" /></div>
                  <div><p className="font-medium text-slate-900 dark:text-slate-100 text-sm">Email</p><p className="text-xs text-slate-500 dark:text-slate-400">Respuesta en 24h</p></div>
                </div>
                <a href="mailto:soporte@inventario.com" className="text-primary-600 font-semibold text-sm block text-center mt-2">soporte@inventario.com</a>
              </div>
              <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl">
                <p className="text-xs font-semibold text-blue-900 mb-1">Horarios de Atención</p>
                <div className="text-xs text-blue-700 space-y-0.5">
                  <p><strong>Lun-Vie:</strong> 9:00 AM - 6:00 PM</p>
                  <p><strong>Sáb:</strong> 9:00 AM - 1:00 PM</p>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
