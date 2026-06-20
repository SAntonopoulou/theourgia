/**
 * @theourgia/shared — the design-system kit shared by every Theourgia app.
 *
 * Imports here are barrel exports of:
 *   - the token layer (theme types + apply/read helpers)
 *   - the i18n shim (passthrough today; real catalog later)
 *   - the UI primitives (Glyph + Button + IconButton + Field + TextInput +
 *     Switch + Chip + Card + Badge + EmptyState + Skeleton)
 *
 * For the CSS file and the icon sprite, import via the sub-paths declared in
 * package.json::exports — those are static assets, not JS exports.
 */

export * from "./Badge/index.js";
export * from "./Button/index.js";
export * from "./Card/index.js";
export * from "./Chip/index.js";
export * from "./EmptyState/index.js";
export * from "./Field/index.js";
export * from "./Glyph/index.js";
export * from "./i18n/index.js";
export * from "./Skeleton/index.js";
export * from "./Switch/index.js";
export * from "./tokens/index.js";
