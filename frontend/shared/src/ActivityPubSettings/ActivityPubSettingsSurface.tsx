/**
 * ActivityPubSettingsSurface — H08 §S3 Cluster B surface 16.
 *
 * Faithful port of ``Theourgia ActivityPub Settings.dc.html``.
 *
 * Honesty rules wired:
 *
 *   * **Master switch is OFF by default** (H08 rule 28 ·
 *     per-network opt-in). Until the user explicitly enables
 *     integration the vault does not federate to ActivityPub
 *     platforms — period.
 *
 *   * **First activation requires a danger-confirm** (rule 2 ·
 *     `--danger` is reserved for Visibility-becoming-Public-
 *     equivalent moments). Toggling the master switch from OFF
 *     to ON opens an alertdialog with `--danger` chrome; only
 *     the user explicitly confirming the danger flips the
 *     master to ON. Toggling back from ON to OFF is a single
 *     tap (no confirm) — disabling is never gated.
 *
 *   * **Body dims when disabled.** Every section other than the
 *     master switch becomes `opacity .42 + pointer-events:none`
 *     so the user can read settings but cannot edit them.
 *
 *   * **Delete-broadcast default is OFF** (H08 outbound table).
 *     The cache-persistence caveat is verbatim — the user reads
 *     "remote caches keep copies regardless" before deciding.
 *
 *   * **Only PUBLIC content reaches AP** (rule 27). The intro
 *     paragraph + confirm body both restate this — verbatim.
 */

import {
  type CSSProperties,
  useEffect,
  useId,
  useState,
} from "react";

import {
  APS_APPROVAL_HEADING,
  APS_APPROVAL_OPTIONS,
  APS_APPROVAL_SUBHEAD,
  APS_CONFIRM_BODY_HEAD,
  APS_CONFIRM_BODY_PUBLIC_STRONG,
  APS_CONFIRM_BODY_TAIL,
  APS_CONFIRM_CANCEL,
  APS_CONFIRM_OK,
  APS_CONFIRM_SUB,
  APS_CONFIRM_TITLE,
  APS_CRUMB,
  APS_DISCARD_CTA,
  APS_INTRO_HEAD,
  APS_INTRO_PUBLIC_EM,
  APS_INTRO_TAIL,
  APS_LABEL_BIO,
  APS_LABEL_DISPLAY_NAME,
  APS_MASTER_LABEL,
  APS_MASTER_SUB_OFF,
  APS_MASTER_SUB_ON,
  APS_OBJECT_HEADING,
  APS_OBJECT_SUBHEAD,
  APS_OBJECT_TYPES,
  APS_OUTBOUND,
  APS_OUTBOUND_HEADING,
  APS_OUTBOUND_SUBHEAD,
  APS_PROFILE_HEADING,
  APS_PROFILE_SUBHEAD,
  APS_SAVE_CTA,
  APS_TITLE,
  APS_WEBFINGER_HELPER,
  type FollowApprovalKey,
  type OutboundActivityKey,
} from "./copy.js";

// ─── Data shapes ──────────────────────────────────────────────────

export interface ApsSettingsDraft {
  enabled: boolean;
  displayName: string;
  bio: string;
  approval: FollowApprovalKey;
  objectMappings: Readonly<Record<string, string>>;
  outbound: Readonly<Record<OutboundActivityKey, boolean>>;
}

export interface ActivityPubSettingsSurfaceProps {
  /** WebFinger handle — already-formed `@user@instance.tld`. */
  webFingerHandle: string;
  /** Initial draft. Default `enabled=false`. */
  initial?: Partial<ApsSettingsDraft>;
  onSave?: (draft: ApsSettingsDraft) => void;
  onDiscard?: () => void;
  className?: string;
  style?: CSSProperties;
}

// ─── Styles ───────────────────────────────────────────────────────

const TOPBAR: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 14,
  padding: "13px 24px",
  borderBottom: "1px solid var(--line)",
  background: "var(--bg)",
};

const MAIN: CSSProperties = {
  overflowY: "auto",
  minHeight: 0,
  padding: "26px 24px 64px",
};

// ─── Component ─────────────────────────────────────────────────────

