/**
 * Theourgia service worker.
 *
 * Minimum-viable offline shell so the admin SPA stays openable without
 * the network. Two caches:
 *
 *   theo-shell — the index.html + entrypoint assets (cache-first offline)
 *   theo-runtime — same-origin GETs to other resources (stale-while-revalidate)
 *
 * NAVIGATION IS NETWORK-FIRST (b108-2hn fix)
 * ------------------------------------------
 * Before b108-2hn the SW served the cached ``/app/index.html`` on every
 * navigation, which pinned the app to whichever chunk hashes existed
 * at first install. Every deploy then broke sessions with a stale-chunk
 * 404 (e.g. ``Placeholder-Dk3fNKXU.js`` not found) until the user
 * manually cleared storage.
 *
 * Fix: navigations go to network first; only fall back to the cached
 * shell when the network fails (true offline). Asset requests still
 * use stale-while-revalidate so bounded chunk 404s recover on the
 * next online visit.
 *
 * Also: install now waits for skipWaiting so a new SW activates as
 * soon as the browser fires ``updatefound`` — the client no longer
 * has to close every tab to pick up a deploy.
 */

// Version is a wall-clock date bumped on every deploy that touches the
// SW. The activate handler clears any prior caches whose keys don't
// end in this string, so a stale shell can't linger past one visit.
const VERSION = "v4-2026-07-20";
const SHELL_CACHE = `theo-shell-${VERSION}`;
const RUNTIME_CACHE = `theo-runtime-${VERSION}`;

const SHELL_ASSETS = [
  "/app/",
  "/app/index.html",
  "/app/manifest.webmanifest",
  "/app/icon.svg",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll(SHELL_ASSETS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter(
              (k) =>
                k !== SHELL_CACHE
                && k !== RUNTIME_CACHE
                && k.startsWith("theo-"),
            )
            .map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

// Allow the page to prompt an immediate takeover after a deploy.
self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Navigation requests — network-first so fresh index.html always
  // wins over a stale cached one. Fall back to the cached shell
  // ONLY when the network is unreachable (offline mode).
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Refresh the cached shell so an eventual offline visit
          // gets the latest index.html the practitioner saw online.
          if (response.ok && response.type === "basic") {
            const clone = response.clone();
            caches.open(SHELL_CACHE).then((cache) => {
              cache.put("/app/index.html", clone);
            });
          }
          return response;
        })
        .catch(() =>
          caches.match("/app/index.html").then(
            (cached) =>
              cached
              ?? new Response(
                "<h1>Offline</h1>"
                  + "<p>The shell hasn't cached yet — visit once online to install.</p>",
                {
                  headers: { "Content-Type": "text/html; charset=utf-8" },
                },
              ),
          ),
        ),
    );
    return;
  }

  // Same-origin asset — stale-while-revalidate. If we serve a stale
  // response but the network returns a 404 (chunk was deleted in a
  // newer build), the browser will fail the module import; the
  // navigation-first path above already covers the next reload.
  event.respondWith(
    caches.open(RUNTIME_CACHE).then((cache) =>
      cache.match(request).then((cached) => {
        const networkFetch = fetch(request)
          .then((response) => {
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
