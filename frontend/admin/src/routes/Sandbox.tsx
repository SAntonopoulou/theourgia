/**
 * Sandbox admin — MBF imported-content isolated runtime.
 *
 * Faithful port of ``Theourgia Sandbox.dc.html``. Per
 * ``agent_onboarding.md §`` — sandbox is **visible isolation**. The
 * design uses:
 *   · `--sand` blue tone + `--sand-soft` tinted topbar chrome
 *   · `--sand-line` border accents
 *   · hatched 18px diagonal pattern fills the content surround so the
 *     sandbox boundary is unmistakable
 *
 * The route content carries the sandbox topbar via ``useTopbar``
 * (Sandbox eyebrow chip in `before`; Discard + "Import for real" in
 * `after`). A sand-toned banner sits at the top of the route to
 * reinforce the boundary; the hatched pattern fills the body.
 */

import { useTopbar } from "@theourgia/shared";

const LINE = "var(--line)";

interface SandboxItem {
  glyph: string;
  name: string;
  kind: string;
  color: string;
  conflict: boolean;
}

const ITEMS: SandboxItem[] = [
  { glyph: "☽", name: "Hekate", kind: "Entity · with correspondences", color: "var(--accent)", conflict: true },
  { glyph: "⚷", name: "Hekate Propylaia", kind: "Entity · alias", color: "var(--accent)", conflict: false },
  { glyph: "▲", name: "Deipnon — the Dark Moon supper", kind: "Working template · 7 blocks", color: "var(--danger)", conflict: false },
  { glyph: "☿", name: "Crossroads divination", kind: "Divination template", color: "var(--info)", conflict: false },
  { glyph: "❖", name: "Hymn to Hekate (PGM)", kind: "Library text", color: "var(--accent)", conflict: true },
];

function SandboxEyebrow() {
  return (
    <span
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        fontFamily: "var(--font-ui)",
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: "0.12em",
        textTransform: "uppercase",
        color: "var(--sand)",
        padding: "5px 11px",
        border: "1px solid var(--sand-line)",
        borderRadius: 999,
        background: "var(--sand-soft)",
      }}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="3.5" y="3.5" width="17" height="17" rx="2" />
        <path d="M8 8l8 8M16 8l-8 8" />
      </svg>
      Sandbox
    </span>
  );
}

