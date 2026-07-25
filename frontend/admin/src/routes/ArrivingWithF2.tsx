/**
 * ArrivingWithF2 — honest placeholder for the three H12 practice
 * surfaces whose real compositions land in Sprint F2 (Astragaloi
 * casting, the Tetraktys ladder, the two-gate verdict queue).
 *
 * The PracticeNav links to these routes today so the practice wing is
 * complete; this small shared surface keeps them from 404ing without
 * pretending anything works yet. One component, three routes — no
 * bespoke scaffolds to unwind later.
 */

import { EmptyState, type GlyphName, useTopbar } from "@theourgia/shared";

export interface ArrivingWithF2Props {
  glyph: GlyphName;
  title: string;
  /** One sentence on what the surface will be — not what it "would" show. */
  body: string;
}

export function ArrivingWithF2({ glyph, title, body }: ArrivingWithF2Props) {
  useTopbar(() => ({ title }), [title]);
  return (
    <div
      style={{
        maxWidth: 720,
        margin: "0 auto",
        padding: "var(--space-8, 64px) 0",
      }}
    >
      <EmptyState glyph={glyph} title={title} body={body} />
      <div
        style={{
          textAlign: "center",
          marginTop: 14,
          fontFamily: "var(--font-ui)",
          fontSize: 12,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: "var(--ink-mute)",
        }}
      >
        Arriving with Sprint F2
      </div>
    </div>
  );
}