export function ActivityPubSettingsSurface({
  webFingerHandle,
  initial,
  onSave,
  onDiscard,
  className,
  style,
}: ActivityPubSettingsSurfaceProps) {
  const titleId = useId();

  const [enabled, setEnabled] = useState<boolean>(
    initial?.enabled ?? false,
  );
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [displayName, setDisplayName] = useState<string>(
    initial?.displayName ?? "",
  );
  const [bio, setBio] = useState<string>(initial?.bio ?? "");
  const [approval, setApproval] = useState<FollowApprovalKey>(
    initial?.approval ?? "manual",
  );
  const [objectMappings, setObjectMappings] = useState<
    Record<string, string>
  >(() => {
    const seed: Record<string, string> = {};
    for (const t of APS_OBJECT_TYPES) seed[t.key] = t.opts[0]!;
    return { ...seed, ...(initial?.objectMappings ?? {}) };
  });
  const [outbound, setOutbound] = useState<
    Record<OutboundActivityKey, boolean>
  >(() => {
    const seed = {
      create: true,
      update: true,
      delete: false,
    } as Record<OutboundActivityKey, boolean>;
    return { ...seed, ...(initial?.outbound ?? {}) };
  });

  const requestMasterToggle = () => {
    if (enabled) {
      // Disabling is always immediate. The brief intentionally
      // gates only the FIRST activation.
      setEnabled(false);
    } else {
      setConfirmOpen(true);
    }
  };

  const confirmEnable = () => {
    setEnabled(true);
    setConfirmOpen(false);
  };

  const handleSave = () =>
    onSave?.({
      enabled,
      displayName,
      bio,
      approval,
      objectMappings,
      outbound,
    });

  return (
    <section
      aria-labelledby={titleId}
      className={className}
      data-surface="activitypub-settings"
      style={{
        display: "flex",
        flexDirection: "column",
        minHeight: 0,
        height: "100%",
        ...style,
      }}
    >
      <header style={TOPBAR}>
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: 11,
              color: "var(--ink-mute)",
              letterSpacing: "0.04em",
            }}
          >
            {APS_CRUMB}
          </div>
          <h1
            id={titleId}
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 21,
              lineHeight: 1.1,
              margin: 0,
            }}
          >
            {APS_TITLE}
          </h1>
        </div>
      </header>

      <main className="scroll" style={MAIN}>
        <div style={{ maxWidth: 720, margin: "0 auto" }}>
          <p
            data-field="intro"
            style={{
              fontFamily: "var(--font-serif)",
              fontSize: 15,
              color: "var(--ink-soft)",
              lineHeight: 1.6,
              margin: "0 0 22px",
            }}
          >
            {APS_INTRO_HEAD}
            <em>{APS_INTRO_PUBLIC_EM}</em>
            {APS_INTRO_TAIL}
          </p>

          <MasterCard
            enabled={enabled}
            onToggle={requestMasterToggle}
          />

          <div
            data-field="body"
            data-enabled={enabled}
            style={{
              opacity: enabled ? 1 : 0.42,
              pointerEvents: enabled ? "auto" : "none",
              transition: "opacity .2s ease",
            }}
          >
            <ProfileBand
              webFingerHandle={webFingerHandle}
              displayName={displayName}
              setDisplayName={setDisplayName}
              bio={bio}
              setBio={setBio}
            />
            <ApprovalBand
              approval={approval}
              onPick={setApproval}
            />
            <ObjectMappingBand
              mappings={objectMappings}
              onChange={(key, value) =>
                setObjectMappings((p) => ({ ...p, [key]: value }))
              }
            />
            <OutboundBand
              outbound={outbound}
              onToggle={(key) =>
                setOutbound((p) => ({ ...p, [key]: !p[key] }))
              }
            />
          </div>

          <div
            style={{
              display: "flex",
              gap: 11,
              justifyContent: "flex-end",
              marginTop: 28,
              paddingTop: 20,
              borderTop: "1px solid var(--line)",
            }}
          >
            <button
              type="button"
              onClick={onDiscard}
              data-action="discard"
              style={{
                padding: "11px 18px",
                borderRadius: "var(--r-md)",
                borderWidth: 1,
                borderStyle: "solid",
                borderColor: "var(--line-2)",
                background: "transparent",
                fontFamily: "var(--font-ui)",
                fontSize: 14,
                color: "var(--ink-soft)",
                cursor: "pointer",
              }}
            >
              {APS_DISCARD_CTA}
            </button>
            <button
              type="button"
              disabled={!enabled}
              onClick={handleSave}
              data-action="save"
              data-disabled={!enabled}
              style={{
                padding: "11px 22px",
                borderRadius: "var(--r-md)",
                background: enabled ? "var(--accent)" : "var(--bg-3)",
                borderWidth: 1,
                borderStyle: "solid",
                borderColor: enabled ? "var(--accent)" : "var(--line)",
                color: enabled ? "var(--accent-ink)" : "var(--ink-mute)",
                fontFamily: "var(--font-ui)",
                fontWeight: 700,
                fontSize: 14,
                cursor: enabled ? "pointer" : "not-allowed",
              }}
            >
              {APS_SAVE_CTA}
            </button>
          </div>
        </div>
      </main>

      {confirmOpen ? (
        <FirstActivationConfirm
          onCancel={() => setConfirmOpen(false)}
          onConfirm={confirmEnable}
        />
      ) : null}
    </section>
  );
}

