/**
 * Theme type definitions + runtime helpers for setting / persisting the
 * four root attributes the design system reads.
 *
 * See ``frontend/shared/src/tokens/first-paint.js`` for the no-flash
 * counterpart that runs before any framework hydrates.
 */

export type Theme = "base" | "hellenic" | "thelemic";
export type Mode = "dark" | "light";
export type Contrast = "normal" | "high";
export type Cvd = "normal" | "safe";

export interface ThemeState {
  theme: Theme;
  mode: Mode;
  contrast: Contrast;
  cvd: Cvd;
}

export const THEMES: readonly Theme[] = ["base", "hellenic", "thelemic"];
export const MODES: readonly Mode[] = ["dark", "light"];
export const CONTRASTS: readonly Contrast[] = ["normal", "high"];
export const CVDS: readonly Cvd[] = ["normal", "safe"];

export const DEFAULT_THEME_STATE: ThemeState = {
  theme: "base",
  mode: "dark",
  contrast: "normal",
  cvd: "normal",
};

const STORAGE_PREFIX = "theourgia.";

function readKey<T extends string>(key: string, allowed: readonly T[], fallback: T): T {
  if (typeof localStorage === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + key);
    return raw && (allowed as readonly string[]).includes(raw) ? (raw as T) : fallback;
  } catch {
    return fallback;
  }
}

/** Read the current theme state from localStorage. */
export function readThemeState(): ThemeState {
  return {
    theme: readKey("theme", THEMES, DEFAULT_THEME_STATE.theme),
    mode: readKey("mode", MODES, DEFAULT_THEME_STATE.mode),
    contrast: readKey("contrast", CONTRASTS, DEFAULT_THEME_STATE.contrast),
    cvd: readKey("cvd", CVDS, DEFAULT_THEME_STATE.cvd),
  };
}

/**
 * Apply a theme state to `<html>` and mirror it to localStorage so the next
 * first-paint matches.
 */
export function applyThemeState(state: ThemeState): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.setAttribute("data-theme", state.theme);
  root.setAttribute("data-mode", state.mode);
  root.setAttribute("data-contrast", state.contrast);
  root.setAttribute("data-cvd", state.cvd);
  if (typeof localStorage !== "undefined") {
    try {
      localStorage.setItem(`${STORAGE_PREFIX}theme`, state.theme);
      localStorage.setItem(`${STORAGE_PREFIX}mode`, state.mode);
      localStorage.setItem(`${STORAGE_PREFIX}contrast`, state.contrast);
      localStorage.setItem(`${STORAGE_PREFIX}cvd`, state.cvd);
    } catch {
      // localStorage may be unavailable (private mode, embedded contexts);
      // we still applied the DOM attributes — silent fallback is fine.
    }
  }
}

/**
 * Read the current state, then merge ``patch`` and apply it. Returns the
 * fully-resolved state that was applied.
 */
export function setThemeState(patch: Partial<ThemeState>): ThemeState {
  const next = { ...readThemeState(), ...patch };
  applyThemeState(next);
  return next;
}
