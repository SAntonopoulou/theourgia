/**
 * Sittings offered by installed packs — read from each pack's own `.mbf`
 * (`sitting-forms` container), and copied into an owned meditation plan on
 * adopt. Mirrors the adorations pack-read (`adoptAdorationSet`): a pack is a
 * source to adopt from, never a link, so a later pack version can't rewrite a
 * plan the practitioner has changed.
 */

import { useQuery } from "@tanstack/react-query";
import { fetchPackFeed, installedPackPayloads } from "@theourgia/shared";

import { apiMethods } from "./api.js";
import { writeMeditationPlan } from "./keepObservance.js";

export interface PackedSitting {
  name: string;
  detail: string;
  /** "sitting" (adopts into Meditation) or "breath" (the breath pacer). */
  kind: string;
  minutes: number;
}

function str(v: unknown): string {
  return typeof v === "string" ? v : "";
}
function num(v: unknown, fallback: number): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const parsed = Number(v);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

export function packedSittingsFromPayload(payload: unknown): PackedSitting[] {
  const items =
    payload && typeof payload === "object" && Array.isArray((payload as { items?: unknown }).items)
      ? ((payload as { items: unknown[] }).items ?? [])
      : [];
  const out: PackedSitting[] = [];
  for (const item of items) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const name = str(row.name);
    if (name.length === 0) continue;
    out.push({
      name,
      detail: str(row.detail),
      kind: str(row.kind) || "sitting",
      minutes: num(row.minutes, 10),
    });
  }
  return out;
}

/**
 * The sittings on offer from installed packs, of one kind ("sitting" for the
 * Meditation surface; "breath" for the breath pacer). Deduped by content, so a
 * bundle and the standalone pack it contains don't offer the same form twice.
 */
export async function fetchPackedSittings(
  kind: "sitting" | "breath" = "sitting",
): Promise<PackedSitting[]> {
  const [feed, installed] = await Promise.all([fetchPackFeed(), apiMethods.bundlesInstalled()]);
  const slugs = installed.bundles.map((b) => b.slug);
  const payloads = await installedPackPayloads(feed, slugs, "sitting-forms");
  const all = payloads
    .flatMap((p) => packedSittingsFromPayload(p.payload))
    .filter((s) => s.kind === kind);
  const seen = new Set<string>();
  return all.filter((s) => {
    const key = `${s.name} ${s.minutes} ${s.detail}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function usePackedSittings(kind: "sitting" | "breath" = "sitting") {
  return useQuery<PackedSitting[], Error>({
    queryKey: ["packed-sittings", kind],
    queryFn: () => fetchPackedSittings(kind),
  });
}

/** Adopt a packed sitting — copy it into an owned, editable meditation plan. */
export async function adoptSitting(sitting: PackedSitting): Promise<void> {
  await writeMeditationPlan({
    name: sitting.name,
    summary: sitting.detail,
    minutes: sitting.minutes,
    bell: false,
  });
}
