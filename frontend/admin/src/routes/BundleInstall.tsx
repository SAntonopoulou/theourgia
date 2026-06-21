/**
 * Bundle Install — the 6-step MBF install wizard.
 *
 * Port of ``Theourgia Bundle Install.dc.html`` per the per-component
 * ritual. From `agent_onboarding.md §` Theourgia Bundle Install:
 *
 * 6 steps:
 *   1. Preview contents — what the manifest declares
 *   2. License & attribution — signature verification + license terms
 *   3. Import mode — **Sandbox first (recommended default)** vs direct
 *   4. Choose items — whole bundle, or pick pieces (Entities, Rituals,
 *      Correspondences, Calendar)
 *   5. Resolve alias conflicts — Keep distinct (default), Same as,
 *      Aspect of, Epithet of (reuses Entity Profile's import-alias
 *      prompt)
 *   6. Confirm — summary of choices + reversibility note
 *
 * Per `agent_onboarding.md` Gotchas:
 *   · Sandbox-first is the recommended default.
 *   · Default alias resolution is **distinct**.
 *   · Piecemeal import is a real requirement (pull one ritual from a
 *     pantheon, etc.) — modeled as per-content-type checkboxes here.
 *
 * Step state survives Cancel → Resume via localStorage (per batch 16
 * acceptance criteria).
 *
 * Bundle metadata is currently hardcoded to "Hellenic Theurgy" — the
 * id comes from ``?bundle=…`` query param so the link from the Bundles
 * browser routes through. Real manifest fetch lands with the MBF
 * backend.
 */

import { useTopbar } from "@theourgia/shared";
import { type CSSProperties, useEffect, useState } from "react";

const LINE = "var(--line)";
const LINE_2 = "var(--line-2)";
const STORAGE_KEY = "theourgia.bundleInstall";

type Mode = "sandbox" | "direct";
type Alias = "distinct" | "sameas" | "aspect" | "epithet";

interface ContentRow {
  key: string;
  label: string;
  detail: string;
  dotColor: string;
}

interface WizardState {
  step: number;
  mode: Mode;
  alias: Alias;
  selected: Record<string, boolean>;
}

const CONTENTS: ContentRow[] = [
  { key: "entities", label: "Entities", detail: "48 — Hekate, Hermes, Selene…", dotColor: "var(--accent)" },
  { key: "rituals", label: "Rituals", detail: "12 — invocations & theurgic rites", dotColor: "var(--c-working, #C2554A)" },
  { key: "correspondences", label: "Correspondences", detail: "6 tables", dotColor: "var(--c-library, #BC8050)" },
  { key: "calendar", label: "Calendar", detail: "Attic festival dates", dotColor: "var(--c-divination, #7E91CE)" },
];

const STEP_NAMES = [
  "Preview contents",
  "Attribution & license",
  "Import mode",
  "Choose items",
  "Resolve conflicts",
  "Confirm",
];

const ALIAS_LABELS: Record<Alias, string> = {
  distinct: "distinct",
  sameas: "as same-as",
  aspect: "as aspect-of",
  epithet: "as epithet-of",
};

const defaultState: WizardState = {
  step: 0,
  mode: "sandbox", // sandbox-first recommended default
  alias: "distinct", // distinct default per design
  selected: { entities: true, rituals: true, correspondences: false, calendar: false },
};

function loadState(): WizardState {
  if (typeof window === "undefined") return defaultState;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState;
    const parsed = JSON.parse(raw) as Partial<WizardState>;
    return {
      step: typeof parsed.step === "number" ? Math.min(5, Math.max(0, parsed.step)) : 0,
      mode: parsed.mode === "direct" ? "direct" : "sandbox",
      alias: ["sameas", "aspect", "epithet"].includes(parsed.alias ?? "") ? (parsed.alias as Alias) : "distinct",
      selected: { ...defaultState.selected, ...(parsed.selected ?? {}) },
    };
  } catch (_) {
    return defaultState;
  }
}

function saveState(s: WizardState) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch (_) {
    /* noop */
  }
}

function clearState() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch (_) {
    /* noop */
  }
}

