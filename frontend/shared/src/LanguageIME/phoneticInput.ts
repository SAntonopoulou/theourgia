/**
 * One door to transliteration, both ways, across every script — the web mirror
 * of the phone's phonetic_input.dart. Type romanized, get the script
 * ({@link toScript}); read a native word back ({@link toLatin}). Sanskrit's
 * extra hop through the Devanagari assembler is hidden here.
 */

import { devanagariToIast, iastToDevanagari } from "./devanagari.js";
import { library } from "./transliteration.js";

export const TRANSLITERATION_SCRIPTS = ["greek", "coptic", "hebrew", "arabic", "sanskrit"] as const;

export type TransliterationScript = (typeof TRANSLITERATION_SCRIPTS)[number];

export const SCRIPT_LABELS: Record<string, string> = {
  greek: "Greek",
  coptic: "Coptic",
  hebrew: "Hebrew",
  arabic: "Arabic",
  sanskrit: "Sanskrit",
};

export function canTransliterate(script: string): boolean {
  return (TRANSLITERATION_SCRIPTS as readonly string[]).includes(script);
}

/**
 * Romanized `roman` → native `script`. Sanskrit routes roman → IAST → the
 * Devanagari assembler; every other script is a single phonetic pass. An
 * unknown script passes through unchanged.
 */
export function toScript(script: string, roman: string): string {
  if (script === "sanskrit") {
    const iast = library.bySlug("sanskrit-iast-input")?.apply(roman) ?? roman;
    return iastToDevanagari(iast);
  }
  return library.phoneticFor(script)?.apply(roman) ?? roman;
}

/**
 * A native word read back to roman, for tap-a-word. Sanskrit uses the
 * inherent-a-aware Devanagari reader; every other script its default scholarly
 * reading. Null if the script has no reading.
 */
export function toLatin(script: string, native: string): string | null {
  if (script === "sanskrit") return devanagariToIast(native);
  return library.readingFor(script)?.apply(native) ?? null;
}

/** The name of the reading {@link toLatin} uses for `script` (e.g. "ALA-LC"). */
export function readingName(script: string): string | null {
  return library.readingFor(script)?.name ?? null;
}

/** Whether the direction runs right to left (Hebrew, Arabic). */
export function isRtl(script: string): boolean {
  return script === "hebrew" || script === "arabic";
}