// ─── MasterCard ───────────────────────────────────────────────────

function MasterCard({
  enabled,
  onToggle,
}: {
  enabled: boolean;
  onToggle: () => void;
}) {
  return (
    <div
      data-field="master-card"
      data-enabled={enabled}
      style={{
        padding: "18px 20px",
        borderWidth: 1,
        borderStyle: "solid",
        borderColor: enabled ? "var(--network-line)" : "var(--line-2)",
        borderRadius: "var(--r-lg)",
        background: enabled ? "var(--network-soft)" : "var(--bg-2)",
        display: "flex",
        alignItems: "center",
        gap: 16,
        marginBottom: 24,
      }}
    >
      <span
        aria-hidden="true"
        style={{
          display: "flex",
          color: enabled ? "var(--network)" : "var(--ink-mute)",
          flex: "none",
        }}
      >
        <svg
          width={26}
          height={26}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.4}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="9" />
          <path d="M12 3a14 14 0 0 0 0 18M12 3a14 14 0 0 1 0 18M3.5 9h17M3.5 15h17" />
        </svg>
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 18,
            color: "var(--ink)",
          }}
        >
          {APS_MASTER_LABEL}
        </div>
        <div
          data-field="master-sub"
          style={{
            fontFamily: "var(--font-ui)",
            fontSize: 12.5,
            color: "var(--ink-mute)",
            marginTop: 2,
          }}
        >
          {enabled ? APS_MASTER_SUB_ON : APS_MASTER_SUB_OFF}
        </div>
      </div>
      <Switch
        on={enabled}
        onClick={onToggle}
        aria-label={APS_MASTER_LABEL}
        size="lg"
        dataField="master-switch"
      />
    </div>
  );
}

// ─── ProfileBand ─────────────────────────────────────────────────

