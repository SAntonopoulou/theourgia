/**
 * Identities admin surface.
 *
 * Port of ``Theourgia Identities.dc.html`` against the per-component
 * ritual (see ``feedback_read_dc_html_before_building.md`` +
 * ``feedback_follow_design_thread_deep.md``):
 *
 *   · `.dc.html` read end-to-end
 *   · `agent_onboarding.md` § Theourgia Identities — *acting-as is global
 *     state* consumed by Editor / Blog / Profile / memberships / SSO;
 *     each identity's keypair is real; archived ≠ deleted; the
 *     unlinkable pseudonym is a first-class identity with signing off.
 *   · `agent_data_and_components.md` §1 — Identity model + SurfaceKey
 *     enum + KeyPair shape
 *
 * Layout (per `.dc.html` lines 188-407):
 *   · Title / sub block in topbar
 *   · Acting-as switcher (in shared `VaultTopbar.actingAs` slot — handled
 *     by App.tsx so it's present on every admin surface)
 *   · "+ New identity" primary action in topbar `after` slot
 *   · Left column: identity cards grid (incl. archived) → Defaults-by-
 *     Surface card → Write-time picker demo
 *   · Right rail: sticky detail card with keypair, surface chips,
 *     "Set as acting" + archive actions
 *   · Themed archive confirm (no native confirm)
 *
 * Demo identity data lives in `@theourgia/shared` (`DEMO_IDENTITIES`)
 * with names matching the SSO / Profile demos. Real read comes from the
 * identity model when it lands.
 */

import {
  ConfirmDialog,
  DEMO_IDENTITIES,
  DEMO_SURFACE_DEFAULTS,
  type Identity,
  useActingAs,
  useSetActingAs,
  useTopbar,
} from "@theourgia/shared";
import { type CSSProperties, type ReactNode, useState } from "react";

const ACCENT_SOFT = "var(--accent-soft)";
const LINE = "var(--line)";
const LINE_2 = "var(--line-2)";

