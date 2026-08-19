/**
 * Read an `astro-techniques` pack into its techniques — for the web reference.
 *
 * The techniques a Hellenistic practitioner reads a year or a life by —
 * profection, zodiacal releasing, the solar return — are attested procedure,
 * not computation the web performs. The phone computes them against a chart;
 * the web shows them as reference: what each one is, how the sources say to
 * read it, and where it must be handled with care.
 *
 * The payload is the phone's `techniques` list reshaped to MBF: one item per
 * technique (`ref` = `techniques:*`), plus the pack's `options` reshaped to
 * their own items (`ref` = `options:*`), which are configuration and not shown.
 */

export interface Technique {
  key: string;
  name: string;
  /** The engine primitive it drives on the phone — carried, not shown. */
  primitive?: string;
  /** `attested`, `reconstructed` — how sure the source is. */
  provenance?: string;
  summary: string;
  /** How the sources say to read it, step by step. */
  reading: string[];
  /** Where the technique reads by house, the meaning of each place. */
  houses?: { house: number; meaning: string }[];
  /** What the technique gets wrong when handled carelessly. */
  cautions: string[];
}

function strings(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === "string");
}

function houses(value: unknown): { house: number; meaning: string }[] | undefined {
  if (value === null || typeof value !== "object") return undefined;
  const out: { house: number; meaning: string }[] = [];
  for (const [key, meaning] of Object.entries(value as Record<string, unknown>)) {
    const house = Number.parseInt(key, 10);
    if (Number.isFinite(house) && typeof meaning === "string") {
      out.push({ house, meaning });
    }
  }
  if (out.length === 0) return undefined;
  return out.sort((a, b) => a.house - b.house);
}

export function packToTechniques(payload: unknown): Technique[] {
  const items = (payload as { items?: unknown })?.items;
  if (!Array.isArray(items)) return [];

  const out: Technique[] = [];
  for (const raw of items) {
    const item = raw as Record<string, unknown>;
    // The reshape keys each list under its own `ref` prefix; the techniques
    // are `techniques:*`, and the `options:*` items are configuration.
    const ref = typeof item.ref === "string" ? item.ref : "";
    if (!ref.startsWith("techniques:")) continue;

    const key = typeof item.key === "string" ? item.key : null;
    const name = typeof item.name === "string" ? item.name : null;
    if (key === null || name === null) continue;

    out.push({
      key,
      name,
      primitive: typeof item.primitive === "string" ? item.primitive : undefined,
      provenance: typeof item.provenance === "string" ? item.provenance : undefined,
      summary: typeof item.summary === "string" ? item.summary : "",
      reading: strings(item.reading),
      houses: houses(item.houses),
      cautions: strings(item.cautions),
    });
  }
  return out;
}
