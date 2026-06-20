/**
 * Theourgia — Tailwind preset
 * ---------------------------------------------------------------------------
 * Maps the CSS custom properties in `theourgia.tokens.css` onto Tailwind's
 * theme so utilities like `bg-surface`, `text-ink-soft`, `border-line`,
 * `rounded-lg`, `font-display`, `shadow-md` resolve to the live token — which
 * means every utility re-skins automatically when you flip
 * `data-theme` / `data-mode` on an ancestor. No Tailwind rebuild per theme.
 *
 * Usage (tailwind.config.js):
 *
 *   const theourgia = require('./tokens/tailwind.theourgia.preset.js');
 *   module.exports = {
 *     presets: [theourgia],
 *     content: ['./**\/*.{html,jsx,tsx}'],
 *   };
 *
 * Then import the CSS token layer once (it defines the variables):
 *   @import './tokens/theourgia.tokens.css';
 *
 * Dark mode is attribute-driven (we set surfaces via [data-mode]), so we use
 * darkMode: ['selector', '[data-mode="dark"]'] only if you also want Tailwind's
 * own `dark:` variant — the token layer already handles the surface swap.
 */

const v = (name) => `var(--${name})`;

module.exports = {
  theme: {
    extend: {
      colors: {
        bg:        v('bg'),
        surface:   v('bg-2'),
        raised:    v('bg-3'),
        sunken:    v('bg-sunk'),
        line:      v('line'),
        'line-2':  v('line-2'),
        ink: {
          DEFAULT: v('ink'),
          soft:    v('ink-soft'),
          mute:    v('ink-mute'),
        },
        accent: {
          DEFAULT: v('accent'),
          ink:     v('accent-ink'),
          soft:    v('accent-soft'),
        },
        info:    v('info'),
        success: v('success'),
        warning: v('warning'),
        danger:  v('danger'),
        care:    v('care'),
        // practice-category accents
        'c-journal':       v('c-journal'),
        'c-divination':    v('c-divination'),
        'c-working':       v('c-working'),
        'c-entity':        v('c-entity'),
        'c-library':       v('c-library'),
        'c-synchronicity': v('c-synchronicity'),
        // elemental
        air: v('air'), fire: v('fire'), water: v('water'), earth: v('earth'),
      },
      fontFamily: {
        display: [v('font-display')],
        serif:   [v('font-serif')],
        ui:      [v('font-ui')],
        mono:    [v('font-mono')],
        glyph:   [v('font-glyph')],
        hebrew:  [v('font-hebrew')],
        arabic:  [v('font-arabic')],
        deva:    [v('font-deva')],
        coptic:  [v('font-coptic')],
      },
      fontSize: {
        hero:    [v('type-hero'),    { lineHeight: v('leading-hero') }],
        h1:      [v('type-h1'),      { lineHeight: v('leading-h1') }],
        h2:      [v('type-h2'),      { lineHeight: v('leading-h2') }],
        h3:      [v('type-h3'),      { lineHeight: v('leading-h3') }],
        'body-lg': [v('type-body-lg')],
        body:    [v('type-body'),    { lineHeight: v('leading-body') }],
        'body-sm': [v('type-body-sm')],
        ui:      [v('type-ui')],
        caption: [v('type-caption')],
      },
      letterSpacing: {
        eyebrow: v('tracking-eyebrow'),
        tightish: v('tracking-tight'),
      },
      borderRadius: {
        sm:   v('r-sm'),
        md:   v('r-md'),
        lg:   v('r-lg'),
        pill: v('r-pill'),
      },
      boxShadow: {
        sm: v('shadow-sm'),
        md: v('shadow-md'),
        lg: v('shadow-lg'),
      },
      spacing: {
        s1: v('space-1'), s2: v('space-2'), s3: v('space-3'),
        s4: v('space-4'), s5: v('space-5'), s6: v('space-6'), s7: v('space-7'),
      },
      maxWidth: {
        doc: v('maxw-doc'),
      },
      transitionTimingFunction: {
        theourgia: 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
    },
  },
};
