/**
 * Newsletter Composer admin — split editor | live email preview.
 *
 * Port of ``Theourgia Newsletter Composer.dc.html``. Per
 * ``agent_onboarding.md §`` — output publishes to the public Newsletter
 * archive; scheduling hands off to Scheduler. Email rendering is its
 * own constraint (table layout, inlined styles, client quirks); the
 * parchment preview must match what actually sends.
 *
 * Paper / email-render color tokens scoped locally on
 * `.newsletter-composer-root` until the email-render substrate ships.
 */

import { useTopbar } from "@theourgia/shared";
import { type CSSProperties, useState } from "react";

const LINE = "var(--line)";
const LINE_2 = "var(--line-2)";

type Audience = "all" | "paid";
type Device = "desktop" | "phone";

interface AudienceOption {
  key: Audience;
  title: string;
  count: string;
  icon: React.ReactNode;
}

const AUDIENCES: AudienceOption[] = [
  {
    key: "all",
    title: "All readers",
    count: "1,240 subscribers",
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="var(--ink-soft)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ flex: "none" }} aria-hidden="true">
        <circle cx="9" cy="8" r="3" />
        <circle cx="17" cy="9" r="2.4" />
        <path d="M3 19c0-3 2.7-5 6-5s6 2 6 5M16 14c2.5 0 5 1.6 5 5" />
      </svg>
    ),
  },
  {
    key: "paid",
    title: "Supporters only",
    count: "214 supporters",
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="var(--ink-soft)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ flex: "none" }} aria-hidden="true">
        <path d="M12 3l7 3v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z" />
        <path d="M9 12l2 2 4-4" />
      </svg>
    ),
  },
];

