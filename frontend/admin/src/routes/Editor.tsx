/**
 * Editor admin — entry composer (Tiptap-based, design-fidelity port).
 *
 * Faithful port of ``Theourgia Editor.dc.html`` per the per-component
 * ritual. From `agent_onboarding.md §` Theourgia Editor:
 *   · Tiptap-based; built-in marks + nodes plus the 8 Theourgia custom
 *     blocks: ritualLog, quoteCitation, gematria, sensation, entityRef,
 *     sigil, chart, divination.
 *   · Slash-command menu (``/``) registers every custom block.
 *   · Multi-language input: language toggle in the format toolbar
 *     switches the ``lang`` attribute + font for subsequent inline
 *     spans (Greek polytonic, pointed Hebrew).
 *   · VisibilitySelector chip in the topbar (current entry visibility +
 *     Sealed indicator when encrypted).
 *   · Breadcrumb + save status + Publish CTA.
 *
 * **This batch ships the surface; live Tiptap wiring follows.**
 * Per the batch 17 plan: Tiptap library install + custom-node
 * implementations is its own sub-batch (Phase 04 Journaling will
 * formally wire the block round-trips). The port below renders the
 * designer's example entry ("Invocation of the Agathos Daimon") with
 * every custom block visible, the slash menu open and pre-populated,
 * and the format toolbar in its full state so consumers can read the
 * full UX before live editing arrives.
 */

import { useTopbar } from "@theourgia/shared";
import { type CSSProperties, useState } from "react";

const LINE = "var(--line)";
const LINE_2 = "var(--line-2)";

type Lang = "latin" | "greek" | "hebrew";

const LANG_LABEL: Record<Lang, string> = {
  latin: "EN",
  greek: "ΕΛ",
  hebrew: "עב",
};

interface SlashItem {
  key: string;
  command: string;
  title: string;
  description: string;
  iconColor: string;
  iconPath: string;
  active?: boolean;
}

const SLASH_ITEMS: SlashItem[] = [
  { key: "sigil", command: "/sigil", title: "Sigil", description: "Embed or construct a sigil", iconColor: "var(--c-working)", iconPath: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z M12 4.5l6.5 11.3H5.5z", active: true },
  { key: "chart", command: "/chart", title: "Chart", description: "Natal, horary or election chart", iconColor: "var(--c-divination)", iconPath: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z M12 3v18M3 12h18" },
  { key: "quote", command: "/quote", title: "Quote & citation", description: "Cite a work from the Library", iconColor: "var(--accent)", iconPath: "M7 8h10M7 12h7M7 16h10M4 5v14" },
  { key: "gematria", command: "/gematria", title: "Gematria", description: "Isopsephy / gematria value", iconColor: "var(--accent)", iconPath: "M5 5h14M9 5v14M5 19h14" },
  { key: "sensation", command: "/sensation", title: "Sensation diagram", description: "Map sensation on a silhouette", iconColor: "var(--c-divination)", iconPath: "M12 2.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5z M12 7.5v8M7 11h10M9 21l3-5 3 5" },
  { key: "entity", command: "/entity", title: "Entity reference", description: "Link a god, daemon or angel", iconColor: "var(--c-entity)", iconPath: "M6 6.5h12M7 9.5h10M9 9.5v8M15 9.5v8M5 20.5h14" },
];

function ToolbarButton({ label, ariaLabel, italic, monospace, smallCaps, onClick }: { label?: string; ariaLabel: string; italic?: boolean; monospace?: boolean; smallCaps?: boolean; onClick?: () => void }) {
  const base: CSSProperties = {
    width: smallCaps ? "auto" : 32,
    height: 32,
    padding: smallCaps ? "0 8px" : 0,
    borderRadius: "var(--r-sm)",
    fontFamily: monospace ? "var(--font-mono)" : "var(--font-serif)",
    fontWeight: italic || smallCaps ? 400 : 700,
    fontStyle: italic ? "italic" : "normal",
    fontSize: smallCaps ? 12 : 15,
    letterSpacing: smallCaps ? "0.04em" : "normal",
    color: "var(--ink-soft)",
    background: "transparent",
    border: "none",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  };
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      onClick={onClick}
      style={base}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLButtonElement).style.background = "var(--bg-3)";
        (e.currentTarget as HTMLButtonElement).style.color = "var(--ink)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.background = "transparent";
        (e.currentTarget as HTMLButtonElement).style.color = "var(--ink-soft)";
      }}
    >
      {label}
    </button>
  );
}

