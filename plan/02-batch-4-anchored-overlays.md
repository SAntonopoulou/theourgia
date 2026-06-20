# Phase 02 — Batch 4: Anchored overlays

> Fourth implementation batch of Phase 02 (Frontend Foundations).
>
> **Scope target:** the anchored overlay family — Popover (the generic primitive), Menu (a Popover with item-list navigation), and Tooltip (a hover-delayed label panel). All three share a positioning engine that places the floating content relative to a trigger element, with flip-on-overflow.

## Why this scope

Batches 1+2 shipped 20 in-flow primitives. Batch 3 shipped the focus-trapped overlay family (dialogs, drawer, banner, toast). What's left in the design system before AppShell can land is the *anchored* overlay family — controls that pop up next to a trigger, like dropdown menus, tooltips, and the popovers behind combobox / date-picker / settings-menu surfaces.

These are split from the focus-trapped batch because their infrastructure shape is fundamentally different:

- Focus-trapped overlays (dialogs) cover the page and trap keyboard focus inside themselves
- Anchored overlays (menus, tooltips) attach to a trigger and don't trap focus — closing on Tab-out is the expected behavior

Three components in this batch:

- **Popover** — generic anchored floating panel; consumer controls open state + content
- **Menu** — Popover specialized for action lists; arrow-key navigation between items
- **Tooltip** — small label-only popover that opens on hover / focus after a configurable delay

Shared infrastructure:

- `useAnchorPosition()` hook — given trigger ref + content ref + placement preference, returns `{ top, left }` clamped to the viewport, with flip-on-overflow
- `useClickOutside()` hook — dismiss on pointerdown outside a set of refs
- All three render via `createPortal` into `document.body` (same SSR-safe pattern as Overlay)

Out of scope (later):

- **CommandPalette** — composes Popover with a search input + filtered Menu; lands when needed by a feature surface
- **Subject-glyph picker** — composes Popover with the icon picker; later
- **Modal Combobox / Autocomplete** — Popover + filtered list; later
- **AppShell** — Batch 5

## Dependencies

- Batches 1–3 primitives (Button, IconButton, Glyph, Field, Card, Banner, Dialog/Toast/Drawer)
- `createPortal` (already a peer dep through Overlay)
- No new packages

## Shared infrastructure

### `src/Anchor/useAnchorPosition.ts`

```ts
type Placement = "top" | "right" | "bottom" | "left";
type Align = "start" | "center" | "end";

interface UseAnchorPositionOpts {
  open: boolean;
  triggerRef: RefObject<HTMLElement>;
  contentRef: RefObject<HTMLElement>;
  placement?: Placement;   // default "bottom"
  align?: Align;           // default "start"
  offset?: number;         // gap between trigger + content, default 4
  flip?: boolean;          // try opposite placement on overflow, default true
}

// Returns null when closed or refs aren't mounted yet.
function useAnchorPosition(opts: UseAnchorPositionOpts): { top: number; left: number; placement: Placement } | null
```

Algorithm:

