/**
 * Foundations — the design-system smoke page.
 *
 * Faithful port of ``Theourgia Foundations.dc.html``. The .dc.html ships
 * as a public-style page-scroll surface with its own header; we embed it
 * inside the admin shell so the topbar (theme cycler + mode toggle) is
 * already provided by VaultTopbar. The body keeps the numbered sections
 * (01 Wordmark / 02 Type / 03 Color / 04 Form / 05 Icons / 06 Components)
 * with the design's exact tone, typography, and token usage.
 *
 * Used as the visual reference for the shared-primitive audit. Every
 * primitive in ``frontend/shared/src/*`` should reproduce the appearance
 * shown here.
 */

import { useTopbar } from "@theourgia/shared";
import { useState } from "react";

// ─── Small primitives ──────────────────────────────────────────────────────

const sectionLabel: React.CSSProperties = {
  fontFamily: "var(--font-ui)",
  fontSize: 10.5,
  letterSpacing: "0.15em",
  textTransform: "uppercase",
  color: "var(--ink-mute)",
};

const sectionHeading: React.CSSProperties = {
  fontFamily: "var(--font-display, var(--font-serif))",
  fontSize: 27,
  margin: 0,
};

function SectionTitle({ no, title }: { no: string; title: string }) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", gap: 14, marginBottom: 26 }}>
      <span
        style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--accent)" }}
      >
        {no}
      </span>
      <h2 style={sectionHeading}>{title}</h2>
    </div>
  );
}

// ─── Hero ──────────────────────────────────────────────────────────────────

function Hero() {
  return (
    <section style={{ maxWidth: 980, margin: "0 auto", padding: "40px 0 30px" }}>
      <div
        style={{
          fontFamily: "var(--font-ui)",
          fontSize: 11,
          letterSpacing: "0.2em",
          textTransform: "uppercase",
          color: "var(--accent)",
          marginBottom: 20,
        }}
      >
        The design system
      </div>
      <h1
        style={{
          fontFamily: "var(--font-display, var(--font-serif))",
          fontWeight: 700,
          fontSize: "clamp(40px, 6vw, 68px)",
          lineHeight: 1.04,
          margin: "0 0 22px",
          letterSpacing: "-0.015em",
        }}
      >
        Professional infrastructure
        <br />
        for the working magician.
      </h1>
      <p
        style={{
          fontFamily: "var(--font-serif)",
          fontSize: 19,
          lineHeight: 1.6,
          color: "var(--ink-soft)",
          maxWidth: "60ch",
          margin: 0,
        }}
      >
        An antiquarian-library gravity applied with the typographic care of a grimoire — and the
        discipline of modern software. Every color, font role, radius, and space is a token.
        Three traditions, two modes, one system.
      </p>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 28 }}>
        {["Dark-first", "Tailwind-portable tokens", "WCAG 2.2 AA", "Multi-script"].map((t) => (
          <span
            key={t}
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: 12.5,
              color: "var(--ink-soft)",
              padding: "6px 13px",
              border: "1px solid var(--line-2)",
              borderRadius: 999,
            }}
          >
            {t}
          </span>
        ))}
      </div>
    </section>
  );
}

// ─── Wordmark ──────────────────────────────────────────────────────────────

