// Kill switch. The app no longer uses a service worker (an old caching one served stale
// JS chunks after deploys). Browsers that still have one registered re-fetch this file on
// their next update check; this version clears every cache and unregisters itself.
// Nothing registers it any more; keep the file so those old installs can clean up.

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys()
      await Promise.all(names.map((name) => caches.delete(name)))
      await self.registration.unregister()
    })()
  )
})
