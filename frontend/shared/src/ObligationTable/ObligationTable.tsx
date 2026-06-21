/**
 * ObligationTable — two-column "What I promised" | "What they
 * promised" for the Contracts surface, with inline fulfill confirms.
 *
 * Per Theourgia Contracts.dc.html: each obligation is a card with a
 * status pill (using --ob-* tokens), due-relative copy, optional
 * notes, and a "Mark fulfilled" inline confirm (datetime + notes).
 *
 * The user records the OTHER party's fulfilment too — they're the
 * one who notices. Per S3.4 of the H01-H03 supplement.
 *
 * Tone: status is information, not judgment. Overdue uses --ob-overdue
 * (amber), never red. Statuses stay in entered order; colour + glyph
 * carries urgency.
 */

import { type CSSProperties, useState } from "react";

export type ObligationStatus =
  | "pending"
  | "in-progress"
  | "fulfilled"
  | "overdue"
  | "waived";

export type ObligationSide = "ours" | "theirs";

export interface Obligation {
  id: string;
  description: string;
  status: ObligationStatus;
  /** Optional ISO date — "in 3 days" / "2 weeks ago" computed by caller. */
  dueAt?: string | null;
  /** Caller-supplied due-relative string ("in 3 days" / "2 weeks ago"). */
  dueRelative?: string;
  fulfilledAt?: string | null;
  notes?: string;
}

export interface FulfillPayload {
  fulfilledAt: string;
  notes: string;
}

export interface ObligationTableProps {
  ours: readonly Obligation[];
  theirs: readonly Obligation[];
  /**
   * Fired when the user confirms an inline "Mark fulfilled" form.
   * Caller is responsible for the API call.
   */
  onFulfill: (
    side: ObligationSide,
    obligationId: string,
    payload: FulfillPayload,
  ) => void | Promise<void>;
  /** Labels for the two column headers. */
  oursLabel?: string;
  theirsLabel?: string;
  className?: string;
  style?: CSSProperties;
}

interface StatusMeta {
  label: string;
  token: string;
}

const STATUS: Record<ObligationStatus, StatusMeta> = {
  pending: { label: "Pending", token: "--ob-pending" },
  "in-progress": { label: "In progress", token: "--ob-progress" },
  fulfilled: { label: "Fulfilled", token: "--ob-fulfilled" },
  overdue: { label: "Overdue", token: "--ob-overdue" },
  waived: { label: "Waived", token: "--ob-waived" },
};

function StatusPill({ status }: { status: ObligationStatus }) {
  const meta = STATUS[status];
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "2px 9px",
        borderRadius: 999,
        fontFamily: "var(--font-ui)",
        fontSize: 10.5,
        color: "var(--ink-soft)",
        background: `color-mix(in srgb, var(${meta.token}) 14%, transparent)`,
        border: `1px solid color-mix(in srgb, var(${meta.token}) 36%, transparent)`,
      }}
      data-status={status}
    >
      <span
        aria-hidden="true"
        style={{
          width: 7,
          height: 7,
          borderRadius: "50%",
          background: `var(${meta.token})`,
        }}
      />
      {meta.label}
    </span>
  );
}

interface ObligationCardProps {
  side: ObligationSide;
  obligation: Obligation;
  onFulfill: ObligationTableProps["onFulfill"];
}