function WordmarkSection() {
  return (
    <section
      style={{
        maxWidth: 980,
        margin: "0 auto",
        padding: "38px 0",
        borderTop: "1px solid var(--line)",
      }}
    >
      <SectionTitle no="01" title="Wordmark" />
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))",
          gap: 16,
        }}
      >
        <div
          style={{
            background: "var(--bg-2)",
            border: "1px solid var(--line)",
            borderRadius: "var(--r-lg, 14px)",
            padding: 34,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 22,
            justifyContent: "center",
          }}
        >
          <svg
            width="68"
            height="68"
            viewBox="0 0 40 40"
            fill="none"
            role="img"
            aria-label="Theourgia mark"
          >
            <title>Theta-in-ring</title>
            <circle cx="20" cy="20" r="17.5" stroke="var(--accent)" strokeWidth="1.4" />
            <line x1="9.5" y1="20" x2="30.5" y2="20" stroke="var(--accent)" strokeWidth="1.4" />
          </svg>
          <span
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: 11,
              letterSpacing: "0.13em",
              textTransform: "uppercase",
              color: "var(--ink-mute)",
            }}
          >
            The mark · Θ in a ring
          </span>
        </div>
        <div
          style={{
            background: "var(--bg-2)",
            border: "1px solid var(--line)",
            borderRadius: "var(--r-lg, 14px)",
            padding: 34,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 22,
            justifyContent: "center",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 13 }}>
            <svg width="40" height="40" viewBox="0 0 40 40" fill="none" aria-hidden="true">
              <circle cx="20" cy="20" r="17.5" stroke="var(--accent)" strokeWidth="1.4" />
              <line x1="9.5" y1="20" x2="30.5" y2="20" stroke="var(--accent)" strokeWidth="1.4" />
            </svg>
            <span
              style={{
                fontFamily: "var(--font-display, var(--font-serif))",
                fontSize: 33,
                letterSpacing: "0.02em",
              }}
            >
              Theourgia
            </span>
          </div>
          <span
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: 11,
              letterSpacing: "0.13em",
              textTransform: "uppercase",
              color: "var(--ink-mute)",
            }}
          >
            Horizontal lockup
          </span>
        </div>
        <div
          style={{
            background: "var(--accent)",
            border: "1px solid var(--accent)",
            borderRadius: "var(--r-lg, 14px)",
            padding: 34,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 22,
            justifyContent: "center",
          }}
        >
          <svg width="68" height="68" viewBox="0 0 40 40" fill="none" aria-hidden="true">
            <circle cx="20" cy="20" r="17.5" stroke="var(--accent-ink)" strokeWidth="1.4" />
            <line
              x1="9.5"
              y1="20"
              x2="30.5"
              y2="20"
              stroke="var(--accent-ink)"
              strokeWidth="1.4"
            />
          </svg>
          <span
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: 11,
              letterSpacing: "0.13em",
              textTransform: "uppercase",
              color: "var(--accent-ink, white)",
              opacity: 0.8,
            }}
          >
            On accent
          </span>
        </div>
      </div>
    </section>
  );
}

// ─── Type ──────────────────────────────────────────────────────────────────

