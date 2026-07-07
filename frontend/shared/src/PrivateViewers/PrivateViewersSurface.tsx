/**
 * PrivateViewersSurface — H08 §S3 Cluster A surface 11.
 *
 * Faithful port of ``Theourgia Private Viewer Management.dc.html``.
 *
 * Honesty rules wired:
 *
 *   1. **Default scope is NOT full-vault.** The new-viewer modal
 *      defaults to "tag" — the practitioner picks Full vault as
 *      an explicit choice. The H08 brief is emphatic.
 *   2. **The credential plaintext is shown ONCE.** The verbatim
 *      warning "This credential is shown ONCE. Save it now."
 *      surfaces in `--warn` ink under the Issue CTA. After issue,
 *      the consumer surfaces the credential via a follow-on flow
 *      this surface doesn't render — the modal is the start, not
 *      the end.
 *   3. **Revoked rows persist** at reduced opacity with a verbatim
 *      "Revoked at {ts}" chip (`--ink-mute`). Never deleted, never
 *      celebrated — the audit trail is the point.
 *   4. **Email-signed-link is the default delivery** — passphrase
 *      is the explicit opt-in.
 */

import {
  type CSSProperties,
  useId,
  useState,
} from "react";

import { useEscapeToClose } from "../hooks/useEscapeToClose.js";
import {
  PV_CANCEL_CTA,
  PV_DELIVERY_LABELS,
  PV_EMAIL_PLACEHOLDER,
  PV_ISSUE_CTA,
  PV_LABEL_DELIVERY,
  PV_LABEL_EMAIL_HANDLE,
  PV_LABEL_LABEL,
  PV_LABEL_PLACEHOLDER,
  PV_LABEL_SCOPE,
  PV_LAST_USED_PREFIX,
  PV_MODAL_TITLE,
  PV_NEW_VIEWER_CTA,
  PV_REVOKED_PREFIX,
  PV_SCOPE_LABELS,
  PV_SCOPE_RADIO_LABELS,
  PV_SHOWN_ONCE_WARNING,
  PV_SUBTITLE,
  PV_TITLE,
  type PrivateViewerDeliveryKind,
  type PrivateViewerScopeKind,
} from "./copy.js";

// ─── Data shapes ──────────────────────────────────────────────────

export interface PrivateViewerRow {
  id: string;
  /** Free-text owner label, e.g. "Student — Aspasia". */
  label: string;
  /** Email OR Fediverse handle. Rendered --font-mono. */
  handle: string;
  /** Display-friendly last-used. */
  lastUsed: string;
  scopeKind: PrivateViewerScopeKind;
  /** Single-glyph monogram for the avatar tile. */
  initial: string;
  /** When true, the row appears at reduced opacity with the
   *  "Revoked at {ts}" chip. */
  revoked?: boolean;
  /** Display-friendly revoked-at; only used when `revoked=true`. */
  revokedAt?: string;
}

export interface NewPrivateViewerDraft {
  emailOrHandle: string;
  label: string;
  scope: PrivateViewerScopeKind;
  delivery: PrivateViewerDeliveryKind;
}

export interface PrivateViewersSurfaceProps {
  viewers: readonly PrivateViewerRow[];
  /** Kebab menu — Revoke / View audit / Edit scope. The surface
   *  fires the action key; the consumer renders the contextual
   *  menu (or implements the actions immediately for v1). */
  onViewerAction?: (viewerId: string) => void;
  /** Fired with the draft on Issue credential. */
  onIssueCredential?: (draft: NewPrivateViewerDraft) => void;
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
  padding: "24px 26px 50px",
};

const INNER: CSSProperties = {
  maxWidth: 840,
  margin: "0 auto",
  display: "flex",
  flexDirection: "column",
  gap: 10,
};

// ─── Component ─────────────────────────────────────────────────────