export function Sandbox() {
  useTopbar(
    () => ({
      tone: "sandbox",
      title: 'Trying "Hekate · A Working Bundle"',
      subtitle: "Nothing here can touch your real vault · by L. Vespera · unverified",
      before: <SandboxEyebrow />,
      after: (
        <div style={{ display: "flex", gap: 10 }}>
          <button
            type="button"
            style={{
              padding: "8px 14px",
              border: "1px solid var(--line-2)",
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
            Discard
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
              fontSize: 13,
              border: "none",
              cursor: "pointer",
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = "0.9"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = "1"; }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M5 12.5l4.5 4.5L19 6.5" />
            </svg>
            Import for real
          </button>
        </div>
      ),
    }),
    [],
  );

  return (
    <div
      className="sandbox-root"
      style={{
        display: "flex",
        flexDirection: "column",
        minHeight: 0,
        flex: 1,
        margin: "0 -28px",
        // Sandbox local palette — per Theourgia Sandbox.dc.html line 24:
        //   --sand: #7E91CE (= --info / --c-divination — cool blue)
        //   --sand-soft: rgba(126,145,206,.13)
        //   --sand-line: rgba(126,145,206,.5)
        ["--sand" as string]: "var(--info)",
        ["--sand-soft" as string]: "color-mix(in srgb, var(--info) 13%, transparent)",
        ["--sand-line" as string]: "color-mix(in srgb, var(--info) 50%, transparent)",
      }}
    >
      {/* Sand-toned reinforce strip: signals "you are in the sandbox" */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 11,
          padding: "11px 28px",
          background: "var(--sand-soft)",
          borderBottom: "1px solid var(--sand-line)",
          fontFamily: "var(--font-ui)",
          fontSize: 12.5,
          color: "var(--ink-soft)",
        }}
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--sand)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" style={{ flex: "none" }} aria-hidden="true">
          <rect x="3.5" y="3.5" width="17" height="17" rx="2" />
          <path d="M8 8l8 8M16 8l-8 8" />
        </svg>
        You are inside the sandbox. Open and read anything; nothing written here reaches your vault until you import.
        Discard and it vanishes without a trace.
      </div>

      {/* Hatched sandbox surround */}
      <div
        className="scroll"
        style={{
          flex: 1,
          overflowY: "auto",
          minHeight: 0,
          padding: "24px 28px 60px",
          background: "repeating-linear-gradient(135deg, var(--bg) 0 18px, var(--bg-sunk) 18px 19px)",
        }}
      >
        <div style={{ maxWidth: 1080, margin: "0 auto", display: "flex", flexWrap: "wrap", alignItems: "flex-start", gap: 24 }}>

          {/* LEFT — contents preview */}
          <div style={{ flex: "2 1 500px", minWidth: 0, border: "1px solid var(--sand-line)", borderRadius: "var(--r-lg)", background: "var(--bg-2)", overflow: "hidden" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "13px 18px", borderBottom: `1px solid ${LINE}`, background: "var(--bg-3)" }}>
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: "var(--sand)",
                  animation: "sandbox-pulse 2s ease infinite",
                }}
                aria-hidden="true"
              />
              <span style={{ fontFamily: "var(--font-ui)", fontSize: 12, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--ink-mute)" }}>
                Running in isolation · 11 items
              </span>
            </div>
            <div style={{ padding: "8px 0" }}>
              {ITEMS.map((it, i) => (
                <div
                  key={it.name}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 13,
                    padding: "12px 18px",
                    borderBottom: i < ITEMS.length - 1 ? `1px solid ${LINE}` : "none",
                  }}
                >
                  <span
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: "var(--r-md)",
                      background: `color-mix(in srgb, ${it.color} 16%, transparent)`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontFamily: "var(--font-glyph)",
                      color: it.color,
                      fontSize: 15,
                      flex: "none",
                    }}
                    aria-hidden="true"
                  >
                    {it.glyph}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: "var(--font-display)", fontSize: 16, lineHeight: 1.1 }}>{it.name}</div>
                    <div style={{ fontFamily: "var(--font-ui)", fontSize: 11.5, color: "var(--ink-mute)" }}>{it.kind}</div>
                  </div>
                  {it.conflict ? (
                    <span
                      style={{
                        fontFamily: "var(--font-ui)",
                        fontSize: 11,
                        color: "var(--warning)",
                        padding: "2px 9px",
                        border: `1px solid ${LINE}`,
                        borderRadius: 999,
                        flex: "none",
                      }}
                    >
                      Name clash
                    </span>
                  ) : null}
                  <button
                    type="button"
                    style={{
                      fontFamily: "var(--font-ui)",
                      fontSize: 12,
                      color: "var(--sand)",
                      flex: "none",
                      background: "transparent",
                      border: "none",
                      cursor: "pointer",
                    }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = "0.8"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = "1"; }}
                  >
                    Open
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* RIGHT — permissions / verdict */}
          <aside style={{ flex: "1 1 280px", minWidth: 0, display: "flex", flexDirection: "column", gap: 18 }}>
            <div style={{ background: "var(--bg-2)", border: `1px solid ${LINE}`, borderRadius: "var(--r-lg)", padding: "18px 20px" }}>
              <div
                style={{
                  fontFamily: "var(--font-ui)",
                  fontSize: 10.5,
                  letterSpacing: "0.16em",
                  textTransform: "uppercase",
                  color: "var(--ink-mute)",
                  marginBottom: 13,
                }}
              >
                What it asked for
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
                {[
                  { tone: "ok", label: "Add entities & correspondences" },
                  { tone: "ok", label: "Add entry templates" },
                  { tone: "warn", label: "Run a script on new entries", note: " — review before trusting" },
                  { tone: "no", label: "No network access (blocked in sandbox)" },
                ].map((row) => (
                  <div key={row.label} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                    {row.tone === "ok" ? (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" style={{ flex: "none", marginTop: 1 }} aria-hidden="true">
                        <path d="M5 12.5l4.5 4.5L19 6.5" />
                      </svg>
                    ) : row.tone === "warn" ? (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--warning)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" style={{ flex: "none", marginTop: 1 }} aria-hidden="true">
                        <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
                        <path d="M12 9v4M12 17h.01" />
                      </svg>
                    ) : (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--ink-mute)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" style={{ flex: "none", marginTop: 1 }} aria-hidden="true">
                        <path d="M6 6l12 12M18 6 6 18" />
                      </svg>
                    )}
                    <span
                      style={{
                        fontFamily: "var(--font-serif)",
                        fontSize: 14,
                        lineHeight: 1.4,
                        color: row.tone === "warn" ? "var(--ink)" : row.tone === "no" ? "var(--ink-mute)" : "var(--ink-soft)",
                      }}
                    >
                      {row.label}
                      {row.note ? <span style={{ color: "var(--ink-mute)" }}>{row.note}</span> : null}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ background: "var(--bg-2)", border: `1px solid ${LINE}`, borderRadius: "var(--r-lg)", padding: "18px 20px" }}>
              <div
                style={{
                  fontFamily: "var(--font-ui)",
                  fontSize: 10.5,
                  letterSpacing: "0.16em",
                  textTransform: "uppercase",
                  color: "var(--ink-mute)",
                  marginBottom: 11,
                }}
              >
                On import, into your vault
              </div>
              {[
                { label: "New items", value: "+11", color: "var(--success)" },
                { label: "Name clashes to resolve", value: "2", color: "var(--warning)" },
                { label: "Signature", value: "Self-signed", color: "var(--warning)", small: true },
              ].map((row) => (
                <div key={row.label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 0" }}>
                  <span style={{ fontFamily: "var(--font-ui)", fontSize: 13, color: "var(--ink-soft)" }}>{row.label}</span>
                  <span style={{ fontFamily: row.small ? "var(--font-ui)" : "var(--font-mono)", fontSize: row.small ? 12 : 13, color: row.color }}>
                    {row.value}
                  </span>
                </div>
              ))}
              <a
                href="/bundles/install"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  fontFamily: "var(--font-ui)",
                  fontSize: 12.5,
                  color: "var(--accent)",
                  marginTop: 11,
                  textDecoration: "none",
                  transition: "gap 0.15s ease",
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.gap = "10px"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.gap = "6px"; }}
              >
                Resolve &amp; install →
              </a>
            </div>

            <div style={{ background: "var(--sand-soft)", border: "1px solid var(--sand-line)", borderRadius: "var(--r-lg)", padding: "16px 20px" }}>
              <div style={{ display: "flex", gap: 10 }}>
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="var(--sand)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ flex: "none", marginTop: 1 }} aria-hidden="true">
                  <rect x="3.5" y="3.5" width="17" height="17" rx="2" />
                  <path d="M8 8l8 8M16 8l-8 8" />
                </svg>
                <p style={{ fontFamily: "var(--font-serif)", fontSize: 14, lineHeight: 1.55, color: "var(--ink-soft)", margin: 0 }}>
                  You are inside the sandbox. Open and read anything; nothing written here reaches your vault until you
                  import. Discard and it vanishes without a trace.
                </p>
              </div>
            </div>
          </aside>
        </div>
      </div>

      <style>{`
        @keyframes sandbox-pulse { 0%, 100% { opacity: .5; } 50% { opacity: 1; } }
        @media (prefers-reduced-motion: reduce) { [data-sandbox-pulse] { animation: none !important; } }
      `}</style>
    </div>
  );
}
