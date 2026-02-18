/**
 * Service Worker for background notifications
 * Compatible with Vite - placed in /public for static serving
 */

const CACHE_NAME = 'inventario-notifications-v1'

// Install event
self.addEventListener('install', (event) => {
  self.skipWaiting()
})

// Activate event
self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  const data = event.notification.data || {}
  let url = '/'

  if (data.tipo === 'stock_bajo') url = '/inventario'
  else if (data.tipo?.includes('transferencia')) url = '/transferencias'
  else if (data.tipo?.includes('conteo')) url = '/conteos'

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      // Focus existing window if available
      for (const client of clients) {
        if (client.url.includes(self.location.origin)) {
          client.focus()
          client.navigate(url)
          return
        }
      }
      // Open new window
      return self.clients.openWindow(url)
    })
  )
})

// Handle push events (for future FCM integration)
self.addEventListener('push', (event) => {
  if (!event.data) return

  try {
    const data = event.data.json()
    const options = {
      body: data.mensaje || data.body || '',
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      tag: data.tag || 'inventory-push',
      renotify: true,
      data: { tipo: data.tipo, url: data.url }
    }

    event.waitUntil(
      self.registration.showNotification(data.titulo || data.title || 'Inventario', options)
    )
  } catch (e) {
    console.error('SW push error:', e)
  }
})