function ObligationCard({
  side,
  obligation,
  onFulfill,
}: ObligationCardProps) {
  const [fulfilling, setFulfilling] = useState(false);
  const [fulfilledAt, setFulfilledAt] = useState(() =>
    new Date().toISOString().slice(0, 16),
  );
  const [notes, setNotes] = useState("");

  const canFulfill =
    obligation.status !== "fulfilled" && obligation.status !== "waived";

  // borderWidth/Style/Color longhand because some browsers (and
  // jsdom) won't accept a `color-mix(...)` value inside the `border:`
  // shorthand. Longhand is universally accepted and round-trips
  // through inline style attribute readback.
  const cardStyle: CSSProperties = {
    borderWidth: 1,
    borderStyle: "solid",
    borderColor:
      obligation.status === "overdue"
        ? "color-mix(in srgb, var(--ob-overdue) 40%, var(--line))"
        : "var(--line)",
    borderRadius: "var(--r-md)",
    background: "var(--bg-2)",
    padding: "13px 15px",
  };

  return (
    <li style={{ listStyle: "none" }}>
      <div style={cardStyle} data-obligation-status={obligation.status}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 6,
          }}
        >
          <StatusPill status={obligation.status} />
          {obligation.dueRelative ? (
            <span
              style={{
                fontFamily: "var(--font-ui)",
                fontSize: 11,
                color: "var(--ink-mute)",
              }}
            >
              {obligation.dueRelative}
            </span>
          ) : null}
        </div>
        <p
          style={{
            margin: 0,
            fontFamily: "var(--font-serif)",
            fontSize: 14,
            color: "var(--ink)",
            lineHeight: 1.5,
          }}
        >
          {obligation.description}
        </p>
        {obligation.notes ? (
          <p
            style={{
              margin: "8px 0 0",
              fontFamily: "var(--font-ui)",
              fontSize: 12,
              color: "var(--ink-soft)",
              lineHeight: 1.5,
            }}
          >
            {obligation.notes}
          </p>
        ) : null}
        {canFulfill && !fulfilling ? (
          <button
            type="button"
            onClick={() => setFulfilling(true)}
            style={{
              marginTop: 10,
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "6px 11px",
              border: "1px solid var(--line-2)",
              borderRadius: 7,
              fontFamily: "var(--font-ui)",
              fontSize: 11.5,
              color: "var(--ink-soft)",
              background: "transparent",
              cursor: "pointer",
            }}
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.8}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M5 12l4 4 10-10" />
            </svg>
            Mark fulfilled
          </button>
        ) : null}
        {fulfilling ? (
          <div
            style={{
              marginTop: 10,
              paddingTop: 10,
              borderTop: "1px solid var(--line)",
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            <div
              style={{
                fontFamily: "var(--font-ui)",
                fontSize: 12,
                color: "var(--ink)",
              }}
            >
              Mark fulfilled?
            </div>
            <input
              type="datetime-local"
              value={fulfilledAt}
              onChange={(e) => setFulfilledAt(e.target.value)}
              aria-label="Fulfilled at"
              style={{
                border: "1px solid var(--line-2)",
                borderRadius: 6,
                background: "var(--bg-sunk)",
                padding: "7px 9px",
                fontFamily: "var(--font-ui)",
                fontSize: 12,
                color: "var(--ink)",
              }}
            />
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="A note, if any"
              aria-label="Notes"
              style={{
                border: "1px solid var(--line-2)",
                borderRadius: 6,
                background: "var(--bg-sunk)",
                padding: "8px 10px",
                fontFamily: "var(--font-serif)",
                fontSize: 13.5,
                color: "var(--ink)",
                resize: "vertical",
              }}
            />
            <div style={{ display: "flex", gap: 8 }}>
              <button
                type="button"
                onClick={() => {
                  void onFulfill(side, obligation.id, {
                    fulfilledAt: new Date(fulfilledAt).toISOString(),
                    notes,
                  });
                  setFulfilling(false);
                  setNotes("");
                }}
                style={{
                  padding: "7px 14px",
                  borderRadius: 7,
                  background: "var(--ob-fulfilled)",
                  color: "var(--accent-ink)",
                  fontFamily: "var(--font-ui)",
                  fontWeight: 700,
                  fontSize: 12,
                  border: "none",
                  cursor: "pointer",
                }}
              >
                Confirm
              </button>
              <button
                type="button"
                onClick={() => {
                  setFulfilling(false);
                  setNotes("");
                }}
                style={{
                  padding: "7px 12px",
                  border: "1px solid var(--line-2)",
                  borderRadius: 7,
                  fontFamily: "var(--font-ui)",
                  fontSize: 12,
                  color: "var(--ink-soft)",
                  background: "transparent",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </li>
  );
}

function ObligationColumn({
  heading,
  side,
  obligations,
  onFulfill,
}: {
  heading: string;
  side: ObligationSide;
  obligations: readonly Obligation[];
  onFulfill: ObligationTableProps["onFulfill"];
}) {
  return (
    <section
      aria-label={heading}
      style={{ display: "flex", flexDirection: "column", gap: 10 }}
    >
      <h3
        style={{
          margin: 0,
          fontFamily: "var(--font-ui)",
          fontSize: 10.5,
          letterSpacing: "0.16em",
          textTransform: "uppercase",
          color: "var(--ink-mute)",
        }}
      >
        {heading}
      </h3>
      {obligations.length > 0 ? (
        <ul
          style={{
            listStyle: "none",
            margin: 0,
            padding: 0,
            display: "flex",
            flexDirection: "column",
            gap: 10,
          }}
        >
          {obligations.map((ob) => (
            <ObligationCard
              key={ob.id}
              side={side}
              obligation={ob}
              onFulfill={onFulfill}
            />
          ))}
        </ul>
      ) : (
        <p
          style={{
            margin: 0,
            padding: "13px 15px",
            border: "1px dashed var(--line)",
            borderRadius: "var(--r-md)",
            fontFamily: "var(--font-ui)",
            fontSize: 12,
            color: "var(--ink-mute)",
          }}
        >
          No obligations on this side.
        </p>
      )}
    </section>
  );
}

export function ObligationTable({
  ours,
  theirs,
  onFulfill,
  oursLabel = "What I promised",
  theirsLabel = "What they promised",
  className,
  style,
}: ObligationTableProps) {
  return (
    <div
      className={className}
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: 18,
        ...style,
      }}
    >
      <ObligationColumn
        heading={oursLabel}
        side="ours"
        obligations={ours}
        onFulfill={onFulfill}
      />
      <ObligationColumn
        heading={theirsLabel}
        side="theirs"
        obligations={theirs}
        onFulfill={onFulfill}
      />
    </div>
  );
}

export { STATUS as OBLIGATION_STATUS_META };
