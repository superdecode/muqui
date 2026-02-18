// === DEBUG DE NAVEGACIÓN - CONFIGURACIONES ===
// Pegar en consola cuando estés en la aplicación

console.log('🔍 Iniciando debug de navegación...');

// 1. Verificar la ruta actual
console.log('📍 Ruta actual:', window.location.pathname);
console.log('🔗 URL completa:', window.location.href);

// 2. Verificar el router de React
const reactRoot = document.querySelector('#root');
if (reactRoot && reactRoot._reactRootContainer) {
  console.log('✅ React root encontrado');
} else {
  console.log('❌ No se encontró React root');
}

// 3. Buscar el componente de navegación/menu
console.log('\n=== ANÁLISIS DEL MENÚ ===');
const menuItems = document.querySelectorAll('a, button, [role="button"]');
console.log(`📋 Total de elementos clickeables: ${menuItems.length}`);

menuItems.forEach((item, index) => {
  const text = item.textContent.trim();
  const href = item.href;
  const onClick = item.onclick;
  const hasRoute = item.getAttribute('data-route') || item.getAttribute('to');
  
  if (text.toLowerCase().includes('configuracion') || text.toLowerCase().includes('configuración')) {
    console.log(`🎯 Item ${index + 1} - CONFIGURACIÓN:`, {
      text,
      href,
      onClick: !!onClick,
      hasRoute,
      className: item.className,
      tagName: item.tagName,
      id: item.id,
      parentElement: item.parentElement?.className
    });
  }
});

// 4. Simular click en el botón de configuraciones
console.log('\n=== SIMULACIÓN DE CLICK ===');
const configButtons = Array.from(menuItems).filter(item => 
  item.textContent.toLowerCase().includes('configuracion') || 
  item.textContent.toLowerCase().includes('configuración')
);

if (configButtons.length > 0) {
  const configButton = configButtons[0];
  console.log('🎯 Botón de configuraciones encontrado:', configButton);
  
  // Agregar listener para capturar el evento
  configButton.addEventListener('click', (e) => {
    console.log('🖱️ Click detectado en configuraciones:', {
      event: e.type,
      target: e.target,
      currentTarget: e.currentTarget,
      defaultPrevented: e.defaultPrevented,
      bubbles: e.bubbles
    });
    
    // Verificar si hay navegación
    setTimeout(() => {
      console.log('📍 Ruta después del click:', window.location.pathname);
    }, 100);
  }, { once: true });
  
  console.log('📌 Listener agregado. Haz click en Configuraciones ahora.');
  
} else {
  console.log('❌ No se encontraron botones de configuraciones');
}

// 5. Verificar las rutas definidas en React Router
console.log('\n=== ANÁLISIS DE RUTAS ===');
// Buscar posibles definiciones de rutas
const scripts = document.querySelectorAll('script');
scripts.forEach((script, index) => {
  if (script.textContent.includes('configuraciones') || script.textContent.includes('Configuraciones')) {
    console.log(`📜 Script ${index} contiene "configuraciones":`, script.src || 'inline');
  }
});

// 6. Función para monitorear cambios de ruta
window.monitorRouteChanges = () => {
  console.log('👀 Iniciando monitoreo de cambios de ruta...');
  
  let lastPath = window.location.pathname;
  
  const checkInterval = setInterval(() => {
    const currentPath = window.location.pathname;
    if (currentPath !== lastPath) {
      console.log(`🔄 Cambio de ruta detectado: ${lastPath} → ${currentPath}`);
      lastPath = currentPath;
    }
  }, 100);
  
  // Detener después de 10 segundos
  setTimeout(() => {
    clearInterval(checkInterval);
    console.log('🛑 Monitoreo de ruta detenido');
  }, 10000);
};

console.log('\n=== FUNCIONES DISPONIBLES ===');
console.log('📌 monitorRouteChanges() - Inicia monitoreo de cambios de ruta');
console.log('\n✅ Debug configurado. Haz click en Configuraciones y observa la consola.');