function TypeSection() {
  const roles = [
    { font: "var(--font-display, var(--font-serif))", role: "Display", name: "Cardo", use: "Titles, headings, ritual text" },
    { font: "var(--font-serif)", role: "Serif / text", name: "Cardo", use: "Body, long-form, polytonic" },
    { font: "var(--font-ui)", role: "UI", name: "Inria Sans", use: "Labels, controls, metadata" },
    { font: "var(--font-mono)", role: "Mono", name: "JetBrains Mono", use: "Keys, UUIDs, gematria" },
  ];
  const scale = [
    { px: "64 / 1.05", text: "Solve et coagula", size: 44 },
    { px: "36 / 1.1", text: "The Preliminary Invocation", size: 32 },
    { px: "24 / 1.2", text: "Of the Bornless One", size: 23 },
    { px: "18 / 1.3", text: "A working edition for the practitioner", size: 18 },
  ];
  const scripts: {
    sample: string;
    note: string;
    font: string;
    dir?: "rtl";
    lang?: string;
  }[] = [
    { sample: "Γνῶθι σαυτόν", note: "Greek · Cardo / GFS Didot", font: "var(--font-display, var(--font-serif))", lang: "el" },
    { sample: "אהיה אשר אהיה", note: "Hebrew · Frank Ruhl Libre", font: "var(--font-hebrew, var(--font-serif))", dir: "rtl", lang: "he" },
    { sample: "بسم الله", note: "Arabic · Noto Naskh", font: "var(--font-arabic, var(--font-serif))", dir: "rtl", lang: "ar" },
    { sample: "ॐ नमः", note: "Devanagari · Noto Serif", font: "var(--font-deva, var(--font-serif))", lang: "hi" },
    { sample: "ⲡⲛⲟⲩⲧⲉ", note: "Coptic · Noto Sans Coptic", font: "var(--font-coptic, var(--font-serif))", lang: "cop" },
    { sample: "418 · 93 · 156", note: "Gematria · JetBrains Mono", font: "var(--font-mono)" },
  ];

  return (
    <section
      style={{
        maxWidth: 980,
        margin: "0 auto",
        padding: "38px 0",
        borderTop: "1px solid var(--line)",
      }}
    >
      <div style={{ display: "flex", alignItems: "baseline", gap: 14, marginBottom: 8 }}>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--accent)" }}>
          02
        </span>
        <h2 style={sectionHeading}>Type</h2>
      </div>
      <p
        style={{
          fontFamily: "var(--font-ui)",
          fontSize: 13.5,
          color: "var(--ink-mute)",
          margin: "0 0 26px",
        }}
      >
        Four roles. The display face is itself a token — it swaps per theme to prove font
        themeability.
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 14,
          marginBottom: 30,
        }}
      >
        {roles.map((r) => (
          <div
            key={r.role}
            style={{
              background: "var(--bg-2)",
              border: "1px solid var(--line)",
              borderRadius: "var(--r-md, 8px)",
              padding: 20,
            }}
          >
            <div style={{ fontFamily: r.font, fontSize: 40, lineHeight: 1, marginBottom: 14 }}>
              Aa
            </div>
            <div
              style={{
                fontFamily: "var(--font-ui)",
                fontSize: 10.5,
                letterSpacing: "0.13em",
                textTransform: "uppercase",
                color: "var(--accent)",
                marginBottom: 4,
              }}
            >
              {r.role}
            </div>
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 12,
                color: "var(--ink-mute)",
              }}
            >
              {r.name}
            </div>
            <div
              style={{
                fontFamily: "var(--font-ui)",
                fontSize: 11.5,
                color: "var(--ink-mute)",
                marginTop: 6,
              }}
            >
              {r.use}
            </div>
          </div>
        ))}
      </div>

      <div
        style={{
          background: "var(--bg-2)",
          border: "1px solid var(--line)",
          borderRadius: "var(--r-lg, 14px)",
          padding: "26px 28px",
          marginBottom: 30,
        }}
      >
        <div style={{ ...sectionLabel, marginBottom: 18 }}>Display scale</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {scale.map((row) => (
            <div
              key={row.text}
              style={{
                display: "flex",
                alignItems: "baseline",
                gap: 18,
                padding: "7px 0",
                borderBottom: "1px solid var(--line)",
              }}
            >
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 11,
                  color: "var(--ink-mute)",
                  width: 54,
                  flex: "none",
                }}
              >
                {row.px}
              </span>
              <span
                style={{
                  fontFamily: "var(--font-display, var(--font-serif))",
                  fontSize: row.size,
                  lineHeight: 1,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {row.text}
              </span>
            </div>
          ))}
          <div style={{ display: "flex", alignItems: "baseline", gap: 18, padding: "7px 0" }}>
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                color: "var(--ink-mute)",
                width: 54,
                flex: "none",
              }}
            >
              15 / 1.6
            </span>
            <span
              style={{
                fontFamily: "var(--font-serif)",
                fontSize: 15,
                color: "var(--ink-soft)",
              }}
            >
              Body, set in Cardo for its broad Latin and polytonic Greek — read closely and tested
              in the work.
            </span>
          </div>
        </div>
      </div>

      <div style={{ ...sectionLabel, marginBottom: 14 }}>Per-script faces</div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: 14,
        }}
      >
        {scripts.map((s) => (
          <div
            key={s.sample}
            style={{
              background: "var(--bg-2)",
              border: "1px solid var(--line)",
              borderRadius: "var(--r-md, 8px)",
              padding: "18px 20px",
            }}
          >
            <div
              lang={s.lang}
              dir={s.dir}
              style={{
                fontFamily: s.font,
                fontSize: 30,
                lineHeight: 1.2,
                color: "var(--ink)",
                marginBottom: 8,
              }}
            >
              {s.sample}
            </div>
            <div style={{ fontFamily: "var(--font-ui)", fontSize: 11, color: "var(--ink-mute)" }}>
              {s.note}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ─── Color ─────────────────────────────────────────────────────────────────

function Swatch({ name, varName }: { name: string; varName: string }) {
  return (
    <div
      style={{
        background: "var(--bg-2)",
        border: "1px solid var(--line)",
        borderRadius: "var(--r-md, 8px)",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          height: 58,
          background: `var(${varName})`,
          borderBottom: "1px solid var(--line)",
        }}
        aria-hidden="true"
      />
      <div style={{ padding: "9px 11px" }}>
        <div style={{ fontFamily: "var(--font-ui)", fontSize: 12, color: "var(--ink)" }}>
          {name}
        </div>
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 10.5,
            color: "var(--ink-mute)",
            marginTop: 2,
          }}
        >
          {varName}
        </div>
      </div>
    </div>
  );
}

function ColorSection() {
  const grid: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(132px, 1fr))",
    gap: 12,
    marginBottom: 28,
  };
  return (
    <section
      style={{
        maxWidth: 980,
        margin: "0 auto",
        padding: "38px 0",
        borderTop: "1px solid var(--line)",
      }}
    >
      <div style={{ display: "flex", alignItems: "baseline", gap: 14, marginBottom: 8 }}>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--accent)" }}>
          03
        </span>
        <h2 style={sectionHeading}>Color</h2>
      </div>
      <p
        style={{
          fontFamily: "var(--font-ui)",
          fontSize: 13.5,
          color: "var(--ink-mute)",
          margin: "0 0 26px",
        }}
      >
        Every value is a token reading live from the current theme &amp; mode. Use the cycler in
        the topbar above and the whole page re-skins.
      </p>

      <div style={{ ...sectionLabel, marginBottom: 13 }}>Surfaces &amp; ink</div>
      <div style={grid}>
        <Swatch name="Background" varName="--bg" />
        <Swatch name="Surface" varName="--bg-2" />
        <Swatch name="Raised" varName="--bg-3" />
        <Swatch name="Sunken" varName="--bg-sunk" />
        <Swatch name="Ink" varName="--ink" />
        <Swatch name="Ink soft" varName="--ink-soft" />
        <Swatch name="Ink mute" varName="--ink-mute" />
        <Swatch name="Line" varName="--line-2" />
      </div>

      <div style={{ ...sectionLabel, marginBottom: 13 }}>Accent &amp; semantic</div>
      <div style={grid}>
        <Swatch name="Accent" varName="--accent" />
        <Swatch name="Accent soft" varName="--accent-soft" />
        <Swatch name="Info" varName="--info" />
        <Swatch name="Success" varName="--success" />
        <Swatch name="Warning" varName="--warning" />
        <Swatch name="Danger" varName="--danger" />
      </div>

      <div style={{ ...sectionLabel, marginBottom: 13 }}>
        Category accents — the six practice colors
      </div>
      <div style={{ ...grid, marginBottom: 0 }}>
        <Swatch name="Journal" varName="--c-journal" />
        <Swatch name="Divination" varName="--c-divination" />
        <Swatch name="Working" varName="--c-working" />
        <Swatch name="Entity" varName="--c-entity" />
        <Swatch name="Library" varName="--c-library" />
        <Swatch name="Synchronicity" varName="--c-synchronicity" />
      </div>
    </section>
  );
}