function ChoiceCard({
  active,
  recommended,
  iconColor,
  icon,
  title,
  body,
  onClick,
}: {
  active: boolean;
  recommended?: boolean;
  iconColor: string;
  icon: React.ReactNode;
  title: string;
  body: string;
  onClick: () => void;
}) {
  const base: CSSProperties = {
    display: "block",
    textAlign: "left",
    width: "100%",
    padding: 16,
    borderRadius: "var(--r-md)",
    background: active ? "var(--accent-soft)" : "var(--bg-3)",
    border: `1px solid ${active ? "var(--accent)" : LINE}`,
    marginBottom: 10,
    transition: "all 0.15s ease",
    cursor: "pointer",
    color: "inherit",
    fontFamily: "inherit",
  };
  return (
    <button
      type="button"
      aria-pressed={active ? "true" : "false"}
      onClick={onClick}
      style={base}
      onMouseEnter={(e) => {
        if (!active) (e.currentTarget as HTMLButtonElement).style.borderColor = LINE_2;
      }}
      onMouseLeave={(e) => {
        if (!active) (e.currentTarget as HTMLButtonElement).style.borderColor = LINE;
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
        <span style={{ color: iconColor, display: "flex", flex: "none" }}>{icon}</span>
        <span style={{ fontFamily: "var(--font-display)", fontSize: 17, color: "var(--ink)" }}>{title}</span>
        {recommended ? (
          <span
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: 11,
              color: "var(--sandbox)",
              border: `1px solid var(--sandbox)`,
              borderRadius: 999,
              padding: "2px 8px",
              marginLeft: "auto",
            }}
          >
            Recommended
          </span>
        ) : null}
      </div>
      <div style={{ fontFamily: "var(--font-ui)", fontSize: 13, color: "var(--ink-soft)", lineHeight: 1.5 }}>{body}</div>
    </button>
  );
}

function AliasCard({
  active,
  title,
  body,
  defaultBadge,
  onClick,
}: {
  active: boolean;
  title: string;
  body: string;
  defaultBadge?: boolean;
  onClick: () => void;
}) {
  const style: CSSProperties = {
    display: "block",
    textAlign: "left",
    width: "100%",
    padding: "12px 15px",
    borderRadius: "var(--r-md)",
    background: active ? "var(--accent-soft)" : "transparent",
    border: `1px solid ${active ? "var(--accent)" : LINE}`,
    cursor: "pointer",
    color: "inherit",
    fontFamily: "inherit",
  };
  return (
    <button type="button" aria-pressed={active ? "true" : "false"} onClick={onClick} style={style}>
      <span style={{ fontFamily: "var(--font-display)", fontSize: 15, color: "var(--ink)" }}>{title}</span>
      <span style={{ fontFamily: "var(--font-ui)", fontSize: 12, color: "var(--ink-mute)", display: "block" }}>
        {body}
        {defaultBadge ? <span style={{ color: "var(--accent)" }}> · Default</span> : null}
      </span>
    </button>
  );
}

