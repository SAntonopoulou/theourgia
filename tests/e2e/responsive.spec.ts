/**
 * Responsive sweep — no horizontal overflow on a mobile viewport.
 *
 * Runs ONLY under the `mobile-chromium` project (iPhone 13, 390×844).
 * The single most damaging responsive bug on a phone is a surface that
 * is wider than the viewport: it produces a horizontal scrollbar,
 * clips content, and makes the whole app feel broken. This spec signs
 * in once and walks every key surface, asserting each fits the narrow
 * viewport.
 *
 * ### Why two checks, not one
 *
 * `document.documentElement.scrollWidth <= innerWidth` alone is not
 * enough: a child clipped by an ancestor's `overflow-x: hidden` doesn't
 * grow `scrollWidth`, yet the layout is still wrong. So we ALSO scan
 * every visible element and flag any whose right edge crosses the
 * viewport's right edge.
 *
 * ### What is deliberately NOT an offender
 *
 *  - Off-canvas chrome (a nav drawer parked at `translateX(±100%)`):
 *    it starts at or past the viewport edge, so it never *starts within*
 *    the viewport — excluded by the `left < innerWidth` guard.
 *  - `display:none` / `visibility:hidden` / `opacity:0` elements.
 *  - Content inside a horizontal scroll/clip container (an ancestor
 *    whose `overflow-x` is not `visible`). Per the project's
 *    "scroll one axis only" rule, a wide table or diagram is allowed to
 *    scroll *inside its own box*; that does not widen the page. Only
 *    elements that widen the page itself (every ancestor
 *    `overflow-x: visible`) count.
 */

import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

import { signInFresh, uniqueName } from "./helpers";

// Horizontal slack, in CSS px. Sub-pixel rounding and 1px hairline
// borders routinely push a rect ~1px past the edge without any real
// overflow; 2px absorbs that without hiding a genuine offender.
const TOLERANCE = 2;

// Key surfaces a phone user reaches. The dashboard lives at "/".
const ROUTES = [
  "/",
  "/journal",
  "/entities",
  "/library",
  "/divination/tarot",
  "/settings",
  "/settings/password",
  "/publications",
  "/analytics",
];

interface OverflowReport {
  pageOverflows: boolean;
  scrollWidth: number;
  innerWidth: number;
  offenders: string[];
}

/**
 * Measure horizontal overflow in the page under test. Runs in the
 * browser; returns a serialisable report.
 */
async function measureOverflow(page: Page): Promise<OverflowReport> {
  return page.evaluate((tolerance) => {
    const iw = window.innerWidth;
    const scrollWidth = document.documentElement.scrollWidth;
    const pageOverflows = scrollWidth > iw + tolerance;

    const offenders: string[] = [];
    for (const el of Array.from(document.body.querySelectorAll("*"))) {
      const st = getComputedStyle(el);
      if (st.display === "none" || st.visibility === "hidden" || st.opacity === "0") continue;

      const r = el.getBoundingClientRect();
      if (r.width < 1 || r.height < 1) continue;

      // Must START within the viewport but extend past its right edge.
      // Anything parked entirely off-canvas (left >= iw) is excluded.
      if (!(r.right > iw + tolerance && r.left < iw - tolerance)) continue;

      // Contained by a horizontal scroll/clip ancestor? Then it scrolls
      // inside that box and does not widen the page — allowed.
      let contained = false;
      let p: Element | null = el.parentElement;
      while (p && p !== document.documentElement) {
        if (getComputedStyle(p).overflowX !== "visible") {
          contained = true;
          break;
        }
        p = p.parentElement;
      }
      if (contained) continue;

      const cls =
        typeof el.className === "string" && el.className.trim()
          ? `.${el.className.trim().split(/\s+/).slice(0, 2).join(".")}`
          : "";
      offenders.push(
        `${el.tagName.toLowerCase()}${el.id ? `#${el.id}` : ""}${cls} ` +
          `[left=${Math.round(r.left)} right=${Math.round(r.right)} vw=${iw}]`,
      );
    }

    return { pageOverflows, scrollWidth, innerWidth: iw, offenders: offenders.slice(0, 12) };
  }, TOLERANCE);
}

/**
 * Load a route on a FRESH page (in the already-authenticated context)
 * and return it ready to measure.
 *
 * A fresh page per route is deliberate: this stack runs against the
 * REAL API, whose surfaces hold streaming/keep-alive connections open.
 * Reusing one page across nine `goto`s accumulates those connections
 * until Chromium's per-host socket pool is exhausted
 * (`ERR_INSUFFICIENT_RESOURCES`). A new page tears the previous route's
 * connections down; the session cookie lives on the shared context, so
 * auth carries over. One retry absorbs any residual transient.
 */
async function openRoute(page: Page, route: string): Promise<Page> {
  const context = page.context();
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const p = await context.newPage();
    try {
      await p.goto(route, { waitUntil: "domcontentloaded" });
      // The authenticated shell (acting-as switcher) confirms the SPA
      // mounted and we are not on a redirect/blank frame.
      await p
        .getByRole("button", { name: "Switch acting identity" })
        .waitFor({ state: "visible", timeout: 20_000 });
      // Bounded settle for async data + layout. networkidle can never
      // fire while a stream is open, so cap it and move on.
      await p.waitForLoadState("networkidle", { timeout: 2_500 }).catch(() => {
        // Best-effort: an open stream keeps the network busy so idle
        // may never arrive. The bounded wait is enough of a settle.
      });
      await p.waitForTimeout(400);
      return p;
    } catch (cause) {
      await p.close();
      if (attempt === 1) throw cause;
      await page.waitForTimeout(750);
    }
  }
  throw new Error(`unreachable: ${route}`);
}

test.describe("responsive — mobile viewport", () => {
  test("no key surface overflows the phone viewport", async ({ page }) => {
    await signInFresh(page, uniqueName("Nomad"));

    for (const route of ROUTES) {
      const routePage = await openRoute(page, route);
      const report = await measureOverflow(routePage);
      await routePage.close();

      // (a) The document itself must not scroll horizontally.
      expect
        .soft(
          report.pageOverflows,
          `${route}: page scrolls horizontally ` +
            `(scrollWidth ${report.scrollWidth} > innerWidth ${report.innerWidth})`,
        )
        .toBe(false);

      // (b) No visible, page-widening element may cross the right edge.
      expect
        .soft(
          report.offenders,
          `${route}: ${report.offenders.length} element(s) overflow the viewport — ` +
            `${report.offenders.join("; ")}`,
        )
        .toEqual([]);
    }
  });
});
