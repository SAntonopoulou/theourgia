/**
 * DataExportRequest — H10 Cluster B2 surface.
 *
 * Rule 45 — async + emailed. After submit, the surface flips to a
 * confirmation banner; no spinner, no polling. The Submit CTA
 * disables and re-labels "Request received" once dispatched.
 *
 * Rule 27 — the "not included" list mentions federated content with
 * the same calm tone as the rest of the disclosures.
 *
 * Rule 5 — sealed content is included as ciphertext only, with the
 * check icon in `--seal` to mark the row visually.
 */

import { useState, type CSSProperties } from "react";

import {
  CAUTION_LINE,
  deliveryLine,
  type ExportFormatKey,
  FORMAT_OPTIONS,
  INCLUDED_ITEMS,
  NOT_INCLUDED_ITEMS,
  PREAMBLE,
  REQUEST_RECEIVED_TITLE,
  requestedBannerLine,
  SECTION_HEADERS,
  SUBMIT_LABEL,
  SUBMITTED_LABEL,
} from "./copy.js";

export interface DataExportRequestSurfaceProps {
  /** The user's email. Rendered into the delivery line + confirmation banner. */
  email: string;
  /** Override the default format. Defaults to "both". */
  initialFormat?: ExportFormatKey;
  /** Once dispatched, the surface re-renders to the confirmation state. */
  requested?: boolean;
  /** Set true while the underlying mutation is in flight. */
  busy?: boolean;
  onSubmit?: (format: ExportFormatKey) => void;
  className?: string;
  style?: CSSProperties;
}

const PAGE: CSSProperties = {
  maxWidth: 600,
  margin: "0 auto",
  padding: "26px 24px 48px",
};

const SECTION_LABEL: CSSProperties = {
  fontFamily: "var(--font-ui)",
  fontSize: 10.5,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  color: "var(--ink-mute)",
  marginBottom: 10,
};

const PREAMBLE_STYLE: CSSProperties = {
  fontFamily: "var(--font-serif)",
  fontSize: 14.5,
  color: "var(--ink-soft)",
  lineHeight: 1.6,
  margin: "0 0 24px",
};

function CheckIcon({ color }: { color: string }) {
  return (
    <span
      style={{
        display: "flex",
        color,
        flex: "none",
        marginTop: 3,
      }}
      aria-hidden="true"
    >
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M20 6L9 17l-5-5" />
      </svg>
    </span>
  );
}

function CrossIcon() {
  return (
    <span
      style={{ display: "flex", flex: "none", marginTop: 3 }}
      aria-hidden="true"
    >
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      >
        <path d="M6 6l12 12M18 6L6 18" />
      </svg>
    </span>
  );
}

function CircleCheckIcon() {
  return (
    <span
      style={{
        display: "flex",
        color: "var(--peer-ok)",
        flex: "none",
        marginTop: 1,
      }}
      aria-hidden="true"
    >
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="12" r="9" />
        <path d="M8 12.5l2.5 2.5L16 9" />
      </svg>
    </span>
  );
}

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

