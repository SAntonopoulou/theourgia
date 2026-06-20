/**
 * Token-layer barrel.
 *
 * Consumers import this for theme helpers and the type definitions that
 * describe the design system's customization axes. The CSS file itself is
 * imported as a side-effect (Vite / Astro pick this up):
 *
 *     import "@theourgia/shared/tokens/theourgia.tokens.css";
 *
 * The first-paint script is shipped as raw JS so apps can inline it via
 * their own build pipeline:
 *
 *     import firstPaintSource from "@theourgia/shared/tokens/first-paint.js?raw";
 */

export type { Contrast, Cvd, Mode, Theme, ThemeState } from "./theme.js";
export {
  applyThemeState,
  CONTRASTS,
  CVDS,
  DEFAULT_THEME_STATE,
  MODES,
  readThemeState,
  setThemeState,
  THEMES,
} from "./theme.js";