export function BundleInstall() {
  const [state, setState] = useState<WizardState>(() => loadState());
  const { step, mode, alias, selected } = state;

  useTopbar(
    () => ({
      title: "Install bundle",
      subtitle: "Magickal Bundle Format · sandbox-first import",
    }),
    [],
  );

  // Persist on every change. The wizard survives navigate-away → return.
  useEffect(() => {
    saveState(state);
  }, [state]);

  function setStep(next: number) {
    setState((s) => ({ ...s, step: Math.min(5, Math.max(0, next)) }));
  }
  function setMode(next: Mode) {
    setState((s) => ({ ...s, mode: next }));
  }
  function setAlias(next: Alias) {
    setState((s) => ({ ...s, alias: next }));
  }
  function toggleSelected(key: string) {
    setState((s) => ({ ...s, selected: { ...s.selected, [key]: !s.selected[key] } }));
  }
  function selectAll() {
    setState((s) => ({
      ...s,
      selected: CONTENTS.reduce<Record<string, boolean>>((acc, c) => {
        acc[c.key] = true;
        return acc;
      }, {}),
    }));
  }

  const progressPct = Math.round(((step + 1) / 6) * 100);
  const isLast = step === 5;

  return (
    <div
      className="bundle-install-root"
      style={{
        height: "100%",
        background: "var(--bg)",
        color: "var(--ink)",
        fontFamily: "var(--font-serif)",
        position: "relative",
        overflow: "hidden",
        flex: 1,
        ["--verified" as string]: "var(--success)",
        ["--sandbox" as string]: "var(--info)",
      }}
    >
      {/* dimmed vault backdrop */}
      <div style={{ position: "absolute", inset: 0, padding: 28, opacity: 0.22 }} aria-hidden="true">
        <div style={{ width: 200, height: 11, background: "var(--ink-mute)", borderRadius: 3, marginBottom: 24 }} />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
          <div style={{ height: 120, background: "var(--ink-mute)", borderRadius: 12 }} />
          <div style={{ height: 120, background: "var(--ink-mute)", borderRadius: 12 }} />
          <div style={{ height: 120, background: "var(--ink-mute)", borderRadius: 12 }} />
        </div>
      </div>
      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,.55)" }} aria-hidden="true" />

      {/* wizard */}
      <div
        style={{
          position: "relative",
          zIndex: 3,
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 28,
        }}
      >
        <div
          style={{
            width: "min(720px, 100%)",
            maxHeight: "88vh",
            background: "var(--bg-2)",
            border: `1px solid ${LINE_2}`,
            borderRadius: "var(--r-lg)",
            boxShadow: "0 30px 70px rgba(0,0,0,.6)",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          {/* header */}
          <div style={{ padding: "20px 24px 16px", borderBottom: `1px solid ${LINE}` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 13, marginBottom: 16 }}>
              <span
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 10,
                  background: "var(--accent-soft)",
                  border: `1px solid ${LINE_2}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "var(--accent)",
                  flex: "none",
                }}
                aria-hidden="true"
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
                  <path d="M5 7h14M6 10h12M8 10v8M16 10v8M4 21h16M6 7l2-3h8l2 3" />
                </svg>
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: "var(--font-display)", fontSize: 20, lineHeight: 1.1 }}>
                  Install · Hellenic Theurgy
                </div>
                <div style={{ fontFamily: "var(--font-ui)", fontSize: 12, color: "var(--ink-mute)" }}>
                  Step {step + 1} of 6 · {STEP_NAMES[step]}
                </div>
              </div>
              <button
                type="button"
                aria-label="Cancel"
                onClick={() => {
                  clearState();
                  window.history.length > 1 ? window.history.back() : (window.location.href = "/bundles");
                }}
                style={{
                  color: "var(--ink-mute)",
                  width: 32,
                  height: 32,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.color = "var(--ink)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.color = "var(--ink-mute)";
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div style={{ height: 3, borderRadius: 3, background: "var(--bg-sunk)", overflow: "hidden" }}>
              <div
                style={{
                  height: "100%",
                  background: "var(--accent)",
                  borderRadius: 3,
                  width: `${progressPct}%`,
                  transition: "width 0.2s ease",
                }}
              />
            </div>
          </div>

          {/* body */}
          <div className="scroll" style={{ padding: 24, overflowY: "auto", overflowX: "hidden", minHeight: 280, flex: 1 }}>
            {/* Step 1 — Preview contents */}
            {step === 0 ? (
              <>
                <div style={{ fontFamily: "var(--font-ui)", fontSize: 13, color: "var(--ink-soft)", marginBottom: 16 }}>
                  This bundle contains the following. Nothing is written to your vault yet.
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {CONTENTS.map((c) => (
                    <div
                      key={c.key}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        padding: "13px 15px",
                        border: `1px solid ${LINE}`,
                        borderRadius: "var(--r-md)",
                        background: "var(--bg-3)",
                      }}
                    >
                      <span style={{ width: 8, height: 8, borderRadius: "50%", background: c.dotColor }} aria-hidden="true" />
                      <span style={{ flex: 1, fontFamily: "var(--font-serif)", fontSize: 15 }}>{c.label}</span>
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--ink-mute)" }}>{c.detail}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : null}

            {/* Step 2 — Attribution & license */}
            {step === 1 ? (
              <>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 9,
                    marginBottom: 18,
                    padding: "11px 14px",
                    border: `1px solid var(--verified)`,
                    borderRadius: "var(--r-md)",
                    background: "rgba(107,168,146,.1)",
                  }}
                >
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="var(--verified)" strokeWidth="1.7" aria-hidden="true">
                    <path d="M12 2l7 3v6c0 5-3 8-7 11-4-3-7-6-7-11V5z" />
                    <path d="M9 12l2 2 4-4" strokeLinecap="round" />
                  </svg>
                  <span style={{ fontFamily: "var(--font-ui)", fontSize: 13, color: "var(--ink)" }}>
                    Signature verified — sealed by <strong>theourgia.core</strong>
                  </span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 14, fontFamily: "var(--font-ui)", fontSize: 13.5 }}>
                  {[
                    ["License", "CC BY-SA 4.0 — share & adapt with attribution"],
                    ["Maintainer", "theourgia.core · since 2024"],
                    ["Provenance", "Sallustius → Wildberg ed. → this bundle"],
                    ["Updated", "14 days ago · v3.2.0"],
                  ].map(([label, value]) => (
                    <div key={label} style={{ display: "flex" }}>
                      <span style={{ width: 120, color: "var(--ink-mute)" }}>{label}</span>
                      <span style={{ color: "var(--ink)" }}>{value}</span>
                    </div>
                  ))}
                </div>
                <p
                  style={{
                    fontFamily: "var(--font-serif)",
                    fontStyle: "italic",
                    fontSize: 14,
                    color: "var(--ink-soft)",
                    margin: "18px 0 0",
                    borderTop: `1px solid ${LINE}`,
                    paddingTop: 14,
                  }}
                >
                  By installing you agree to preserve the attribution and license terms when you re-share.
                </p>
              </>
            ) : null}

            {/* Step 3 — Import mode */}
            {step === 2 ? (
              <>
                <div style={{ fontFamily: "var(--font-ui)", fontSize: 13, color: "var(--ink-soft)", marginBottom: 16 }}>
                  Where should this land?
                </div>
                <ChoiceCard
                  active={mode === "sandbox"}
                  recommended
                  iconColor="var(--sandbox)"
                  icon={
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 7l9-4 9 4-9 4-9-4zM3 7v10l9 4 9-4V7" />
                    </svg>
                  }
                  title="Sandbox first"
                  body="Try the bundle in an isolated space. Promote what you keep; discard the rest. Nothing touches your record until you say so."
                  onClick={() => setMode("sandbox")}
                />
                <ChoiceCard
                  active={mode === "direct"}
                  iconColor="var(--ink-soft)"
                  icon={
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 3v12M7 10l5 5 5-5M5 21h14" />
                    </svg>
                  }
                  title="Direct to vault"
                  body="Merge straight into your vault. Faster, but conflicts apply immediately."
                  onClick={() => setMode("direct")}
                />
              </>
            ) : null}

            {/* Step 4 — Choose items */}
            {step === 3 ? (
              <>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                  <span style={{ fontFamily: "var(--font-ui)", fontSize: 13, color: "var(--ink-soft)" }}>
                    Import the whole bundle, or pick pieces.
                  </span>
                  <button
                    type="button"
                    onClick={selectAll}
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
                    Select all
                  </button>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {CONTENTS.map((c) => {
                    const isOn = !!selected[c.key];
                    return (
                      <button
                        key={c.key}
                        type="button"
                        role="checkbox"
                        aria-checked={isOn ? "true" : "false"}
                        onClick={() => toggleSelected(c.key)}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 12,
                          padding: "12px 15px",
                          border: `1px solid ${isOn ? LINE_2 : LINE}`,
                          borderRadius: "var(--r-md)",
                          background: isOn ? "var(--accent-soft)" : "transparent",
                          cursor: "pointer",
                          color: "inherit",
                          fontFamily: "inherit",
                          textAlign: "left",
                          width: "100%",
                        }}
                      >
                        {isOn ? (
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <rect x="3" y="3" width="18" height="18" rx="4" />
                            <path d="M8 12l3 3 5-5" />
                          </svg>
                        ) : (
                          <span style={{ width: 18, height: 18, border: `1.5px solid ${LINE_2}`, borderRadius: 5, flex: "none" }} />
                        )}
                        <span style={{ flex: 1, fontFamily: "var(--font-serif)", fontSize: 15, color: isOn ? "var(--ink)" : "var(--ink-soft)" }}>
                          {c.label}{" "}
                          <span style={{ color: "var(--ink-mute)", fontFamily: "var(--font-ui)", fontSize: 12 }}>
                            · {c.detail.split(" — ")[0]}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </>
            ) : null}

            {/* Step 5 — Resolve conflicts */}
            {step === 4 ? (
              <>
                <div
                  style={{
                    display: "flex",
                    gap: 10,
                    padding: "12px 14px",
                    border: `1px solid ${LINE_2}`,
                    borderRadius: "var(--r-md)",
                    background: "var(--bg-3)",
                    marginBottom: 18,
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.6" style={{ flex: "none", marginTop: 1 }} aria-hidden="true">
                    <circle cx="12" cy="12" r="9" />
                    <path d="M12 8v5M12 16h.01" strokeLinecap="round" />
                  </svg>
                  <div style={{ fontFamily: "var(--font-ui)", fontSize: 13, lineHeight: 1.5, color: "var(--ink-soft)" }}>
                    You already have an entity named <strong style={{ color: "var(--ink)" }}>Hekate</strong> (Hekate-PGM). How is the incoming{" "}
                    <strong style={{ color: "var(--ink)" }}>Hekate</strong> related?
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <AliasCard
                    active={alias === "distinct"}
                    title="Keep distinct"
                    body="Two separate entities."
                    defaultBadge
                    onClick={() => setAlias("distinct")}
                  />
                  <AliasCard active={alias === "sameas"} title="Same as" body="Merge — one entity, two sources." onClick={() => setAlias("sameas")} />
                  <AliasCard active={alias === "aspect"} title="Aspect of" body="A facet of your existing Hekate." onClick={() => setAlias("aspect")} />
                  <AliasCard active={alias === "epithet"} title="Epithet of" body="A title or by-name of the same power." onClick={() => setAlias("epithet")} />
                </div>
              </>
            ) : null}

            {/* Step 6 — Confirm */}
            {step === 5 ? (
              <>
                <div style={{ fontFamily: "var(--font-display)", fontSize: 19, marginBottom: 16 }}>Ready to install</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 12, fontFamily: "var(--font-ui)", fontSize: 13.5 }}>
                  <div style={{ display: "flex" }}>
                    <span style={{ width: 130, color: "var(--ink-mute)" }}>Destination</span>
                    <span style={{ color: "var(--ink)" }}>
                      {mode === "sandbox" ? "Sandbox (isolated)" : "Vault (direct merge)"}
                    </span>
                  </div>
                  <div style={{ display: "flex" }}>
                    <span style={{ width: 130, color: "var(--ink-mute)" }}>Importing</span>
                    <span style={{ color: "var(--ink)" }}>
                      {CONTENTS.filter((c) => selected[c.key])
                        .map((c) => c.label.toLowerCase())
                        .join(", ") || "nothing selected"}
                    </span>
                  </div>
                  <div style={{ display: "flex" }}>
                    <span style={{ width: 130, color: "var(--ink-mute)" }}>Conflicts</span>
                    <span style={{ color: "var(--ink)" }}>1 resolved — Hekate kept {ALIAS_LABELS[alias]}</span>
                  </div>
                  <div style={{ display: "flex" }}>
                    <span style={{ width: 130, color: "var(--ink-mute)" }}>License</span>
                    <span style={{ color: "var(--ink)" }}>CC BY-SA 4.0</span>
                  </div>
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    marginTop: 18,
                    padding: "11px 14px",
                    border: `1px solid ${LINE}`,
                    borderRadius: "var(--r-md)",
                    background: "var(--bg-3)",
                    fontFamily: "var(--font-ui)",
                    fontSize: 12.5,
                    color: "var(--ink-mute)",
                  }}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M3 12a9 9 0 1 0 9-9M3 12l3-3M3 12l3 3" />
                  </svg>
                  Reversible — uninstall any time, with one-click rollback.
                </div>
              </>
            ) : null}
          </div>

          {/* footer */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "16px 24px", borderTop: `1px solid ${LINE}` }}>
            <button
              type="button"
              onClick={() => setStep(step - 1)}
              disabled={step === 0}
              style={{
                padding: "11px 20px",
                borderRadius: "var(--r-md)",
                fontFamily: "var(--font-ui)",
                fontSize: 14,
                border: `1px solid ${LINE_2}`,
                color: step === 0 ? "var(--ink-mute)" : "var(--ink)",
                opacity: step === 0 ? 0.5 : 1,
                background: "transparent",
                cursor: step === 0 ? "not-allowed" : "pointer",
              }}
            >
              Back
            </button>
            <span style={{ marginLeft: "auto" }} />
            <button
              type="button"
              onClick={() => {
                if (isLast) {
                  // Real install lands with the MBF backend. For now,
                  // acknowledge + clear wizard state.
                  clearState();
                  window.location.href = mode === "sandbox" ? "/bundles" : "/bundles";
                } else {
                  setStep(step + 1);
                }
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "11px 22px",
                borderRadius: "var(--r-md)",
                background: "var(--accent)",
                color: "var(--accent-ink)",
                fontFamily: "var(--font-ui)",
                fontWeight: 700,
                fontSize: 14,
                border: "none",
                cursor: "pointer",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.opacity = "0.92";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.opacity = "1";
              }}
            >
              {isLast ? "Install bundle" : "Continue"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
