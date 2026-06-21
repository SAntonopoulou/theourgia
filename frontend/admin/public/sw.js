/**
 * Theourgia service worker.
 *
 * Minimum-viable offline shell so the admin SPA stays openable without
 * the network. Two caches:
 *
 *   theo-shell — the index.html + entrypoint assets (cache-first)
 *   theo-runtime — same-origin GETs to other resources (stale-while-revalidate)
 *
 * Per ``feedback_mcp_first.md`` + ``feedback_quality_over_speed.md`` — no
 * background sync, no push notifications, no analytics. The worker
 * exists *only* so the practitioner who opens the app on the train,
 * subway, or in a basement temple can still write down what just
 * happened. Captured entries persist to localStorage and replay on next
 * online visit (handled by the route, not the worker).
 *
 * Cache invalidation: bump VERSION on each deploy and the activate
 * handler clears the old caches.
 */

const VERSION = "v1";
const SHELL_CACHE = `theo-shell-${VERSION}`;
const RUNTIME_CACHE = `theo-runtime-${VERSION}`;

const SHELL_ASSETS = ["/admin/", "/admin/index.html", "/admin/manifest.webmanifest", "/admin/icon.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) => cache.addAll(SHELL_ASSETS)).then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k !== SHELL_CACHE && k !== RUNTIME_CACHE && k.startsWith("theo-"))
            .map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Navigation requests — serve the cached shell so offline boot works.
  if (request.mode === "navigate") {
    event.respondWith(
      caches.match("/admin/index.html").then(
        (cached) =>
          cached ??
          fetch(request).catch(
            () =>
              new Response("<h1>Offline</h1><p>The shell hasn't cached yet — visit once online to install.</p>", {
                headers: { "Content-Type": "text/html; charset=utf-8" },
              }),
          ),
      ),
    );
    return;
  }

  // Same-origin asset — stale-while-revalidate.
  event.respondWith(
    caches.open(RUNTIME_CACHE).then((cache) =>
      cache.match(request).then((cached) => {
        const networkFetch = fetch(request)
          .then((response) => {
            // Only cache successful, basic responses.
            if (response.ok && response.type === "basic") {
              cache.put(request, response.clone());
            }
            return response;
          })
          .catch(() => cached);
        return cached || networkFetch;
      }),
    ),
  );
});
