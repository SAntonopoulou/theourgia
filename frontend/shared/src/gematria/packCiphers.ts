/**
 * Turn an installed `gematria-systems` pack payload into web ciphers — so a
 * number-system installed from the feed (Greek, Hebrew, Coptic, Arabic,
 * Sanskrit…) counts on the site exactly as it counts on the phone, merged
 * beside the built-in ciphers.
 *
 * The pack payload is the phone's number-system reshaped to MBF: items, each
 * with `tables` (named char→value maps). Each table becomes one cipher; the
 * language is read from the system's id, which is script-prefixed
 * (greek-milesian, hebrew, coptic-isopsephy, arabic-abjad, sanskrit-katapayadi).
 */

import type { Cipher, CipherLanguage } from "./ciphers.js";

function inferLanguage(id: string, script: string | undefined): CipherLanguage {
  const key = id.toLowerCase();
  if (key.includes("greek")) return "greek";
  if (key.includes("hebrew")) return "hebrew";
  if (key.includes("coptic")) return "coptic";
  if (key.includes("arabic")) return "arabic";
  if (key.includes("sanskrit") || key.includes("devanagari")) return "sanskrit";
  // Fall back to the script label where the id is opaque.
  const s = (script ?? "").toLowerCase();
  if (s.includes("greek") || s.includes("ελλην")) return "greek";
  return "custom";
}

interface PackSystem {
  id?: unknown;
  name?: unknown;
  script?: unknown;
  tables?: unknown;
  methods?: unknown;
}

/** Map a `gematria-systems` payload to the ciphers it installs. Defensive: a
 *  malformed item is skipped, never thrown on. */
export function packToCiphers(payload: unknown): Cipher[] {
  const items = (payload as { items?: unknown })?.items;
  if (!Array.isArray(items)) return [];

  const out: Cipher[] = [];
  for (const raw of items) {
    const item = raw as PackSystem;
    const id = typeof item.id === "string" ? item.id : null;
    const tables = item.tables;
    if (id === null || tables === null || typeof tables !== "object") continue;

    const name = typeof item.name === "string" ? item.name : id;
    const script = typeof item.script === "string" ? item.script : undefined;
    const language = inferLanguage(id, script);
    const methods = Array.isArray(item.methods) ? item.methods : [];
    const first = methods[0] as { source?: unknown } | undefined;
    const citation = typeof first?.source === "string" ? first.source : "";

    for (const [tableName, rawValues] of Object.entries(tables as Record<string, unknown>)) {
      if (rawValues === null || typeof rawValues !== "object") continue;
      const values: Record<string, number> = {};
      for (const [ch, v] of Object.entries(rawValues as Record<string, unknown>)) {
        if (typeof v === "number") values[ch] = v;
      }
      if (Object.keys(values).length === 0) continue;
      out.push({
        id: tableName === "default" ? `pack:${id}` : `pack:${id}:${tableName}`,
        name: tableName === "default" ? name : `${name} · ${tableName}`,
        language,
        citation,
        personal: false,
        values,
      });
    }
  }
  return out;
}