function ProfileBand({
  webFingerHandle,
  displayName,
  setDisplayName,
  bio,
  setBio,
}: {
  webFingerHandle: string;
  displayName: string;
  setDisplayName: (s: string) => void;
  bio: string;
  setBio: (s: string) => void;
}) {
  return (
    <section style={{ marginBottom: 24 }} data-field="profile-band">
      <div
        style={{
          fontFamily: "var(--font-display)",
          fontSize: 16,
          color: "var(--ink)",
          marginBottom: 3,
        }}
      >
        {APS_PROFILE_HEADING}
      </div>
      <div
        style={{
          fontFamily: "var(--font-ui)",
          fontSize: 12.5,
          color: "var(--ink-mute)",
          marginBottom: 13,
        }}
      >
        {APS_PROFILE_SUBHEAD}
      </div>
      <div
        style={{
          padding: "16px 18px",
          borderWidth: 1,
          borderStyle: "solid",
          borderColor: "var(--line)",
          borderRadius: "var(--r-md)",
          background: "var(--bg-2)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 13,
            marginBottom: 16,
          }}
        >
          <span
            aria-hidden="true"
            style={{
              width: 46,
              height: 46,
              borderRadius: "50%",
              background: "var(--accent-soft)",
              borderWidth: 1,
              borderStyle: "solid",
              borderColor: "var(--network-line)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: "var(--font-display)",
              fontSize: 21,
              color: "var(--accent)",
              flex: "none",
            }}
          >
            Θ
          </span>
          <div style={{ minWidth: 0 }}>
            <div
              data-field="webfinger-handle"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "4px 12px",
                borderWidth: 1,
                borderStyle: "solid",
                borderColor: "var(--network-line)",
                borderRadius: 20,
                background: "var(--network-soft)",
                fontFamily: "var(--font-mono)",
                fontSize: 13,
                color: "var(--network)",
              }}
            >
              {webFingerHandle}
            </div>
            <div
              style={{
                fontFamily: "var(--font-ui)",
                fontSize: 11,
                color: "var(--ink-mute)",
                marginTop: 6,
              }}
            >
              {APS_WEBFINGER_HELPER}
            </div>
          </div>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 14,
          }}
        >
          <label style={{ display: "block" }}>
            <span
              style={{
                display: "block",
                fontFamily: "var(--font-ui)",
                fontSize: 11,
                color: "var(--ink-mute)",
                marginBottom: 5,
              }}
            >
              {APS_LABEL_DISPLAY_NAME}
            </span>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.currentTarget.value)}
              data-field="display-name"
              style={{
                width: "100%",
                padding: "9px 11px",
                borderWidth: 1,
                borderStyle: "solid",
                borderColor: "var(--line-2)",
                borderRadius: "var(--r-md)",
                background: "var(--bg)",
                color: "var(--ink)",
                fontFamily: "var(--font-serif)",
                fontSize: 14,
              }}
            />
          </label>
          <label style={{ display: "block" }}>
            <span
              style={{
                display: "block",
                fontFamily: "var(--font-ui)",
                fontSize: 11,
                color: "var(--ink-mute)",
                marginBottom: 5,
              }}
            >
              {APS_LABEL_BIO}
            </span>
            <input
              type="text"
              value={bio}
              onChange={(e) => setBio(e.currentTarget.value)}
              data-field="bio"
              style={{
                width: "100%",
                padding: "9px 11px",
                borderWidth: 1,
                borderStyle: "solid",
                borderColor: "var(--line-2)",
                borderRadius: "var(--r-md)",
                background: "var(--bg)",
                color: "var(--ink)",
                fontFamily: "var(--font-serif)",
                fontSize: 14,
              }}
            />
          </label>
        </div>
      </div>
    </section>
  );
}

// ─── ApprovalBand ────────────────────────────────────────────────