export function PrivateViewersSurface({
  viewers,
  onViewerAction,
  onIssueCredential,
  className,
  style,
}: PrivateViewersSurfaceProps) {
  const titleId = useId();
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <section
      aria-labelledby={titleId}
      className={className}
      data-surface="private-viewers"
      style={{
        display: "flex",
        flexDirection: "column",
        minWidth: 0,
        minHeight: 0,
        height: "100%",
        ...style,
      }}
    >
      <header style={TOPBAR}>
        <div style={{ minWidth: 0 }}>
          <h1
            id={titleId}
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 21,
              lineHeight: 1.1,
              margin: 0,
            }}
          >
            {PV_TITLE}
          </h1>
          <div
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: 12.5,
              color: "var(--ink-mute)",
              marginTop: 2,
            }}
          >
            {PV_SUBTITLE}
          </div>
        </div>
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          data-action="open-new"
          style={{
            marginLeft: "auto",
            display: "flex",
            alignItems: "center",
            gap: 7,
            padding: "9px 15px",
            borderRadius: "var(--r-md)",
            background: "var(--accent)",
            color: "var(--accent-ink)",
            fontFamily: "var(--font-ui)",
            fontWeight: 700,
            fontSize: 13,
            border: "none",
            cursor: "pointer",
          }}
        >
          <svg
            width={15}
            height={15}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.7}
            strokeLinecap="round"
            aria-hidden="true"
          >
            <path d="M12 5v14M5 12h14" />
          </svg>
          {PV_NEW_VIEWER_CTA}
        </button>
      </header>

      <div className="scroll" style={MAIN}>
        <div style={INNER}>
          {viewers.map((v) => (
            <div
              key={v.id}
              data-viewer-id={v.id}
              data-revoked={!!v.revoked}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 15,
                padding: "15px 18px",
                border: "1px solid var(--line)",
                borderRadius: "var(--r-md)",
                background: "var(--bg-2)",
                opacity: v.revoked ? 0.55 : 1,
              }}
            >
              <span
                aria-hidden="true"
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: "50%",
                  background: "var(--network-soft)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flex: "none",
                  fontFamily: "var(--font-display)",
                  fontSize: 17,
                  color: "var(--network)",
                }}
              >
                {v.initial}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 9,
                    flexWrap: "wrap",
                  }}
                >
                  <span
                    style={{
                      fontFamily: "var(--font-display)",
                      fontSize: 16,
                      color: "var(--ink)",
                    }}
                    data-field="label"
                  >
                    {v.label}
                  </span>
                  {v.revoked && v.revokedAt ? (
                    <span
                      data-pill="revoked"
                      style={{
                        fontFamily: "var(--font-ui)",
                        fontSize: 10.5,
                        color: "var(--ink-mute)",
                        border: "1px solid var(--line-2)",
                        borderRadius: "999px",
                        padding: "1px 8px",
                      }}
                    >
                      {PV_REVOKED_PREFIX}
                      {v.revokedAt}
                    </span>
                  ) : null}
                </div>
                <div
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 11.5,
                    color: "var(--ink-mute)",
                  }}
                  data-field="handle"
                >
                  {v.handle}
                  {PV_LAST_USED_PREFIX}
                  {v.lastUsed}
                </div>
              </div>
              <span
                className="pv-scope"
                data-pill="scope"
                data-scope={v.scopeKind}
                style={{
                  padding: "3px 11px",
                  border: "1px solid var(--network-line)",
                  borderRadius: "999px",
                  background: "var(--network-soft)",
                  fontFamily: "var(--font-ui)",
                  fontSize: 11.5,
                  color: "var(--network)",
                  flex: "none",
                }}
              >
                {PV_SCOPE_LABELS[v.scopeKind]}
              </span>
              <button
                type="button"
                aria-label="Viewer actions"
                onClick={() => onViewerAction?.(v.id)}
                data-action="viewer-kebab"
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: "var(--r-sm)",
                  color: "var(--ink-mute)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flex: "none",
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                <svg
                  width={16}
                  height={16}
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <circle cx="5" cy="12" r="1.6" />
                  <circle cx="12" cy="12" r="1.6" />
                  <circle cx="19" cy="12" r="1.6" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      </div>

      {modalOpen ? (
        <NewViewerModal
          onCancel={() => setModalOpen(false)}
          onIssue={(draft) => {
            setModalOpen(false);
            onIssueCredential?.(draft);
          }}
        />
      ) : null}
    </section>
  );
}

// ─── New viewer modal ─────────────────────────────────────────────

