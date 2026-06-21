/**
 * Glyph atlas — every name in the engraving sprite, rendered at the
 * default size. Subject-glyph expansion (planetary / zodiac / decan /
 * lunar) is in the designer's pipeline; new names land here as they're
 * added to ``tokens/theourgia-icons.svg``.
 */
import type { Meta, StoryObj } from "@storybook/react";

import { Glyph } from "./Glyph.js";
import { GLYPH_NAMES } from "./names.js";

const meta = {
  title: "Foundations/Glyphs",
  parameters: { layout: "fullscreen" },
} satisfies Meta;

export default meta;
type Story = StoryObj;

export const Atlas: Story = {
  render: () => (
    <div
      style={{
        background: "var(--bg)",
        color: "var(--ink)",
        padding: 28,
        minHeight: "100vh",
        fontFamily: "var(--font-serif)",
      }}
    >
      <h1 style={{ fontFamily: "var(--font-display)", fontSize: 26, margin: "0 0 18px" }}>Glyph atlas</h1>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))", gap: 14 }}>
        {GLYPH_NAMES.map((name) => (
          <div
            key={name}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 8,
              padding: 16,
              border: "1px solid var(--line)",
              borderRadius: "var(--r-md)",
              background: "var(--bg-2)",
            }}
          >
            <Glyph name={name} size={32} />
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--ink-mute)" }}>{name}</div>
          </div>
        ))}
      </div>
    </div>
  ),
};

export const Sizes: Story = {
  render: () => (
    <div style={{ padding: 28, display: "flex", gap: 18, alignItems: "center" }}>
      {[12, 16, 20, 28, 40, 64].map((size) => (
        <div key={size} style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "center" }}>
          <Glyph name="pentacle" size={size} />
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--ink-mute)" }}>{size}px</div>
        </div>
      ))}
    </div>
  ),
};