1. When `open` becomes true, measure trigger + content with `getBoundingClientRect`
2. Compute preferred position via placement + align + offset
3. If the result is offscreen and `flip` is true, try the opposite placement
4. Clamp to viewport (so the corner never escapes the screen)
5. Return the final coordinates + the effective placement (in case it flipped — Menu's item handlers may care)

Re-measures on `window.resize` and on `scroll` (passive listeners). Closes the content if the trigger scrolls out of view (left to the caller — the hook just returns coordinates).

### `src/Anchor/useClickOutside.ts`

```ts
function useClickOutside(refs: RefObject<HTMLElement>[], onOutside: () => void, enabled: boolean): void
```

Installs a single `pointerdown` listener on the document. If the click target isn't inside any of the supplied refs, calls `onOutside`. Enabled gate so consumers can disable when their open state is false.

## Components

| Component | File | Props |
|---|---|---|
| `Popover` | `src/Popover/Popover.tsx` | `open`, `onClose`, `trigger: ReactElement`, `placement?`, `align?`, `offset?`, `children` |
| `Menu` | `src/Menu/Menu.tsx` | `trigger: ReactElement`, `items: MenuItem[]`, `placement?`, `align?` |
| `Tooltip` | `src/Tooltip/Tooltip.tsx` | `label: string`, `children: ReactElement`, `placement?`, `delay?: number` |

### Notes on the API shape

**`Popover.trigger`.** Popover accepts the *trigger element* as a prop rather than wrapping it. The trigger is cloned with a ref + aria attributes (`aria-expanded`, `aria-haspopup`, `aria-controls`). This matches the pattern from `agent_data_and_components.md` — consumer writes `<Popover trigger={<Button>Menu</Button>}>...</Popover>`.

**`Menu.items` schema:**
```ts
type MenuItem =
  | { kind: "item"; label: string; glyph?: GlyphName; tone?: "default" | "danger"; onSelect: () => void; disabled?: boolean }
  | { kind: "separator" }
  | { kind: "label"; label: string }   // non-interactive section heading
```

Arrow keys move between items, skipping separators + disabled. Enter / Space activates. Escape closes. Tab closes + restores focus to the trigger.

**`Tooltip.delay`.** Default 400ms. Pass 0 to open immediately on hover/focus.

**`Tooltip` content is text only** — by intent. Tooltips that need rich content should use Popover.

## Tests

Per-component vitest tests, colocated. Coverage targets:

- `useAnchorPosition`: returns null when closed; positions below by default; flips to top when overflowing bottom; clamps to viewport edges
- `useClickOutside`: clicks inside the ref array don't fire; clicks outside do fire; respects `enabled`
- Popover: open / closed rendering; closes on outside click + ESC; trigger gets aria-expanded
- Menu: arrow nav cycles; separators / labels are skipped; Enter activates; Tab closes
- Tooltip: opens after delay on hover; closes on hover-out; opens immediately on focus; closes on blur

Target ~40-50 new tests.

## Smoke page

Extend `/foundations` in admin with an "Anchored overlays" section:

- One Tooltip wrapping a Button (label "Lunar phase notifications")
- A Menu trigger with a few items, a separator, a destructive item
- A Popover trigger that opens a card-style panel

## Test plan

- `pnpm --filter @theourgia/shared test` — 213 existing + new tests
- `pnpm typecheck` — clean
- `pnpm lint` — clean
- `pnpm deploy:dev` — ships + curl-verify gate

## Acceptance criteria

1. Three new components shipped, each with tests + index.ts re-export + barrel inclusion.
2. All existing tests still pass.
3. `/foundations` smoke page demos each component live.
4. `pnpm deploy:dev` ships and verifies.
5. Commit pushed to `main`.

## What this batch deliberately does NOT do

- **CommandPalette** — needs Popover + filtered Menu + text input; later.
- **Auto-resize on viewport change** — the position re-measures on resize, but the content's own size doesn't dynamically reflow; if content is a Menu, items don't truncate (caller responsibility).
- **Animation library** — plain CSS transitions on open.
- **Virtual scrolling for Menu** — Menus stay short by convention; long lists use Select / combobox patterns.

## Risks + mitigations

- **Anchor measurement timing.** Content size isn't known until it's mounted. Mitigation: render content invisibly first via `visibility: hidden`, measure, then unhide via state.
- **Flip-on-overflow stability.** A menu that opens just barely fitting could thrash between placements when the user scrolls. Mitigation: only flip on initial open; don't re-flip on scroll updates after that.
- **Tooltip delay accessibility.** Some users need instant feedback. Mitigation: open immediately on focus (keyboard users), only delay on hover (mouse users).
- **Click-outside with portaled content.** If we listen on `document` and the portal IS a child of body, the listener fires for clicks inside the portal too — must check against the content ref, not just the trigger ref. Mitigation: `useClickOutside` accepts an array of refs.

## Plan-doc-discipline

Same as Batches 1+2+3. Any deviation updates this doc before commit.
