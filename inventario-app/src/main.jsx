import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { initializeFirebase } from './config/firebase.config'

// Inicializar Firebase si está habilitado
if (import.meta.env.VITE_ENABLE_FIREBASE === 'true') {
  try {
    initializeFirebase()
    console.log('✅ Firebase inicializado en main.jsx')
  } catch (error) {
    console.error('❌ Error inicializando Firebase:', error)
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
