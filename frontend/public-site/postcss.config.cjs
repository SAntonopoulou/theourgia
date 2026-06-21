// PostCSS picks Tailwind up in Astro 6+ via Vite's built-in PostCSS
// pipeline. `@astrojs/tailwind` (the old Astro integration) doesn't
// support Astro 6 — peer is locked at `^3 || ^4 || ^5`. The admin SPA
// uses the same PostCSS-based setup, so this keeps the workspace
// consistent on Tailwind v3 + the shared `tokens/tailwind-preset`.
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