function ApprovalBand({
  approval,
  onPick,
}: {
  approval: FollowApprovalKey;
  onPick: (k: FollowApprovalKey) => void;
}) {
  return (
    <section style={{ marginBottom: 24 }} data-field="approval-band">
      <div
        style={{
          fontFamily: "var(--font-display)",
          fontSize: 16,
          color: "var(--ink)",
          marginBottom: 3,
        }}
      >
        {APS_APPROVAL_HEADING}
      </div>
      <div
        style={{
          fontFamily: "var(--font-ui)",
          fontSize: 12.5,
          color: "var(--ink-mute)",
          marginBottom: 13,
        }}
      >
        {APS_APPROVAL_SUBHEAD}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {APS_APPROVAL_OPTIONS.map(([key, label, rec]) => {
          const on = approval === key;
          return (
            <button
              key={key}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => onPick(key)}
              data-field="approval-option"
              data-approval={key}
              data-on={on}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                width: "100%",
                padding: "13px 15px",
                borderWidth: 1,
                borderStyle: "solid",
                borderColor: on ? "var(--network-line)" : "var(--line)",
                borderRadius: "var(--r-md)",
                background: on ? "var(--network-soft)" : "var(--bg-2)",
                textAlign: "left",
                cursor: "pointer",
              }}
            >
              <span
                aria-hidden="true"
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: "50%",
                  borderWidth: 1,
                  borderStyle: "solid",
                  borderColor: on ? "var(--accent)" : "var(--line-2)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flex: "none",
                }}
              >
                {on ? (
                  <span
                    style={{
                      width: 9,
                      height: 9,
                      borderRadius: "50%",
                      background: "var(--accent)",
                    }}
                  />
                ) : null}
              </span>
              <span
                style={{
                  fontFamily: "var(--font-serif)",
                  fontSize: 14.5,
                  color: "var(--ink)",
                }}
              >
                {label}
              </span>
              <span
                style={{
                  marginLeft: "auto",
                  fontFamily: "var(--font-ui)",
                  fontSize: 11,
                  color: "var(--ink-mute)",
                }}
              >
                {rec}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

// ─── ObjectMappingBand ───────────────────────────────────────────

function ObjectMappingBand({
  mappings,
  onChange,
}: {
  mappings: Record<string, string>;
  onChange: (key: string, value: string) => void;
}) {
  return (
    <section
      style={{ marginBottom: 24 }}
      data-field="object-mapping-band"
    >
      <div
        style={{
          fontFamily: "var(--font-display)",
          fontSize: 16,
          color: "var(--ink)",
          marginBottom: 3,
        }}
      >
        {APS_OBJECT_HEADING}
      </div>
      <div
        style={{
          fontFamily: "var(--font-ui)",
          fontSize: 12.5,
          color: "var(--ink-mute)",
          marginBottom: 13,
        }}
      >
        {APS_OBJECT_SUBHEAD}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {APS_OBJECT_TYPES.map((t) => (
          <div
            key={t.key}
            data-field="object-row"
            data-object-key={t.key}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 13,
              padding: "12px 14px",
              borderWidth: 1,
              borderStyle: "solid",
              borderColor: "var(--line)",
              borderRadius: "var(--r-md)",
              background: "var(--bg-2)",
            }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontFamily: "var(--font-serif)",
                  fontSize: 14,
                  color: "var(--ink)",
                }}
              >
                {t.label}
              </div>
              <div
                style={{
                  fontFamily: "var(--font-ui)",
                  fontSize: 11,
                  color: "var(--ink-mute)",
                }}
              >
                {t.note}
              </div>
            </div>
            <select
              value={mappings[t.key] ?? t.opts[0]}
              onChange={(e) =>
                onChange(t.key, e.currentTarget.value)
              }
              data-field="object-mapping-select"
              data-object={t.key}
              aria-label={t.label}
              style={{
                padding: "7px 10px",
                borderWidth: 1,
                borderStyle: "solid",
                borderColor: "var(--line-2)",
                borderRadius: "var(--r-md)",
                background: "var(--bg)",
                color: "var(--ink)",
                fontFamily: "var(--font-mono)",
                fontSize: 12.5,
              }}
            >
              {t.opts.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>
    </section>
  );
}

// ─── OutboundBand ────────────────────────────────────────────────

function OutboundBand({
  outbound,
  onToggle,
}: {
  outbound: Record<OutboundActivityKey, boolean>;
  onToggle: (key: OutboundActivityKey) => void;
}) {
  return (
    <section style={{ marginBottom: 8 }} data-field="outbound-band">
      <div
        style={{
          fontFamily: "var(--font-display)",
          fontSize: 16,
          color: "var(--ink)",
          marginBottom: 3,
        }}
      >
        {APS_OUTBOUND_HEADING}
      </div>
      <div
        style={{
          fontFamily: "var(--font-ui)",
          fontSize: 12.5,
          color: "var(--ink-mute)",
          marginBottom: 13,
        }}
      >
        {APS_OUTBOUND_SUBHEAD}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {APS_OUTBOUND.map((a) => {
          const on = outbound[a.key];
          return (
            <label
              key={a.key}
              data-field="outbound-row"
              data-outbound-key={a.key}
              data-on={on}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "12px 14px",
                borderWidth: 1,
                borderStyle: "solid",
                borderColor: "var(--line)",
                borderRadius: "var(--r-md)",
                background: "var(--bg-2)",
                cursor: "pointer",
              }}
            >
              <Switch
                on={on}
                onClick={() => onToggle(a.key)}
                aria-label={a.label}
                size="sm"
                dataField={`outbound-switch-${a.key}`}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontFamily: "var(--font-serif)",
                    fontSize: 14,
                    color: "var(--ink)",
                  }}
                >
                  {a.label}
                </div>
                <div
                  style={{
                    fontFamily: "var(--font-ui)",
                    fontSize: 11,
                    color: "var(--ink-mute)",
                  }}
                >
                  {a.note}
                </div>
              </div>
            </label>
          );
        })}
      </div>
    </section>
  );
}

// ─── Switch ──────────────────────────────────────────────────────