function LangButton({ value, current, onClick }: { value: Lang; current: Lang; onClick: () => void }) {
  const active = value === current;
  const base: CSSProperties = {
    padding: "5px 11px",
    fontFamily: "var(--font-ui)",
    fontSize: 12,
    color: active ? "var(--ink)" : "var(--ink-mute)",
    background: active ? "var(--accent-soft)" : "transparent",
    border: "none",
    cursor: "pointer",
  };
  return (
    <button type="button" aria-pressed={active ? "true" : "false"} onClick={onClick} style={base}>
      {LANG_LABEL[value]}
    </button>
  );
}

function VisibilityChip() {
  return (
    <div
      role="status"
      aria-label="Visibility · Sealed"
      style={{
        display: "flex",
        border: `1px solid ${LINE}`,
        borderRadius: "var(--r-md)",
        overflow: "hidden",
        fontFamily: "var(--font-ui)",
        fontSize: 12,
      }}
    >
      <span style={{ padding: "6px 11px", color: "var(--ink-soft)" }}>Personal</span>
      <span
        style={{
          padding: "6px 11px",
          borderLeft: `1px solid ${LINE}`,
          background: "var(--accent-soft)",
          color: "var(--ink)",
          display: "flex",
          alignItems: "center",
          gap: 5,
        }}
      >
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" aria-hidden="true">
          <rect x="5" y="11" width="14" height="9" rx="1.5" />
          <path d="M8 11V8a4 4 0 0 1 8 0v3" />
        </svg>
        Sealed
      </span>
    </div>
  );
}

