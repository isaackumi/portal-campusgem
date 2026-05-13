const CACHE_NAME = "campus-gem-ministries-v1.0.6";
const STATIC_CACHE_URLS = ["/manifest.json", "/offline.html"];

const BYPASS_PREFIXES = [
  "/api/",
  "/_next/",
  "/admin",
  "/dashboard",
  "/members",
  "/groups",
  "/attendance",
  "/visitors",
  "/auth",
  "/camp-meeting",
  "/sms",
  "/celebrations",
  "/financial",
  "/communication",
  "/f/",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_CACHE_URLS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      )
    )
  );
  self.clients.claim();
});

function shouldBypassServiceWorker(request) {
  if (request.method !== "GET") {
    return true;
  }

  if (!request.url.startsWith("http")) {
    return true;
  }

  const url = new URL(request.url);

  if (url.hostname === "localhost" || url.hostname === "127.0.0.1") {
    return true;
  }

  if (request.mode === "navigate") {
    return true;
  }

  for (const prefix of BYPASS_PREFIXES) {
    if (url.pathname.startsWith(prefix)) {
      return true;
    }
  }

  if (
    url.pathname.startsWith("/_next/") ||
    url.pathname.includes("/chunks/") ||
    url.pathname.endsWith(".js") ||
    url.pathname.endsWith(".css")
  ) {
    return true;
  }

  if (url.searchParams.has("_rsc") || url.searchParams.has("_nextData")) {
    return true;
  }

  const accept = request.headers.get("accept") || "";
  if (accept.includes("text/html") || accept.includes("text/x-component")) {
    return true;
  }

  return false;
}

self.addEventListener("fetch", (event) => {
  if (shouldBypassServiceWorker(event.request)) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(event.request, { redirect: "follow" })
        .then((response) => {
          if (
            response.type === "opaqueredirect" ||
            response.status === 302 ||
            response.status === 301
          ) {
            return response;
          }

          const contentType = response.headers.get("content-type") || "";
          if (
            !response ||
            response.status !== 200 ||
            response.type !== "basic" ||
            contentType.includes("text/html")
          ) {
            return response;
          }

          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });

          return response;
        })
        .catch(() => fetch(event.request));
    })
  );
});

self.addEventListener("sync", (event) => {
  if (event.tag === "background-sync") {
    event.waitUntil(doBackgroundSync());
  }
});

async function doBackgroundSync() {
  console.log("Background sync triggered");
}
