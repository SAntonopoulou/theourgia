/**
 * PublicChrome — the unauthenticated top header.
 *
 * Used by the public-site, the login surface, and the admin's
 * non-authenticated state. Hosts the brand, the theme + mode togglers,
 * and an action slot (usually a "Sign in" button or similar).
 */

import { type CSSProperties, type ReactNode, useState } from "react";

import { Button } from "../Button/index.js";
import { MODES, THEMES, type Theme, applyThemeState, readThemeState } from "../tokens/index.js";

export interface PublicChromeProps {
  /** Right-side actions slot. Typically a Sign in button. */
  actions?: ReactNode;
  /** Custom brand element (defaults to a serif "Theourgia" wordmark). */
  brand?: ReactNode;
  /** Hide the theme + mode togglers. */
  hideToggles?: boolean;
  className?: string;
  style?: CSSProperties;
}

const THEME_LABEL: Record<Theme, string> = {
  base: "Base",
  hellenic: "Hellenic",
  thelemic: "Thelemic",
};

function cycle<T extends string>(value: T, allowed: readonly T[]): T {
  const idx = allowed.indexOf(value);
  return allowed[(idx + 1) % allowed.length] ?? value;
}

export function PublicChrome({
  actions,
  brand,
  hideToggles = false,
  className,
  style,
}: PublicChromeProps) {
  const [themeState, setThemeStateLocal] = useState(() => readThemeState());

  function nextTheme(): void {
    const next = { ...themeState, theme: cycle(themeState.theme, THEMES) };
    applyThemeState(next);
    setThemeStateLocal(next);
  }

  function nextMode(): void {
    const next = { ...themeState, mode: cycle(themeState.mode, MODES) };
    applyThemeState(next);
    setThemeStateLocal(next);
  }

  return (
    <header
      className={className}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "var(--space-4, 16px)",
        padding: "var(--space-3, 12px) var(--space-5, 24px)",
        borderBottom: "1px solid var(--line)",
        backgroundColor: "var(--bg)",
        ...style,
      }}
    >
      {brand ?? (
        <a
          href="/"
          style={{
            fontFamily: "var(--font-display, var(--font-serif, Georgia, serif))",
            fontSize: "var(--type-h3, 20px)",
            color: "var(--ink)",
            textDecoration: "none",
            letterSpacing: "0.02em",
          }}
        >
          Theourgia
        </a>
      )}

      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2, 8px)" }}>
        {!hideToggles ? (
          <>
            <Button size="sm" variant="quiet" onClick={nextTheme} aria-label="Cycle theme">
              {THEME_LABEL[themeState.theme]}
            </Button>
            <Button size="sm" variant="quiet" onClick={nextMode} aria-label="Cycle mode">
              {themeState.mode === "dark" ? "Dark" : "Light"}
            </Button>
          </>
        ) : null}
        {actions}
      </div>
    </header>
  );
}
