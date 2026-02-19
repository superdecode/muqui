import { useState } from 'react'
import { triggerTransferenciaRecibida, triggerStockBajo } from '../../services/notificationService'
import { useAuthStore } from '../../stores/authStore'
import { useToastStore } from '../../stores/toastStore'
import Button from '../common/Button'
import { Bell, AlertTriangle, ArrowRightLeft } from 'lucide-react'

export default function NotificationTester() {
  const { user } = useAuthStore()
  const toast = useToastStore()
  const [loading, setLoading] = useState(false)

  const handleTestTransferNotification = async () => {
    if (!user) {
      toast.error('Error', 'Debes estar logueado')
      return
    }
    
    setLoading(true)
    try {
      console.log('🧪 Iniciando prueba de notificación de transferencia...')
      // Simulate a transfer notification to self
      const result = await triggerTransferenciaRecibida({
        transferencia: {
          id: `TEST-${Date.now()}`,
          codigo_legible: `MV-TEST-${Math.floor(Math.random() * 1000)}`
        },
        productos: [
          { producto_id: 'P1', nombre: 'Producto Prueba 1', cantidad: 5 },
          { producto_id: 'P2', nombre: 'Producto Prueba 2', cantidad: 10 }
        ],
        origen: { id: 'ORG', nombre: 'Bodega Origen Test' },
        destino: { id: 'DST', nombre: 'Bodega Destino Test' },
        usuarioCreador: { nombre: 'Sistema de Prueba' },
        usuariosDestino: [user.id] // Send to self
      })
      
      console.log('✅ Resultado prueba transferencia:', result)
      toast.success('Prueba Enviada', 'Se envió una notificación de transferencia a tu usuario')
    } catch (error) {
      console.error('❌ Error prueba transferencia:', error)
      toast.error('Error', error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleTestStockNotification = async () => {
    if (!user) return
    setLoading(true)
    try {
      console.log('🧪 Iniciando prueba de notificación de stock...')
      await triggerStockBajo({
        producto: { id: 'P-LOW', nombre: 'Producto Bajo Stock', stock_actual: 2, stock_minimo: 5 },
        ubicacion: { id: 'LOC', nombre: 'Almacén Principal' },
        stockActual: 2,
        stockMinimo: 5,
        usuariosDestino: [user.id]
      })
      toast.success('Prueba Enviada', 'Se envió una alerta de stock bajo')
    } catch (error) {
      console.error(error)
      toast.error('Error', error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
      <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
        <Bell size={20} className="text-primary-600" />
        Diagnóstico de Notificaciones
      </h3>
      <p className="text-sm text-slate-500 mb-4">
        Usa estos botones para verificar si el sistema de notificaciones está funcionando correctamente.
        Las notificaciones se enviarán a tu usuario actual (ID: {user?.id}).
      </p>
      
      <div className="flex flex-wrap gap-3">
        <Button 
          onClick={handleTestTransferNotification} 
          loading={loading}
          variant="primary"
          className="flex items-center gap-2"
        >
          <ArrowRightLeft size={16} />
          Probar Transferencia
        </Button>
        
        <Button 
          onClick={handleTestStockNotification} 
          loading={loading}
          variant="outline"
          className="flex items-center gap-2 text-orange-600 border-orange-200 hover:bg-orange-50"
        >
          <AlertTriangle size={16} />
          Probar Stock Bajo
        </Button>
      </div>
      
      <div className="mt-4 p-3 bg-slate-100 dark:bg-slate-900 rounded-lg text-xs font-mono text-slate-600 dark:text-slate-400 overflow-auto max-h-32">
        <p>Log de depuración:</p>
        <p>- Usuario actual: {user?.nombre} ({user?.rol})</p>
        <p>- ID: {user?.id}</p>
        <p>- Ubicaciones asignadas: {JSON.stringify(user?.ubicaciones_asignadas)}</p>
      </div>
    </div>
  )
}
