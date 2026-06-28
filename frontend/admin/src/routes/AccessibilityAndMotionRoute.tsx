/**
 * AccessibilityAndMotion — H10 B7 admin route.
 *
 * Local-storage backed (no server endpoint for v1 — the prefs are
 * applied client-side via the AccessibilityProvider that already
 * exists for the rest of the admin shell). Crisis-aware-nudge is
 * opt-in; default off (rule 60).
 *
 * Mounted at /settings/accessibility.
 */

import {
  AccessibilityAndMotionCopy,
  AccessibilityAndMotionSurface,
  useTopbar,
} from "@theourgia/shared";
import { useEffect, useState } from "react";

const PREFS_KEY = "theourgia.a11y.prefs";

function loadPrefs(): typeof AccessibilityAndMotionCopy.DEFAULT_PREFS {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (!raw) return AccessibilityAndMotionCopy.DEFAULT_PREFS;
    const parsed = JSON.parse(raw);
    return { ...AccessibilityAndMotionCopy.DEFAULT_PREFS, ...parsed };
  } catch {
    return AccessibilityAndMotionCopy.DEFAULT_PREFS;
  }
}

export function AccessibilityAndMotionRoute() {
  useTopbar(() => ({
    title: "Accessibility & motion",
    subtitle: "Contrast, text size, motion, autoplay",
  }));

  const [prefs, setPrefs] = useState(AccessibilityAndMotionCopy.DEFAULT_PREFS);

  useEffect(() => {
    setPrefs(loadPrefs());
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.reducedMotion = prefs.reducedMotion ? "1" : "";
    root.dataset.contrast = prefs.contrast ? "high" : "";
    root.style.fontSize = `${Math.round(prefs.textScale * 100)}%`;
  }, [prefs]);

  return (
    <AccessibilityAndMotionSurface
      value={prefs}
      onChange={(next) => {
        setPrefs(next);
        try {
          localStorage.setItem(PREFS_KEY, JSON.stringify(next));
        } catch {
          // localStorage unavailable — runtime-only persistence.
        }
      }}
    />
  );
}
