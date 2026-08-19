/**
 * Read a `directional-frames` pack into its frames — for the web reference.
 *
 * A live compass is mobile-only (a computer has no magnetometer, and you are
 * not turning your desk toward a quarter). But the frame packs hold real
 * reference data — which quarter is which wind, at what bearing — and that is
 * worth showing on the web as a rose and a reading, without a fake needle.
 *
 * The payload is the phone's frame reshaped to MBF: one `self:` item per frame
 * carrying its `quarters` list.
 */

export interface FrameQuarter {
  key: string;
  label: string;
  degrees: number;
  attribution: string;
}

export interface DirectionalFrame {
  id: string;
  name: string;
  summary?: string;
  quarters: FrameQuarter[];
}

export function packToFrames(payload: unknown): DirectionalFrame[] {
  const items = (payload as { items?: unknown })?.items;
  if (!Array.isArray(items)) return [];

  const out: DirectionalFrame[] = [];
  for (const raw of items) {
    const item = raw as Record<string, unknown>;
    const id = typeof item.id === "string" ? item.id : null;
    const quarters = item.quarters;
    if (id === null || !Array.isArray(quarters)) continue;

    const qs: FrameQuarter[] = [];
    for (const q of quarters) {
      const qq = q as Record<string, unknown>;
      if (
        typeof qq.key === "string" &&
        typeof qq.label === "string" &&
        typeof qq.degrees === "number"
      ) {
        qs.push({
          key: qq.key,
          label: qq.label,
          degrees: qq.degrees,
          attribution: typeof qq.attribution === "string" ? qq.attribution : "",
        });
      }
    }
    if (qs.length === 0) continue;

    out.push({
      id,
      name: typeof item.name === "string" ? item.name : id,
      summary: typeof item.summary === "string" ? item.summary : undefined,
      quarters: qs.sort((a, b) => a.degrees - b.degrees),
    });
  }
  return out;
}