export function DataExportRequestSurface({
  email,
  initialFormat = "both",
  requested = false,
  busy = false,
  onSubmit,
  className,
  style,
}: DataExportRequestSurfaceProps) {
  const [format, setFormat] = useState<ExportFormatKey>(initialFormat);

  const submitDisabled = requested || busy;

  return (
    <div className={className} style={{ ...PAGE, ...style }}>
      {requested ? (
        <div
          role="status"
          style={{
            display: "flex",
            gap: 13,
            padding: "18px 20px",
            borderWidth: 1,
            borderStyle: "solid",
            borderColor: "var(--peer-ok-border)",
            borderRadius: "var(--r-lg)",
            background: "var(--peer-ok-soft)",
            marginBottom: 24,
          }}
        >
          <CircleCheckIcon />
          <div>
            <div
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 17,
                color: "var(--ink)",
              }}
            >
              {REQUEST_RECEIVED_TITLE}
            </div>
            <div
              style={{
                fontFamily: "var(--font-serif)",
                fontSize: 14,
                color: "var(--ink-soft)",
                marginTop: 3,
                lineHeight: 1.5,
              }}
            >
              An email with download links will arrive at{" "}
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 12.5,
                }}
              >
                {email}
              </span>{" "}
              within 24 hours. The links expire 7 days after they arrive.
              You can close this page.
            </div>
          </div>
        </div>
      ) : null}

      <p style={PREAMBLE_STYLE}>{PREAMBLE}</p>

      <div style={SECTION_LABEL}>{SECTION_HEADERS.whatsIncluded}</div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 7,
          marginBottom: 24,
        }}
      >
        {INCLUDED_ITEMS.map((item, idx) => (
          <div
            key={idx}
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 10,
              fontFamily: "var(--font-serif)",
              fontSize: 14,
              color: "var(--ink-soft)",
              lineHeight: 1.5,
            }}
          >
            <CheckIcon
              color={item.seal ? "var(--seal)" : "var(--peer-ok)"}
            />
            <span>{item.text}</span>
          </div>
        ))}
      </div>

      <div style={SECTION_LABEL}>{SECTION_HEADERS.whatsNotIncluded}</div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 7,
          marginBottom: 26,
        }}
      >
        {NOT_INCLUDED_ITEMS.map((text, idx) => (
          <div
            key={idx}
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 10,
              fontFamily: "var(--font-serif)",
              fontSize: 14,
              color: "var(--ink-mute)",
              lineHeight: 1.5,
            }}
          >
            <CrossIcon />
            <span>{text}</span>
          </div>
        ))}
      </div>

      <div
        style={{
          fontFamily: "var(--font-display)",
          fontSize: 15,
          color: "var(--ink)",
          marginBottom: 8,
        }}
      >
        {SECTION_HEADERS.format}
      </div>
      <div
        role="radiogroup"
        aria-label={SECTION_HEADERS.format}
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 8,
          marginBottom: 24,
        }}
      >
        {FORMAT_OPTIONS.map((opt) => {
          const on = format === opt.key;
          return (
            <button
              key={opt.key}
              type="button"
              role="radio"
              aria-checked={on}
              data-format={opt.key}
              onClick={() => setFormat(opt.key)}
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
                {opt.label}
              </span>
            </button>
          );
        })}
      </div>

      <div
        style={{
          padding: "15px 17px",
          borderWidth: 1,
          borderStyle: "solid",
          borderColor: "var(--line)",
          borderRadius: "var(--r-md)",
          background: "var(--bg-2)",
          marginBottom: 26,
        }}
      >
        <div
          style={{
            fontFamily: "var(--font-ui)",
            fontSize: 10.5,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: "var(--ink-mute)",
            marginBottom: 6,
          }}
        >
          {SECTION_HEADERS.delivery}
        </div>
        <div
          style={{
            fontFamily: "var(--font-serif)",
            fontSize: 14,
            color: "var(--ink)",
            lineHeight: 1.55,
          }}
        >
          An email with download links will arrive at{" "}
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 12.5,
              color: "var(--ink-soft)",
            }}
          >
            {email}
          </span>{" "}
          within 24 hours. The links expire 7 days after they arrive.
        </div>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          justifyContent: "flex-end",
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-ui)",
            fontSize: 11.5,
            color: "var(--ink-mute)",
            marginRight: "auto",
          }}
        >
          {CAUTION_LINE}
        </span>
        <button
          type="button"
          disabled={submitDisabled}
          onClick={() => onSubmit?.(format)}
          aria-label={requested ? SUBMITTED_LABEL : SUBMIT_LABEL}
          style={{
            padding: "11px 22px",
            borderRadius: "var(--r-md)",
            background: submitDisabled
              ? "var(--bg-3)"
              : "var(--accent)",
            borderWidth: 1,
            borderStyle: "solid",
            borderColor: submitDisabled
              ? "var(--line)"
              : "var(--accent)",
            color: submitDisabled
              ? "var(--ink-mute)"
              : "var(--accent-ink)",
            fontFamily: "var(--font-ui)",
            fontWeight: 700,
            fontSize: 14,
            cursor: submitDisabled ? "default" : "pointer",
            font: "inherit",
          }}
        >
          {requested ? SUBMITTED_LABEL : SUBMIT_LABEL}
        </button>
      </div>
    </div>
  );
}

// Re-export for convenience.
export { deliveryLine, requestedBannerLine };