function IdentityMedallion({
  identity,
  size,
  fontSize,
}: {
  identity: Identity;
  size: number;
  fontSize: number;
}): ReactNode {
  const tone = identity.glyphTone ?? "accent";
  return (
    <span
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: tone === "mute" ? "var(--bg-3)" : ACCENT_SOFT,
        border: tone === "mute" ? `1px ${identity.archived ? "solid" : "dashed"} ${LINE_2}` : `1px solid ${LINE_2}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: identity.archived ? "var(--font-display)" : "var(--font-glyph)",
        color: tone === "mute" ? (identity.archived ? "var(--ink-mute)" : "var(--ink-soft)") : "var(--accent)",
        fontSize,
        flex: "none",
      }}
      aria-hidden="true"
    >
      {identity.glyph ?? identity.name.slice(0, 1)}
    </span>
  );
}

function tagStyle(tone: "soft" | "warn" | "success" | undefined): CSSProperties {
  const color =
    tone === "warn" ? "var(--warning)" : tone === "success" ? "var(--success)" : "var(--ink-soft)";
  return {
    fontFamily: "var(--font-ui)",
    fontSize: 10.5,
    color,
    padding: "2px 8px",
    border: `1px solid ${LINE}`,
    borderRadius: 999,
    display: "flex",
    alignItems: "center",
    gap: 5,
  };
}

function IdentityCard({
  identity,
  selected,
  acting,
  onSelect,
}: {
  identity: Identity;
  selected: boolean;
  acting: boolean;
  onSelect: () => void;
}): ReactNode {
  return (
    <button
      type="button"
      data-idcard
      aria-pressed={selected ? "true" : "false"}
      onClick={onSelect}
      className="identity-card"
      style={{
        textAlign: "left",
        display: "flex",
        flexDirection: "column",
        gap: 12,
        padding: 16,
        border: `1px ${identity.archived ? "dashed" : "solid"} ${LINE}`,
        borderRadius: "var(--r-lg)",
        background: identity.archived ? "transparent" : "var(--bg-2)",
        opacity: identity.archived ? 0.72 : 1,
        cursor: "pointer",
        fontFamily: "inherit",
        color: "inherit",
        boxShadow: selected ? "inset 3px 0 0 var(--accent)" : "none",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <IdentityMedallion identity={identity} size={42} fontSize={21} />
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontFamily: identity.glyphTone === "mute" && !identity.archived ? "var(--font-mono)" : "var(--font-display)",
              fontSize: identity.glyphTone === "mute" && !identity.archived ? 16 : 18,
              lineHeight: 1.1,
              color: identity.archived ? "var(--ink-soft)" : "var(--ink)",
            }}
          >
            {identity.name}
          </div>
          <div
            style={{
              fontFamily: identity.id === "theo" ? "var(--font-display)" : "var(--font-ui)",
              fontSize: identity.id === "theo" ? 13 : 11.5,
              color: "var(--ink-mute)",
              marginTop: identity.id === "theo" ? 1 : 2,
            }}
          >
            {identity.kind}
          </div>
        </div>
      </div>
      <p
        style={{
          fontFamily: "var(--font-serif)",
          fontSize: 13,
          lineHeight: 1.5,
          color: identity.archived ? "var(--ink-mute)" : "var(--ink-soft)",
          margin: 0,
        }}
      >
        {identity.bio}
      </p>
      <div style={{ display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap" }}>
        {acting ? (
          <span style={tagStyle("success")}>
            <span
              aria-hidden="true"
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: "var(--success)",
              }}
            />
            Acting now
          </span>
        ) : identity.tags && identity.tags.length > 0 ? (
          identity.tags.map((t, i) => (
            <span key={i} style={tagStyle(t.tone)}>
              {t.tone === "warn" ? (
                <svg
                  width="11"
                  height="11"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
                  <path d="M12 9v4M12 17h.01" />
                </svg>
              ) : null}
              {t.label}
            </span>
          ))
        ) : identity.archived ? (
          <span style={{ ...tagStyle("soft"), color: "var(--ink-mute)" }}>Restore…</span>
        ) : null}
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 10.5,
            color: "var(--ink-mute)",
            marginLeft: "auto",
          }}
        >
          {identity.signingEnabled ? identity.signing.publicKey.split("·").slice(0, 2).join("·") : "no key"}
        </span>
      </div>
    </button>
  );
}

function SurfaceDefaultsCard(): ReactNode {
  return (
    <div
      style={{
        background: "var(--bg-2)",
        border: `1px solid ${LINE}`,
        borderRadius: "var(--r-lg)",
        padding: "18px 20px",
        marginBottom: 26,
      }}
    >
      <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 4 }}>
        <h3 style={{ fontFamily: "var(--font-display)", fontSize: 18, margin: 0 }}>Defaults by surface</h3>
      </div>
      <p
        style={{
          fontFamily: "var(--font-ui)",
          fontSize: 12,
          color: "var(--ink-mute)",
          margin: "0 0 16px",
        }}
      >
        Which identity authors each kind of work, unless you choose otherwise at write time.
      </p>
      <div style={{ display: "flex", flexDirection: "column" }}>
        {DEMO_SURFACE_DEFAULTS.map((d, i) => {
          const identity = DEMO_IDENTITIES.find((id) => id.id === d.identityId);
          if (!identity) return null;
          return (
            <div
              key={`${d.key}-${i}`}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "11px 0",
                borderBottom: i < DEMO_SURFACE_DEFAULTS.length - 1 ? `1px solid ${LINE}` : "none",
              }}
            >
              <svg
                width="17"
                height="17"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--ink-mute)"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ flex: "none" }}
                aria-hidden="true"
              >
                <path d={String(d.iconPath)} />
              </svg>
              <span
                style={{
                  fontFamily: "var(--font-ui)",
                  fontSize: 13.5,
                  color: "var(--ink)",
                  flex: 1,
                }}
              >
                {d.label}
              </span>
              <button
                type="button"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "5px 10px",
                  border: `1px solid ${LINE}`,
                  borderRadius: 999,
                  background: "var(--bg)",
                  cursor: "pointer",
                  color: "inherit",
                  fontFamily: "inherit",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.borderColor = LINE_2;
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.borderColor = LINE;
                }}
              >
                <IdentityMedallion identity={identity} size={18} fontSize={10} />
                <span style={{ fontFamily: "var(--font-ui)", fontSize: 12.5, color: "var(--ink-soft)" }}>
                  {identity.name}
                </span>
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="var(--ink-mute)"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  aria-hidden="true"
                >
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DetailRail({
  identity,
  acting,
  onSetActive,
  onArchive,
}: {
  identity: Identity;
  acting: boolean;
  onSetActive: () => void;
  onArchive: () => void;
}): ReactNode {
  const keyColor = identity.archived
    ? "var(--ink-mute)"
    : identity.signingEnabled
      ? "var(--success)"
      : "var(--warning)";
  const keyLabel = identity.archived ? "Archived" : identity.signingEnabled ? "Verified" : "Unsigned";
  const keyText = identity.signingEnabled
    ? `ed25519  ${identity.signing.publicKey}`
    : "— no signing key (entries are unsigned)";

  return (
    <div
      style={{
        background: "var(--bg-2)",
        border: `1px solid ${LINE}`,
        borderRadius: "var(--r-lg)",
        overflow: "hidden",
      }}
    >
      <div style={{ padding: "22px 20px 18px", borderBottom: `1px solid ${LINE}`, background: "var(--bg-3)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <IdentityMedallion identity={identity} size={52} fontSize={26} />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 22, lineHeight: 1.05 }}>{identity.name}</div>
            <div
              style={{
                fontFamily: "var(--font-ui)",
                fontSize: 12,
                color: "var(--ink-mute)",
                marginTop: 3,
              }}
            >
              {identity.kind}
            </div>
          </div>
        </div>
        {acting ? (
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              marginTop: 14,
              fontFamily: "var(--font-ui)",
              fontSize: 11,
              color: "var(--success)",
              padding: "3px 9px",
              border: `1px solid ${LINE}`,
              borderRadius: 999,
            }}
          >
            <span
              aria-hidden="true"
              style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--success)" }}
            />
            Acting identity
          </div>
        ) : null}
      </div>

      <div style={{ padding: "18px 20px", display: "flex", flexDirection: "column", gap: 16 }}>
        <div>
          <div
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: 10,
              letterSpacing: "0.15em",
              textTransform: "uppercase",
              color: "var(--ink-mute)",
              marginBottom: 7,
            }}
          >
            Display name
          </div>
          <div
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 16,
              padding: "9px 12px",
              border: `1px solid ${LINE_2}`,
              borderRadius: "var(--r-md)",
              background: "var(--bg)",
            }}
          >
            {identity.displayName ?? identity.name}
          </div>
        </div>

        <div>
          <div
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: 10,
              letterSpacing: "0.15em",
              textTransform: "uppercase",
              color: "var(--ink-mute)",
              marginBottom: 7,
            }}
          >
            Bio
          </div>
          <div
            style={{
              fontFamily: "var(--font-serif)",
              fontSize: 14,
              lineHeight: 1.55,
              color: "var(--ink-soft)",
              padding: "10px 12px",
              border: `1px solid ${LINE}`,
              borderRadius: "var(--r-md)",
              background: "var(--bg)",
              minHeight: 64,
            }}
          >
            {identity.bio}
          </div>
        </div>

        <div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 7,
            }}
          >
            <span
              style={{
                fontFamily: "var(--font-ui)",
                fontSize: 10,
                letterSpacing: "0.15em",
                textTransform: "uppercase",
                color: "var(--ink-mute)",
              }}
            >
              Signing keypair
            </span>
            <span style={{ fontFamily: "var(--font-ui)", fontSize: 10.5, color: keyColor }}>{keyLabel}</span>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 9,
              padding: "10px 12px",
              border: `1px solid ${LINE}`,
              borderRadius: "var(--r-md)",
              background: "var(--bg)",
            }}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke={keyColor}
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ flex: "none" }}
              aria-hidden="true"
            >
              <circle cx="7.5" cy="15.5" r="4" />
              <path d="M10.5 12.5 20 3M16 7l2.5 2.5M18.5 4.5 21 7" />
            </svg>
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 12,
                color: "var(--ink-soft)",
                minWidth: 0,
                wordBreak: "break-all",
              }}
            >
              {keyText}
            </span>
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 9 }}>
            <button
              type="button"
              style={{
                flex: 1,
                fontFamily: "var(--font-ui)",
                fontSize: 12,
                color: "var(--ink-soft)",
                padding: "7px 10px",
                border: `1px solid ${LINE_2}`,
                borderRadius: "var(--r-sm)",
                background: "transparent",
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
              Rotate key
            </button>
            <button
              type="button"
              style={{
                flex: 1,
                fontFamily: "var(--font-ui)",
                fontSize: 12,
                color: "var(--ink-soft)",
                padding: "7px 10px",
                border: `1px solid ${LINE_2}`,
                borderRadius: "var(--r-sm)",
                background: "transparent",
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
              Export public key
            </button>
          </div>
        </div>

        <div>
          <div
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: 10,
              letterSpacing: "0.15em",
              textTransform: "uppercase",
              color: "var(--ink-mute)",
              marginBottom: 9,
            }}
          >
            Authors on
          </div>
          {identity.authorsOn && identity.authorsOn.length > 0 ? (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {identity.authorsOn.map((s) => (
                <span
                  key={s}
                  style={{
                    fontFamily: "var(--font-ui)",
                    fontSize: 11.5,
                    color: "var(--ink-soft)",
                    padding: "3px 10px",
                    border: `1px solid ${LINE}`,
                    borderRadius: 999,
                  }}
                >
                  {s}
                </span>
              ))}
            </div>
          ) : (
            <span
              style={{
                fontFamily: "var(--font-ui)",
                fontSize: 12,
                color: "var(--ink-mute)",
                fontStyle: "italic",
              }}
            >
              No public surfaces — kept entirely private.
            </span>
          )}
        </div>
      </div>

      <div style={{ display: "flex", gap: 9, padding: "16px 20px", borderTop: `1px solid ${LINE}` }}>
        <button
          type="button"
          onClick={onSetActive}
          disabled={identity.archived || acting}
          style={{
            flex: 1,
            fontFamily: "var(--font-ui)",
            fontSize: 13,
            fontWeight: 700,
            color: "var(--accent-ink)",
            background: "var(--accent)",
            padding: "9px 14px",
            borderRadius: "var(--r-md)",
            border: "none",
            cursor: identity.archived || acting ? "not-allowed" : "pointer",
            opacity: identity.archived || acting ? 0.55 : 1,
          }}
        >
          {acting ? "Currently acting" : "Set as acting"}
        </button>
        <button
          type="button"
          onClick={onArchive}
          aria-label={identity.archived ? "Restore identity" : "Archive identity"}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 40,
            border: `1px solid ${LINE_2}`,
            borderRadius: "var(--r-md)",
            color: "var(--ink-mute)",
            background: "transparent",
            cursor: "pointer",
          }}
        >
          <svg
            width="17"
            height="17"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <rect x="3.5" y="4.5" width="17" height="4" rx="1" />
            <path d="M5 8.5V19a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8.5M10 12.5h4" />
          </svg>
        </button>
      </div>
    </div>
  );
}

/**
 * The identities backend model (Persona table · Option D) is deferred to
 * Phase 02/03. Until then, the fabricated demo identities (Aspasia,
 * Theophrastos, Frater Sub Rosā, null.priest, V.) MUST NOT display as if
 * they were the practitioner's real identities. The default view is the
 * honest empty state; the fabricated preview only renders behind an
 * explicit env flag or ?demo=1 query — same gating pattern as SignInRoute
 * (b108-2ey).
 */
function useDemoEnabled(): boolean {
  if (import.meta.env.VITE_THEOURGIA_ENABLE_DEMO_IDENTITIES === "1") return true;
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).get("demo") === "1";
}

function IdentitiesEmptyState(): ReactNode {
  return (
    <div
      className="scroll"
      style={{
        overflowY: "auto",
        overflowX: "hidden",
        minHeight: 0,
        padding: "48px 28px",
      }}
    >
      <div
        style={{
          maxWidth: 620,
          margin: "0 auto",
          padding: "32px 28px",
          border: `1px solid ${LINE}`,
          borderRadius: "var(--r-lg)",
          background: "var(--bg-2)",
        }}
      >
        <h2
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 23,
            margin: "0 0 12px",
          }}
        >
          Identities are not built yet.
        </h2>
        <p
          style={{
            fontFamily: "var(--font-serif)",
            fontSize: 14.5,
            lineHeight: 1.55,
            color: "var(--ink-soft)",
            margin: "0 0 14px",
          }}
        >
          The Persona table (Option D, per the resolved-decisions memory)
          is queued for a later phase. When it lands, this surface will
          show your author identities — one person, many masks — each
          with its own signing key and per-surface defaults.
        </p>
        <p
          style={{
            fontFamily: "var(--font-serif)",
            fontSize: 14.5,
            lineHeight: 1.55,
            color: "var(--ink-soft)",
            margin: "0 0 14px",
          }}
        >
          Nothing is being persisted here yet — the CLI actions do not
          hit any backend. To preview the finished design, append{" "}
          <code style={{ fontFamily: "var(--font-mono)", fontSize: 13 }}>?demo=1</code>{" "}
          to the URL.
        </p>
      </div>
    </div>
  );
}

export function Identities() {
  const acting = useActingAs();
  const setActing = useSetActingAs();
  const demoEnabled = useDemoEnabled();
  const [selectedId, setSelectedId] = useState<string>(DEMO_IDENTITIES[0]?.id ?? "");
  const [archiveTarget, setArchiveTarget] = useState<Identity | null>(null);

  const nonArchived = DEMO_IDENTITIES.filter((i) => !i.archived).length;
  const archived = DEMO_IDENTITIES.length - nonArchived;
  const signing = DEMO_IDENTITIES.filter((i) => i.signingEnabled && !i.archived).length;

  useTopbar(
    () => ({
      title: "Identities",
      subtitle: demoEnabled
        ? `${nonArchived} author ${nonArchived === 1 ? "identity" : "identities"} · ${archived} archived · ${signing} signing keys · demo preview`
        : "backend not built yet",
      after: (
        <button
          type="button"
          className="primary-cta"
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
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.opacity = "0.9";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.opacity = "1";
          }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
            <path d="M12 5v14M5 12h14" />
          </svg>
          New identity
        </button>
      ),
    }),
    [nonArchived, archived, signing, demoEnabled],
  );

  if (!demoEnabled) return <IdentitiesEmptyState />;

  const selected = DEMO_IDENTITIES.find((i) => i.id === selectedId) ?? DEMO_IDENTITIES[0];
  if (!selected) return null;

  return (
    <div
      className="scroll"
      style={{ overflowY: "auto", overflowX: "hidden", minHeight: 0, padding: "24px 28px" }}
    >
      <div
        style={{
          maxWidth: 1240,
          margin: "0 auto",
          display: "flex",
          flexWrap: "wrap",
          alignItems: "flex-start",
          gap: 26,
        }}
      >
        {/* LEFT */}
        <div style={{ flex: "3 1 520px", minWidth: 0 }}>
          <div
            style={{
              marginBottom: 20,
              padding: "12px 16px",
              border: "1px dashed var(--line-2)",
              borderRadius: "var(--r-md)",
              background: "var(--bg-3)",
              fontFamily: "var(--font-ui)",
              fontSize: 13,
              color: "var(--ink-soft)",
              lineHeight: 1.5,
            }}
          >
            <strong style={{ color: "var(--ink)" }}>Preview surface.</strong>{" "}
            The Persona table (Option D, per the resolved-decisions memory) is
            queued for Phase 02/03 and the identity rows below are illustrative.
            Actions do not persist yet.
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 4 }}>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: 23, margin: 0 }}>Your identities</h2>
            <span style={{ fontFamily: "var(--font-ui)", fontSize: 12.5, color: "var(--ink-mute)" }}>
              One person, many masks. Each authors and signs separately.
            </span>
          </div>
          <p
            style={{
              fontFamily: "var(--font-serif)",
              fontSize: 14.5,
              lineHeight: 1.55,
              color: "var(--ink-soft)",
              maxWidth: "62ch",
              margin: "8px 0 20px",
            }}
          >
            Choose which identity speaks on each surface. Nothing links one to another in public — a reader of the
            blog need never know the theurgist and the chaos pseudonym share a vault.
          </p>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(248px, 1fr))",
              gap: 14,
              marginBottom: 30,
            }}
          >
            {DEMO_IDENTITIES.map((identity) => (
              <IdentityCard
                key={identity.id}
                identity={identity}
                selected={identity.id === selectedId}
                acting={identity.id === acting}
                onSelect={() => setSelectedId(identity.id)}
              />
            ))}
          </div>

          <SurfaceDefaultsCard />

          {/* WRITE-TIME PICKER DEMONSTRATION (static demo per design — illustrative only) */}
          <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 12 }}>
            <h3 style={{ fontFamily: "var(--font-display)", fontSize: 18, margin: 0 }}>At write time</h3>
            <span style={{ fontFamily: "var(--font-ui)", fontSize: 12, color: "var(--ink-mute)" }}>
              The picker that opens when you begin a new entry.
            </span>
          </div>
          <div
            style={{
              border: `1px solid ${LINE}`,
              borderRadius: "var(--r-lg)",
              background: "var(--bg-sunk)",
              padding: 20,
              position: "relative",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                paddingBottom: 16,
                borderBottom: `1px solid ${LINE}`,
                marginBottom: 18,
              }}
            >
              <div style={{ fontFamily: "var(--font-display)", fontSize: 20, color: "var(--ink-soft)" }}>
                New entry — untitled working
              </div>
              <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 9, padding: "6px 8px 6px 6px", border: `1px solid var(--accent)`, borderRadius: 999, background: "var(--bg-2)" }}>
                <IdentityMedallion identity={DEMO_IDENTITIES[0]!} size={26} fontSize={13} />
                <span style={{ display: "flex", flexDirection: "column", lineHeight: 1.1 }}>
                  <span
                    style={{
                      fontFamily: "var(--font-ui)",
                      fontSize: 9,
                      letterSpacing: "0.12em",
                      textTransform: "uppercase",
                      color: "var(--ink-mute)",
                    }}
                  >
                    Authoring as
                  </span>
                  <span style={{ fontFamily: "var(--font-ui)", fontSize: 12.5, color: "var(--ink)" }}>
                    {DEMO_IDENTITIES[0]!.name}
                  </span>
                </span>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.8" strokeLinecap="round" style={{ transform: "rotate(180deg)" }} aria-hidden="true">
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </div>
            </div>
            <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
              <div style={{ flex: "1 1 240px", minWidth: 0 }}>
                <div
                  style={{
                    fontFamily: "var(--font-ui)",
                    fontSize: 10,
                    letterSpacing: "0.15em",
                    textTransform: "uppercase",
                    color: "var(--ink-mute)",
                    marginBottom: 10,
                  }}
                >
                  Author this entry as
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {DEMO_IDENTITIES.filter((i) => !i.archived).slice(0, 3).map((id, i) => (
                    <div
                      key={id.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 11,
                        padding: "9px 11px",
                        border: `1px solid ${i === 0 ? "var(--accent)" : LINE}`,
                        borderRadius: "var(--r-md)",
                        background: i === 0 ? ACCENT_SOFT : "transparent",
                      }}
                    >
                      <IdentityMedallion identity={id} size={28} fontSize={13} />
                      <span style={{ flex: 1 }}>
                        <span
                          style={{
                            display: "block",
                            fontFamily: id.glyphTone === "mute" ? "var(--font-mono)" : "var(--font-display)",
                            fontSize: id.glyphTone === "mute" ? 12.5 : 14.5,
                            color: i === 0 ? "var(--ink)" : "var(--ink-soft)",
                          }}
                        >
                          {id.name}
                        </span>
                        <span
                          style={{
                            display: "block",
                            fontFamily: "var(--font-ui)",
                            fontSize: 10.5,
                            color: "var(--ink-mute)",
                          }}
                        >
                          {i === 0 ? "Default for workings" : id.kind}
                        </span>
                      </span>
                      {i === 0 ? (
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <path d="M5 12.5l4.5 4.5L19 6.5" />
                        </svg>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ flex: "1 1 200px", minWidth: 0, borderLeft: `1px solid ${LINE}`, paddingLeft: 24 }}>
                <div
                  style={{
                    fontFamily: "var(--font-ui)",
                    fontSize: 10,
                    letterSpacing: "0.15em",
                    textTransform: "uppercase",
                    color: "var(--ink-mute)",
                    marginBottom: 10,
                  }}
                >
                  What changes
                </div>
                <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 11 }}>
                  {[
                    "The signing key applied to the entry",
                    "The byline shown to readers if published",
                    "Whether lineage attaches at all",
                  ].map((line, i) => (
                    <li
                      key={i}
                      style={{
                        display: "flex",
                        gap: 9,
                        fontFamily: "var(--font-serif)",
                        fontSize: 13.5,
                        color: "var(--ink-soft)",
                        lineHeight: 1.4,
                      }}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ flex: "none", marginTop: 1 }} aria-hidden="true">
                        <path d="M9 12l2 2 4-4" />
                        <circle cx="12" cy="12" r="9" />
                      </svg>
                      {line}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT — detail rail */}
        <div style={{ flex: "1 1 300px", minWidth: 0, position: "sticky", top: 0 }}>
          <DetailRail
            identity={selected}
            acting={selected.id === acting}
            onSetActive={() => setActing(selected.id)}
            onArchive={() => setArchiveTarget(selected)}
          />
        </div>
      </div>

      {/* Archive confirm — themed, no native confirm. */}
      <ConfirmDialog
        open={archiveTarget !== null}
        title={`Archive ${archiveTarget?.name ?? "identity"}?`}
        body="It will stop appearing in pickers and can no longer author new work. Everything already written under this name keeps its byline and signature. You can restore it whenever you like."
        confirmLabel="Archive identity"
        cancelLabel="Keep active"
        tone="constructive"
        onConfirm={() => {
          // Real archive call lands with the identity backend model.
          setArchiveTarget(null);
        }}
        onCancel={() => setArchiveTarget(null)}
      />
    </div>
  );
}
