# Theourgia — Design Tokens

The portable token layer behind every Theourgia surface. Two files, framework-agnostic:

| File | What it is |
|---|---|
| `theourgia.tokens.css` | The source of truth. ~70 CSS custom properties; theme + mode override blocks. Plain CSS, no build step. |
| `tailwind.theourgia.preset.js` | Optional. Maps the variables onto Tailwind's theme so utilities (`bg-surface`, `text-ink-soft`, `font-display`, `rounded-lg`) resolve to live tokens. |

## The model

Two independent axes, set as attributes on any ancestor (usually `<html>`):

```html
<html data-theme="base | hellenic | thelemic" data-mode="dark | light">
```

- **`data-theme`** swaps brand identity — the **display font** (base→Cardo, hellenic→GFS Didot, thelemic→Cinzel) and the accent + category hues.
- **`data-mode`** swaps the surface/ink ramp between dark (leads) and light.

The cascade is `:root` (base + dark) → `[data-theme=…]` → `[data-mode="light"]`. Themes set fonts/accent; mode sets surfaces; they compose. Token **names never change across themes** — only their values — so any component built on `var(--token)` re-skins for free.

## Use it directly (no framework)

```css
@import './tokens/theourgia.tokens.css';

.card {
  background: var(--bg-2);
  color: var(--ink);
  border: 1px solid var(--line);
  border-radius: var(--r-lg);
  box-shadow: var(--shadow-md);
  font-family: var(--font-serif);
}
.card h2 { font-family: var(--font-display); color: var(--ink); }
.card .meta { font-family: var(--font-ui); color: var(--ink-mute); }
```

Flip the whole UI by toggling one attribute:

```js
document.documentElement.dataset.theme = 'hellenic';
document.documentElement.dataset.mode  = 'light';
```

## Use it with Tailwind

```js
// tailwind.config.js
const theourgia = require('./tokens/tailwind.theourgia.preset.js');
module.exports = { presets: [theourgia], content: ['./**/*.{html,jsx,tsx}'] };
```

```html
<div class="bg-surface text-ink border border-line rounded-lg shadow-md font-serif">
  <h2 class="font-display text-h2">Solve et coagula</h2>
  <p class="font-ui text-ink-mute text-caption">…</p>
</div>
```

Because the utilities point at `var(--…)`, switching `data-theme`/`data-mode` re-skins without a Tailwind rebuild.

## Token groups

- **Type** — `--font-display` (theme-swapped), `--font-serif|ui|mono|glyph`, per-script `--font-hebrew|arabic|deva|coptic`; scale `--type-hero…caption`.
- **Surfaces & ink** — `--bg`, `--bg-2`, `--bg-3`, `--bg-sunk`; `--line`, `--line-2`; `--ink`, `--ink-soft`, `--ink-mute`.
- **Accent** — `--accent`, `--accent-ink` (text on accent), `--accent-soft` (tint).
- **Semantic** — `--info|success|warning|danger` (+ `--danger-bg|border`), `--care` (wellbeing — calm, never red).
- **Category** — six practice domains: `--c-journal|divination|working|entity|library|synchronicity`.
- **Elemental** — `--air|fire|water|earth` (circle/talisman work).
- **Form** — `--r-sm|md|lg|pill`, `--space-1…7`, `--shadow-sm|md|lg`, `--transition-color|all`, `--maxw-doc`, `--nav-w`.

## Accessibility

Contrast pairs are tuned for **WCAG 2.2 AA** in both modes. `prefers-reduced-motion` is honored in the token file. Two opt-in a11y layers are live at the foot of `theourgia.tokens.css`, composable with any theme/mode:

- **`[data-contrast="high"]`** — collapses `--ink-soft`/`--ink-mute` to full `--ink`, hardens borders, and solidifies alpha tints (separate light-mode overrides included).
- **`[data-cvd="safe"]`** — a blue / teal / amber / vermilion semantic + category triad that stays distinguishable under deuteranopia & protanopia. Always pair color with an icon or shape — color is never the only cue.

```html
<html data-theme="hellenic" data-mode="dark" data-contrast="high" data-cvd="safe">
```

## Fonts

Tokens reference the families by name; load them however your app does (the surfaces use Google Fonts). Faces: Cardo, GFS Didot, Cinzel, Inria Sans, JetBrains Mono, Frank Ruhl Libre, Noto Naskh Arabic, Noto Serif Devanagari, Noto Sans Coptic, Noto Sans Symbols.
