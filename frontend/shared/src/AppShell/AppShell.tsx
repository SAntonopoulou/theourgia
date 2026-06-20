/**
 * AppShell — the top-level responsive application chrome.
 *
 * Desktop (≥ 768px): header above; horizontal grid of [VaultNav | main]
 *                    when the user is authenticated; just [main] otherwise.
 * Mobile (< 768px): single column; header has a hamburger that opens
 *                   VaultNav inside a focus-trapped Drawer.
 *
 * AppShell is a pure layout primitive — it doesn't know the route, the
 * nav items, or the auth state. The consumer passes the chrome, nav,
 * and content as slots so the same shell works on top of any router.
 */

import { type ReactNode, useState } from "react";

import { Button } from "../Button/index.js";
import { Drawer } from "../Drawer/index.js";
import { useMediaQuery } from "../hooks/index.js";

export interface AppShellProps {
  /** The persistent top chrome (PublicChrome-like). */
  header: ReactNode;
  /** The sidebar nav (VaultNav). Omit to render without a sidebar. */
  nav?: ReactNode;
  /** The active route's content. */
  children: ReactNode;
  /**
   * Override the breakpoint at which the sidebar collapses into a drawer.
   * CSS media-query syntax. Default ``(min-width: 768px)``.
   */
  desktopQuery?: string;
  /** Optional fixed sidebar width on desktop. Default 240px. */
  sidebarWidth?: number;
}

export function AppShell({
  header,
  nav,
  children,
  desktopQuery = "(min-width: 768px)",
  sidebarWidth = 240,
}: AppShellProps) {
  const isDesktop = useMediaQuery(desktopQuery);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const hasSidebar = nav !== undefined;
  const showInlineSidebar = hasSidebar && isDesktop;
  const showHamburger = hasSidebar && !isDesktop;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        minHeight: "100vh",
        backgroundColor: "var(--bg)",
        color: "var(--ink)",
      }}
    >
      <div style={{ display: "flex", alignItems: "stretch" }}>
        {showHamburger ? (
          <Button
            size="sm"
            variant="quiet"
            aria-label="Open navigation"
            onClick={() => setDrawerOpen(true)}
            style={{
              alignSelf: "center",
              margin: "0 var(--space-2, 8px)",
            }}
          >
            ☰
          </Button>
        ) : null}
        <div style={{ flex: 1 }}>{header}</div>
      </div>

      <div
        style={{
          display: "flex",
          flex: 1,
          minHeight: 0,
        }}
      >
        {showInlineSidebar ? (
          <aside
            style={{
              width: sidebarWidth,
              flexShrink: 0,
              borderRight: "1px solid var(--line)",
              overflow: "auto",
              maxHeight: "calc(100vh - 56px)",
              position: "sticky",
              top: 56,
            }}
          >
            {nav}
          </aside>
        ) : null}
        <main
          style={{
            flex: 1,
            minWidth: 0,
            padding: "var(--space-5, 24px)",
            overflow: "auto",
          }}
        >
          {children}
        </main>
      </div>

      {showHamburger ? (
        <Drawer
          open={drawerOpen}
          side="left"
          title="Navigation"
          width={Math.min(sidebarWidth + 40, 320)}
          onClose={() => setDrawerOpen(false)}
        >
          {/* Wrap the nav so any NavLink click can close the drawer. */}
          <div
            onClickCapture={(event) => {
              // If the click landed on an anchor / element marked as a nav link,
              // close the drawer. Imperfect heuristic; consumer can also pass
              // onNavigate to the inner VaultNav.
              const target = event.target as HTMLElement;
              if (target.closest("a, [role=link]")) setDrawerOpen(false);
            }}
          >
            {nav}
          </div>
        </Drawer>
      ) : null}
    </div>
  );
}
