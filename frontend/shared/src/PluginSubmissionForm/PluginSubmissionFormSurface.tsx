/**
 * PluginSubmissionForm — H10 Cluster A2 surface.
 *
 * Rule 42 — SPDX-validated, BLOCKING. If `licenseSpdx` is not in
 * ACCEPTED_LICENSES, the Submit button is disabled and a
 * `--warn-soft` block surfaces the accepted list inline.
 */

import { useMemo, useState, type CSSProperties } from "react";

import {
  ACCEPTED_LICENSES,
  type CapabilityChip,
  FIELD_LABELS,
  HEADERS,
  MANIFEST_PARSED_PREFIX,
  PREAMBLE,
  SIGNATURE_VERIFIED_PREFIX,
  SOURCE_DISTRIBUTION_HINT,
  SOURCE_OPTIONS,
  type SourceKind,
  SUBMIT_LABEL,
} from "./copy.js";

export interface PluginSubmissionFormProps {
  /** Parsed manifest preview (rendered as `--font-mono` pre block). */
  manifestText: string;
  manifestSizeBytes?: number;
  pluginName: string;
  pluginVersion: string;
  authorDid: string;
  licenseSpdx: string;
  sourceUrl: string;
  signatureBase64: string;
  signatureKeyFingerprint: string;
  capabilities: readonly CapabilityChip[];
  initialSourceKind?: SourceKind;
  /** Override when the parent wants its own license set (else defaults to
   *  ACCEPTED_LICENSES). The validation always uses this list. */
  acceptedLicenses?: readonly string[];
  busy?: boolean;
  onSubmit?: (payload: {
    sourceKind: SourceKind;
    sourceUrl: string;
    signature: string;
  }) => void;
  onReplaceManifest?: () => void;
  className?: string;
  style?: CSSProperties;
}

const PAGE: CSSProperties = {
  maxWidth: 600,
  margin: "0 auto",
  padding: "24px 24px 56px",
};

const SECTION_HEADING: CSSProperties = {
  fontFamily: "var(--font-display)",
  fontSize: 16,
  color: "var(--ink)",
  marginBottom: 9,
};

const DL_LABEL: CSSProperties = {
  fontFamily: "var(--font-ui)",
  fontSize: 11,
  letterSpacing: "0.06em",
  textTransform: "uppercase",
  color: "var(--ink-mute)",
};

function RadioDot({ on }: { on: boolean }) {
  return (
    <span
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
      aria-hidden="true"
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
  );
}

