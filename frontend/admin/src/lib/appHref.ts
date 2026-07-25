/**
 * appHref — resolve an internal SPA route to a browser-absolute URL.
 *
 * The admin SPA is served under Vite's BASE_URL: "/" in dev, "/app/" in
 * prod builds (vite.config.ts). Router-mediated navigation (<Link>,
 * <NavLink>, useNavigate) applies the BrowserRouter basename
 * automatically — but anything that renders a plain string href (shared
 * components taking href props, window.location writes) bypasses the
 * router. In prod a raw "/daily-practice/resh" escapes the /app prefix,
 * full-page-loads into the public Astro site, and 404s.
 *
 * Rule: internal navigation goes through the router. Where a plain
 * string is genuinely needed, resolve it through appHref() so the
 * basename is applied. The RawLinkInvariant test enforces this.
 */

/** BrowserRouter basename — BASE_URL with the trailing slash trimmed
 *  ("/app" in prod, "" in dev). */
export const APP_BASENAME = import.meta.env.BASE_URL.replace(/\/$/, "");

/** Prefix an internal app route ("/verdicts") with the SPA basename. */
export function appHref(path: string): string {
  return `${APP_BASENAME}${path}`;
}