function Switch({
  on,
  onClick,
  size,
  dataField,
  ...aria
}: {
  on: boolean;
  onClick: () => void;
  size: "sm" | "lg";
  dataField?: string;
  "aria-label"?: string;
}) {
  const dims =
    size === "lg"
      ? { w: 46, h: 26, knob: 20, gap: 22 }
      : { w: 38, h: 22, knob: 16, gap: 18 };
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={onClick}
      data-field={dataField}
      aria-label={aria["aria-label"]}
      style={{
        position: "relative",
        width: dims.w,
        height: dims.h,
        borderRadius: dims.h / 2,
        background: on ? "var(--accent)" : "var(--bg-3)",
        borderWidth: 1,
        borderStyle: "solid",
        borderColor: on ? "var(--accent)" : "var(--line-2)",
        flex: "none",
        transition: "background .18s ease",
        cursor: "pointer",
      }}
    >
      <span
        aria-hidden="true"
        style={{
          position: "absolute",
          top: 2,
          left: on ? dims.gap : 2,
          width: dims.knob,
          height: dims.knob,
          borderRadius: "50%",
          background: on ? "var(--accent-ink)" : "var(--ink-mute)",
          transition: "left .18s ease",
        }}
      />
    </button>
  );
}

// ─── FirstActivationConfirm ─────────────────────────────────────

function FirstActivationConfirm({
  onCancel,
  onConfirm,
}: {
  onCancel: () => void;
  onConfirm: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  return (
    <div
      data-modal="aps-first-activation"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="aps-confirm-title"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 80,
        background: "rgba(0,0,0,.55)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div
        style={{
          width: 480,
          maxWidth: "100%",
          background: "var(--bg)",
          borderWidth: 1,
          borderStyle: "solid",
          borderColor: "var(--danger-border)",
          borderRadius: "var(--r-lg)",
          boxShadow: "0 28px 70px rgba(0,0,0,.55)",
          overflow: "hidden",
        }}
      >
        <header
          style={{
            padding: "22px 24px 16px",
            display: "flex",
            gap: 14,
            alignItems: "flex-start",
            borderBottom: "1px solid var(--line)",
          }}
        >
          <span
            aria-hidden="true"
            style={{
              display: "flex",
              color: "var(--danger)",
              flex: "none",
              marginTop: 1,
            }}
          >
            <svg
              width={24}
              height={24}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 3l9 16H3z" />
              <path d="M12 10v4M12 17h.01" />
            </svg>
          </span>
          <div>
            <h2
              id="aps-confirm-title"
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 20,
                margin: 0,
                color: "var(--ink)",
              }}
            >
              {APS_CONFIRM_TITLE}
            </h2>
            <div
              style={{
                fontFamily: "var(--font-ui)",
                fontSize: 12.5,
                color: "var(--ink-mute)",
                marginTop: 4,
              }}
            >
              {APS_CONFIRM_SUB}
            </div>
          </div>
        </header>
        <div
          style={{
            padding: "18px 24px",
            fontFamily: "var(--font-serif)",
            fontSize: 14.5,
            color: "var(--ink-soft)",
            lineHeight: 1.6,
          }}
          data-field="confirm-body"
        >
          {APS_CONFIRM_BODY_HEAD}
          <strong style={{ color: "var(--ink)" }}>
            {APS_CONFIRM_BODY_PUBLIC_STRONG}
          </strong>
          {APS_CONFIRM_BODY_TAIL}
        </div>
        <footer
          style={{
            padding: "16px 24px",
            borderTop: "1px solid var(--line)",
            display: "flex",
            gap: 10,
            justifyContent: "flex-end",
          }}
        >
          <button
            type="button"
            onClick={onCancel}
            data-action="confirm-cancel"
            style={{
              padding: "11px 18px",
              borderRadius: "var(--r-md)",
              borderWidth: 1,
              borderStyle: "solid",
              borderColor: "var(--line-2)",
              background: "transparent",
              fontFamily: "var(--font-ui)",
              fontSize: 14,
              color: "var(--ink-soft)",
              cursor: "pointer",
            }}
          >
            {APS_CONFIRM_CANCEL}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            data-action="confirm-enable"
            style={{
              padding: "11px 20px",
              borderRadius: "var(--r-md)",
              background: "var(--danger-soft)",
              borderWidth: 1,
              borderStyle: "solid",
              borderColor: "var(--danger-border)",
              fontFamily: "var(--font-ui)",
              fontWeight: 700,
              fontSize: 14,
              color: "var(--danger)",
              cursor: "pointer",
            }}
          >
            {APS_CONFIRM_OK}
          </button>
        </footer>
      </div>
    </div>
  );
}
