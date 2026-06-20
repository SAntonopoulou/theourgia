# Phase 02 — Batch 3: Modal overlay family

> Third implementation batch of Phase 02 (Frontend Foundations).
>
> **Scope target:** the focus-trapped overlay family — the hard rule from `agent_onboarding.md`: **NEVER alert() / confirm() / prompt()**. Themed dialogs, focus-trapped, ESC-dismissible, screen-reader-correct. Plus the inline-notification family (Toast non-blocking + Banner persistent). And Drawer because it's structurally the same as a side-anchored modal.
>
> Anchored overlays (Popover / Menu / Tooltip) and AppShell are split off into Batches 4 and 5 respectively because their infrastructure shape is different.

## Why this scope

Modal overlays share a common backbone:

1. Render via React `createPortal` so they sit outside the calling component's DOM hierarchy (avoids z-index stacking traps and overflow clipping).
2. Trap keyboard focus inside while open; restore focus to the trigger on close.
3. Dismiss on ESC + click-outside (configurable).
4. Lock body scroll while open.
5. Backdrop layer above the page, below the dialog.
6. ARIA semantics: `role="dialog"` + `aria-modal="true"` + `aria-labelledby` to the title.

Toast and Banner aren't focus-trapped but share the portal + ARIA-live patterns, so they live in this batch too. Drawer is a modal that slides in from an edge — same infrastructure, different geometry.

Anchored overlays (Menu / Tooltip / Popover) have an entirely different shape: they're *positioned relative to a trigger* and don't trap focus the same way. Splitting them out keeps the anchoring engine work coherent.

The seven components in this batch:

- **Overlay** — internal primitive (not exported) that supplies portal + focus-trap + ESC + scroll-lock + backdrop
- **ConfirmDialog** — destructive / constructive / neutral; two-button confirm
- **AlertDialog** — single-button acknowledgement (irrevocable warnings)
- **PromptDialog** — text input + confirm/cancel
- **Toast** — non-blocking notification with optional action; `Toast.push()` global API
- **Banner** — persistent inline notification; tone-driven
- **Drawer** — side panel (left or right); same focus-trap as dialogs

Out of scope (later batches):

- **Anchored overlays** (Popover, Menu, Tooltip) — Batch 4
- **CommandPalette + QuickCapture** — domain-specific overlays composing Batches 3+4; later in Phase 02
- **AppShell** — Batch 5

## Dependencies

- Batches 1 + 2 primitives (`Button`, `IconButton`, `Glyph`, `Card`, `Badge`, `Field`, `TextInput`, etc.)
- Token CSS already wires `--shadow-overlay`, `--bg-overlay`, `--z-overlay` etc.
- React 19 (already in admin) — `createPortal` works the same as React 18

## Shared infrastructure

A small set of internal modules powers all overlays.

### `src/Overlay/Overlay.tsx`

The internal primitive. Not exported at the top-level barrel — only the specialized dialog components are. Handles:

```ts
interface OverlayProps {
  open: boolean;
  onClose?: () => void;
  closeOnEsc?: boolean;        // default true
  closeOnBackdrop?: boolean;   // default true
  initialFocus?: React.RefObject<HTMLElement>;  // explicit focus target
  ariaLabelledby?: string;
  ariaDescribedby?: string;
  role?: "dialog" | "alertdialog";
  variant?: "centered" | "drawer-right" | "drawer-left";
  children: React.ReactNode;
}
```

Implementation:
- `createPortal` into `document.body` (with `typeof document` guard for SSR)
- Focus trap via a tiny inline implementation: query focusable elements once on open + Tab/Shift+Tab cycling
- `useEffect` for ESC keydown + scroll lock (`document.body.style.overflow = "hidden"` while open, restored on unmount/close)
- Backdrop: a separate `<div>` styled with `var(--bg-overlay)` and `pointer-events: auto`
- Geometry: centered (modal), or slide-in (drawer-left/right)

### `src/Overlay/focusTrap.ts`

Pure helper that returns the next/previous focusable element given a container + current event. No state. Used by Overlay's Tab handler.

### `src/Overlay/scrollLock.ts`

Reference-counted body-scroll lock — multiple overlays open at once shouldn't fight over `body.style.overflow`. Pure module-level counter.

## Components

| Component | File | Props |
|---|---|---|
| `ConfirmDialog` | `src/Dialog/ConfirmDialog.tsx` | `open`, `tone: "destructive"\|"constructive"\|"neutral"`, `title`, `body`, `confirmLabel`, `cancelLabel?`, `onConfirm`, `onCancel` |
| `AlertDialog` | `src/Dialog/AlertDialog.tsx` | `open`, `title`, `body`, `acknowledgeLabel`, `onAcknowledge`, `tone?: "warning"\|"danger"\|"info"` |
| `PromptDialog` | `src/Dialog/PromptDialog.tsx` | `open`, `title`, `label`, `defaultValue?`, `placeholder?`, `validate?`, `confirmLabel?`, `cancelLabel?`, `onSubmit(value)`, `onCancel` |
| `Drawer` | `src/Drawer/Drawer.tsx` | `open`, `side?: "left"\|"right"`, `title`, `onClose`, `width?`, `children` |
| `Toast` (component + `push()` API) | `src/Toast/Toast.tsx` + `Toast.tsx` provider | `ToastProvider` mounts the container; `Toast.push({ tone, title, body?, action?, duration? })` enqueues |
| `Banner` | `src/Banner/Banner.tsx` | `tone: "info"\|"success"\|"warning"\|"danger"`, `title`, `body?`, `dismissible?`, `action?`, `onDismiss?` |

