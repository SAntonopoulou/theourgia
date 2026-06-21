/**
 * Foundations — visual atlas of the Theourgia design tokens.
 *
 * Renders the palette, type scale, radii, and surface elevations so every
 * tradition × mode combination can be eyeballed for drift. Switch the
 * Tradition / Mode globals in the toolbar to see each surface re-cast.
 */
import type { Meta, StoryObj } from "@storybook/react";

const meta = {
  title: "Foundations/Tokens",
  parameters: { layout: "fullscreen" },
} satisfies Meta;

export default meta;
type Story = StoryObj;

const SURFACES = [
  { token: "--bg", label: "Base surface", note: "Page background" },
  { token: "--bg-2", label: "Raised", note: "Cards, panels" },
  { token: "--bg-3", label: "Elevated", note: "Hover, popovers" },
  { token: "--bg-sunk", label: "Recessed", note: "Code, terminal" },
];
const INK = [
  { token: "--ink", label: "Primary ink", note: "Body & headings" },
  { token: "--ink-soft", label: "Secondary ink", note: "Captions, copy" },
  { token: "--ink-mute", label: "Tertiary ink", note: "Helper text" },
];
const ACCENT = [
  { token: "--accent", label: "Accent", note: "Affirmative actions" },
  { token: "--accent-soft", label: "Accent soft", note: "Pressed / selected fills" },
];
const SEMANTIC = [
  { token: "--info", label: "Info" },
  { token: "--success", label: "Success" },
  { token: "--warning", label: "Warning" },
  { token: "--danger", label: "Danger" },
  { token: "--care", label: "Care (wellbeing)" },
];
const CATEGORY = [
  { token: "--c-journal", label: "Journal" },
  { token: "--c-divination", label: "Divination" },
  { token: "--c-working", label: "Working" },
  { token: "--c-entity", label: "Entity" },
  { token: "--c-library", label: "Library" },
  { token: "--c-synchronicity", label: "Synchronicity" },
];
const TYPE_SCALE = [
  { size: 40, label: "Display 40", family: "var(--font-display)" },
  { size: 26, label: "Display 26", family: "var(--font-display)" },
  { size: 19, label: "Display 19", family: "var(--font-display)" },
  { size: 16, label: "Serif 16 body", family: "var(--font-serif)" },
  { size: 14, label: "Serif 14 body", family: "var(--font-serif)" },
  { size: 13, label: "UI 13", family: "var(--font-ui)" },
  { size: 11, label: "UI 11 caption", family: "var(--font-ui)" },
  { size: 12, label: "Mono 12", family: "var(--font-mono)" },
];

function Swatch({ token, label, note }: { token: string; label: string; note?: string }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 8,
        padding: 14,
        border: "1px solid var(--line)",
        borderRadius: "var(--r-md)",
        background: "var(--bg-2)",
      }}
    >
      <div
        aria-hidden="true"
        style={{
          width: "100%",
          height: 56,
          borderRadius: "var(--r-sm)",
          background: `var(${token})`,
          border: "1px solid var(--line)",
        }}
      />
      <div style={{ fontFamily: "var(--font-ui)", fontSize: 12.5, color: "var(--ink)" }}>{label}</div>
      <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--ink-mute)" }}>{token}</div>
      {note ? <div style={{ fontFamily: "var(--font-ui)", fontSize: 11, color: "var(--ink-mute)" }}>{note}</div> : null}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 32 }}>
      <h2
        style={{
          fontFamily: "var(--font-ui)",
          fontSize: 11,
          letterSpacing: "0.16em",
          textTransform: "uppercase",
          color: "var(--ink-mute)",
          margin: "0 0 14px",
        }}
      >
        {title}
      </h2>
      {children}
    </section>
  );
}

function Grid({ items }: { items: { token: string; label: string; note?: string }[] }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 12 }}>
      {items.map((item) => (
        <Swatch key={item.token} {...item} />
      ))}
    </div>
  );
}

export const Palette: Story = {
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
      <h1
        style={{
          fontFamily: "var(--font-display)",
          fontSize: 28,
          margin: "0 0 24px",
          letterSpacing: "-0.01em",
        }}
      >
        Theourgia tokens
      </h1>
      <Section title="Surfaces"><Grid items={SURFACES} /></Section>
      <Section title="Ink"><Grid items={INK} /></Section>
      <Section title="Accent"><Grid items={ACCENT} /></Section>
      <Section title="Semantic"><Grid items={SEMANTIC} /></Section>
      <Section title="Content categories"><Grid items={CATEGORY} /></Section>
    </div>
  ),
};

export const TypeScale: Story = {
  render: () => (
    <div style={{ background: "var(--bg)", color: "var(--ink)", padding: 28, minHeight: "100vh" }}>
      <h1 style={{ fontFamily: "var(--font-display)", fontSize: 28, margin: "0 0 24px" }}>Type scale</h1>
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        {TYPE_SCALE.map((t) => (
          <div key={t.label}>
            <div
              style={{
                fontFamily: t.family,
                fontSize: t.size,
                lineHeight: 1.2,
                color: "var(--ink)",
              }}
            >
              The candle flickers. The breath steadies.
            </div>
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                color: "var(--ink-mute)",
                marginTop: 4,
              }}
            >
              {t.label} · {t.family}
            </div>
          </div>
        ))}
      </div>
    </div>
  ),
};

export const Radii: Story = {
  render: () => (
    <div style={{ background: "var(--bg)", color: "var(--ink)", padding: 28, minHeight: "100vh" }}>
      <h1 style={{ fontFamily: "var(--font-display)", fontSize: 28, margin: "0 0 24px" }}>Radii</h1>
      <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
        {[
          { token: "--r-sm", px: 4 },
          { token: "--r-md", px: 8 },
          { token: "--r-lg", px: 14 },
        ].map((r) => (
          <div
            key={r.token}
            style={{
              width: 140,
              height: 90,
              border: "1px solid var(--line-2)",
              borderRadius: `var(${r.token})`,
              background: "var(--bg-2)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: "var(--font-mono)",
              fontSize: 12,
              color: "var(--ink-mute)",
            }}
          >
            {r.token} · {r.px}px
          </div>
        ))}
      </div>
    </div>
  ),
};
