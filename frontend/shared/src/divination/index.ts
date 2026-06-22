/**
 * Divination engines for Phase 06 surfaces (H04 handoff).
 *
 * Each sub-module ports the verbatim mockup engine from its .dc.html
 * file: data tables, lookup helpers, and the pure derivation math the
 * surface needs. Editorial text (full card/hexagram meanings) lives on
 * the backend; engines hold only the structure + traditional names +
 * citations + reference notes.
 */
export * from "./geomancy/index.js";
export * from "./iching/index.js";
export * from "./runes/index.js";
export * from "./tarot/index.js";
