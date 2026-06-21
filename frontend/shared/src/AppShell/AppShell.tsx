/**
 * AppShell — the admin app shell.
 *
 * Faithful re-implementation of the ``om-shell`` grid layout used by every
 * app-shell .dc.html surface in the design system:
 *
 *     <div class="om-shell" data-nav-open="…"
 *          style="height:100vh; display:grid;
 *                 grid-template-columns: var(--shell-nav-w) 1fr;
 *                 grid-template-rows: minmax(0,1fr);
 *                 overflow:hidden">
 *       [VaultNav .om-aside]
 *       [.om-scrim — drawer backdrop, ≤1024]
 *       <div style="display:grid; grid-template-rows: auto 1fr; min-width:0">
 *         [topbar — auto row]
 *         <main class="scroll" style="overflow-y:auto; min-height:0">…</main>
 *       </div>
 *     </div>
 *
 * Below 1024px the .om-aside slides off-canvas; the hamburger in the topbar
 * toggles ``data-nav-open`` on the .om-shell root (the responsive rules
 * live in ``theourgia.shared.css``). Scroll convention from
 * agent_onboarding §8 is honored: ``minmax(0,1fr)`` row + ``min-height:0``
 * + ``overflow-y:auto`` on the inner scroller.
 */

import { type ReactNode, useEffect, useState } from "react";

export interface AppShellProps {
  /** The route-aware topbar (typically ``<VaultTopbar />``). */
  topbar: ReactNode;
  /** The sidebar nav (typically ``<VaultNav />``). Pass null for public surfaces. */
  nav?: ReactNode;
  /** Route content. */
  children: ReactNode;
}

export function AppShell({ topbar, nav, children }: AppShellProps) {
  const [navOpen, setNavOpen] = useState(false);

  // ESC closes the off-canvas drawer (mirrors the delegated script in the
  // design's .dc.html files).
  useEffect(() => {
    function onKey(e: KeyboardEvent): void {
      if (e.key === "Escape" && navOpen) setNavOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [navOpen]);

  return (
    <div
      className="om-shell"
      data-nav-open={navOpen ? "true" : "false"}
      style={{
        height: "100vh",
        display: "grid",
        gridTemplateColumns: nav ? "var(--shell-nav-w) 1fr" : "1fr",
        gridTemplateRows: "minmax(0, 1fr)",
        background: "var(--bg)",
        color: "var(--ink)",
        fontFamily: "var(--font-serif)",
        overflow: "hidden",
      }}
    >
      {nav}

      {nav ? (
        <div
          className="om-scrim"
          aria-hidden="true"
          onClick={() => setNavOpen(false)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") setNavOpen(false);
          }}
        />
      ) : null}

      <div
        style={{
          display: "grid",
          gridTemplateRows: "auto 1fr",
          minWidth: 0,
        }}
      >
        {/* Topbar — wired with the menu toggle so the hamburger can open
            the off-canvas drawer below 1024. */}
        {wrapTopbarWithToggle(topbar, () => setNavOpen((open) => !open), navOpen)}

        <main
          className="scroll"
          style={{
            overflowY: "auto",
            overflowX: "hidden",
            minHeight: 0,
            padding: "var(--shell-pad, 28px)",
          }}
        >
          {children}
        </main>
      </div>
    </div>
  );
}

/**
 * Clone the topbar element with the menu-toggle props injected so the
 * hamburger drives the drawer state. Only injects when the topbar is a
 * proper component element (not a host element like ``<div>``) so we
 * don't put unknown attributes onto a DOM node.
 */
function wrapTopbarWithToggle(
  topbar: ReactNode,
  onMenuToggle: () => void,
  navOpen: boolean,
): ReactNode {
  if (
    topbar &&
    typeof topbar === "object" &&
    "type" in (topbar as { type?: unknown }) &&
    "props" in (topbar as { props?: unknown })
  ) {
    const el = topbar as React.ReactElement<{
      onMenuToggle?: () => void;
      navOpen?: boolean;
    }>;
    // Skip host elements (strings like "div"). Component types are
    // functions (function components) or objects (memo/forwardRef wrappers).
    if (typeof el.type === "string") return topbar;
    // Don't clobber consumer-supplied handlers.
    const existing = el.props ?? {};
    return {
      ...el,
      props: {
        ...existing,
        onMenuToggle: existing.onMenuToggle ?? onMenuToggle,
        navOpen: existing.navOpen ?? navOpen,
      },
    } as ReactNode;
  }
  return topbar;
}
