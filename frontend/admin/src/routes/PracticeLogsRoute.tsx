/**
 * Practice Logs — admin route wrapping the shared PracticeLogsSurface.
 *
 * Wires the four sub-panels to the backend (B88):
 *   - dream      → POST /api/v1/entries (type=dream)
 *   - path       → POST /api/v1/entries (type=pathworking)
 *   - asana      → POST /api/v1/practice/body
 *   - banish     → POST /api/v1/practice/banishing
 *
 * The Banishing Seal toggle is honored in the request shape (the
 * payload carries `sealed` in correspondences) — the actual
 * client-side encryption pipeline (Mode B with CanonicalBytes
 * preview from B54) lands in a follow-up batch alongside the
 * BanishingLog.encryption_mode schema addition.
 */

import {
  type BanishingMethodWire,
  type DreamChip,
  PRACTICE_LOGS_SUBTITLE,
  PRACTICE_LOGS_TITLE,
  type PracticeLogTab,
  PracticeLogsSurface,
  Toast,
  useTopbar,
} from "@theourgia/shared";
import { useCallback } from "react";

import { apiMethods } from "../data/api.js";

// ─── Mapping helpers ─────────────────────────────────────────────

/** Rite display string → backend BanishingMethod enum + label override.
 *
 *  The B86 surface ships five rite options; the backend enum predates
 *  H04 and covers a slightly different set. We map known overlaps and
 *  route the rest through "other" with the verbatim label as
 *  method_label so the data round-trips faithfully.
 */
const RITE_TO_METHOD: Record<
  string,
  { method: BanishingMethodWire; label?: string }
> = {
  "LBRP — Lesser Banishing Ritual of the Pentagram": { method: "lbrp" },
  "LIRP — Lesser Invoking Ritual": {
    method: "other",
    label: "LIRP — Lesser Invoking Ritual",
  },
  "Star Ruby": { method: "star_ruby" },
  "Qabalistic Cross": {
    method: "other",
    label: "Qabalistic Cross",
  },
  "Grounding — three breaths to the earth": {
    method: "simple_ground",
    label: "Grounding — three breaths to the earth",
  },
};

/** Convert a "HH:MM" time string + today's date to an ISO timestamp. */
function timeToIso(time: string): string {
  const m = /^(\d{1,2}):(\d{2})$/.exec(time.trim());
  const now = new Date();
  if (!m) return now.toISOString();
  const h = Number(m[1]);
  const min = Number(m[2]);
  const d = new Date(now);
  d.setHours(h, min, 0, 0);
  return d.toISOString();
}

function chipsToMarkdown(chips: readonly DreamChip[]): string {
  if (chips.length === 0) return "";
  const symbols = chips
    .filter((c) => c.kind === "symbol")
    .map((c) => c.label);
  const figures = chips
    .filter((c) => c.kind === "figure")
    .map((c) => c.label);
  const parts: string[] = [];
  if (symbols.length > 0) parts.push(`**Symbols:** ${symbols.join(", ")}`);
  if (figures.length > 0) parts.push(`**Figures:** ${figures.join(", ")}`);
  return parts.join("\n");
}

interface DreamPayload {
  text: string;
  chips: readonly DreamChip[];
  feltSense: string;
  lucid: boolean;
}

interface PathPayload {
  path: { number: number; letter: string; trump: string; route: string };
  vision: string;
  integration: string;
}

interface AsanaPayload {
  name: string;
  breath: string;
  seconds: number;
  notes: string;
}

interface BanishPayload {
  rite: string;
  time: string;
  note: string;
  sealed: boolean;
}

// ─── Route ───────────────────────────────────────────────────────

const SAVE_TOAST_TITLE: Record<PracticeLogTab, string> = {
  dream: "Dream saved",
  path: "Pathworking saved",
  asana: "Session logged",
  banish: "Banishing logged",
};

const SEAL_PENDING_NOTE =
  "Sealed mode UI is in place; client-side encryption lands in a follow-up batch — for now the entry is recorded as plain text with a sealed flag.";

export function PracticeLogsRoute() {
  useTopbar(
    () => ({ title: PRACTICE_LOGS_TITLE, subtitle: PRACTICE_LOGS_SUBTITLE }),
    [],
  );

  const handleDream = useCallback(async (p: DreamPayload) => {
    const blocks = [
      p.text.trim(),
      chipsToMarkdown(p.chips),
      p.feltSense ? `**Felt sense:** ${p.feltSense}` : "",
      p.lucid ? "**Lucid:** yes" : "",
    ].filter(Boolean);
    await apiMethods.createEntry({
      title: `Dream — ${new Date().toLocaleDateString()}`,
      type: "dream",
      glyph: "moon",
      body: blocks.join("\n\n"),
      excerpt: p.text.slice(0, 240),
    });
  }, []);

  const handlePath = useCallback(async (p: PathPayload) => {
    const body = [
      `**Path ${p.path.number} · ${p.path.letter}** — ${p.path.trump} (${p.path.route})`,
      "",
      "## What you saw",
      p.vision.trim(),
      p.integration.trim()
        ? `\n## Integration notes\n${p.integration.trim()}`
        : "",
    ]
      .filter(Boolean)
      .join("\n");
    await apiMethods.createEntry({
      title: `Pathworking — Path ${p.path.number} ${p.path.letter}`,
      type: "pathworking",
      glyph: "feather",
      body,
      excerpt: p.vision.slice(0, 240),
    });
  }, []);

  const handleAsana = useCallback(async (p: AsanaPayload) => {
    const notes = [
      p.breath ? `Breath ratio: ${p.breath}` : "",
      p.notes.trim(),
    ]
      .filter(Boolean)
      .join("\n\n");
    await apiMethods.createBodyPracticeSession({
      kind: "asana",
      posture_or_pattern: p.name.trim() || "Āsana",
      duration_seconds: p.seconds,
      observation_notes: notes || null,
    });
  }, []);

  const handleBanish = useCallback(async (p: BanishPayload) => {
    const mapping = RITE_TO_METHOD[p.rite] ?? {
      method: "other" as const,
      label: p.rite,
    };
    await apiMethods.createBanishingLog({
      method: mapping.method,
      method_label: mapping.label ?? null,
      performed_at: timeToIso(p.time),
      notes: p.note || null,
      correspondences: { sealed: p.sealed },
    });
    if (p.sealed) {
      Toast.push({
        tone: "info",
        title: "Sealed flag noted",
        body: SEAL_PENDING_NOTE,
      });
    }
  }, []);

  const handleSave = useCallback(
    async (tab: PracticeLogTab, payload: Record<string, unknown>) => {
      try {
        if (tab === "dream") {
          await handleDream(payload as unknown as DreamPayload);
        } else if (tab === "path") {
          await handlePath(payload as unknown as PathPayload);
        } else if (tab === "asana") {
          await handleAsana(payload as unknown as AsanaPayload);
        } else {
          await handleBanish(payload as unknown as BanishPayload);
        }
        Toast.push({
          tone: "success",
          title: SAVE_TOAST_TITLE[tab],
          body: "Added to your journal.",
        });
      } catch (e) {
        Toast.push({
          tone: "warning",
          title: "Could not save",
          body:
            e instanceof Error
              ? e.message
              : "Try again — the entry was not saved.",
        });
      }
    },
    [handleAsana, handleBanish, handleDream, handlePath],
  );

  return <PracticeLogsSurface onSave={handleSave} />;
}