function CheckIcon({ size = 12 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
}

export function PluginSubmissionFormSurface({
  manifestText,
  manifestSizeBytes,
  pluginName,
  pluginVersion,
  authorDid,
  licenseSpdx,
  sourceUrl: initialSourceUrl,
  signatureBase64: initialSignature,
  signatureKeyFingerprint,
  capabilities,
  initialSourceKind = "github",
  acceptedLicenses = ACCEPTED_LICENSES,
  busy = false,
  onSubmit,
  onReplaceManifest,
  className,
  style,
}: PluginSubmissionFormProps) {
  const [sourceKind, setSourceKind] = useState<SourceKind>(initialSourceKind);
  const [sourceUrl, setSourceUrl] = useState(initialSourceUrl);
  const [signature, setSignature] = useState(initialSignature);

  const licenseValid = useMemo(
    () => acceptedLicenses.includes(licenseSpdx),
    [acceptedLicenses, licenseSpdx],
  );

  const canSubmit = licenseValid && !busy && sourceUrl.trim().length > 0 &&
    signature.trim().length > 0;

  const sizeLabel = manifestSizeBytes
    ? `${MANIFEST_PARSED_PREFIX} · ${(manifestSizeBytes / 1024).toFixed(1)} KB`
    : MANIFEST_PARSED_PREFIX;

  return (
    <div className={className} style={{ ...PAGE, ...style }}>
      <p
        style={{
          fontFamily: "var(--font-serif)",
          fontSize: 14.5,
          color: "var(--ink-soft)",
          lineHeight: 1.6,
          margin: "0 0 24px",
        }}
      >
        {PREAMBLE}
      </p>

      {/* Manifest */}
      <section style={{ marginBottom: 26 }}>
        <div style={SECTION_HEADING}>{HEADERS.manifest}</div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "14px 16px",
            borderWidth: 1,
            borderStyle: "dashed",
            borderColor: "var(--line-2)",
            borderRadius: "var(--r-md)",
            background: "var(--bg-2)",
            marginBottom: 11,
          }}
        >
          <span
            style={{
              display: "flex",
              color: "var(--ink-mute)",
              flex: "none",
            }}
            aria-hidden="true"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
              <path d="M14 3v5h5" />
            </svg>
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 13,
                color: "var(--ink)",
              }}
            >
              plugin.toml
            </div>
            <div
              style={{
                fontFamily: "var(--font-ui)",
                fontSize: 11.5,
                color: "var(--ink-mute)",
              }}
            >
              {sizeLabel}
            </div>
          </div>
          <button
            type="button"
            onClick={onReplaceManifest}
            style={{
              padding: "7px 13px",
              borderRadius: "var(--r-md)",
              borderWidth: 1,
              borderStyle: "solid",
              borderColor: "var(--line-2)",
              background: "transparent",
              fontFamily: "var(--font-ui)",
              fontSize: 12.5,
              color: "var(--ink-soft)",
              cursor: "pointer",
            }}
          >
            Replace
          </button>
        </div>
        <pre
          style={{
            margin: 0,
            padding: "13px 15px",
            background: "var(--bg-sunk)",
            borderWidth: 1,
            borderStyle: "solid",
            borderColor: "var(--line)",
            borderRadius: "var(--r-md)",
            fontFamily: "var(--font-mono)",
            fontSize: 11.5,
            lineHeight: 1.6,
            color: "var(--ink-soft)",
            whiteSpace: "pre-wrap",
          }}
        >
          {manifestText}
        </pre>
      </section>

      {/* Identity */}
      <section style={{ marginBottom: 26 }}>
        <div style={SECTION_HEADING}>{HEADERS.identity}</div>
        <dl
          style={{
            display: "grid",
            gridTemplateColumns: "auto 1fr",
            gap: "9px 18px",
            margin: "0 0 13px",
          }}
        >
          <dt style={DL_LABEL}>{FIELD_LABELS.name}</dt>
          <dd
            style={{
              margin: 0,
              fontFamily: "var(--font-serif)",
              fontSize: 14,
              color: "var(--ink)",
            }}
          >
            {pluginName}{" "}
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 12,
                color: "var(--ink-mute)",
              }}
            >
              v{pluginVersion}
            </span>
          </dd>

          <dt style={DL_LABEL}>{FIELD_LABELS.author}</dt>
          <dd
            style={{
              margin: 0,
              fontFamily: "var(--font-mono)",
              fontSize: 12.5,
              color: "var(--ink-soft)",
              wordBreak: "break-all",
            }}
          >
            {authorDid}{" "}
            <span
              style={{
                fontFamily: "var(--font-ui)",
                fontSize: 11,
                color: "var(--ink-mute)",
              }}
            >
              {FIELD_LABELS.authorSessionHint}
            </span>
          </dd>

          <dt style={DL_LABEL}>{FIELD_LABELS.license}</dt>
          <dd
            style={{
              margin: 0,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 13,
                color: "var(--ink)",
              }}
            >
              {licenseSpdx}
            </span>
            {licenseValid ? (
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                  padding: "1px 9px",
                  borderRadius: "var(--r-pill)",
                  background: "var(--peer-ok-soft)",
                  borderWidth: 1,
                  borderStyle: "solid",
                  borderColor: "var(--peer-ok-border)",
                  fontFamily: "var(--font-ui)",
                  fontSize: 11,
                  color: "var(--peer-ok)",
                }}
              >
                <CheckIcon />
                {FIELD_LABELS.spdxValidated}
              </span>
            ) : null}
          </dd>
        </dl>
        {!licenseValid ? (
          <div
            role="alert"
            style={{
              padding: "12px 14px",
              borderWidth: 1,
              borderStyle: "solid",
              borderColor: "var(--warn-border)",
              background: "var(--warn-soft)",
              borderRadius: "var(--r-md)",
              marginBottom: 12,
            }}
          >
            <div
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 14,
                color: "var(--ink)",
                marginBottom: 6,
              }}
            >
              {FIELD_LABELS.licenseNotAccepted}
            </div>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 6,
              }}
            >
              {acceptedLicenses.map((l) => (
                <span
                  key={l}
                  style={{
                    padding: "2px 9px",
                    borderRadius: "var(--r-pill)",
                    borderWidth: 1,
                    borderStyle: "solid",
                    borderColor: "var(--line)",
                    fontFamily: "var(--font-mono)",
                    fontSize: 11,
                    color: "var(--ink-soft)",
                  }}
                >
                  {l}
                </span>
              ))}
            </div>
          </div>
        ) : (
          <details
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: 12,
              color: "var(--ink-mute)",
            }}
          >
            <summary style={{ cursor: "pointer" }}>
              {FIELD_LABELS.acceptedLicenses}
            </summary>
            <div
              style={{
                marginTop: 8,
                display: "flex",
                flexWrap: "wrap",
                gap: 6,
              }}
            >
              {acceptedLicenses.map((l) => (
                <span
                  key={l}
                  style={{
                    padding: "2px 9px",
                    borderRadius: "var(--r-pill)",
                    borderWidth: 1,
                    borderStyle: "solid",
                    borderColor: "var(--line)",
                    fontFamily: "var(--font-mono)",
                    fontSize: 11,
                    color: "var(--ink-soft)",
                  }}
                >
                  {l}
                </span>
              ))}
            </div>
          </details>
        )}
      </section>

      {/* Source distribution */}
      <section style={{ marginBottom: 26 }}>
        <div
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 16,
            color: "var(--ink)",
            marginBottom: 4,
          }}
        >
          {HEADERS.sourceDistribution}
        </div>
        <p
          style={{
            fontFamily: "var(--font-ui)",
            fontSize: 12,
            color: "var(--ink-mute)",
            margin: "0 0 11px",
          }}
        >
          {SOURCE_DISTRIBUTION_HINT}
        </p>
        <div
          role="radiogroup"
          aria-label={HEADERS.sourceDistribution}
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 8,
            marginBottom: 11,
          }}
        >
          {SOURCE_OPTIONS.map((o) => {
            const on = sourceKind === o.key;
            return (
              <button
                key={o.key}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => setSourceKind(o.key)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 11,
                  width: "100%",
                  padding: "11px 14px",
                  borderWidth: 1,
                  borderStyle: "solid",
                  borderColor: on ? "var(--accent)" : "var(--line)",
                  borderRadius: "var(--r-md)",
                  background: on ? "var(--accent-soft)" : "var(--bg-2)",
                  textAlign: "left",
                  cursor: "pointer",
                  font: "inherit",
                  color: "inherit",
                }}
              >
                <RadioDot on={on} />
                <span
                  style={{
                    fontFamily: "var(--font-serif)",
                    fontSize: 14,
                    color: "var(--ink)",
                  }}
                >
                  {o.label}
                </span>
              </button>
            );
          })}
        </div>
        <input
          type="text"
          value={sourceUrl}
          onChange={(e) => setSourceUrl(e.target.value)}
          aria-label="Source URL"
          style={{
            width: "100%",
            padding: "10px 13px",
            borderWidth: 1,
            borderStyle: "solid",
            borderColor: "var(--line-2)",
            borderRadius: "var(--r-md)",
            background: "var(--bg-2)",
            color: "var(--ink)",
            fontFamily: "var(--font-mono)",
            fontSize: 12.5,
          }}
        />
      </section>

      {/* Signature */}
      <section style={{ marginBottom: 26 }}>
        <div style={SECTION_HEADING}>{HEADERS.signature}</div>
        <textarea
          rows={2}
          value={signature}
          onChange={(e) => setSignature(e.target.value)}
          aria-label="Signature"
          style={{
            width: "100%",
            padding: "10px 13px",
            borderWidth: 1,
            borderStyle: "solid",
            borderColor: "var(--line-2)",
            borderRadius: "var(--r-md)",
            background: "var(--bg-2)",
            color: "var(--ink)",
            fontFamily: "var(--font-mono)",
            fontSize: 12,
            resize: "vertical",
          }}
        />
        <div
          style={{
            fontFamily: "var(--font-ui)",
            fontSize: 11.5,
            color: "var(--ink-mute)",
            marginTop: 7,
          }}
        >
          {SIGNATURE_VERIFIED_PREFIX}{" "}
          <span
            style={{
              fontFamily: "var(--font-mono)",
              color: "var(--ink-soft)",
            }}
          >
            {signatureKeyFingerprint}
          </span>
        </div>
      </section>

      {/* Capability summary */}
      <section style={{ marginBottom: 30 }}>
        <div style={SECTION_HEADING}>{HEADERS.capabilities}</div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          {capabilities.map((c) => (
            <div
              key={c.wireKey}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "11px 14px",
                borderWidth: 1,
                borderStyle: "solid",
                borderColor: "var(--line)",
                borderRadius: "var(--r-md)",
                background: "var(--bg-2)",
              }}
            >
              <span
                style={{
                  fontFamily: "var(--font-serif)",
                  fontSize: 14,
                  color: "var(--ink)",
                  flex: 1,
                  minWidth: 0,
                }}
              >
                {c.label}
              </span>
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 11.5,
                  color: "var(--network)",
                  padding: "1px 7px",
                  borderRadius: "var(--r-sm)",
                  background: "var(--network-soft)",
                }}
              >
                {c.wireKey}
              </span>
            </div>
          ))}
        </div>
      </section>

      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button
          type="button"
          disabled={!canSubmit}
          onClick={() =>
            onSubmit?.({ sourceKind, sourceUrl, signature })
          }
          style={{
            padding: "11px 24px",
            borderRadius: "var(--r-md)",
            background: canSubmit ? "var(--accent)" : "var(--bg-3)",
            borderWidth: 1,
            borderStyle: "solid",
            borderColor: canSubmit ? "var(--accent)" : "var(--line)",
            color: canSubmit ? "var(--accent-ink)" : "var(--ink-mute)",
            fontFamily: "var(--font-ui)",
            fontWeight: 700,
            fontSize: 14,
            cursor: canSubmit ? "pointer" : "not-allowed",
          }}
        >
          {SUBMIT_LABEL}
        </button>
      </div>
    </div>
  );
}
