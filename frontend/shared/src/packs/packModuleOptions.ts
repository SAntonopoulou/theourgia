/**
 * The options a pack declares — read on the web, for the pack-settings screen.
 *
 * A pack (module) can carry `options`: a contested convention the practitioner
 * chooses, like whether the iota subscript counts for ten, or where a releasing
 * sequence resumes at the loosing of the bond. On the phone these are
 * `ModuleOption {key, label, detail, choices, byDefault}` read from the pack's
 * payload (`domain/module.dart`); `pack_to_mbf` carries a pack's `payload.options`
 * into the `.mbf` as `options:*` items, each keeping its whole definition
 * (choices, default). This reads those items back, so the web can offer the same
 * choice the phone offers. Pure — the value chosen is stored elsewhere (a synced
 * record; see `moduleSettings`).
 *
 * Known gap: a few packs (the gematria number systems) declare their options in
 * the pack *manifest* rather than the payload, and `pack_to_mbf` carries only the
 * payload's — so their options do not reach the `.mbf` yet. Covering them needs a
 * coordinated change to the pack tool (and its regenerated feed) plus a check on
 * the phone's own `.mbf` reader, and is left as a follow-up.
 */

import type { FeedPack } from "./packFeed.js";

export interface ModuleChoiceDef {
  value: string;
  label: string;
  detail: string;
}

export interface ModuleOptionDef {
  key: string;
  label: string;
  detail: string;
  choices: ModuleChoiceDef[];
  /** The value chosen when the practitioner has chosen nothing. */
  byDefault: string;
}

export interface PackModuleOptions {
  /** The pack's dotted id — the `moduleId` the phone keys its choice under. */
  moduleId: string;
  moduleName: string;
  options: ModuleOptionDef[];
}

function str(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function readChoice(raw: unknown): ModuleChoiceDef | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const value = str(o.value);
  if (value.length === 0) return null;
  return { value, label: str(o.label) || value, detail: str(o.detail) };
}

/**
 * The option definitions in a pack payload document — the `options:*` items,
 * each with its choices and default. Empty for a payload that carries none.
 */
export function moduleOptionsFromPayload(payload: unknown): ModuleOptionDef[] {
  const items =
    payload && typeof payload === "object" && Array.isArray((payload as { items?: unknown }).items)
      ? ((payload as { items: unknown[] }).items ?? [])
      : [];
  const out: ModuleOptionDef[] = [];
  for (const item of items) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    if (!str(o.ref).startsWith("options:")) continue;
    const key = str(o.key);
    if (key.length === 0) continue;
    const choices = Array.isArray(o.choices)
      ? (o.choices as unknown[]).map(readChoice).filter((c): c is ModuleChoiceDef => c !== null)
      : [];
    if (choices.length === 0) continue;
    // The phone reads the default from `default`, falling back to `byDefault`,
    // and finally to the first choice (`domain/module.dart`).
    const firstChoice = choices[0] as ModuleChoiceDef;
    const byDefault = str(o.default) || str(o.byDefault) || firstChoice.value;
    out.push({
      key,
      label: str(o.label) || key,
      detail: str(o.detail),
      choices,
      byDefault,
    });
  }
  return out;
}

/**
 * The option-bearing packs among a set of installed pack documents, each tagged
 * with the pack that owns it. Packs with no options are dropped; the rest are
 * A→Z by name.
 */
export function packModuleOptions(
  docs: readonly { pack: FeedPack; payload: unknown }[],
): PackModuleOptions[] {
  const out: PackModuleOptions[] = [];
  for (const { pack, payload } of docs) {
    const options = moduleOptionsFromPayload(payload);
    if (options.length === 0) continue;
    out.push({ moduleId: pack.id, moduleName: pack.title || pack.id, options });
  }
  return out.sort((a, b) =>
    a.moduleName.localeCompare(b.moduleName, undefined, { sensitivity: "base" }),
  );
}
