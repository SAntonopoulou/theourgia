/**
 * AccessibilityAndMotion — H10 Cluster B7 surface copy.
 *
 * The crisis-aware-nudge copy is verbatim from the designer
 * (`feedback_wellbeing_copy_never_improvise.md` — don't paraphrase).
 */

export const PREAMBLE =
  "Your system preferences guide the chrome by default. Override any of them here to set how Theourgia behaves for you.";

export const TOGGLES = {
  reducedMotion: {
    label: "Reduced motion",
    note: "Removes non-essential animation. Default: respects your system preference.",
  },
  contrast: {
    label: "Increased contrast",
    note: "Strengthens text and border contrast. Default: respects your system preference.",
  },
  autoplay: {
    label: "Autoplay audio",
    note: "Auto-plays recordings of voces magicae and meditation prompts. Default: off.",
  },
} as const;

export const TEXT_SCALE = {
  label: "Larger text",
  note: "Scales all text relative to the baseline.",
  min: 0.875,
  max: 1.5,
  step: 0.025,
} as const;

export const CRISIS_NUDGE = {
  label: "Crisis-aware nudge",
  body: "Opt-in. If your writing over time suggests you may be struggling, Theourgia can show a single, quiet, dismissible note pointing to the Sacred Well Directory of support resources. It is shown gently, never repeated within a session, and never assumes a diagnosis. Off by default; you choose whether this care exists.",
} as const;

export function formatScaleLabel(scale: number): string {
  // Drop trailing zeros + trailing dot, then suffix ×.
  return `${scale.toFixed(3).replace(/0+$/, "").replace(/\.$/, "")}×`;
}

export interface AccessibilityPrefs {
  reducedMotion: boolean;
  contrast: boolean;
  autoplay: boolean;
  textScale: number;
  crisisNudge: boolean;
}

export const DEFAULT_PREFS: AccessibilityPrefs = {
  reducedMotion: false,
  contrast: false,
  autoplay: false,
  textScale: 1.0,
  // Crisis-aware nudge is OFF by default — opt-in only.
  crisisNudge: false,
};
