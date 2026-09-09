self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {}
  const title = data.title || 'Spont'
  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || '',
      data: { url: data.url || '/' },
    }),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = (event.notification.data && event.notification.data.url) || '/'
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((clientsArr) => {
      const existing = clientsArr.find((c) => c.url.includes(self.location.origin))
      if (existing) return existing.focus()
      return self.clients.openWindow(url)
    }),
  )
})