function ToolbarIconButton({ label, ariaLabel, monospaceItalic, dividerAfter }: { label: string; ariaLabel: string; monospaceItalic?: boolean; dividerAfter?: boolean }) {
  return (
    <>
      <button
        type="button"
        aria-label={ariaLabel}
        style={{
          width: 30,
          height: 30,
          borderRadius: "var(--r-sm)",
          color: "var(--ink-soft)",
          fontFamily: monospaceItalic ? "var(--font-display)" : "var(--font-ui)",
          fontStyle: monospaceItalic ? "italic" : "normal",
          fontWeight: !monospaceItalic && label === "B" ? 700 : 400,
          fontSize: 15,
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
        {label}
      </button>
      {dividerAfter ? <span style={{ width: 1, height: 18, background: LINE, margin: "0 5px" }} /> : null}
    </>
  );
}

export function NewsletterComposer() {
  const [subject, setSubject] = useState("The Solstice Letter — on keeping the longest day");
  const [previewText, setPreviewText] = useState("Solar work without sun-worship, and one reading from Proclus to carry into the dark half of the year.");
  const [audience, setAudience] = useState<Audience>("all");
  const [device, setDevice] = useState<Device>("desktop");

  useTopbar(
    () => ({
      title: "Newsletter composer",
      subtitle: "The Theurgist's Almanac · Issue №18 · draft",
      before: (
        <span style={{ display: "flex", alignItems: "center", gap: 6, fontFamily: "var(--font-ui)", fontSize: 12, color: "var(--ink-mute)" }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M5 12.5l4.5 4.5L19 6.5" />
          </svg>
          Saved
        </span>
      ),
      after: (
        <div style={{ display: "flex", gap: 12 }}>
          <button
            type="button"
            style={{
              padding: "8px 14px",
              border: `1px solid ${LINE_2}`,
              borderRadius: "var(--r-md)",
              fontFamily: "var(--font-ui)",
              fontSize: 13,
              color: "var(--ink-soft)",
              background: "transparent",
              cursor: "pointer",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = "var(--bg-2)";
              (e.currentTarget as HTMLButtonElement).style.color = "var(--ink)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = "transparent";
              (e.currentTarget as HTMLButtonElement).style.color = "var(--ink-soft)";
            }}
          >
            Send test
          </button>
          <button
            type="button"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "9px 16px",
              borderRadius: "var(--r-md)",
              background: "var(--accent)",
              color: "var(--accent-ink)",
              fontFamily: "var(--font-ui)",
              fontWeight: 700,
              fontSize: 13.5,
              border: "none",
              cursor: "pointer",
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = "0.9"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = "1"; }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M22 2 11 13M22 2l-7 20-4-9-9-4z" />
            </svg>
            Schedule send
          </button>
        </div>
      ),
    }),
    [],
  );

  return (
    <div
      className="newsletter-composer-root"
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        minHeight: 0,
        minWidth: 0,
        flex: 1,
        margin: "0 -28px",
        ["--paper" as string]: "#F2E9D4",
        ["--paper-ink" as string]: "#2B2114",
        ["--paper-soft" as string]: "#8A7857",
        ["--paper-rule" as string]: "#C9B68C",
      }}
    >
      {/* EDITOR */}
      <div className="scroll" style={{ overflowY: "auto", minHeight: 0, borderRight: `1px solid ${LINE}`, padding: "24px 28px 60px" }}>
        <div style={{ maxWidth: 520, margin: "0 auto" }}>
          <div style={{ fontFamily: "var(--font-ui)", fontSize: 10.5, letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--ink-mute)", marginBottom: 8 }}>
            Subject line
          </div>
          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            aria-label="Subject line"
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 21,
              color: "var(--ink)",
              padding: "12px 14px",
              border: `1px solid ${LINE_2}`,
              borderRadius: "var(--r-md)",
              background: "var(--bg-2)",
              marginBottom: 6,
              width: "100%",
              outline: "none",
            }}
          />
          <div style={{ fontFamily: "var(--font-ui)", fontSize: 11.5, color: "var(--ink-mute)", marginBottom: 22 }}>
            Preview text ·{" "}
            <input
              value={previewText}
              onChange={(e) => setPreviewText(e.target.value)}
              aria-label="Preview text"
              style={{
                color: "var(--ink-soft)",
                background: "transparent",
                border: "none",
                outline: "none",
                fontFamily: "inherit",
                fontSize: "inherit",
                width: "70%",
              }}
            />
          </div>

          <div style={{ fontFamily: "var(--font-ui)", fontSize: 10.5, letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--ink-mute)", marginBottom: 10 }}>
            Body
          </div>
          <div style={{ border: `1px solid ${LINE}`, borderRadius: "var(--r-lg)", background: "var(--bg-2)", overflow: "hidden" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 3, padding: "8px 10px", borderBottom: `1px solid ${LINE}`, background: "var(--bg-sunk)", flexWrap: "wrap" }}>
              <ToolbarIconButton label="H" ariaLabel="Heading" />
              <ToolbarIconButton label="B" ariaLabel="Bold" />
              <ToolbarIconButton label="i" ariaLabel="Italic" monospaceItalic dividerAfter />
              <button type="button" aria-label="Quote" style={iconBtn} onMouseEnter={iconHoverIn} onMouseLeave={iconHoverOut}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M7 7H5a2 2 0 0 0-2 2v3h4v-3M17 7h-2a2 2 0 0 0-2 2v3h4v-3" />
                </svg>
              </button>
              <button type="button" aria-label="Link" style={iconBtn} onMouseEnter={iconHoverIn} onMouseLeave={iconHoverOut}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M9 15l6-6M8 8H7a4 4 0 0 0 0 8h1M16 16h1a4 4 0 0 0 0-8h-1" />
                </svg>
              </button>
              <button type="button" aria-label="Divider" style={iconBtn} onMouseEnter={iconHoverIn} onMouseLeave={iconHoverOut}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
                  <path d="M4 12h16" />
                </svg>
              </button>
              <span style={{ width: 1, height: 18, background: LINE, margin: "0 5px" }} />
              <button
                type="button"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  height: 30,
                  padding: "0 10px",
                  borderRadius: "var(--r-sm)",
                  color: "var(--accent)",
                  fontFamily: "var(--font-ui)",
                  fontSize: 12,
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "var(--bg-3)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden="true">
                  <path d="M12 5v14M5 12h14" />
                </svg>
                Insert essay
              </button>
            </div>
            <div style={{ padding: "20px 22px", display: "flex", flexDirection: "column", gap: 14 }}>
              <p style={{ fontFamily: "var(--font-serif)", fontSize: 15.5, lineHeight: 1.6, color: "var(--ink-soft)", margin: 0 }}>Friends —</p>
              <p style={{ fontFamily: "var(--font-serif)", fontSize: 15.5, lineHeight: 1.6, color: "var(--ink-soft)", margin: 0 }}>
                The Sun stands still tonight at his northern height. A word, then, on solar work that does not collapse
                into sun-worship: the discipline is to <span style={{ color: "var(--ink)" }}>attend</span>, not to adore.
              </p>
              <div style={{ border: `1px solid ${LINE_2}`, borderRadius: "var(--r-md)", background: "var(--bg)", padding: "13px 15px", display: "flex", gap: 12, alignItems: "center" }}>
                <span style={{ width: 34, height: 34, borderRadius: "var(--r-sm)", background: "var(--accent-soft)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--accent)", flex: "none" }} aria-hidden="true">
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 5.5h11a2 2 0 0 1 2 2V20a2 2 0 0 0-2-2H4z" />
                    <path d="M20 5.5h-3a2 2 0 0 0-2 2V18" />
                  </svg>
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: "var(--font-ui)", fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--ink-mute)" }}>Linked essay</div>
                  <div style={{ fontFamily: "var(--font-display)", fontSize: 15, color: "var(--ink)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    On the discipline of the magical record
                  </div>
                </div>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--ink-mute)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" style={{ flex: "none" }} aria-hidden="true">
                  <path d="M9 6l6 6-6 6" />
                </svg>
              </div>
              <p style={{ fontFamily: "var(--font-serif)", fontSize: 15.5, lineHeight: 1.6, color: "var(--ink-soft)", margin: 0 }}>
                And one reading to carry down into the dark half of the year…
              </p>
              <div style={{ fontFamily: "var(--font-ui)", fontSize: 12.5, color: "var(--ink-mute)", display: "flex", alignItems: "center", gap: 7 }}>
                <span style={{ width: 7, height: 15, background: "var(--accent)", opacity: 0.5, display: "inline-block" }} />
                Writing…
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* PREVIEW + SETTINGS */}
      <div className="scroll" style={{ overflowY: "auto", minHeight: 0, background: "var(--bg-sunk)", padding: "24px 28px 60px" }}>
        <div style={{ maxWidth: 480, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <span style={{ fontFamily: "var(--font-ui)", fontSize: 10.5, letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--ink-mute)" }}>
              Email preview
            </span>
            {/* Desktop / Phone preview toggle — design line 167. Desktop active by default. */}
            <div style={{ display: "flex", gap: 6 }}>
              <button
                type="button"
                aria-label="Desktop preview"
                aria-pressed={device === "desktop" ? "true" : "false"}
                onClick={() => setDevice("desktop")}
                style={{
                  width: 30,
                  height: 28,
                  border: `1px solid ${device === "desktop" ? LINE_2 : LINE}`,
                  borderRadius: "var(--r-sm)",
                  background: device === "desktop" ? "var(--accent-soft)" : "transparent",
                  color: device === "desktop" ? "var(--ink)" : "var(--ink-mute)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                }}
                onMouseEnter={(e) => {
                  if (device !== "desktop") (e.currentTarget as HTMLButtonElement).style.color = "var(--ink)";
                }}
                onMouseLeave={(e) => {
                  if (device !== "desktop") (e.currentTarget as HTMLButtonElement).style.color = "var(--ink-mute)";
                }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                  <rect x="3" y="4" width="18" height="13" rx="1.5" />
                  <path d="M8 20h8M12 17v3" strokeLinecap="round" />
                </svg>
              </button>
              <button
                type="button"
                aria-label="Phone preview"
                aria-pressed={device === "phone" ? "true" : "false"}
                onClick={() => setDevice("phone")}
                style={{
                  width: 30,
                  height: 28,
                  border: `1px solid ${device === "phone" ? LINE_2 : LINE}`,
                  borderRadius: "var(--r-sm)",
                  background: device === "phone" ? "var(--accent-soft)" : "transparent",
                  color: device === "phone" ? "var(--ink)" : "var(--ink-mute)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                }}
                onMouseEnter={(e) => {
                  if (device !== "phone") (e.currentTarget as HTMLButtonElement).style.color = "var(--ink)";
                }}
                onMouseLeave={(e) => {
                  if (device !== "phone") (e.currentTarget as HTMLButtonElement).style.color = "var(--ink-mute)";
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                  <rect x="6" y="3" width="12" height="18" rx="2" />
                  <path d="M11 18h2" strokeLinecap="round" />
                </svg>
              </button>
            </div>
          </div>

          {/* rendered email — parchment; phone toggle narrows to phone-width frame */}
          <div
            style={{
              background: "var(--paper)",
              color: "var(--paper-ink)",
              borderRadius: "var(--r-md)",
              overflow: "hidden",
              boxShadow: "0 16px 40px rgba(0,0,0,.45)",
              marginBottom: 24,
              maxWidth: device === "phone" ? 340 : "none",
              marginLeft: device === "phone" ? "auto" : 0,
              marginRight: device === "phone" ? "auto" : 0,
              transition: "max-width 0.2s ease",
            }}
          >
            <div style={{ padding: "26px 30px", textAlign: "center", borderBottom: "1px solid var(--paper-rule)" }}>
              <div style={{ fontFamily: "var(--font-glyph)", color: "#8C2F23", fontSize: 18, marginBottom: 8 }}>☾ ☉ ☽</div>
              <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 22, color: "var(--paper-ink)" }}>
                The Theurgist's Almanac
              </div>
              <div style={{ fontFamily: "var(--font-ui)", fontSize: 11, color: "var(--paper-soft)", marginTop: 5 }}>
                Issue №18 · 21 June 2026
              </div>
            </div>
            <div style={{ padding: "24px 30px" }}>
              <h2 style={{ fontFamily: "var(--font-display)", fontSize: 21, lineHeight: 1.25, margin: "0 0 14px", color: "var(--paper-ink)" }}>{subject}</h2>
              <p style={{ fontFamily: "var(--font-display)", fontSize: 14.5, lineHeight: 1.65, color: "var(--paper-ink)", margin: "0 0 12px" }}>Friends —</p>
              <p style={{ fontFamily: "var(--font-display)", fontSize: 14.5, lineHeight: 1.65, color: "var(--paper-ink)", margin: "0 0 14px" }}>
                The Sun stands still tonight at his northern height. A word, then, on solar work that does not collapse
                into sun-worship: the discipline is to attend, not to adore.
              </p>
              <div style={{ borderLeft: "2px solid #8C2F23", padding: "2px 0 2px 14px", margin: "0 0 16px" }}>
                <div style={{ fontFamily: "var(--font-ui)", fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--paper-soft)", marginBottom: 3 }}>
                  Read in full
                </div>
                <div style={{ fontFamily: "var(--font-display)", fontSize: 15, color: "var(--paper-ink)" }}>
                  On the discipline of the magical record →
                </div>
              </div>
              <p style={{ fontFamily: "var(--font-display)", fontSize: 14.5, lineHeight: 1.65, color: "var(--paper-ink)", margin: 0 }}>
                And one reading to carry down into the dark half of the year…
              </p>
              <div style={{ marginTop: 22, paddingTop: 16, borderTop: "1px solid var(--paper-rule)", fontFamily: "var(--font-ui)", fontSize: 11, color: "var(--paper-soft)", textAlign: "center" }}>
                Sent to you because you follow the Almanac · <span style={{ textDecoration: "underline" }}>Unsubscribe</span>
              </div>
            </div>
          </div>

          {/* audience */}
          <div style={{ fontFamily: "var(--font-ui)", fontSize: 10.5, letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--ink-mute)", marginBottom: 11 }}>
            Audience
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 7, marginBottom: 18 }}>
            {AUDIENCES.map((a) => {
              const isActive = audience === a.key;
              return (
                <button
                  key={a.key}
                  type="button"
                  data-aud
                  aria-pressed={isActive ? "true" : "false"}
                  onClick={() => setAudience(a.key)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "12px 14px",
                    border: `1px solid ${isActive ? "var(--accent)" : LINE}`,
                    borderRadius: "var(--r-md)",
                    background: isActive ? "var(--accent-soft)" : "var(--bg-2)",
                    textAlign: "left",
                    cursor: "pointer",
                    color: "inherit",
                    fontFamily: "inherit",
                  }}
                >
                  {a.icon}
                  <span style={{ flex: 1 }}>
                    <span style={{ display: "block", fontFamily: "var(--font-display)", fontSize: 15.5, color: "var(--ink)" }}>{a.title}</span>
                    <span style={{ display: "block", fontFamily: "var(--font-ui)", fontSize: 11.5, color: "var(--ink-mute)" }}>{a.count}</span>
                  </span>
                </button>
              );
            })}
          </div>

          {/* send as identity */}
          <div style={{ display: "flex", alignItems: "center", gap: 11, padding: "12px 14px", border: `1px solid ${LINE}`, borderRadius: "var(--r-md)", background: "var(--bg-2)" }}>
            <span style={{ width: 30, height: 30, borderRadius: "50%", background: "var(--accent-soft)", border: `1px solid ${LINE_2}`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-glyph)", color: "var(--accent)", fontSize: 14, flex: "none" }} aria-hidden="true">Θ</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: "var(--font-ui)", fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--ink-mute)" }}>Send as</div>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 15, color: "var(--ink)" }}>Theophrastos</div>
            </div>
            <a href="/identities" style={{ fontFamily: "var(--font-ui)", fontSize: 12, color: "var(--accent)", flex: "none", textDecoration: "none" }}>Change</a>
          </div>
        </div>
      </div>
    </div>
  );
}

const iconBtn: CSSProperties = {
  width: 30,
  height: 30,
  borderRadius: "var(--r-sm)",
  color: "var(--ink-soft)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "transparent",
  border: "none",
  cursor: "pointer",
};

const iconHoverIn = (e: React.MouseEvent<HTMLButtonElement>) => {
  e.currentTarget.style.background = "var(--bg-3)";
  e.currentTarget.style.color = "var(--ink)";
};
const iconHoverOut = (e: React.MouseEvent<HTMLButtonElement>) => {
  e.currentTarget.style.background = "transparent";
  e.currentTarget.style.color = "var(--ink-soft)";
};