// ─── Form (radii, spacing, elevation) ──────────────────────────────────────

function FormSection() {
  return (
    <section
      style={{
        maxWidth: 980,
        margin: "0 auto",
        padding: "38px 0",
        borderTop: "1px solid var(--line)",
      }}
    >
      <SectionTitle no="04" title="Form" />
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          gap: 20,
        }}
      >
        <div
          style={{
            background: "var(--bg-2)",
            border: "1px solid var(--line)",
            borderRadius: "var(--r-lg, 14px)",
            padding: "22px 24px",
          }}
        >
          <div style={{ ...sectionLabel, marginBottom: 16 }}>Radii</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 13 }}>
            {[
              { r: "var(--r-sm, 4px)", label: "--r-sm · 4px" },
              { r: "var(--r-md, 8px)", label: "--r-md · 8px" },
              { r: "var(--r-lg, 14px)", label: "--r-lg · 14px" },
              { r: "999px", label: "pill · 999px" },
            ].map((row) => (
              <div key={row.label} style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <span
                  style={{
                    width: 50,
                    height: 34,
                    background: "var(--accent-soft)",
                    border: "1px solid var(--line-2)",
                    borderRadius: row.r,
                  }}
                />
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 12,
                    color: "var(--ink-soft)",
                  }}
                >
                  {row.label}
                </span>
              </div>
            ))}
          </div>
        </div>
        <div
          style={{
            background: "var(--bg-2)",
            border: "1px solid var(--line)",
            borderRadius: "var(--r-lg, 14px)",
            padding: "22px 24px",
          }}
        >
          <div style={{ ...sectionLabel, marginBottom: 16 }}>Spacing ramp</div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 9, height: 90 }}>
            {[6, 10, 14, 20, 28, 38].map((s) => (
              <div
                key={s}
                style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 7 }}
              >
                <span style={{ width: s, height: s, background: "var(--accent)" }} />
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 9.5,
                    color: "var(--ink-mute)",
                  }}
                >
                  {s}
                </span>
              </div>
            ))}
          </div>
        </div>
        <div
          style={{
            background: "var(--bg-2)",
            border: "1px solid var(--line)",
            borderRadius: "var(--r-lg, 14px)",
            padding: "22px 24px",
          }}
        >
          <div style={{ ...sectionLabel, marginBottom: 16 }}>Elevation</div>
          <div style={{ display: "flex", gap: 16, alignItems: "center", padding: "8px 0" }}>
            <span
              style={{
                width: 56,
                height: 42,
                borderRadius: "var(--r-md, 8px)",
                background: "var(--bg-3)",
                border: "1px solid var(--line)",
              }}
            />
            <span
              style={{
                width: 56,
                height: 42,
                borderRadius: "var(--r-md, 8px)",
                background: "var(--bg-3)",
                boxShadow: "0 8px 24px rgba(0,0,0,0.35)",
              }}
            />
            <span
              style={{
                width: 56,
                height: 42,
                borderRadius: "var(--r-md, 8px)",
                background: "var(--bg-3)",
                boxShadow: "0 22px 48px rgba(0,0,0,0.5)",
              }}
            />
          </div>
          <div
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: 11.5,
              color: "var(--ink-mute)",
              marginTop: 10,
            }}
          >
            Flat · raised · overlay. Shadow carries elevation; the page itself stays matte.
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Icons ─────────────────────────────────────────────────────────────────

