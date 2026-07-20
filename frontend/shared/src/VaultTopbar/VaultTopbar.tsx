/**
 * VaultTopbar — the admin app-shell topbar.
 *
 * Faithful re-implementation of the `om-topbar` block that appears at the
 * top of every app-shell surface in the design system (Today, Journal,
 * Library, Settings, Entities, etc.).
 *
 * Layout, left → right:
 *
 *   Hamburger button (om-menu, hidden on desktop via .om-shell media block)
 *   Title block — h1 (font-display 21px) + subtitle (font-ui 12.5px)
 *   ── margin-left: auto ──
 *   ``before`` slot (Today's search box, when present)
 *   Theme cycler (Base / Hel / Thel segmented control — .om-theme-seg)
 *   Mode toggle (sun/moon icon button, 36×36)
 *   ``after`` slot (primary action button, e.g. "New entry" / "Add work")
 *
 * Title/subtitle/before/after are pulled from :func:`useTopbarState` so each
 * route can register its own content. When nothing is registered, the
 * topbar renders without a title block (the chrome still shows).
 */

import { type ReactNode, useEffect, useState } from "react";

import {
  applyThemeState,
  MODES,
  type Mode,
  readThemeState,
  type Theme,
  THEMES,
} from "../tokens/index.js";

import { useTopbarState } from "./TopbarContext.js";

const THEME_SHORT: Record<Theme, string> = {
  base: "Base",
  hellenic: "Hel",
  thelemic: "Thel",
};

export interface VaultTopbarProps {
  /** Called when the hamburger is pressed. */
  onMenuToggle?: () => void;
  /** Hamburger aria-expanded state — driven by parent. */
  navOpen?: boolean;
  /**
   * Optional acting-as switcher. Rendered between the topbar ``before``
   * slot and the theme cycler. Use the ``<ActingAsSwitcher/>`` from
   * ``@theourgia/shared`` (or a custom node).
   *
   * Per ``agent_onboarding.md`` § Identities — acting-as is global state,
   * surfaced at the top of every admin app-shell surface.
   */
  actingAs?: ReactNode;
}

const HAMBURGER_PATH = "M4 7h16M4 12h16M4 17h16";

function HamburgerIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d={HAMBURGER_PATH} />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z" />
    </svg>
  );
}

function SunIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4" />
    </svg>
  );
}

