/**
 * Placeholder — every Phase 02 Batch 5 route uses this until the real
 * surface lands in a later batch. Renders an EmptyState with the
 * surface's glyph + name.
 */

import { EmptyState, type GlyphName } from "@theourgia/shared";

export interface PlaceholderProps {
  glyph: GlyphName;
  title: string;
  body: string;
}

export function Placeholder({ glyph, title, body }: PlaceholderProps) {
  return (
    <div
      style={{
        maxWidth: 720,
        margin: "0 auto",
        padding: "var(--space-8, 64px) 0",
      }}
    >
      <EmptyState glyph={glyph} title={title} body={body} />
    </div>
  );
}
