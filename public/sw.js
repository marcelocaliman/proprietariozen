const CACHE_VERSION = 'v1'
const STATIC_CACHE = `pz-static-${CACHE_VERSION}`

const STATIC_PATTERNS = [
  /^\/_next\/static\//,
  /^\/icons\//,
  /^\/manifest\.json$/,
]

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k.startsWith('pz-') && k !== STATIC_CACHE)
            .map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)

  // Only handle same-origin GET requests
  if (url.origin !== location.origin) return
  if (event.request.method !== 'GET') return

  // Skip API and auth routes — always network
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/auth/')) return

  // Cache-first for static assets (JS, CSS, images, icons, manifest)
  if (STATIC_PATTERNS.some((p) => p.test(url.pathname))) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached
        return fetch(event.request).then((response) => {
          if (response.ok) {
            const clone = response.clone()
            caches.open(STATIC_CACHE).then((cache) => cache.put(event.request, clone))
          }
          return response
        })
      })
    )
    return
  }

  // Network-first for all pages (SSR — always fresh from server)
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  )
})
