/**
 * Wellbeing — Settings → Wellbeing (opt-in gentle check-ins).
 *
 * The single most tone-sensitive surface in the product. Per
 * ``agent_onboarding.md §`` Theourgia Wellbeing:
 *
 *   · **Off by default.** The first time anyone lands here the toggle is
 *     unchecked. Demo content for the live preview only renders when
 *     the user opts in.
 *   · **On-device only.** No telemetry. No logs. The privacy guarantee
 *     is literal — these copy lines are an honest promise.
 *   · **Never modal, never alarming, never red.** The care palette
 *     (``--care`` / ``--care-soft`` / ``--care-line``) is purpose-built
 *     for this surface and is calm, not warning-toned. ``--danger``
 *     never appears on this page.
 *   · **"A note, if it's welcome"** framing — verbatim from the designer.
 *     **Do not improvise crisis language.** All copy on this page is
 *     copied verbatim from ``Theourgia Wellbeing.dc.html``.
 *
 * Per `feedback_follow_design_thread_deep.md` — every visible string
 * here is editorial copy the maintainer reviewed; production
 * deployments need a final maintainer pass over the regional resource
 * list before going live (the lines themselves are real, but "The
 * Sacred Well Directory" is a designer placeholder for a Theourgia-
 * curated directory that does not yet exist).
 */

import { useTopbar } from "@theourgia/shared";
import { type CSSProperties, useState } from "react";

type Sensitivity = "rare" | "some" | "strong";
type Region = "intl" | "us" | "uk" | "greece";

interface Resource {
  glyph: string;
  name: string;
  detail: string;
  /** Optional ``lang`` attribute for non-Latin script resources. */
  lang?: string;
}

const RESOURCES: Record<Region, { label: string; rows: Resource[] }> = {
  intl: {
    label: "International",
    rows: [
      { glyph: "☎", name: "Befrienders Worldwide", detail: "Find a helpline in your country · befrienders.org" },
      { glyph: "✆", name: "Find A Helpline", detail: "Free, confidential support lines worldwide · findahelpline.com" },
      // The Sacred Well Directory is a designer-named placeholder for a
      // Theourgia-curated magick-literate directory that does not yet
      // exist. Replace with the real directory name + URL before
      // shipping any production deployment.
      { glyph: "❖", name: "The Sacred Well Directory", detail: "Community-vetted, magick-literate counsellors" },
    ],
  },
  us: {
    label: "United States",
    rows: [
      { glyph: "☎", name: "988 Suicide & Crisis Lifeline", detail: "Call or text 988 · 24/7, free and confidential" },
      { glyph: "✆", name: "Crisis Text Line", detail: "Text HOME to 741741" },
      { glyph: "❖", name: "The Sacred Well Directory", detail: "Pagan- and occult-friendly therapists by state" },
    ],
  },
  uk: {
    label: "UK & Ireland",
    rows: [
      { glyph: "☎", name: "Samaritans", detail: "Call 116 123, free · day or night, any day" },
      { glyph: "✆", name: "Shout", detail: "Text SHOUT to 85258" },
      { glyph: "❖", name: "The Sacred Well Directory", detail: "Esoteric-aware counsellors across the isles" },
    ],
  },
  greece: {
    label: "Greece",
    rows: [
      { glyph: "☎", name: "Κλίμακα — Suicide Prevention", detail: "Call 1018 · γραμμή παρέμβασης για την αυτοκτονία", lang: "el" },
      { glyph: "✆", name: "Κέντρο Ημέρας", detail: "Ψυχοκοινωνική στήριξη · klimaka.org.gr", lang: "el" },
      { glyph: "❖", name: "The Sacred Well Directory", detail: "Σύμβουλοι εξοικειωμένοι με την πρακτική", lang: "el" },
    ],
  },
};

