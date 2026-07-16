/**
 * AccessibilityAndMotion — H10 B7 admin route.
 *
 * Local-storage backed for the purely client-side prefs (motion,
 * contrast, text scale, autoplay — applied via the root dataset just
 * like the AccessibilityProvider does for the rest of the admin
 * shell). The crisis-aware nudge toggle additionally syncs with the
 * server (v1-010): GET /api/v1/wellbeing/nudge hydrates it from the
 * `a11y.crisis_nudge` user setting and PUT persists changes, so the
 * backend nudge evaluation honors the user's choice. Crisis-aware
 * nudge is opt-in; default off (rule 60) — the server setting also
 * defaults to off.
 *
 * Mounted at /settings/accessibility.
 */

import {
  AccessibilityAndMotionCopy,
  AccessibilityAndMotionSurface,
  useTopbar,
} from "@theourgia/shared";
import { useEffect, useState } from "react";

import { apiMethods } from "../data/api.js";

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
    // Server truth for the crisis-nudge opt-in (`a11y.crisis_nudge`).
    // Offline / unauthenticated → the localStorage value stands.
    const controller = new AbortController();
    apiMethods
      .getWellbeingNudge({ signal: controller.signal })
      .then((nudge) => {
        if (typeof nudge?.enabled === "boolean") {
          setPrefs((prev) =>
            prev.crisisNudge === nudge.enabled ? prev : { ...prev, crisisNudge: nudge.enabled },
          );
        }
      })
      .catch(() => {
        // Keep the local value; the next successful load re-syncs.
      });
    return () => controller.abort();
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
        const crisisChanged = next.crisisNudge !== prefs.crisisNudge;
        setPrefs(next);
        try {
          localStorage.setItem(PREFS_KEY, JSON.stringify(next));
        } catch {
          // localStorage unavailable — runtime-only persistence.
        }
        if (crisisChanged) {
          // Persist the opt-in server-side so the backend nudge
          // evaluation (and its privacy contract) follows the choice.
          apiMethods.putWellbeingNudge({ enabled: next.crisisNudge }).catch(() => {
            // Server write failed — localStorage keeps the intent;
            // hydration re-syncs from server truth next visit.
          });
        }
      }}
    />
  );
}