function NewViewerModal({
  onCancel,
  onIssue,
}: {
  onCancel: () => void;
  onIssue: (draft: NewPrivateViewerDraft) => void;
}) {
  // Default scope is "tag" per the H08 brief — full-vault is the
  // explicit-opt-in path, never default.
  const [emailOrHandle, setEmailOrHandle] = useState("");
  const [label, setLabel] = useState("");
  const [scope, setScope] = useState<PrivateViewerScopeKind>("tag");
  const [delivery, setDelivery] =
    useState<PrivateViewerDeliveryKind>("signed-link");

  // Escape cancels the modal (b108-2fz a11y sweep).
  useEscapeToClose(true, onCancel);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={PV_MODAL_TITLE}
      data-modal="new-viewer"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 90,
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        padding: "40px 20px",
        overflow: "auto",
      }}
    >
      <div
        onClick={onCancel}
        data-action="scrim"
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(0,0,0,.55)",
        }}
      />
      <div
        className="scroll"
        style={{
          position: "relative",
          width: "min(480px, 100%)",
          maxHeight: "calc(100vh - 80px)",
          overflowY: "auto",
          border: "1px solid var(--line-2)",
          borderRadius: "var(--r-lg)",
          background: "var(--bg)",
          boxShadow: "0 24px 60px rgba(0,0,0,.5)",
          padding: "24px 26px",
        }}
      >
        <h2
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 22,
            margin: "0 0 18px",
          }}
        >
          {PV_MODAL_TITLE}
        </h2>

        <label
          htmlFor="pv-email"
          style={{
            display: "block",
            fontFamily: "var(--font-ui)",
            fontSize: 11,
            color: "var(--ink-mute)",
            marginBottom: 6,
          }}
        >
          {PV_LABEL_EMAIL_HANDLE}
        </label>
        <input
          id="pv-email"
          type="text"
          placeholder={PV_EMAIL_PLACEHOLDER}
          value={emailOrHandle}
          onChange={(e) => setEmailOrHandle(e.currentTarget.value)}
          data-field="email"
          style={{
            width: "100%",
            padding: "10px 12px",
            border: "1px solid var(--line-2)",
            borderRadius: "var(--r-md)",
            background: "var(--bg-2)",
            color: "var(--ink)",
            fontFamily: "var(--font-ui)",
            fontSize: 14,
            marginBottom: 14,
          }}
        />

        <label
          htmlFor="pv-label"
          style={{
            display: "block",
            fontFamily: "var(--font-ui)",
            fontSize: 11,
            color: "var(--ink-mute)",
            marginBottom: 6,
          }}
        >
          {PV_LABEL_LABEL}
        </label>
        <input
          id="pv-label"
          type="text"
          placeholder={PV_LABEL_PLACEHOLDER}
          value={label}
          onChange={(e) => setLabel(e.currentTarget.value)}
          data-field="label"
          style={{
            width: "100%",
            padding: "10px 12px",
            border: "1px solid var(--line-2)",
            borderRadius: "var(--r-md)",
            background: "var(--bg-2)",
            color: "var(--ink)",
            fontFamily: "var(--font-serif)",
            fontSize: 15,
            marginBottom: 14,
          }}
        />

        <fieldset
          data-field="scope"
          style={{ border: "none", padding: 0, margin: "0 0 16px" }}
        >
          <legend
            style={{
              display: "block",
              fontFamily: "var(--font-ui)",
              fontSize: 11,
              color: "var(--ink-mute)",
              marginBottom: 8,
              padding: 0,
            }}
          >
            {PV_LABEL_SCOPE}
          </legend>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {(
              ["tag", "kind", "specific", "full"] as const
            ).map((s) => (
              <RadioRow
                key={s}
                name="pv-scope"
                value={s}
                label={PV_SCOPE_RADIO_LABELS[s]}
                checked={scope === s}
                onChange={() => setScope(s)}
                data-scope={s}
              />
            ))}
          </div>
        </fieldset>

        <fieldset
          data-field="delivery"
          style={{ border: "none", padding: 0, margin: "0 0 18px" }}
        >
          <legend
            style={{
              display: "block",
              fontFamily: "var(--font-ui)",
              fontSize: 11,
              color: "var(--ink-mute)",
              marginBottom: 8,
              padding: 0,
            }}
          >
            {PV_LABEL_DELIVERY}
          </legend>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {(["signed-link", "passphrase"] as const).map((d) => (
              <RadioRow
                key={d}
                name="pv-delivery"
                value={d}
                label={PV_DELIVERY_LABELS[d]}
                checked={delivery === d}
                onChange={() => setDelivery(d)}
                data-delivery={d}
              />
            ))}
          </div>
        </fieldset>

        <div style={{ display: "flex", gap: 10 }}>
          <button
            type="button"
            onClick={onCancel}
            data-action="cancel"
            style={{
              flex: 1,
              padding: 12,
              borderRadius: "var(--r-md)",
              border: "1px solid var(--line-2)",
              background: "transparent",
              fontFamily: "var(--font-ui)",
              fontSize: 14,
              color: "var(--ink-soft)",
              cursor: "pointer",
            }}
          >
            {PV_CANCEL_CTA}
          </button>
          <button
            type="button"
            onClick={() =>
              onIssue({ emailOrHandle, label, scope, delivery })
            }
            data-action="issue"
            style={{
              flex: 1.4,
              padding: 12,
              borderRadius: "var(--r-md)",
              background: "var(--accent)",
              color: "var(--accent-ink)",
              fontFamily: "var(--font-ui)",
              fontWeight: 700,
              fontSize: 14,
              border: "none",
              cursor: "pointer",
            }}
          >
            {PV_ISSUE_CTA}
          </button>
        </div>
        <p
          data-field="shown-once-warning"
          style={{
            fontFamily: "var(--font-ui)",
            fontSize: 11,
            color: "var(--warn)",
            textAlign: "center",
            margin: "12px 0 0",
          }}
        >
          {PV_SHOWN_ONCE_WARNING}
        </p>
      </div>
    </div>
  );
}

function RadioRow({
  name,
  value,
  label,
  checked,
  onChange,
  ...rest
}: {
  name: string;
  value: string;
  label: string;
  checked: boolean;
  onChange: () => void;
  [k: `data-${string}`]: string;
}) {
  return (
    <label
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        cursor: "pointer",
      }}
      {...rest}
    >
      <input
        type="radio"
        name={name}
        value={value}
        checked={checked}
        onChange={onChange}
        data-radio={value}
        style={{
          position: "absolute",
          opacity: 0,
          width: 0,
          height: 0,
        }}
      />
      <span
        aria-hidden="true"
        data-visual-radio={value}
        data-checked={checked}
        style={{
          width: 18,
          height: 18,
          borderRadius: "50%",
          border: `1px solid ${checked ? "var(--accent)" : "var(--line-2)"}`,
          background: checked ? "var(--accent)" : "transparent",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flex: "none",
        }}
      >
        {checked ? (
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: "var(--accent-ink)",
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
    </label>
  );
}