function RitualLogBlock() {
  return (
    <div data-block="ritualLog" style={{ border: `1px solid ${LINE}`, borderRadius: "var(--r-lg)", background: "var(--bg-2)", margin: "0 0 22px", overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 16px", borderBottom: `1px solid ${LINE}`, background: "var(--bg-3)" }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--c-working)" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 2" />
        </svg>
        <span style={{ fontFamily: "var(--font-ui)", fontSize: 10.5, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--ink-mute)" }}>
          Ritual log
        </span>
      </div>
      <div style={{ padding: "6px 16px 12px" }}>
        {[
          { time: "14:12", text: "Banishing — LRP, all quarters" },
          { time: "14:18", text: "Bornless preliminary invocation" },
          { time: "14:31", text: "Conjuration — third call, presence felt" },
        ].map((row, i, arr) => (
          <div
            key={row.time}
            style={{
              display: "flex",
              gap: 14,
              padding: "9px 0",
              borderBottom: i < arr.length - 1 ? `1px solid ${LINE}` : "none",
            }}
          >
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--accent)", flex: "none", width: 48 }}>{row.time}</span>
            <span style={{ fontFamily: "var(--font-serif)", fontSize: 15, color: "var(--ink-soft)" }}>{row.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function QuoteCitationBlock() {
  return (
    <blockquote data-block="quoteCitation" style={{ margin: "0 0 22px", padding: "4px 0 4px 24px", borderLeft: "2px solid var(--accent)" }}>
      <div lang="el" style={{ fontFamily: "var(--font-greek)", fontStyle: "italic", fontSize: 21, lineHeight: 1.5, color: "var(--ink)" }}>
        Ἐγώ εἰμι ὁ Ἀκέφαλος δαίμων…
      </div>
      <div style={{ fontFamily: "var(--font-serif)", fontSize: 16, color: "var(--ink-soft)", marginTop: 6 }}>
        "I am the Headless daemon, seeing with my feet."
      </div>
      <div style={{ fontFamily: "var(--font-ui)", fontSize: 11.5, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--ink-mute)", marginTop: 10 }}>
        — Papyri Graecae Magicae, PGM V. 96–172 · cited
      </div>
    </blockquote>
  );
}

function GematriaBlock() {
  return (
    <div data-block="gematria" style={{ flex: "1 1 240px", minWidth: 0, border: `1px solid ${LINE}`, borderRadius: "var(--r-lg)", background: "var(--bg-2)", overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 16px", borderBottom: `1px solid ${LINE}`, background: "var(--bg-3)" }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.6" aria-hidden="true">
          <path d="M5 5h14M9 5v14M5 19h14" strokeLinecap="round" />
        </svg>
        <span style={{ fontFamily: "var(--font-ui)", fontSize: 10.5, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--ink-mute)" }}>
          Gematria · Greek isopsephy
        </span>
      </div>
      <div style={{ padding: 16 }}>
        <div lang="el" style={{ fontFamily: "var(--font-greek)", fontSize: 24, color: "var(--ink)", marginBottom: 12 }}>ἀγαθοδαίμων</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, fontFamily: "var(--font-mono)", fontSize: 11.5, color: "var(--ink-mute)", marginBottom: 12 }}>
          {["α·1", "γ·3", "α·1", "θ·9", "ο·70", "δ·4", "α·1", "ι·10", "μ·40", "ω·800", "ν·50"].map((s) => (
            <span key={s}>{s}</span>
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 10, borderTop: `1px solid ${LINE}`, paddingTop: 12 }}>
          <span style={{ fontFamily: "var(--font-display)", fontSize: 28, color: "var(--accent)" }}>989</span>
          <span style={{ fontFamily: "var(--font-ui)", fontSize: 12, color: "var(--ink-mute)" }}>also: ἡ σφραγίς · 989</span>
        </div>
      </div>
    </div>
  );
}

function SensationBlock() {
  return (
    <div data-block="sensation" style={{ flex: "1 1 240px", minWidth: 0, border: `1px solid ${LINE}`, borderRadius: "var(--r-lg)", background: "var(--bg-2)", overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 16px", borderBottom: `1px solid ${LINE}`, background: "var(--bg-3)" }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--c-divination)" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
          <circle cx="12" cy="5" r="2.5" />
          <path d="M12 7.5v8M7 11h10M9 21l3-5 3 5" />
        </svg>
        <span style={{ fontFamily: "var(--font-ui)", fontSize: 10.5, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--ink-mute)" }}>
          Sensation diagram
        </span>
      </div>
      <div style={{ padding: "14px 16px", display: "flex", gap: 16, alignItems: "center" }}>
        <svg width="64" height="128" viewBox="0 0 80 160" style={{ flex: "none" }} aria-hidden="true">
          <path
            d="M40 6c6 0 10 5 10 11s-4 11-10 11-10-5-10-11 4-11 10-11Z M33 30h14c3 0 5 2 6 6l5 26c1 3-3 5-4 1l-5-21v36l4 58c0 4-6 4-7 0l-6-44-6 44c-1 4-7 4-7 0l4-58V42l-5 21c-1 4-5 2-4-1l5-26c1-4 3-6 6-6Z"
            fill="var(--ink)"
            opacity=".14"
            stroke="var(--ink-soft)"
            strokeWidth="1"
          />
          <circle cx="40" cy="8" r="4" fill="var(--accent)" />
          <circle cx="40" cy="38" r="4" fill="var(--c-divination)" />
          <circle cx="40" cy="58" r="5" fill="var(--c-working)" />
        </svg>
        <div style={{ display: "flex", flexDirection: "column", gap: 9, fontFamily: "var(--font-ui)", fontSize: 12.5, color: "var(--ink-soft)" }}>
          {[
            { dot: "var(--accent)", label: "Crown · pressure" },
            { dot: "var(--c-divination)", label: "Throat · cool" },
            { dot: "var(--c-working)", label: "Solar plexus · heat" },
          ].map((row) => (
            <div key={row.label} style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ width: 9, height: 9, borderRadius: "50%", background: row.dot }} />
              {row.label}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SlashMenu() {
  return (
    <div style={{ position: "relative", marginTop: 4 }}>
      <p style={{ fontFamily: "var(--font-serif)", fontSize: 19, lineHeight: 1.7, color: "var(--ink-mute)", margin: 0 }}>
        /<span style={{ color: "var(--accent)" }}>|</span>
      </p>
      <div
        style={{
          position: "absolute",
          top: 34,
          left: 0,
          width: 340,
          background: "var(--bg-2)",
          border: `1px solid ${LINE_2}`,
          borderRadius: "var(--r-lg)",
          boxShadow: "0 18px 40px rgba(0,0,0,.5)",
          overflow: "hidden",
          zIndex: 20,
        }}
      >
        <div
          style={{
            padding: "8px 14px",
            borderBottom: `1px solid ${LINE}`,
            fontFamily: "var(--font-ui)",
            fontSize: 10.5,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: "var(--ink-mute)",
          }}
        >
          Insert magickal block
        </div>
        <div style={{ padding: 6 }}>
          {SLASH_ITEMS.map((item) => (
            <button
              key={item.key}
              type="button"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "9px 10px",
                borderRadius: "var(--r-md)",
                background: item.active ? "var(--accent-soft)" : "transparent",
                width: "100%",
                border: "none",
                cursor: "pointer",
                color: "inherit",
                fontFamily: "inherit",
                textAlign: "left",
              }}
              onMouseEnter={(e) => {
                if (!item.active) (e.currentTarget as HTMLButtonElement).style.background = "var(--bg-3)";
              }}
              onMouseLeave={(e) => {
                if (!item.active) (e.currentTarget as HTMLButtonElement).style.background = "transparent";
              }}
            >
              <span
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 7,
                  background: "var(--bg-3)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: item.iconColor,
                  flex: "none",
                }}
                aria-hidden="true"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  <path d={item.iconPath} />
                </svg>
              </span>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: "var(--font-serif)", fontSize: 15, color: "var(--ink)" }}>{item.title}</div>
                <div style={{ fontFamily: "var(--font-ui)", fontSize: 11.5, color: "var(--ink-mute)" }}>{item.description}</div>
              </div>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--ink-mute)" }}>{item.command}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export function Editor() {
  const [lang, setLang] = useState<Lang>("latin");

  useTopbar(
    () => ({
      title: (
        <div style={{ display: "flex", alignItems: "center", gap: 10, fontFamily: "var(--font-ui)", fontSize: 13, color: "var(--ink-mute)" }}>
          <span>Journal</span>
          <span style={{ opacity: 0.5 }}>/</span>
          <span style={{ color: "var(--ink-soft)" }}>Workings</span>
          <span style={{ opacity: 0.5 }}>/</span>
          <span style={{ color: "var(--ink)" }}>Untitled draft</span>
          <span style={{ display: "flex", alignItems: "center", gap: 6, marginLeft: 8, fontSize: 11.5, color: "var(--c-synchronicity)" }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--c-synchronicity)" }} />
            Saved · just now
          </span>
        </div>
      ),
      before: <VisibilityChip />,
      after: (
        <button
          type="button"
          style={{
            padding: "8px 16px",
            borderRadius: "var(--r-md)",
            background: "var(--accent)",
            color: "var(--accent-ink)",
            fontFamily: "var(--font-ui)",
            fontWeight: 700,
            fontSize: 13,
            border: "none",
            cursor: "pointer",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.opacity = "0.9";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.opacity = "1";
          }}
        >
          Publish
        </button>
      ),
    }),
    [],
  );

  // Per `Theourgia Editor.dc.html` line 182 — the inline Greek span renders
  // verbatim "ἀγαθὸς δαίμων" with lang="el" always. The language toggle in
  // the format toolbar is a UI affordance for the *next* span the user
  // inserts, not a swap-the-current-content control.

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: 0, flex: 1, margin: "0 -28px" }}>
      {/* FORMAT TOOLBAR — second header row under VaultTopbar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: "8px 28px",
          borderBottom: `1px solid ${LINE}`,
          background: "var(--bg-2)",
          flexWrap: "wrap",
        }}
      >
        <button
          type="button"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "6px 11px",
            border: `1px solid ${LINE}`,
            borderRadius: "var(--r-md)",
            fontFamily: "var(--font-ui)",
            fontSize: 12.5,
            color: "var(--ink-soft)",
            background: "transparent",
            cursor: "pointer",
          }}
        >
          Paragraph
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>
        <span style={{ width: 1, height: 22, background: LINE, margin: "0 3px" }} />
        <ToolbarButton label="B" ariaLabel="Bold" />
        <ToolbarButton label="I" ariaLabel="Italic" italic />
        <ToolbarButton label="Sᴄ" ariaLabel="Small caps" smallCaps />
        <button
          type="button"
          aria-label="Link"
          style={{
            width: 32,
            height: 32,
            borderRadius: "var(--r-sm)",
            color: "var(--ink-soft)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "transparent",
            border: "none",
            cursor: "pointer",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = "var(--bg-3)";
            (e.currentTarget as HTMLButtonElement).style.color = "var(--ink)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = "transparent";
            (e.currentTarget as HTMLButtonElement).style.color = "var(--ink-soft)";
          }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden="true">
            <path d="M10 13a5 5 0 0 0 7 0l2-2a5 5 0 0 0-7-7l-1 1M14 11a5 5 0 0 0-7 0l-2 2a5 5 0 0 0 7 7l1-1" />
          </svg>
        </button>
        <span style={{ width: 1, height: 22, background: LINE, margin: "0 3px" }} />
        <div style={{ display: "flex", border: `1px solid ${LINE}`, borderRadius: "var(--r-md)", overflow: "hidden" }}>
          <LangButton value="latin" current={lang} onClick={() => setLang("latin")} />
          <LangButton value="greek" current={lang} onClick={() => setLang("greek")} />
          <LangButton value="hebrew" current={lang} onClick={() => setLang("hebrew")} />
        </div>
        <button
          type="button"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            marginLeft: "auto",
            padding: "6px 12px",
            border: `1px solid ${LINE_2}`,
            borderRadius: "var(--r-md)",
            fontFamily: "var(--font-ui)",
            fontSize: 12.5,
            color: "var(--ink)",
            background: "transparent",
            cursor: "pointer",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = "var(--bg-3)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = "transparent";
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden="true">
            <path d="M12 5v14M5 12h14" />
          </svg>
          Insert block · /
        </button>
      </div>

      {/* DOCUMENT */}
      <main
        className="scroll"
        style={{
          minWidth: 0,
          overflowY: "auto",
          minHeight: 0,
          overflowX: "hidden",
          padding: "44px 28px 120px",
          flex: 1,
        }}
      >
        <div style={{ maxWidth: 720, margin: "0 auto", position: "relative" }}>
          <input
            defaultValue="Invocation of the Agathos Daimon"
            aria-label="Entry title"
            style={{
              width: "100%",
              background: "none",
              border: "none",
              outline: "none",
              fontFamily: "var(--font-display)",
              fontWeight: 700,
              fontSize: 40,
              lineHeight: 1.1,
              color: "var(--ink)",
              marginBottom: 12,
              padding: 0,
            }}
          />
          <div style={{ display: "flex", alignItems: "center", gap: 10, fontFamily: "var(--font-ui)", fontSize: 12.5, color: "var(--ink-mute)", marginBottom: 32, flexWrap: "wrap" }}>
            <span style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--c-working)" }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--c-working)" }} />
              Working
            </span>
            <span style={{ opacity: 0.4 }}>·</span>
            <span>Today, 14:12</span>
            <span style={{ opacity: 0.4 }}>·</span>
            <span>
              <span style={{ fontFamily: "var(--font-glyph)" }}>♀</span> Hour of Venus
            </span>
            <span style={{ opacity: 0.4 }}>·</span>
            <span>
              <span style={{ fontFamily: "var(--font-glyph)" }}>☽</span> Waxing Gibbous
            </span>
          </div>

          <p style={{ fontFamily: "var(--font-serif)", fontSize: 19, lineHeight: 1.7, color: "var(--ink)", margin: "0 0 22px", textWrap: "pretty" } as CSSProperties}>
            <span
              style={{
                float: "left",
                fontFamily: "var(--font-display)",
                fontWeight: 700,
                fontSize: 62,
                lineHeight: 0.8,
                padding: "6px 12px 0 0",
                color: "var(--accent)",
              }}
            >
              B
            </span>
            egan with the banishing by the Lesser Ritual of the Pentagram, then the Bornless preliminary invocation. The
            temple settled quickly tonight — the candle flames steadied at the third circumambulation.
          </p>

          <RitualLogBlock />
          <QuoteCitationBlock />

          <p style={{ fontFamily: "var(--font-serif)", fontSize: 19, lineHeight: 1.7, color: "var(--ink)", margin: "0 0 22px", textWrap: "pretty" } as CSSProperties}>
            At the name of the{" "}
            <span lang="el" style={{ color: "var(--ink)" }}>
              ἀγαθὸς δαίμων
            </span>{" "}
            the air thickened and a faint citrus scent rose — recorded below in the sensation map. I held the image of
            the serpent crowned until the vision steadied.
          </p>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 16, margin: "0 0 22px" }}>
            <GematriaBlock />
            <SensationBlock />
          </div>

          <SlashMenu />

          <p
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: 11.5,
              color: "var(--ink-mute)",
              fontStyle: "italic",
              margin: "60px 0 0",
              maxWidth: "62ch",
              textAlign: "center",
              marginLeft: "auto",
              marginRight: "auto",
            }}
          >
            Editor surface is design-fidelity rendered. Live Tiptap integration + custom-node round-trip ship in the
            wiring pass; this page renders the designer's example entry so consumers can read the full UX before live
            editing arrives.
          </p>
        </div>
      </main>
    </div>
  );
}
