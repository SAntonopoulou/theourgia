/**
 * useNarrowLayout — is the viewport narrow enough that a multi-pane
 * layout must collapse to a single column?
 *
 * Responsive sweep (v1-050): most admin surfaces are built as fixed
 * two- or three-pane splits (a fixed-width rail/sidebar + a flexible
 * content pane, usually wrapped in an ``overflow: hidden`` container).
 * On a phone the fixed pane eats most of the width and the content
 * pane is clipped off-screen. Surfaces call this hook and, when it
 * returns ``true``, stack their panes vertically (``flexDirection:
 * "column"`` / ``gridTemplateColumns: "1fr"``) and let the fixed pane
 * go full-width.
 *
 * Breakpoints:
 *   · STACK_TWO_PANE (720px) — a sidebar + content split. Below this a
 *     260–320px sidebar leaves too little for the content pane.
 *   · STACK_THREE_PANE (960px) — a rail + list + detail split needs
 *     more room, so it collapses earlier.
 *
 * SSR default is ``false`` (desktop-first); the admin app is a CSR SPA
 * so the first client render corrects immediately, and the few shared
 * surfaces that render under Astro degrade to the desktop layout,
 * which is the safe direction.
 */

import { useMediaQuery } from "./useMediaQuery.js";

export const STACK_TWO_PANE = "(max-width: 720px)";
export const STACK_THREE_PANE = "(max-width: 960px)";

export function useNarrowLayout(
  query: string = STACK_TWO_PANE,
): boolean {
  return useMediaQuery(query);
}
