/**
 * Practice Logs — admin route wrapping the shared PracticeLogsSurface.
 *
 * Holds no state of its own beyond the topbar title; the surface owns
 * its tab + sub-panel state. Save callbacks emit Toasts until the
 * backend `/api/v1/practice-logs` endpoints are wired.
 */

import {
  PRACTICE_LOGS_SUBTITLE,
  PRACTICE_LOGS_TITLE,
  type PracticeLogTab,
  PracticeLogsSurface,
  Toast,
  useTopbar,
} from "@theourgia/shared";
import { useCallback } from "react";

const SAVE_TOAST_TITLE: Record<PracticeLogTab, string> = {
  dream: "Dream saved",
  path: "Pathworking saved",
  asana: "Session logged",
  banish: "Banishing logged",
};

export function PracticeLogsRoute() {
  useTopbar(
    () => ({ title: PRACTICE_LOGS_TITLE, subtitle: PRACTICE_LOGS_SUBTITLE }),
    [],
  );

  const handleSave = useCallback((tab: PracticeLogTab) => {
    Toast.push({
      tone: "success",
      title: SAVE_TOAST_TITLE[tab],
      body: "Added to your journal. (Backend wiring lands with the practice-logs API.)",
    });
  }, []);

  return <PracticeLogsSurface onSave={handleSave} />;
}
