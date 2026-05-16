/**
 * Muhasebe Pro — Service Worker
 *
 * Strateji:
 *  - /_next/static/* (JS/CSS/font/hash'li asset): cache-first (1 yıl, hash değişince yeni)
 *  - /icons/*, /favicon.ico: cache-first (1 hafta)
 *  - /api/auth/*: network-only (oturum critical)
 *  - /api/files/*: cache-first (dekontlar değişmez)
 *  - /uygulama/* GET: stale-while-revalidate
 *      → cache'ten anında göster, arkada fresh fetch et, cache'i güncelle
 *  - /api/* POST/PUT/DELETE: network-only (mutation)
 *  - Diğer: network-first fallback cache
 *
 * Cache versiyonlama: yeni sürüm çıkınca CACHE_VERSION bump'la
 * (uygulamayı yeniden yüklemek eski cache'i siler)
 */

const CACHE_VERSION = "v1";
const STATIC_CACHE = `muhasebe-static-${CACHE_VERSION}`;
const PAGES_CACHE = `muhasebe-pages-${CACHE_VERSION}`;
const API_CACHE = `muhasebe-api-${CACHE_VERSION}`;

const STATIC_PATTERNS = [
  /\/_next\/static\//,
  /\/icons\//,
  /\.(?:woff2?|ttf|otf|eot)$/,
  /\.(?:png|jpe?g|gif|webp|avif|svg|ico)$/,
];

const PAGE_PATTERN = /^\/uygulama(\/.*)?$/;
const FILES_API_PATTERN = /^\/api\/files\//;
const AUTH_API_PATTERN = /^\/api\/auth\//;

self.addEventListener("install", (event) => {
  // Yeni SW hemen aktif olsun
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  // Eski cache'leri temizle
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((k) => !k.endsWith(`-${CACHE_VERSION}`))
          .map((k) => caches.delete(k)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return; // POST/PUT/DELETE → network

  const url = new URL(request.url);
  // Sadece kendi domain'imiz
  if (url.origin !== location.origin) return;

  // Auth — asla cache'leme
  if (AUTH_API_PATTERN.test(url.pathname)) return;

  // Statik asset → cache-first
  if (STATIC_PATTERNS.some((re) => re.test(url.pathname))) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }

  // Yüklenmiş dosyalar (dekontlar/logolar) → cache-first
  if (FILES_API_PATTERN.test(url.pathname)) {
    event.respondWith(cacheFirst(request, API_CACHE));
    return;
  }

  // Uygulama sayfaları → stale-while-revalidate
  if (PAGE_PATTERN.test(url.pathname)) {
    event.respondWith(staleWhileRevalidate(request, PAGES_CACHE));
    return;
  }

  // Diğer → network-first (fallback cache)
  event.respondWith(networkFirst(request, PAGES_CACHE));
});

/** Cache'te varsa hemen dön, yoksa network'ten al ve cache'le */
async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch (err) {
    return cached ?? new Response("Offline", { status: 503 });
  }
}

/** Cache'i hemen dön (varsa), aynı anda network'ten yenile */
async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  const networkPromise = fetch(request)
    .then((response) => {
      // Sadece OK + same-origin response'ları cache'le
      if (response.ok && response.type !== "opaque") {
        cache.put(request, response.clone()).catch(() => {});
      }
      return response;
    })
    .catch(() => null);

  // Cache varsa hemen dön, arkada network güncelliyor
  if (cached) {
    // Network response arka planda cache'i güncelliyor — yanıtı bekleme
    event.waitUntil?.(networkPromise);
    return cached;
  }

  // Cache yok → network'ü bekle
  const networkResponse = await networkPromise;
  return networkResponse ?? new Response("Offline", { status: 503 });
}

/** Network'ü dene, başarısızsa cache'e düş */
async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone()).catch(() => {});
    return response;
  } catch (err) {
    const cached = await cache.match(request);
    return cached ?? new Response("Offline", { status: 503 });
  }
}

// Mutation sonrası cache invalidate isteği (client tarafından gelir)
self.addEventListener("message", (event) => {
  if (event.data?.type === "INVALIDATE_PAGES") {
    void caches.delete(PAGES_CACHE);
  }
  if (event.data?.type === "CLEAR_ALL") {
    void caches.keys().then((keys) => keys.forEach((k) => caches.delete(k)));
  }
});
