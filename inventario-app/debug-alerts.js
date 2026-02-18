// === CÓDIGO PARA DEBUGEAR SISTEMA DE ALERTAS ===
// Pegar directamente en la consola del navegador

console.log('🧪 Iniciando debug del sistema de alertas...');

// 1. Buscar el store de toast en el contexto de React
var toastStore = null;

// Método 1: Buscar en window.__REACT_DEVTOOLS_GLOBAL_HOOK__
if (window.__REACT_DEVTOOLS_GLOBAL_HOOK__?.renderers) {
  const renderers = window.__REACT_DEVTOOLS_GLOBAL_HOOK__.renderers;
  for (let [key, renderer] of renderers) {
    if (renderer && renderer.currentRoot) {
      const root = renderer.currentRoot;
      if (root._debugRoot) {
        // Buscar en el árbol de componentes
        const findStore = (node) => {
          if (node?.stateNode?.store?.getState?.().toasts !== undefined) {
            return node.stateNode.store;
          }
          if (node?.child) {
            return findStore(node.child);
          }
          return null;
        };
        toastStore = findStore(root._debugRoot);
        if (toastStore) break;
      }
    }
  }
}

// Método 2: Buscar en objetos globales
if (!toastStore) {
  // Buscar en posibles ubicaciones globales
  const globalKeys = Object.keys(window);
  for (let key of globalKeys) {
    const obj = window[key];
    if (obj && typeof obj === 'object' && obj.getState && obj.getState().toasts !== undefined) {
      toastStore = obj;
      break;
    }
  }
}

// Método 3: Acceder directamente a través del componente React
if (!toastStore) {
  try {
    // Intentar obtener el store a través del DOM
    const reactRoot = document.querySelector('#root');
    if (reactRoot && reactRoot._reactRootContainer) {
      const fiber = reactRoot._reactRootContainer._internalRoot.current;
      const findStoreInFiber = (fiber) => {
        if (fiber.stateNode?.store?.getState?.().toasts !== undefined) {
          return fiber.stateNode.store;
        }
        if (fiber.child) {
          return findStoreInFiber(fiber.child);
        }
        return null;
      };
      toastStore = findStoreInFiber(fiber);
    }
  } catch (e) {
    console.log('⚠️ No se pudo acceder al store a través del DOM');
  }
}

if (!toastStore) {
  console.error('❌ No se encontró el store de toast.');
  console.log('🔍 Alternativa: Creando un mock de prueba...');
  
  // Crear una función de prueba directa
  window.testDirectToast = () => {
    console.log('🧪 Probando toast directamente...');
    
    // Buscar el componente ToastContainer en el DOM
    const toastContainer = document.querySelector('[class*="fixed top-4 right-4"]');
    if (toastContainer) {
      console.log('✅ ToastContainer encontrado en el DOM');
    } else {
      console.log('❌ ToastContainer NO encontrado en el DOM');
    }
    
    // Verificar si hay elementos de toast
    const toasts = document.querySelectorAll('[class*="border rounded-lg shadow-lg"]');
    console.log(`🔔 Toasts encontrados en DOM: ${toasts.length}`);
    
    return {
      containerFound: !!toastContainer,
      toastCount: toasts.length
    };
  };
  
  console.log('📌 Ejecuta testDirectToast() para verificar el DOM');
  
} else {
  console.log('✅ Store de toast encontrado:', toastStore);
  
  // 2. Ver estado actual
  const currentState = toastStore.getState();
  console.log('📊 Estado actual del store:', currentState);
  console.log('🔔 Toasts actuales:', currentState.toasts);
  
  // 3. Probar diferentes tipos de alertas
  console.log('\n=== PRUEBAS DE ALERTAS ===');
  
  // Alerta de éxito (3 segundos)
  console.log('⏰ Creando alerta de éxito (3s)...');
  const successId = currentState.success('Prueba Éxito', 'Debería autocerrarse en 3 segundos');
  console.log('🆔 ID de alerta éxito:', successId);
  
  // Alerta de error (6 segundos)
  setTimeout(() => {
    console.log('⏰ Creando alerta de error (6s)...');
    const errorId = currentState.error('Prueba Error', 'Debería autocerrarse en 6 segundos');
    console.log('🆔 ID de alerta error:', errorId);
  }, 1000);
  
  // Alerta de advertencia (4 segundos)
  setTimeout(() => {
    console.log('⏰ Creando alerta de advertencia (4s)...');
    const warningId = currentState.warning('Prueba Advertencia', 'Debería autocerrarse en 4 segundos');
    console.log('🆔 ID de alerta advertencia:', warningId);
  }, 2000);
  
  // Alerta info (3 segundos)
  setTimeout(() => {
    console.log('⏰ Creando alerta info (3s)...');
    const infoId = currentState.info('Prueba Info', 'Debería autocerrarse en 3 segundos');
    console.log('🆔 ID de alerta info:', infoId);
  }, 3000);
  
  // Alerta manual (sin autocerrado)
  setTimeout(() => {
    console.log('⏰ Creando alerta manual (sin autocerrado)...');
    const manualId = currentState.success('Prueba Manual', 'NO se autoccierra - haz clic en la X', 0);
    console.log('🆔 ID de alerta manual:', manualId);
  }, 4000);
  
  // 4. Monitorear cambios en el store
  console.log('\n=== MONITOREO DE CAMBIOS ===');
  let lastToastCount = currentState.toasts.length;
  
  const monitorInterval = setInterval(() => {
    const newState = toastStore.getState();
    const currentCount = newState.toasts.length;
    
    if (currentCount !== lastToastCount) {
      console.log(`🔄 Cambio detectado: ${lastToastCount} → ${currentCount} toasts`);
      console.log('📋 Toasts actuales:', newState.toasts);
      lastToastCount = currentCount;
    }
  }, 500);
  
  // Detener monitoreo después de 15 segundos
  setTimeout(() => {
    clearInterval(monitorInterval);
    console.log('🛑 Monitoreo detenido');
  }, 15000);
  
  // 5. Función para limpiar todas las alertas
  window.clearAllToasts = () => {
    console.log('🧹 Limpiando todas las alertas...');
    toastStore.getState().clearAll();
  };
  
  // 6. Función para probar autocerrado forzado
  window.testAutoClose = () => {
    console.log('🧪 Probando autocerrado forzado...');
    const id = toastStore.getState().success('Test Forzado', 'Se autocerrará en 2s', 2000);
    console.log('🆔 ID del test forzado:', id);
    return id;
  };
  
  // 7. Función para verificar el DOM
  window.checkToastDOM = () => {
    const toastContainer = document.querySelector('[class*="fixed top-4 right-4"]');
    const toasts = document.querySelectorAll('[class*="border rounded-lg shadow-lg"]');
    
    console.log('🖼️ ToastContainer en DOM:', !!toastContainer);
    console.log('🔔 Toasts en DOM:', toasts.length);
    
    toasts.forEach((toast, index) => {
      console.log(`📋 Toast ${index + 1}:`, toast.textContent.trim());
    });
    
    return {
      containerFound: !!toastContainer,
      toastCount: toasts.length,
      toastContents: Array.from(toasts).map(t => t.textContent.trim())
    };
  };
  
  console.log('\n=== FUNCIONES DISPONIBLES ===');
  console.log('📌 clearAllToasts() - Limpia todas las alertas');
  console.log('📌 testAutoClose() - Prueba autocerrado de 2 segundos');
  console.log('📌 checkToastDOM() - Verifica las alertas en el DOM');
  console.log('\n✅ Debug configurado. Observa la consola y las alertas en pantalla.');
}
