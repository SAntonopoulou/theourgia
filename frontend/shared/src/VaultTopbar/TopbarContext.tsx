/**
 * TopbarContext — per-route topbar registration for the admin app shell.
 *
 * Each surface registers its own title/subtitle (and optional ``before`` /
 * ``after`` slots) via :func:`useTopbar`. The shell reads from the same
 * context and renders the topbar at the top of the route content column.
 *
 * Usage:
 *
 *     function Today() {
 *       useTopbar(
 *         () => ({
 *           title: "Today",
 *           subtitle: <DateSubtitle date={now} hourIndex={hour} />,
 *           before: <TopbarSearch />,
 *         }),
 *         [date, hour],  // stable primitive deps
 *       );
 *       return <TodayBody />;
 *     }
 *
 * Wrap the app's tree with :func:`TopbarProvider` (typically inside
 * AppShell). When no surface has registered anything, the topbar renders
 * with default fallback content.
 *
 * Two-context split is intentional. The original single-context shape
 * combined ``state`` and ``set`` into one object that was recreated every
 * time ``state`` changed — putting that object in a consumer's effect deps
 * produced a tight setState → re-render → setState loop. Splitting setter
 * and state into separate contexts (and relying on React's guarantee that
 * ``useState``'s setter has stable identity) eliminates the loop.
 */

import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";

export interface TopbarRegistration {
  title?: ReactNode;
  subtitle?: ReactNode;
  /** Rendered before the theme cycler. Used for the Today search box. */
  before?: ReactNode;
  /** Rendered after the mode toggle. Used for primary surface actions. */
  after?: ReactNode;
  /**
   * Visual tone for the bar chrome itself. ``"sandbox"`` tints the bar
   * in `--sand-soft` / `--sand-line` per the Sandbox `.dc.html`; default
   * leaves the bar in the standard `--bg` / `--line`.
   */
  tone?: "sandbox";
}

type SetTopbar = (next: TopbarRegistration) => void;

const TopbarStateContext = createContext<TopbarRegistration>({});
const TopbarSetterContext = createContext<SetTopbar | null>(null);

export interface TopbarProviderProps {
  /** Optional initial state — useful for SSR / tests. */
  initial?: TopbarRegistration;
  children: ReactNode;
}

export function TopbarProvider({ initial, children }: TopbarProviderProps) {
  const [state, setState] = useState<TopbarRegistration>(initial ?? {});
  // ``setState`` from ``useState`` is stable across renders — passing it
  // directly through the setter context lets effects below depend only on
  // their own primitive deps without thrashing.
  return (
    <TopbarSetterContext.Provider value={setState}>
      <TopbarStateContext.Provider value={state}>
        {children}
      </TopbarStateContext.Provider>
    </TopbarSetterContext.Provider>
  );
}

/**
 * Read the currently-registered topbar state. Returns the empty registration
 * when called outside of a TopbarProvider.
 */
export function useTopbarState(): TopbarRegistration {
  return useContext(TopbarStateContext);
}

/**
 * Register topbar content for the current route.
 *
 * @param factory  Returns the registration. Called once on mount + whenever
 *                 the deps change.
 * @param deps     Stable primitive deps that drive re-registration. Default
 *                 ``[]`` means mount-only (call manually if you need to
 *                 update mid-lifetime).
 *
 * On unmount the registration is cleared so the next route can register
 * its own content.
 */
export function useTopbar(
  factory: () => TopbarRegistration,
  deps: ReadonlyArray<unknown> = [],
): void {
  const set = useContext(TopbarSetterContext);
  useEffect(() => {
    if (!set) return;
    set(factory());
    return () => set({});
    // ``set`` is stable from useState; ``factory`` is intentionally not in
    // deps — consumer-supplied deps drive re-registration.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