### Notes on the API shape

**`Toast.push()` is a singleton-ish API.** The provider (`<ToastProvider />`) lives at the app root and creates a module-level emitter that `Toast.push()` writes to. Tests work because the provider mounts a fresh emitter per render; production has one global emitter for the lifetime of the app. This matches the API expected in `agent_data_and_components.md` (e.g. `Toast.push({ tone: "success", title: "Saved" })` from anywhere in the tree).

**`PromptDialog`'s validate.** `(value: string) => string | null` — return the error message (or `null` if valid). The dialog blocks Submit until validate returns null.

**`AlertDialog` vs `ConfirmDialog`.** AlertDialog is for irrevocable warnings the user must acknowledge (no cancel path). ConfirmDialog is the standard yes/no.

**`Drawer`'s width.** Default 360px right, 280px left. Configurable. Drawer never closes-on-backdrop by default if it has a form — the caller decides via the shared Overlay `closeOnBackdrop` flag.

## Tests

Per-component vitest tests, colocated. Coverage targets:

- Open / closed state renders correctly (closed = nothing in DOM)
- ESC closes (calls `onCancel` / `onClose`)
- Backdrop click closes (configurable)
- Focus moves to the dialog on open; restores to trigger on close
- Tab cycling stays within the dialog
- Confirm button calls `onConfirm`; cancel calls `onCancel`
- AlertDialog has only an acknowledge button (no cancel)
- PromptDialog: validate runs before submit; blocks submit when invalid; submit passes the value
- Toast: `push()` shows; auto-dismisses after duration; action runs callback; max-stack behavior
- Banner: dismissible variant has a close button; non-dismissible doesn't; action button works
- Drawer: side variant flips animation direction; respects width
- `aria-modal` + `role="dialog"` + `aria-labelledby` present
- Scroll lock applied on open, released on close (test by inspecting `document.body.style.overflow` before/after)

Target ~60-70 new tests for the batch.

## Smoke page

Extend `/foundations` in both apps with an "Overlays" section. Since the public-site is static, the Astro mirror demonstrates the *appearance* (a screenshot-like static rendering of a dialog) without the interactive open/close — the interactive demo lives in the admin SPA. Admin's section has a row of trigger buttons:
- "Open confirm" → ConfirmDialog (destructive tone)
- "Open alert" → AlertDialog
- "Open prompt" → PromptDialog (with validate)
- "Open drawer" → Drawer
- "Push toast" → Toast.push (with action)
- A persistent Banner above the section, dismissible

## Test plan

- `pnpm --filter @theourgia/shared test` — 163 existing + ~60 new tests
- `pnpm typecheck` — clean across all packages
- `pnpm lint` — Biome clean
- `pnpm build` — both apps build
- `pnpm deploy:dev` — ships + curl-verify gate passes
- Visual: open https://dev.theourgia.com/admin/ and click each trigger; verify ESC closes, click-outside closes (where configured), focus is trapped, focus restores

## Acceptance criteria

1. Seven new components shipped, each with tests + index.ts re-export + barrel inclusion.
2. All Batch 1+2 tests still pass; Batch 3 tests pass; typecheck + lint clean.
3. `/foundations` in admin gets an "Overlays" section with one working trigger per dialog type, a Toast.push button, and a Banner.
4. `pnpm deploy:dev` ships and verifies live.
5. Commit pushed to `main`.

## What this batch deliberately does NOT do

- **Anchored overlays** (Menu, Tooltip, Popover) — different infrastructure (positioning relative to a trigger); land in Batch 4.
- **CommandPalette** — composes Menu + Popover + Dialog; lands when Batch 4 makes its dependencies available.
- **QuickCapture overlay** — a domain-specific composer; later in Phase 02.
- **Animation library** — opens / closes use plain CSS transitions; we don't pull in Framer Motion or similar.
- **Focus trap library** — internal implementation is small (~30 lines); no `focus-trap-react` dependency.

## Risks + mitigations

- **Focus trap edge cases.** Auto-focus on first focusable element; Shift+Tab from first wraps to last; Tab from last wraps to first. Mitigation: write tests for each wrap direction; use a known focus-trap algorithm (query `[tabindex]:not([tabindex="-1"])` etc.).
- **Multiple overlays stacked.** A PromptDialog opened from inside a ConfirmDialog. Mitigation: scroll-lock is reference-counted; focus-trap honors the topmost-mounted overlay (the last one to mount captures Tab events).
- **Portal + SSR.** Astro renders pages on server. Mitigation: gate `createPortal` behind `typeof document !== "undefined"`; on first SSR pass, render nothing (the overlay is closed by definition on initial server load).
- **Toast singleton in tests.** Tests creating multiple ToastProviders could leak across tests. Mitigation: each test wraps its render in a fresh `<ToastProvider />`, and the emitter resets per-provider mount.

## Plan-doc-discipline

Same as Batches 1+2. Any deviation updates this doc before commit. Inline-style pattern matches Batch 1's authored approach. All user-facing copy through `_()`.
