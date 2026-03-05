console.log('🚀 main.simple.jsx iniciado')

// Renderizado ultra simple
const rootElement = document.getElementById('root')
console.log('🎯 Root element:', rootElement)

if (rootElement) {
  rootElement.innerHTML = `
    <div style="padding: 20px; font-family: Arial, sans-serif; background: #f0f0f0; min-height: 100vh;">
      <h1>🎉 SERVIDOR FUNCIONANDO</h1>
      <p>✅ HTML renderizado correctamente</p>
      <p>📅 Timestamp: ${new Date().toISOString()}</p>
      <p>🌐 URL: ${window.location.href}</p>
      <button onclick="alert('JavaScript funcionando!')" style="padding: 10px; background: #007bff; color: white; border: none; border-radius: 5px;">
        Probar JavaScript
      </button>
    </div>
  `
  console.log('✅ Contenido HTML insertado')
} else {
  console.error('❌ No se encontró el elemento root')
}
