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
        bg: v("bg"),
        surface: v("bg-2"),
        raised: v("bg-3"),
        sunken: v("bg-sunk"),
        line: v("line"),
        "line-2": v("line-2"),
        ink: {
          DEFAULT: v("ink"),
          soft: v("ink-soft"),
          mute: v("ink-mute"),
        },
        accent: {
          DEFAULT: v("accent"),
          ink: v("accent-ink"),
          soft: v("accent-soft"),
        },
        info: v("info"),
        success: v("success"),
        warning: v("warning"),
        danger: v("danger"),
        care: v("care"),
        // practice-category accents
        "c-journal": v("c-journal"),
        "c-divination": v("c-divination"),
        "c-working": v("c-working"),
        "c-entity": v("c-entity"),
        "c-library": v("c-library"),
        "c-synchronicity": v("c-synchronicity"),
        // elemental
        air: v("air"),
        fire: v("fire"),
        water: v("water"),
        earth: v("earth"),
        // felt (divination)
        felt: v("felt"),
        // warn (Visibility downgrade — amber, not red)
        warn: {
          DEFAULT: v("warn"),
          soft: v("warn-soft"),
          border: v("warn-border"),
        },
        // ──── H01-H03 token families ─────────────────────────────────
        // Entity relationship status + book status (shared --st- ns)
        "st-active": v("st-active"),
        "st-open": v("st-open"),
        "st-dormant": v("st-dormant"),
        "st-contracted": v("st-contracted"),
        "st-observing": v("st-observing"),
        "st-severed": v("st-severed"),
        "st-owned": v("st-owned"),
        "st-reading": v("st-reading"),
        "st-read": v("st-read"),
        "st-want": v("st-want"),
        "st-lent": v("st-lent"),
        "st-unlisted": v("st-unlisted"),
        // Contract / obligation / oath / initiation / servitor status
        "cs-draft": v("cs-draft"),
        "cs-active": v("cs-active"),
        "cs-fulfilled": v("cs-fulfilled"),
        "cs-expired": v("cs-expired"),
        "cs-dissolved": v("cs-dissolved"),
        "cs-breached": v("cs-breached"),
        "ob-pending": v("ob-pending"),
        "ob-progress": v("ob-progress"),
        "ob-fulfilled": v("ob-fulfilled"),
        "ob-overdue": v("ob-overdue"),
        "ob-waived": v("ob-waived"),
        "os-active": v("os-active"),
        "os-fulfilled": v("os-fulfilled"),
        "os-broken": v("os-broken"),
        "os-renounced": v("os-renounced"),
        "os-lapsed": v("os-lapsed"),
        "is-active": v("is-active"),
        "is-suspended": v("is-suspended"),
        "is-lapsed": v("is-lapsed"),
        "is-resigned": v("is-resigned"),
        "ss-active": v("ss-active"),
        "ss-dormant": v("ss-dormant"),
        "ss-retired": v("ss-retired"),
        "ss-decommissioned": v("ss-decommissioned"),
        "ts-pending": v("ts-pending"),
        "ts-progress": v("ts-progress"),
        "ts-completed": v("ts-completed"),
        "ts-abandoned": v("ts-abandoned"),
        // Sealed + signing
        seal: {
          DEFAULT: v("seal"),
          soft: v("seal-soft"),
          border: v("seal-border"),
        },
        verify: {
          DEFAULT: v("verify"),
          soft: v("verify-soft"),
        },
        revoke: {
          DEFAULT: v("revoke"),
          soft: v("revoke-soft"),
        },
        // Entity-kind function groups
        "g-venerated": v("g-venerated"),
        "g-approached": v("g-approached"),
        "g-intimate": v("g-intimate"),
        "g-constructed": v("g-constructed"),
        "g-other": v("g-other"),
        // Offering item categories
        "cat-liquid": v("cat-liquid"),
        "cat-solid": v("cat-solid"),
        "cat-body": v("cat-body"),
        "cat-time": v("cat-time"),
        // Reception scale
        "rc-none": v("rc-none"),
        "rc-faint": v("rc-faint"),
        "rc-clear": v("rc-clear"),
        "rc-strong": v("rc-strong"),
        "rc-over": v("rc-over"),
        // Festival traditions
        "fest-woty": v("fest-woty"),
        "fest-greek": v("fest-greek"),
        "fest-roman": v("fest-roman"),
        "fest-hekatean": v("fest-hekatean"),
        "fest-thelemic": v("fest-thelemic"),
        // Planetary / arc / moon
        "pl-sun": v("pl-sun"),
        "pl-moon": v("pl-moon"),
        "pl-merc": v("pl-merc"),
        "pl-venus": v("pl-venus"),
        "pl-mars": v("pl-mars"),
        "pl-jup": v("pl-jup"),
        "pl-sat": v("pl-sat"),
        "arc-day": v("arc-day"),
        "arc-night": v("arc-night"),
        "moon-light": v("moon-light"),
        "moon-dark": v("moon-dark"),
        // Search hit
        hit: {
          DEFAULT: v("hit"),
          bg: v("hit-bg"),
        },
        // Visibility levels
        "vis-personal": v("vis-personal"),
        "vis-viewer": v("vis-viewer"),
        "vis-hub": v("vis-hub"),
        "vis-public": v("vis-public"),
        // Print / Export parchment
        paper: {
          DEFAULT: v("paper"),
          "2": v("paper-2"),
          ink: v("paper-ink"),
          "ink-soft": v("paper-ink-soft"),
          line: v("paper-line"),
        },
        // Body silhouette
        skin: {
          DEFAULT: v("skin"),
          line: v("skin-line"),
        },
        // Alias graph edges
        edge: {
          DEFAULT: v("edge"),
          soft: v("edge-soft"),
        },
        // Contract blood binding
        "bind-blood": v("bind-blood"),
      },
      fontFamily: {
        display: [v("font-display")],
        serif: [v("font-serif")],
        ui: [v("font-ui")],
        mono: [v("font-mono")],
        glyph: [v("font-glyph")],
        greek: [v("font-greek")],
        hebrew: [v("font-hebrew")],
        arabic: [v("font-arabic")],
        deva: [v("font-deva")],
        coptic: [v("font-coptic")],
      },
      fontSize: {
        hero: [v("type-hero"), { lineHeight: v("leading-hero") }],
        h1: [v("type-h1"), { lineHeight: v("leading-h1") }],
        h2: [v("type-h2"), { lineHeight: v("leading-h2") }],
        h3: [v("type-h3"), { lineHeight: v("leading-h3") }],
        "body-lg": [v("type-body-lg")],
        body: [v("type-body"), { lineHeight: v("leading-body") }],
        "body-sm": [v("type-body-sm")],
        ui: [v("type-ui")],
        caption: [v("type-caption")],
      },
      letterSpacing: {
        eyebrow: v("tracking-eyebrow"),
        tightish: v("tracking-tight"),
      },
      borderRadius: {
        sm: v("r-sm"),
        md: v("r-md"),
        lg: v("r-lg"),
        pill: v("r-pill"),
      },
      boxShadow: {
        sm: v("shadow-sm"),
        md: v("shadow-md"),
        lg: v("shadow-lg"),
      },
      spacing: {
        s1: v("space-1"),
        s2: v("space-2"),
        s3: v("space-3"),
        s4: v("space-4"),
        s5: v("space-5"),
        s6: v("space-6"),
        s7: v("space-7"),
      },
      maxWidth: {
        doc: v("maxw-doc"),
      },
      transitionTimingFunction: {
        theourgia: "cubic-bezier(0.4, 0, 0.2, 1)",
      },
    },
  },
};