const ICONS: Record<string, string> = {
  Journal: "M5 4.5h11a2 2 0 0 1 2 2V20a2 2 0 0 0-2-2H5zM19 4.5h0M9 9h6M9 12.5h4",
  Divination: "M12 3l2.4 5.6L20 9l-4.6 3.8L17 19l-5-3.4L7 19l1.6-6.2L4 9l5.6-.4z",
  Entity: "M12 3l7 3v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z",
  Library: "M5 4h3v16H5zM10 4h3v16h-3zM16 5l3.4.9-3.2 14.5L13 19",
  Sigil: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 3v18M5 8l14 8M19 8 5 16",
  Calendar: "M3.5 5.5h17v15h-17zM3.5 10h17M8 3v4M16 3v4",
  Ritual: "M12 3v9M8 7l4-4 4 4M6 12h12l-1.5 8H7.5z",
  Trance:
    "M3 12s3.5-6 9-6 9 6 9 6-3.5 6-9 6-9-6-9-6zM12 9.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5z",
  Lock: "M6 11V8a6 6 0 0 1 12 0v3M5 11h14v9H5zM12 15v2",
  Key: "M9.5 14.5a4 4 0 1 0-3-3M11 12.5 20 3.5M16.5 7l2.5 2.5M18 5.5 20.5 8",
  Moon: "M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z",
  Sun: "M12 4v2M12 18v2M4 12h2M18 12h2M6 6l1.5 1.5M16.5 16.5 18 18M18 6l-1.5 1.5M7.5 16.5 6 18M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7z",
  Star: "M12 3l2 6h6l-5 4 2 7-5-4-5 4 2-7-5-4h6z",
  Eye: "M3 12s3.5-6.5 9-6.5 9 6.5 9 6.5-3.5 6.5-9 6.5S3 12 3 12zM12 9.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5z",
  Candle:
    "M10 21h4M12 18v3M9.5 11h5v7h-5zM12 4c1.2 1.4 2 2.6 2 3.8A2 2 0 0 1 12 9.6 2 2 0 0 1 10 7.8C10 6.6 10.8 5.4 12 4z",
  Hand:
    "M12 3c1.6 1.8 2.6 3.5 2.6 5.2A2.6 2.6 0 0 1 9.4 8.2C9.4 6.5 10.4 4.8 12 3zM8 21h8M10 21c0-2.2-2.4-3-2.4-6.2M14 21c0-2.2 2.4-3 2.4-6.2",
  Scroll: "M6 4h10a2 2 0 0 1 2 2v11a3 3 0 0 0 3 3H8a3 3 0 0 1-3-3V6a2 2 0 0 0-2-2zM9 8h6M9 11.5h6",
  Feather: "M20 4S9 4 6 13l-2 7M6.5 14h7M4 20l5-5",
  Compass: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM15 9l-2 5-4 1 2-5z",
  Shield: "M12 3l7 3v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6zM9 12l2 2 4-4",
  Flask:
    "M9 3h6M10 3v6l-4.5 9a1.6 1.6 0 0 0 1.5 2.3h10a1.6 1.6 0 0 0 1.5-2.3L14 9V3M7.5 14h9",
  Pentacle:
    "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 5.5l2 6.2h6.4l-5.2 3.8 2 6.2-5.2-3.8M12 5.5l-2 6.2H3.6",
  Bell: "M6 16V11a6 6 0 0 1 12 0v5l2 2H4zM10 20a2 2 0 0 0 4 0",
};

