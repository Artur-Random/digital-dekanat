// Service worker «Студкаб» (docs/pwa-requirements.md): вручную, без библиотек.
// - Статика (/_next/static, /brand, /icons, офлайн-страница): cache-first, кеш с версией сборки.
// - Навигация: только сеть, при обрыве — офлайн-страница. HTML не кешируется никогда.
// - Не перехватываются: не-GET, RSC-запросы, /api/*, Server Actions, чужие домены.
// - Сообщение { type: "clear" } удаляет все кеши (выход).
// Версия приходит в адресе регистрации: /sw.js?v=<версия сборки>.

const VERSION = new URL(self.location.href).searchParams.get("v") || "dev";
const STATIC_CACHE = `studcab-static-${VERSION}`;
const OFFLINE_URL = "/offline.html";
const PRECACHE = [
  OFFLINE_URL,
  "/brand/studcab-logo-light.svg",
  "/brand/studcab-logo-dark.svg",
  "/icons/icon-192.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== STATIC_CACHE).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  );
});

function isStatic(url) {
  return (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/brand/") ||
    url.pathname.startsWith("/icons/")
  );
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (request.headers.get("RSC") || url.searchParams.has("_rsc")) return;
  if (url.pathname.startsWith("/api/")) return;

  if (request.mode === "navigate") {
    event.respondWith(fetch(request).catch(() => caches.match(OFFLINE_URL)));
    return;
  }
  if (isStatic(url)) {
    event.respondWith(
      caches.match(request).then(
        (hit) =>
          hit ||
          fetch(request).then((response) => {
            if (response.ok) {
              const copy = response.clone();
              caches.open(STATIC_CACHE).then((cache) => cache.put(request, copy));
            }
            return response;
          }),
      ),
    );
  }
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "clear") {
    event.waitUntil(caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k)))));
  }
});