const SENSITIVITIES: { key: Sensitivity; title: string; body: string }[] = [
  {
    key: "rare",
    title: "Only when I ask",
    body: "Never automatic. A \"check in with me\" action appears in the journal menu, and nowhere else.",
  },
  {
    key: "some",
    title: "When the tone is heavy for a while",
    body: "Only after a sustained shift across several entries — not a single hard day. The gentlest automatic setting.",
  },
  {
    key: "strong",
    title: "When something sounds acute",
    body: "Responds sooner to language of crisis. Choose this if you'd rather it err toward reaching out.",
  },
];

const LINE = "var(--line)";
const LINE_2 = "var(--line-2)";

function LampIcon({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3c1.6 1.8 2.6 3.5 2.6 5.2A2.6 2.6 0 0 1 12 10.8a2.6 2.6 0 0 1-2.6-2.6C9.4 6.5 10.4 4.8 12 3z" />
      <path d="M8 21h8M10 21c0-2.2-2.4-3-2.4-6.2M14 21c0-2.2 2.4-3 2.4-6.2" />
    </svg>
  );
}

function SensRadio({ on }: { on: boolean }) {
  return (
    <span
      aria-hidden="true"
      style={{
        width: 18,
        height: 18,
        borderRadius: "50%",
        flex: "none",
        marginTop: 1,
        border: `1px solid ${on ? "var(--care)" : LINE_2}`,
        background: on
          ? "radial-gradient(circle at center, var(--care) 0 5px, transparent 6px)"
          : "transparent",
        display: "block",
      }}
    />
  );
}

function CareSwitch({ enabled, onToggle }: { enabled: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled ? "true" : "false"}
      aria-label="Enable gentle check-ins"
      onClick={onToggle}
      style={{
        position: "relative",
        width: 48,
        height: 27,
        borderRadius: 999,
        flex: "none",
        background: enabled ? "var(--care)" : "var(--bg-3)",
        border: `1px solid ${enabled ? "var(--care)" : LINE_2}`,
        transition: "all 0.18s ease",
        cursor: "pointer",
        padding: 0,
      }}
    >
      <span
        style={{
          position: "absolute",
          top: 2,
          left: enabled ? 23 : 2,
          width: 21,
          height: 21,
          borderRadius: "50%",
          background: enabled ? "var(--bg)" : "var(--ink-mute)",
          transition: "all 0.18s ease",
          display: "block",
        }}
      />
    </button>
  );
}

function PrivacyRow({ children, strong, useSuccessIcon }: { children: React.ReactNode; strong: string; useSuccessIcon?: "shield" | "check" }) {
  return (
    <div style={{ display: "flex", gap: 11, alignItems: "flex-start" }}>
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" style={{ flex: "none", marginTop: 1 }} aria-hidden="true">
        {useSuccessIcon === "shield" ? (
          <>
            <path d="M12 3l7 3v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z" />
            <path d="M9 12l2 2 4-4" />
          </>
        ) : (
          <path d="M5 12.5l4.5 4.5L19 6.5" />
        )}
      </svg>
      <span style={{ fontFamily: "var(--font-serif)", fontSize: 14.5, lineHeight: 1.45, color: "var(--ink-soft)" }}>
        <span style={{ color: "var(--ink)" }}>{strong}</span> {children}
      </span>
    </div>
  );
}

