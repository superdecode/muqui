// Script de depuración para encontrar el error
console.log('🔍 Debug script iniciado')
console.log('📋 Variables de entorno:', import.meta.env)
console.log('🌐 URL actual:', window.location.href)

// Intentar inicializar Firebase
try {
  import('./config/firebase.config.js').then(module => {
    console.log('✅ Firebase config importado')
    if (import.meta.env.VITE_ENABLE_FIREBASE === 'true') {
      module.initializeFirebase()
      console.log('✅ Firebase inicializado')
    }
  }).catch(error => {
    console.error('❌ Error importando Firebase config:', error)
  })
} catch (error) {
  console.error('❌ Error general:', error)
}

// Verificar que el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
  console.log('✅ DOM cargado')
})

window.addEventListener('load', () => {
  console.log('✅ Página completamente cargada')
  console.log('🎯 Elemento root:', document.getElementById('root'))
})
