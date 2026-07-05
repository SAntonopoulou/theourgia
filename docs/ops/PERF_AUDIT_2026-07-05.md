# Perf budget audit — 2026-07-05 (pre-v1.0)

Snapshot ahead of the v1.0 cut. Static-analysis only; live Lighthouse
+ Web-Vitals telemetry ship separately with the on-instance
observability wave.

## Scope

- Public-site static output (`frontend/public-site`)
- Admin SPA build (`frontend/admin`)
- Third-party library payload split

## Public site — 656 KB total, zero JS

| Metric | Value | Note |
|---|---:|---|
| Total output | 656 KB | 20 static HTML pages + CSS + sprite |
| Single CSS bundle | 24 KB | inlined `BaseLayout.css`, one file |
| JS bundle | **0 KB** | Astro's zero-JS-by-default is honoured everywhere |
| Homepage HTML | 60 KB | content-heavy; hero + manifesto + toolkit + footer |
| Footer pages HTML | 16 KB each | vault · federation · hubs · self-host |

**Verdict:** ✅ excellent. First Contentful Paint is bound by the CSS
byte-count; there is no hydration cost. The public site can be served
straight from Caddy with `Cache-Control: public, max-age=31536000,
immutable` for the `_astro/*` assets. HTML pages should use
`Cache-Control: public, max-age=300, stale-while-revalidate=86400`.

## Admin SPA — 2.4 MB (600 kB gzip)

### Before the audit (single-bundle build)

| Asset | Raw | Gzip |
|---|---:|---:|
| `index-<hash>.js` | 2498 KB | 601 KB |
| `index-<hash>.css` | 12 KB | 4 KB |
| `index.html` | 9 KB | 3 KB |
| **Total** | 2519 KB | 608 KB |

Rolldown warning: "Some chunks are larger than 500 kB after
minification" — the single-bundle strategy meant every deploy busts
the whole payload's cache.

### After — 4-way manual chunk split

| Asset | Raw | Gzip | Change vs. before |
|---|---:|---:|---:|
| `index-<hash>.js` (app code) | 1797 KB | 381 KB | **−36% gzip** |
| `vendor-react` | 527 KB | 164 KB | (extracted) |
| `vendor-tiptap` | 127 KB | 42 KB | (extracted) |
| `vendor-query` | 43 KB | 13 KB | (extracted) |
| CSS + HTML | ~21 KB | ~7 KB | unchanged |
| **Total (first paint)** | 2515 KB | 607 KB | ~identical |

### What changed practically

- **First deploy:** total transfer identical (as expected — same code
  bytes).
- **Subsequent deploys where only app code changed:** browser cache
  serves `vendor-*` from disk. Network fetch is the 381 KB gzip main
  chunk + delta on the changed vendor chunks (which is zero when
  vendor deps don't change). **Practically a 36% reduction in
  revalidation payload on typical deploys.**
- **Parallel fetch:** the 4 chunks download simultaneously vs. one
  sequential ~600 KB file. On a bandwidth-limited connection, all
  four bytes-in-flight sooner.

### Remaining optimisation opportunities

1. **Route-level `React.lazy()`.** The 1797 KB main chunk includes
   every H10 route (27 surfaces), every H01-H09 surface, and the
   Tiptap editor. Splitting each route via `React.lazy(() => import(...))`
   would let the SPA ship ~200-300 KB gzip for the initial route
   (Today or Connection) and lazy-load the rest. **Deferred to
   v1.1** — the app is functional today and the caching win from the
   vendor split covers the most common redeploy case.

2. **Route-preload hints.** Once route-splitting lands, emit
   `<link rel="modulepreload">` for the current-route's chunks.
   Vite/Rolldown does this automatically once splits exist.

3. **Sprite subsetting.** The engraving icon sprite is inlined into
   `index.html` (currently ~small; not seen as a top-line concern in
   this audit). If it grows past ~10 KB gzip, split into a
   per-namespace sprite and hydrate lazily.

## Bundle-composition heuristics

Third-party libs total 697 KB raw / 220 KB gzip, split as:

- React + React DOM + React Router = 527 KB / 164 KB gzip — expected
  for React 19 + modern router
- Tiptap + ProseMirror = 127 KB / 42 KB gzip — reasonable for a
  full-featured rich-text editor
- TanStack Query = 43 KB / 13 KB gzip — minimal

**Verdict:** ✅ third-party payload is proportional to features. No
low-hanging bloat.

## Recommendations before v1.0 ship

- ✅ **Vendor-chunk split** (this audit — shipped).
- ⏳ **Route-level lazy loading** — recommended, deferred to v1.1
  (post-v1.0 optimisation batch).
- ⏳ **On-instance Web-Vitals telemetry** — ships with the
  observability wave (Phase 15 hardening tail-end).
- ⏳ **Caddy cache headers** documented — update `theourgia.caddy`
  snippet to serve `_astro/*` and `assets/*` with immutable caching.

## Live-check checklist (post-deploy)

Once the vendor-split build lands in prod, verify:

- [ ] `dist/assets/vendor-*.js` filenames are stable across deploys
      when the vendor deps don't change (they should be — the hash
      is content-addressed).
- [ ] Admin SPA first paint is unchanged (all 4 chunks still resolve
      before hydration).
- [ ] No new console errors from lazy-load boundaries (there are
      none in this audit — the split is `manualChunks`, not
      `React.lazy`; both bundles are loaded synchronously via
      `<script>` tags).

---

**Author:** Soror Ευ. Α. + Claude Opus 4.7 (1M context)
**Batch:** `b108-2cp` (perf audit)