export function Wellbeing() {
  // **Off by default.** This is the non-negotiable rule for first render.
  const [enabled, setEnabled] = useState(false);
  const [sens, setSens] = useState<Sensitivity>("some");
  const [region, setRegion] = useState<Region>("intl");
  // Live-preview nudge state: 'shown' | 'dismissed'.
  const [nudgeState, setNudgeState] = useState<"shown" | "dismissed">("shown");
  const [resourcesOpen, setResourcesOpen] = useState(false);
  const [muteOpen, setMuteOpen] = useState(false);

  useTopbar(
    () => ({
      title: "Wellbeing",
      subtitle: "Settings",
    }),
    [],
  );

  const cur = RESOURCES[region];
  const statusLine = enabled
    ? "On — checking the tone of your private journal only"
    : "Off — Theourgia is not watching anything";

  const subnavLinkStyle: CSSProperties = {
    fontFamily: "var(--font-ui)",
    fontSize: 13,
    color: "var(--ink-mute)",
    background: "transparent",
    border: `1px solid ${LINE}`,
    borderRadius: 999,
    padding: "6px 13px",
    cursor: "pointer",
  };

  return (
    <div className="scroll" style={{ overflowY: "auto", minHeight: 0, padding: "30px 28px" }}>
      <div style={{ maxWidth: 1080, margin: "0 auto", display: "flex", flexWrap: "wrap", alignItems: "flex-start", gap: 30 }}>

        {/* LEFT — settings */}
        <div style={{ flex: "2 1 460px", minWidth: 0 }}>

          <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 30, lineHeight: 1.15, margin: "0 0 10px" }}>
            Gentle check-ins
          </h1>
          <p style={{ fontSize: 16, lineHeight: 1.62, color: "var(--ink-soft)", maxWidth: "60ch", margin: "0 0 6px" }}>
            Deep practice can stir deep things. If you'd like, Theourgia can keep a quiet eye on the tone of your
            private journal — and, very occasionally, offer a short note and a few resources.
          </p>
          <p style={{ fontFamily: "var(--font-display)", fontStyle: "italic", fontSize: 15, color: "var(--ink-mute)", margin: "0 0 24px" }}>
            It is off until you turn it on, and yours to turn off again at any moment.
          </p>

          {/* OPT-IN CARD */}
          <div
            style={{
              border: `1px solid ${LINE_2}`,
              borderRadius: "var(--r-lg)",
              background: "var(--bg-2)",
              overflow: "hidden",
              marginBottom: 22,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "20px 22px" }}>
              <span
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: "50%",
                  background: "var(--care-soft)",
                  border: "1px solid var(--care-line)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "var(--care)",
                  flex: "none",
                }}
              >
                <LampIcon size={22} />
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: "var(--font-display)", fontSize: 18, lineHeight: 1.2 }}>
                  Let Theourgia check in on me
                </div>
                <div style={{ fontFamily: "var(--font-ui)", fontSize: 12.5, color: "var(--ink-mute)", marginTop: 3 }}>
                  {statusLine}
                </div>
              </div>
              <CareSwitch enabled={enabled} onToggle={() => setEnabled((e) => !e)} />
            </div>

            {/* privacy guarantees */}
            <div style={{ borderTop: `1px solid ${LINE}`, background: "var(--bg-sunk)", padding: "16px 22px" }}>
              <div
                style={{
                  fontFamily: "var(--font-ui)",
                  fontSize: 10.5,
                  letterSpacing: "0.15em",
                  textTransform: "uppercase",
                  color: "var(--ink-mute)",
                  marginBottom: 13,
                }}
              >
                How it protects you
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
                <PrivacyRow strong="Read on your device, never sent." useSuccessIcon="shield">
                  The tone is assessed locally. Your words do not leave your vault — not to us, not to anyone.
                </PrivacyRow>
                <PrivacyRow strong="Nothing is logged.">
                  No record is kept of what prompted a check-in, or that one happened at all.
                </PrivacyRow>
                <PrivacyRow strong="Never urgent, never modal.">
                  A check-in is a small card you can dismiss with a glance. It will never interrupt you or demand a response.
                </PrivacyRow>
              </div>
            </div>
          </div>

          {/* FINER CONTROLS — only when enabled. */}
          {enabled ? (
            <div style={{ animation: "wbpop 0.18s ease" }}>
              {/* sensitivity */}
              <div style={{ marginBottom: 24 }}>
                <h3 style={{ fontFamily: "var(--font-display)", fontSize: 18, margin: "0 0 4px" }}>
                  When should it speak up?
                </h3>
                <p style={{ fontFamily: "var(--font-ui)", fontSize: 12.5, color: "var(--ink-mute)", margin: "0 0 13px" }}>
                  You set the threshold. Quieter is always an option.
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {SENSITIVITIES.map((s) => {
                    const active = sens === s.key;
                    return (
                      <button
                        key={s.key}
                        type="button"
                        data-sens
                        aria-pressed={active ? "true" : "false"}
                        onClick={() => setSens(s.key)}
                        style={{
                          display: "flex",
                          gap: 13,
                          alignItems: "flex-start",
                          padding: "14px 16px",
                          border: `1px solid ${active ? "var(--care-line)" : LINE}`,
                          borderRadius: "var(--r-md)",
                          background: active ? "var(--care-soft)" : "var(--bg-2)",
                          textAlign: "left",
                          cursor: "pointer",
                          color: "inherit",
                          fontFamily: "inherit",
                        }}
                        onMouseEnter={(e) => {
                          if (!active) (e.currentTarget as HTMLButtonElement).style.borderColor = LINE_2;
                        }}
                        onMouseLeave={(e) => {
                          if (!active) (e.currentTarget as HTMLButtonElement).style.borderColor = LINE;
                        }}
                      >
                        <SensRadio on={active} />
                        <span style={{ flex: 1 }}>
                          <span style={{ display: "block", fontFamily: "var(--font-display)", fontSize: 16, color: "var(--ink)" }}>
                            {s.title}
                          </span>
                          <span style={{ display: "block", fontFamily: "var(--font-ui)", fontSize: 12.5, color: "var(--ink-mute)", marginTop: 2 }}>
                            {s.body}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* regional resources */}
              <div style={{ marginBottom: 10 }}>
                <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, marginBottom: 4 }}>
                  <h3 style={{ fontFamily: "var(--font-display)", fontSize: 18, margin: 0 }}>Resources near you</h3>
                  <span
                    style={{
                      fontFamily: "var(--font-ui)",
                      fontSize: 11.5,
                      color: "var(--ink-mute)",
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <circle cx="12" cy="12" r="9" />
                      <path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
                    </svg>
                    Community-maintained
                  </span>
                </div>
                <p style={{ fontFamily: "var(--font-ui)", fontSize: 12.5, color: "var(--ink-mute)", margin: "0 0 13px" }}>
                  The list a check-in would offer. Curated by practitioners — crisis lines, and counsellors who understand the work.
                </p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginBottom: 16 }}>
                  {(["intl", "us", "uk", "greece"] as Region[]).map((r) => {
                    const active = region === r;
                    return (
                      <button
                        key={r}
                        type="button"
                        data-region
                        aria-pressed={active ? "true" : "false"}
                        onClick={() => setRegion(r)}
                        style={{
                          ...subnavLinkStyle,
                          color: active ? "var(--ink)" : "var(--ink-soft)",
                          background: active ? "var(--care-soft)" : "transparent",
                          borderColor: active ? "var(--care-line)" : LINE,
                        }}
                        onMouseEnter={(e) => {
                          if (!active) (e.currentTarget as HTMLButtonElement).style.borderColor = LINE_2;
                        }}
                        onMouseLeave={(e) => {
                          if (!active) (e.currentTarget as HTMLButtonElement).style.borderColor = LINE;
                        }}
                      >
                        {RESOURCES[r].label}
                      </button>
                    );
                  })}
                </div>
                <div style={{ border: `1px solid ${LINE}`, borderRadius: "var(--r-lg)", background: "var(--bg-2)", overflow: "hidden" }}>
                  {cur.rows.map((r, i) => (
                    <div
                      key={`${r.name}-${i}`}
                      style={{
                        display: "flex",
                        gap: 13,
                        alignItems: "flex-start",
                        padding: "14px 18px",
                        borderBottom: i < cur.rows.length - 1 ? `1px solid ${LINE}` : "none",
                      }}
                    >
                      <span style={{ fontFamily: "var(--font-glyph)", color: "var(--care)", fontSize: 16, flex: "none", marginTop: 1 }} aria-hidden="true">
                        {r.glyph}
                      </span>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontFamily: "var(--font-serif)", fontSize: 15.5, lineHeight: 1.25, color: "var(--ink)" }} lang={r.lang}>
                          {r.name}
                        </div>
                        <div style={{ fontFamily: "var(--font-ui)", fontSize: 12.5, color: "var(--ink-mute)", marginTop: 3 }} lang={r.lang}>
                          {r.detail}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 7,
                    fontFamily: "var(--font-ui)",
                    fontSize: 12.5,
                    color: "var(--accent)",
                    marginTop: 12,
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    transition: "gap 0.15s ease",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.gap = "11px";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.gap = "7px";
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                  Suggest a resource for this region
                </button>
              </div>
            </div>
          ) : null}
        </div>

        {/* RIGHT — live preview */}
        <aside style={{ flex: "1 1 320px", minWidth: 0, position: "sticky", top: 0 }}>
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
            Exactly what you'd see
          </div>

          <div
            style={{
              border: `1px solid ${LINE}`,
              borderRadius: "var(--r-lg)",
              background: "var(--bg-sunk)",
              padding: 18,
              position: "relative",
              overflow: "hidden",
            }}
          >
            {/* faux journal context */}
            <div aria-hidden="true" style={{ opacity: 0.5, pointerEvents: "none", filter: "saturate(.7)" }}>
              <div style={{ fontFamily: "var(--font-ui)", fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--ink-mute)", marginBottom: 8 }}>
                Thursday · late
              </div>
              <div style={{ height: 9, width: "78%", borderRadius: 3, background: LINE_2, marginBottom: 9 }} />
              <div style={{ height: 9, width: "94%", borderRadius: 3, background: LINE, marginBottom: 9 }} />
              <div style={{ height: 9, width: "62%", borderRadius: 3, background: LINE, marginBottom: 9 }} />
              <div style={{ height: 9, width: "88%", borderRadius: 3, background: LINE }} />
            </div>

            {/* THE NUDGE — only shown when opted in and not dismissed. */}
            {enabled && nudgeState === "shown" ? (
              <div
                role="note"
                aria-label="A gentle check-in"
                style={{
                  marginTop: 18,
                  border: "1px solid var(--care-line)",
                  borderLeft: "3px solid var(--care)",
                  borderRadius: "var(--r-md)",
                  background: "var(--bg-2)",
                  boxShadow: "0 8px 24px rgba(0,0,0,.28)",
                  overflow: "hidden",
                  animation: "wbpop 0.22s ease",
                }}
              >
                <div style={{ padding: "17px 18px 16px" }}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                    <span
                      style={{
                        width: 34,
                        height: 34,
                        borderRadius: "50%",
                        background: "var(--care-soft)",
                        border: "1px solid var(--care-line)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "var(--care)",
                        flex: "none",
                      }}
                    >
                      <LampIcon size={18} />
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: "var(--font-display)", fontSize: 17, lineHeight: 1.2, color: "var(--ink)" }}>
                        A note, if it's welcome
                      </div>
                    </div>
                    <div style={{ position: "relative", flex: "none" }}>
                      <button
                        type="button"
                        aria-label="Mute options"
                        aria-haspopup="menu"
                        aria-expanded={muteOpen ? "true" : "false"}
                        onClick={() => setMuteOpen((o) => !o)}
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: "var(--r-sm)",
                          color: "var(--ink-mute)",
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
                          (e.currentTarget as HTMLButtonElement).style.color = "var(--ink-mute)";
                        }}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden="true">
                          <circle cx="5" cy="12" r="1.3" fill="currentColor" stroke="none" />
                          <circle cx="12" cy="12" r="1.3" fill="currentColor" stroke="none" />
                          <circle cx="19" cy="12" r="1.3" fill="currentColor" stroke="none" />
                        </svg>
                      </button>
                      {muteOpen ? (
                        <div
                          role="menu"
                          aria-label="Don't show again"
                          style={{
                            position: "absolute",
                            top: "calc(100% + 6px)",
                            right: 0,
                            width: 208,
                            background: "var(--bg-3)",
                            border: `1px solid ${LINE_2}`,
                            borderRadius: "var(--r-md)",
                            boxShadow: "0 16px 36px rgba(0,0,0,.5)",
                            padding: 6,
                            zIndex: 20,
                            animation: "wbpop 0.14s ease",
                          }}
                        >
                          <div
                            style={{
                              fontFamily: "var(--font-ui)",
                              fontSize: 10,
                              letterSpacing: "0.12em",
                              textTransform: "uppercase",
                              color: "var(--ink-mute)",
                              padding: "7px 9px 8px",
                            }}
                          >
                            Don't show again…
                          </div>
                          {["For a week", "For a month", "Turn check-ins off"].map((label) => (
                            <button
                              key={label}
                              type="button"
                              role="menuitem"
                              onClick={() => {
                                setMuteOpen(false);
                                setNudgeState("dismissed");
                                setResourcesOpen(false);
                                if (label === "Turn check-ins off") setEnabled(false);
                              }}
                              style={{
                                display: "block",
                                width: "100%",
                                textAlign: "left",
                                padding: "8px 9px",
                                borderRadius: "var(--r-sm)",
                                fontFamily: "var(--font-ui)",
                                fontSize: 13,
                                color: "var(--ink-soft)",
                                background: "transparent",
                                border: "none",
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
                              {label}
                            </button>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </div>
                  <p style={{ fontFamily: "var(--font-serif)", fontSize: 14.5, lineHeight: 1.58, color: "var(--ink-soft)", margin: "11px 0 0" }}>
                    You've been carrying something heavy in these pages — and that's allowed; the record is for exactly
                    this. If it would help to speak with someone who understands both the work and the weight of it, a
                    few people are here.
                  </p>

                  {/* resource drawer */}
                  {resourcesOpen ? (
                    <div style={{ marginTop: 14, borderTop: `1px solid ${LINE}`, paddingTop: 13, animation: "wbdrawer 0.2s ease" }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                        <span style={{ fontFamily: "var(--font-ui)", fontSize: 10, letterSpacing: "0.13em", textTransform: "uppercase", color: "var(--ink-mute)" }}>
                          {cur.label}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            const order: Region[] = ["intl", "us", "uk", "greece"];
                            const idx = order.indexOf(region);
                            setRegion(order[(idx + 1) % order.length]!);
                          }}
                          style={{
                            fontFamily: "var(--font-ui)",
                            fontSize: 11.5,
                            color: "var(--accent)",
                            background: "transparent",
                            border: "none",
                            cursor: "pointer",
                            padding: 0,
                          }}
                          onMouseEnter={(e) => {
                            (e.currentTarget as HTMLButtonElement).style.opacity = "0.8";
                          }}
                          onMouseLeave={(e) => {
                            (e.currentTarget as HTMLButtonElement).style.opacity = "1";
                          }}
                        >
                          Change
                        </button>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
                        {cur.rows.map((r, i) => (
                          <div key={`${r.name}-${i}`} style={{ display: "flex", gap: 11, alignItems: "flex-start" }}>
                            <span style={{ fontFamily: "var(--font-glyph)", color: "var(--care)", fontSize: 14, flex: "none", marginTop: 1 }} aria-hidden="true">
                              {r.glyph}
                            </span>
                            <div style={{ minWidth: 0 }}>
                              <div style={{ fontFamily: "var(--font-serif)", fontSize: 14.5, lineHeight: 1.25, color: "var(--ink)" }} lang={r.lang}>
                                {r.name}
                              </div>
                              <div style={{ fontFamily: "var(--font-ui)", fontSize: 12, color: "var(--ink-mute)", marginTop: 2 }} lang={r.lang}>
                                {r.detail}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {/* nudge actions */}
                  <div style={{ display: "flex", alignItems: "center", gap: 9, marginTop: 15 }}>
                    <button
                      type="button"
                      onClick={() => setResourcesOpen((o) => !o)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 7,
                        padding: "8px 15px",
                        borderRadius: "var(--r-md)",
                        background: "var(--care)",
                        color: "var(--bg)",
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
                      {resourcesOpen ? "Hide resources" : "See resources"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setNudgeState("dismissed");
                        setMuteOpen(false);
                        setResourcesOpen(false);
                      }}
                      style={{
                        padding: "8px 14px",
                        borderRadius: "var(--r-md)",
                        fontFamily: "var(--font-ui)",
                        fontSize: 13,
                        color: "var(--ink-soft)",
                        background: "transparent",
                        border: "none",
                        cursor: "pointer",
                      }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLButtonElement).style.color = "var(--ink)";
                        (e.currentTarget as HTMLButtonElement).style.background = "var(--bg-3)";
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLButtonElement).style.color = "var(--ink-soft)";
                        (e.currentTarget as HTMLButtonElement).style.background = "transparent";
                      }}
                    >
                      Not now
                    </button>
                  </div>
                </div>
              </div>
            ) : null}

            {/* dismissed state */}
            {enabled && nudgeState === "dismissed" ? (
              <div
                style={{
                  marginTop: 18,
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "13px 15px",
                  border: `1px dashed ${LINE_2}`,
                  borderRadius: "var(--r-md)",
                }}
              >
                <span style={{ fontFamily: "var(--font-serif)", fontStyle: "italic", fontSize: 14, color: "var(--ink-mute)", flex: 1 }}>
                  Dismissed — the page returns to you, undisturbed.
                </span>
                <button
                  type="button"
                  onClick={() => setNudgeState("shown")}
                  style={{
                    fontFamily: "var(--font-ui)",
                    fontSize: 12.5,
                    color: "var(--accent)",
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    padding: 0,
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.opacity = "0.8";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.opacity = "1";
                  }}
                >
                  Replay
                </button>
              </div>
            ) : null}

            {/* when opted out, preview is just the disclaimer */}
            {!enabled ? (
              <div
                style={{
                  marginTop: 18,
                  padding: "13px 15px",
                  border: `1px dashed ${LINE_2}`,
                  borderRadius: "var(--r-md)",
                  fontFamily: "var(--font-serif)",
                  fontStyle: "italic",
                  fontSize: 14,
                  color: "var(--ink-mute)",
                  textAlign: "center",
                }}
              >
                Nothing here unless you ask for it.
              </div>
            ) : null}
          </div>

          {/* clinician disclaimer — always visible */}
          <div
            style={{
              display: "flex",
              gap: 10,
              marginTop: 16,
              padding: "14px 16px",
              border: `1px solid ${LINE}`,
              borderRadius: "var(--r-lg)",
              background: "var(--bg-2)",
            }}
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="var(--ink-mute)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ flex: "none", marginTop: 1 }} aria-hidden="true">
              <circle cx="12" cy="12" r="9" />
              <path d="M12 16v-4M12 8h.01" />
            </svg>
            <p style={{ fontFamily: "var(--font-ui)", fontSize: 12, lineHeight: 1.55, color: "var(--ink-mute)", margin: 0 }}>
              A check-in is never a diagnosis, and Theourgia is not a clinician. It only points toward people who are.
            </p>
          </div>
        </aside>

      </div>

      {/* per-surface keyframes — the design uses two */}
      <style>{`
        @keyframes wbpop { from { opacity: 0; transform: translateY(-5px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes wbdrawer { from { opacity: 0; } to { opacity: 1; } }
      `}</style>
    </div>
  );
}
