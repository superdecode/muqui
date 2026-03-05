import React from 'react'

function App() {
  console.log('🎯 App.simple.jsx renderizado')
  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>🚀 Aplicación Cargada Exitosamente</h1>
      <p>Si ves esto, el problema está en el App.jsx original</p>
      <p>Variables de entorno: {import.meta.env.VITE_ENABLE_FIREBASE}</p>
      <p>Timestamp: {new Date().toISOString()}</p>
    </div>
  )
}

export default App