function IconsSection() {
  return (
    <section
      style={{
        maxWidth: 980,
        margin: "0 auto",
        padding: "38px 0",
        borderTop: "1px solid var(--line)",
      }}
    >
      <div style={{ display: "flex", alignItems: "baseline", gap: 14, marginBottom: 8 }}>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--accent)" }}>
          05
        </span>
        <h2 style={sectionHeading}>Icons</h2>
      </div>
      <p
        style={{
          fontFamily: "var(--font-ui)",
          fontSize: 13.5,
          color: "var(--ink-mute)",
          margin: "0 0 24px",
        }}
      >
        Custom engraving set — uniform 1.4 stroke,{" "}
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 12 }}>currentColor</span>, no
        fills. No third-party icon library.
      </p>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(96px, 1fr))",
          gap: 10,
        }}
      >
        {Object.entries(ICONS).map(([name, d]) => (
          <div
            key={name}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 9,
              padding: "16px 8px",
              background: "var(--bg-2)",
              border: "1px solid var(--line)",
              borderRadius: "var(--r-md, 8px)",
              color: "var(--ink)",
            }}
          >
            <svg
              viewBox="0 0 24 24"
              width={24}
              height={24}
              fill="none"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d={d} />
            </svg>
            <span
              style={{ fontFamily: "var(--font-ui)", fontSize: 10.5, color: "var(--ink-mute)" }}
            >
              {name}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

// ─── Components ────────────────────────────────────────────────────────────

function ComponentsSection() {
  const [demoOn, setDemoOn] = useState(true);
  return (
    <section
      style={{
        maxWidth: 980,
        margin: "0 auto",
        padding: "38px 0 30px",
        borderTop: "1px solid var(--line)",
      }}
    >
      <SectionTitle no="06" title="Components" />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
          gap: 18,
        }}
      >
        <div
          style={{
            background: "var(--bg-2)",
            border: "1px solid var(--line)",
            borderRadius: "var(--r-lg, 14px)",
            padding: "22px 24px",
          }}
        >
          <div style={{ ...sectionLabel, marginBottom: 16 }}>Buttons</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
            <button
              type="button"
              style={{
                padding: "9px 18px",
                borderRadius: "var(--r-md, 8px)",
                background: "var(--accent)",
                color: "var(--accent-ink, white)",
                fontFamily: "var(--font-ui)",
                fontWeight: 700,
                fontSize: 13.5,
                border: "none",
                cursor: "pointer",
              }}
            >
              Primary
            </button>
            <button
              type="button"
              style={{
                padding: "9px 18px",
                borderRadius: "var(--r-md, 8px)",
                border: "1px solid var(--line-2)",
                background: "transparent",
                fontFamily: "var(--font-ui)",
                fontSize: 13.5,
                color: "var(--ink-soft)",
                cursor: "pointer",
              }}
            >
              Secondary
            </button>
            <button
              type="button"
              style={{
                padding: "9px 14px",
                borderRadius: "var(--r-md, 8px)",
                background: "transparent",
                border: "none",
                fontFamily: "var(--font-ui)",
                fontSize: 13.5,
                color: "var(--ink-mute)",
                cursor: "pointer",
              }}
            >
              Ghost
            </button>
            <button
              type="button"
              style={{
                padding: "9px 16px",
                borderRadius: "var(--r-md, 8px)",
                border: "1px solid var(--danger, #c2554a)",
                background: "transparent",
                color: "var(--danger, #c2554a)",
                fontFamily: "var(--font-ui)",
                fontSize: 13.5,
                cursor: "pointer",
              }}
            >
              Destructive
            </button>
          </div>
        </div>

        <div
          style={{
            background: "var(--bg-2)",
            border: "1px solid var(--line)",
            borderRadius: "var(--r-lg, 14px)",
            padding: "22px 24px",
          }}
        >
          <div style={{ ...sectionLabel, marginBottom: 16 }}>Controls</div>
          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
            <button
              type="button"
              role="switch"
              aria-checked={demoOn}
              onClick={() => setDemoOn((v) => !v)}
              style={{
                position: "relative",
                width: 46,
                height: 26,
                borderRadius: 999,
                flex: "none",
                background: demoOn ? "var(--accent)" : "var(--bg-3)",
                border: `1px solid ${demoOn ? "var(--accent)" : "var(--line-2)"}`,
                cursor: "pointer",
                padding: 0,
              }}
            >
              <span
                style={{
                  position: "absolute",
                  top: 2,
                  left: demoOn ? 22 : 2,
                  width: 20,
                  height: 20,
                  borderRadius: "50%",
                  background: demoOn ? "var(--accent-ink, white)" : "var(--ink-mute)",
                  transition: "all 0.16s",
                  display: "block",
                }}
              />
            </button>
            <div style={{ display: "flex", gap: 9 }}>
              <span
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 7,
                  fontFamily: "var(--font-ui)",
                  fontSize: 13,
                  color: "var(--ink-soft)",
                }}
              >
                <span
                  style={{
                    width: 16,
                    height: 16,
                    borderRadius: "50%",
                    border: "1px solid var(--accent)",
                    background:
                      "radial-gradient(circle at center, var(--accent) 0 4px, transparent 5px)",
                  }}
                />
                On
              </span>
              <span
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 7,
                  fontFamily: "var(--font-ui)",
                  fontSize: 13,
                  color: "var(--ink-mute)",
                }}
              >
                <span
                  style={{
                    width: 16,
                    height: 16,
                    borderRadius: "50%",
                    border: "1px solid var(--line-2)",
                  }}
                />
                Off
              </span>
            </div>
          </div>
          <div
            style={{
              display: "flex",
              gap: 7,
              marginTop: 18,
              padding: 3,
              border: "1px solid var(--line)",
              borderRadius: 8,
              background: "var(--bg)",
              width: "max-content",
            }}
          >
            <span
              style={{
                padding: "5px 13px",
                fontFamily: "var(--font-ui)",
                fontSize: 12.5,
                borderRadius: 6,
                background: "var(--accent-soft)",
                border: "1px solid var(--line-2)",
              }}
            >
              Segmented
            </span>
            <span
              style={{
                padding: "5px 13px",
                fontFamily: "var(--font-ui)",
                fontSize: 12.5,
                color: "var(--ink-mute)",
              }}
            >
              Control
            </span>
          </div>
        </div>

        <div
          style={{
            background: "var(--bg-2)",
            border: "1px solid var(--line)",
            borderRadius: "var(--r-lg, 14px)",
            padding: "22px 24px",
          }}
        >
          <div style={{ ...sectionLabel, marginBottom: 16 }}>Status &amp; tags</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            <span
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                fontFamily: "var(--font-ui)",
                fontSize: 11.5,
                color: "var(--success, var(--c-synchronicity))",
                padding: "3px 11px",
                border: "1px solid var(--line)",
                borderRadius: 999,
              }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: "var(--success, var(--c-synchronicity))",
                }}
              />
              Verified
            </span>
            {[
              { label: "Pending", color: "var(--warning, var(--c-entity))" },
              { label: "Revoked", color: "var(--danger, var(--c-working))" },
              { label: "Sealed", color: "var(--ink-soft)" },
            ].map((chip) => (
              <span
                key={chip.label}
                style={{
                  fontFamily: "var(--font-ui)",
                  fontSize: 11.5,
                  color: chip.color,
                  padding: "3px 11px",
                  border: "1px solid var(--line)",
                  borderRadius: 999,
                }}
              >
                {chip.label}
              </span>
            ))}
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                color: "var(--ink-mute)",
                padding: "3px 11px",
                border: "1px solid var(--line)",
                borderRadius: 999,
              }}
            >
              9F2A·7C41
            </span>
          </div>
        </div>

        <div
          style={{
            background: "var(--bg-2)",
            border: "1px solid var(--line)",
            borderRadius: "var(--r-lg, 14px)",
            padding: "22px 24px",
          }}
        >
          <div style={{ ...sectionLabel, marginBottom: 16 }}>Field</div>
          <div
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: 11,
              color: "var(--ink-mute)",
              marginBottom: 6,
            }}
          >
            Intent
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 9,
              padding: "10px 13px",
              border: "1px solid var(--line-2)",
              borderRadius: "var(--r-md, 8px)",
              background: "var(--bg)",
            }}
          >
            <svg
              viewBox="0 0 24 24"
              width="16"
              height="16"
              fill="none"
              stroke="var(--ink-mute)"
              strokeWidth="1.4"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M12 3v18M5 8l7-5 7 5" />
            </svg>
            <span style={{ fontFamily: "var(--font-serif)", fontSize: 14.5, color: "var(--ink)" }}>
              To know the measure of a thing
            </span>
          </div>
          <div
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: 11,
              color: "var(--ink-mute)",
              marginTop: 7,
            }}
          >
            Focus rings are 2px accent, offset 2px.
          </div>
        </div>
      </div>

      <div
        style={{
          marginTop: 18,
          display: "flex",
          alignItems: "center",
          gap: 13,
          padding: "16px 22px",
          border: "1px solid var(--line)",
          borderRadius: "var(--r-lg, 14px)",
          background: "var(--bg-2)",
          flexWrap: "wrap",
        }}
      >
        <svg
          viewBox="0 0 24 24"
          width="24"
          height="24"
          fill="none"
          stroke="var(--accent)"
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <rect x="3.5" y="5" width="17" height="14" rx="2" />
          <path d="M3.5 9.5h17" />
        </svg>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: "var(--font-display, var(--font-serif))", fontSize: 16 }}>
            Overlay family
          </div>
          <div
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: 12.5,
              color: "var(--ink-mute)",
            }}
          >
            Toast · Banner · ConfirmDialog · AlertDialog · PromptDialog · Drawer · Command palette
            — all themed, focus-trapped, ESC-dismissible. Never a native dialog.
          </div>
        </div>
        <span
          style={{
            fontFamily: "var(--font-ui)",
            fontSize: 12.5,
            color: "var(--ink-mute)",
            whiteSpace: "nowrap",
          }}
        >
          Gallery pending
        </span>
      </div>
    </section>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────

export function Foundations() {
  useTopbar(
    () => ({
      title: "Foundations",
      subtitle: "The design system",
    }),
    [],
  );

  return (
    <div>
      <Hero />
      <WordmarkSection />
      <TypeSection />
      <ColorSection />
      <FormSection />
      <IconsSection />
      <ComponentsSection />
      <footer
        style={{
          maxWidth: 980,
          margin: "0 auto",
          padding: "30px 0 70px",
          borderTop: "1px solid var(--line)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div
          style={{
            fontFamily: "var(--font-display, var(--font-serif))",
            fontStyle: "italic",
            fontSize: 16,
            color: "var(--ink-soft)",
          }}
        >
          Solve et coagula.
        </div>
        <div style={{ fontFamily: "var(--font-ui)", fontSize: 12, color: "var(--ink-mute)" }}>
          Theourgia Foundations · live tokens
        </div>
      </footer>
    </div>
  );
}