export function VaultTopbar({ onMenuToggle, navOpen, actingAs }: VaultTopbarProps) {
  const [themeState, setThemeStateLocal] = useState(() => readThemeState());
  const { title, subtitle, before, after, tone } = useTopbarState();

  // Reflect external theme/mode changes (e.g. system preference, other tabs).
  useEffect(() => {
    function onStorage(): void {
      setThemeStateLocal(readThemeState());
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  function setTheme(theme: Theme): void {
    const next = { ...themeState, theme };
    applyThemeState(next);
    setThemeStateLocal(next);
  }

  function setMode(mode: Mode): void {
    const next = { ...themeState, mode };
    applyThemeState(next);
    setThemeStateLocal(next);
  }

  function cycleMode(): void {
    const idx = MODES.indexOf(themeState.mode);
    const next = MODES[(idx + 1) % MODES.length] ?? themeState.mode;
    setMode(next);
  }

  const segBase: React.CSSProperties = {
    padding: "5px 11px",
    fontFamily: "var(--font-ui)",
    fontSize: 12,
    letterSpacing: "0.03em",
    color: "var(--ink-mute)",
    background: "transparent",
    border: "1px solid transparent",
    borderRadius: 6,
    transition: "all 0.15s ease",
    cursor: "pointer",
  };
  const segOn: React.CSSProperties = {
    ...segBase,
    color: "var(--ink)",
    background: "var(--accent-soft)",
    borderColor: "var(--line-2)",
  };

  // Sandbox tone: per Theourgia Sandbox.dc.html line 99, the topbar is
  // tinted in `--sand-soft` with a `--sand-line` border so the boundary
  // is unmistakable from the chrome itself, not just the body banner.
  // `--sand` resolves to `--info` (cool blue, #7E91CE in base theme) per
  // `Sandbox.dc.html` line 24.
  const toneStyles: React.CSSProperties = tone === "sandbox"
    ? {
        background: "color-mix(in srgb, var(--info) 13%, transparent)",
        borderBottom: "1px solid color-mix(in srgb, var(--info) 50%, transparent)",
      }
    : { background: "var(--bg)", borderBottom: "1px solid var(--line)" };

  return (
    <header
      className="om-topbar"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 18,
        padding: "14px 28px",
        ...toneStyles,
      }}
    >
      <button
        type="button"
        className="om-menu"
        onClick={() => onMenuToggle?.()}
        aria-label="Open navigation"
        aria-expanded={navOpen ? "true" : "false"}
        style={{
          alignItems: "center",
          justifyContent: "center",
          width: 40,
          height: 40,
          border: "1px solid var(--line)",
          borderRadius: 8,
          background: "var(--bg-2)",
          color: "var(--ink-soft)",
          flex: "none",
        }}
      >
        <HamburgerIcon />
      </button>

      {(title !== undefined || subtitle !== undefined) && (
        // flex:1 1 auto + min-width:0 lets the title block yield space to
        // the action cluster on narrow screens; the title truncates with
        // an ellipsis rather than forcing the topbar wider than the
        // viewport (the mobile-overflow fix — v1-046).
        <div style={{ minWidth: 0, flex: "1 1 auto" }} className="om-topbar-title">
          {title !== undefined ? (
            <div
              style={{
                fontFamily: "var(--font-display, var(--font-serif))",
                fontSize: 21,
                lineHeight: 1.1,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {title}
            </div>
          ) : null}
          {subtitle !== undefined ? (
            <div
              className="om-topbar-subtitle"
              style={{
                fontFamily: "var(--font-ui)",
                fontSize: 12.5,
                color: "var(--ink-mute)",
                marginTop: 2,
                display: "flex",
                alignItems: "center",
                gap: 8,
                flexWrap: "wrap",
              }}
            >
              {subtitle}
            </div>
          ) : null}
        </div>
      )}

      <div
        className="om-topbar-actions"
        style={{
          marginLeft: "auto",
          display: "flex",
          alignItems: "center",
          gap: 12,
          minWidth: 0,
          flex: "0 1 auto",
        }}
      >
        {before ?? null}
        {actingAs ?? null}
        <div
          role="group"
          aria-label="Theme"
          className="om-theme-seg"
          style={{
            display: "flex",
            gap: 2,
            padding: 3,
            border: "1px solid var(--line)",
            borderRadius: 8,
            background: "var(--bg-2)",
          }}
        >
          {THEMES.map((t) => {
            const selected = t === themeState.theme;
            return (
              <button
                key={t}
                type="button"
                onClick={() => setTheme(t)}
                aria-pressed={selected}
                style={selected ? segOn : segBase}
              >
                {THEME_SHORT[t]}
              </button>
            );
          })}
        </div>
        <button
          type="button"
          onClick={cycleMode}
          aria-label="Toggle light and dark"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 36,
            height: 36,
            border: "1px solid var(--line)",
            borderRadius: 8,
            background: "var(--bg-2)",
            color: "var(--ink-soft)",
            cursor: "pointer",
          }}
        >
          {themeState.mode === "dark" ? <MoonIcon /> : <SunIcon />}
        </button>
        {after ?? null}
      </div>
    </header>
  );
}

/**
 * Convenience component for the Today (or any other "search-first" surface)
 * topbar — renders the design's "Search the record…" affordance.
 * Pure UI for now; the global search overlay isn't wired in this batch.
 */
export function TopbarSearch({ onOpen }: { onOpen?: () => void }): ReactNode {
  return (
    <button
      type="button"
      className="om-search"
      onClick={() => onOpen?.()}
      aria-label="Search the record"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "8px 13px",
        border: "1px solid var(--line)",
        borderRadius: "var(--r-md, 8px)",
        background: "var(--bg-2)",
        minWidth: 230,
        color: "var(--ink-mute)",
        cursor: "pointer",
      }}
    >
      <svg
        width="15"
        height="15"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        aria-hidden="true"
      >
        <circle cx="11" cy="11" r="7" />
        <path d="M21 21l-4.3-4.3" />
      </svg>
      <span className="om-search-label" style={{ fontFamily: "var(--font-ui)", fontSize: 13 }}>
        Search the record…
      </span>
      <span
        className="om-search-kbd"
        aria-hidden="true"
        style={{
          marginLeft: "auto",
          fontFamily: "var(--font-mono)",
          fontSize: 11,
          border: "1px solid var(--line)",
          borderRadius: 4,
          padding: "1px 5px",
        }}
      >
        ⌘K
      </span>
    </button>
  );
}
