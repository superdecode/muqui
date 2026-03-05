import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'

// Componente de login simplificado
function SimpleLogin() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  
  const handleLogin = () => {
    setIsLoggedIn(true)
  }
  
  if (isLoggedIn) {
    return <Navigate to="/dashboard" replace />
  }
  
  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      fontFamily: 'Arial, sans-serif'
    }}>
      <div style={{
        background: 'white',
        padding: '40px',
        borderRadius: '12px',
        boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
        textAlign: 'center',
        maxWidth: '400px'
      }}>
        <h1 style={{ color: '#333', marginBottom: '20px' }}>🏪 Sistema de Inventario</h1>
        <p style={{ color: '#666', marginBottom: '30px' }}>
          Sistema de Control Inventario Multi-tienda
        </p>
        <button 
          onClick={handleLogin}
          style={{
            background: '#007bff',
            color: 'white',
            border: 'none',
            padding: '12px 30px',
            borderRadius: '6px',
            fontSize: '16px',
            cursor: 'pointer',
            width: '100%'
          }}
        >
          Iniciar Sesión (Demo)
        </button>
      </div>
    </div>
  )
}

// Dashboard simplificado
function SimpleDashboard() {
  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>🎉 Dashboard Funcionando</h1>
      <p>✅ React Router funcionando</p>
      <p>✅ Estado global funcionando</p>
      <p>📅 Timestamp: {new Date().toISOString()}</p>
      <div style={{ marginTop: '20px' }}>
        <button 
          onClick={() => window.location.reload()}
          style={{
            background: '#28a745',
            color: 'white',
            border: 'none',
            padding: '10px 20px',
            borderRadius: '5px',
            cursor: 'pointer'
          }}
        >
          Recargar Página
        </button>
      </div>
    </div>
  )
}

function App() {
  const [isReady, setIsReady] = useState(false)
  
  useEffect(() => {
    console.log('🚀 App.jsx iniciado')
    setIsReady(true)
  }, [])
  
  if (!isReady) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '100vh',
        fontFamily: 'Arial, sans-serif'
      }}>
        <div>
          <h1>🔄 Cargando...</h1>
          <p>Inicializando aplicación</p>
        </div>
      </div>
    )
  }
  
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<SimpleLogin />} />
        <Route path="/dashboard" element={<SimpleDashboard />} />
        <Route path="/" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
