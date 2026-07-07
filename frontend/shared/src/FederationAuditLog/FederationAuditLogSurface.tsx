/**
 * FederationAuditLogSurface — H08 §S3 Cluster A surface 14.
 *
 * Faithful port of ``Theourgia Federation Audit Log.dc.html``.
 *
 * Honesty rules wired:
 *
 *   * **Append-only.** The surface never offers edit or delete
 *     affordances. Rows are signed and immutable on the server;
 *     this frontend filters the *view* only.
 *
 *   * **Every row carries its signed envelope.** Expanding a row
 *     reveals the full JSON of the signed federation event,
 *     `--font-mono`, so a practitioner can audit the wire form
 *     against another party's log.
 *
 *   * **Tone families colour the affect, not the verdict** (H08
 *     rule 26). Revoke is `--warn`, not `--danger`. Heartbeat /
 *     Mirror / Comment are `--remote` because they originate
 *     off-instance. Accept is `--peer-ok`. The rest are
 *     `--network`.
 *
 *   * **Time zone is disclosed in plain copy.** Times render in
 *     the practitioner's zone and the surface says so verbatim:
 *     `Times shown in your local zone ({zone})`.
 *
 *   * **Filters are opt-in.** "Show only my actions" is OFF by
 *     default — every actor is visible until filtered.
 *
 *   * **Export bundles the current filter.** The CSV is described
 *     as a CSV of signed envelopes — the export is a forensic
 *     artefact, not a marketing report.
 */

import {
  type CSSProperties,
  type ReactNode,
  useId,
  useMemo,
  useState,
} from "react";

import {
  FAL_EMPTY_BODY,
  FAL_EMPTY_TITLE,
  FAL_EVENT_KEYS,
  FAL_EVENT_TONES,
  FAL_EXPORT_BODY_SUFFIX,
  FAL_EXPORT_CTA,
  FAL_EXPORT_TITLE,
  FAL_HUB_SUFFIX,
  FAL_LABEL_ACTOR,
  FAL_LABEL_EVENT_TYPE,
  FAL_LABEL_TIME_RANGE,
  FAL_PAGE_TITLE,
  FAL_SIGNED_ENVELOPE_LABEL,
  FAL_TIME_RANGES,
  FAL_TOGGLE_MINE,
  FAL_ZONE_DISCLOSURE_PREFIX,
  FAL_ZONE_DISCLOSURE_SUFFIX,
  type FalEventKey,
  type FalEventTone,
  type FalTimeRange,
} from "./copy.js";

// ─── Data shapes ──────────────────────────────────────────────────

export interface FalActorOption {
  /** Wire DID, or "all" for the catch-all. */
  value: string;
  /** Display label, e.g. "Theophrastos (officer)" or "All actors". */
  label: string;
}

export interface FalEventRow {
  /** Stable wire id (e.g. `evt_1234`). Used for the open/closed
   *  toggle state and as a React key. */
  id: string;
  /** Display-friendly local time, e.g. `27 Jun · 14:02`. */
  time: string;
  /** Event type — drives chrome via FAL_EVENT_TONES. */
  event: FalEventKey;
  /** Actor DID — surface renders the trailing two `:`-segments. */
  actorDid: string;
  /** Sentence summary in user-facing copy. */
  summary: string;
  /** The full signed-envelope JSON for forensic inspection. The
   *  consumer renders it verbatim. */
  envelopeJson: string;
}

export interface FederationAuditLogSurfaceProps {
  hubLabel: string;
  /** IANA time zone label disclosed under the count band. */
  localZone: string;
  /** Actor select options. */
  actorOptions: readonly FalActorOption[];
  /** "Mine" filter wire — DID compared to row.actorDid. */
  mineDid: string;
  /** Rows already filtered by the consumer's time-range selection
   *  + any server-side filters. The surface owns the actor / event
   *  / mine-only filters on top of this. */
  rows: readonly FalEventRow[];
  /** Fired with the current filter triple + count. */
  onExportCsv?: (filters: {
    actor: string;
    event: "all" | FalEventKey;
    timeRange: FalTimeRange;
    mineOnly: boolean;
    count: number;
  }) => void;
  /** Fired when the consumer needs to refetch on time-range
   *  change. The surface owns no time-range logic itself. */
  onTimeRangeChange?: (timeRange: FalTimeRange) => void;
  className?: string;
  style?: CSSProperties;
}

// ─── Tone tokens ─────────────────────────────────────────────────

interface TonePalette {
  ink: string;
  bg: string;
  border: string;
}

const TONE: Record<FalEventTone, TonePalette> = {
  network: {
    ink: "var(--network)",
    bg: "var(--network-soft)",
    border: "var(--network-line)",
  },
  remote: {
    ink: "var(--remote)",
    bg: "var(--remote-soft)",
    border: "var(--remote)",
  },
  "peer-ok": {
    ink: "var(--peer-ok)",
    bg: "var(--peer-ok-soft)",
    border: "var(--peer-ok)",
  },
  warn: {
    ink: "var(--warn)",
    bg: "var(--warn-soft)",
    border: "var(--warn-border)",
  },
};

// ─── Styles ───────────────────────────────────────────────────────

const TOPBAR: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 14,
  padding: "13px 24px",
  borderBottom: "1px solid var(--line)",
  background: "var(--bg)",
};

const COLS: CSSProperties = {
  display: "flex",
  alignItems: "stretch",
  minHeight: 0,
  flex: 1,
  overflow: "hidden",
};

const RAIL: CSSProperties = {
  flex: "0 0 296px",
  minWidth: 0,
  borderRight: "1px solid var(--line)",
  background: "var(--bg-2)",
  padding: "18px 16px",
  overflowY: "auto",
};

const MAIN: CSSProperties = {
  flex: "1 1 auto",
  minWidth: 0,
  overflowY: "auto",
  padding: "20px 24px 30px",
  display: "flex",
  flexDirection: "column",
};

const RAIL_HEADING: CSSProperties = {
  fontFamily: "var(--font-ui)",
  fontSize: 10.5,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  color: "var(--ink-mute)",
  marginBottom: 9,
};

const SELECT: CSSProperties = {
  width: "100%",
  padding: "9px 11px",
  borderWidth: 1,
  borderStyle: "solid",
  borderColor: "var(--line-2)",
  borderRadius: "var(--r-md)",
  background: "var(--bg)",
  color: "var(--ink)",
  fontFamily: "var(--font-ui)",
  fontSize: 13,
};

// ─── Component ─────────────────────────────────────────────────────

export function FederationAuditLogSurface({
  hubLabel,
  localZone,
  actorOptions,
  mineDid,
  rows,
  onExportCsv,
  onTimeRangeChange,
  className,
  style,
}: FederationAuditLogSurfaceProps): ReactNode {
  const titleId = useId();
  const [actor, setActor] = useState<string>("all");
  const [event, setEvent] = useState<"all" | FalEventKey>("all");
  const [timeRange, setTimeRange] = useState<FalTimeRange>(
    "Last 7 days",
  );
  const [mineOnly, setMineOnly] = useState(false);
  const [openIds, setOpenIds] = useState<ReadonlySet<string>>(
    () => new Set(),
  );

  const filtered = useMemo(
    () =>
      rows.filter(
        (r) =>
          (actor === "all" || r.actorDid === actor) &&
          (event === "all" || r.event === event) &&
          (!mineOnly || r.actorDid === mineDid),
      ),
    [rows, actor, event, mineOnly, mineDid],
  );

  const countLabel = `${filtered.length} ${
    filtered.length === 1 ? "event" : "events"
  }`;

  const toggleOpen = (id: string) =>
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <section
      aria-labelledby={titleId}
      className={className}
      data-surface="federation-audit-log"
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
            data-field="hub-crumb"
          >
            {hubLabel}
            {FAL_HUB_SUFFIX}
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
            {FAL_PAGE_TITLE}
          </h1>
        </div>
      </header>

      <div style={COLS}>
        <aside className="scroll" style={RAIL}>
          <div style={RAIL_HEADING}>{FAL_LABEL_ACTOR}</div>
          <select
            value={actor}
            onChange={(e) => setActor(e.currentTarget.value)}
            style={{ ...SELECT, marginBottom: 18 }}
            aria-label={FAL_LABEL_ACTOR}
            data-field="actor-select"
          >
            {actorOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          <div style={RAIL_HEADING}>{FAL_LABEL_EVENT_TYPE}</div>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 6,
              marginBottom: 18,
            }}
            role="radiogroup"
            aria-label={FAL_LABEL_EVENT_TYPE}
            data-field="event-filters"
          >
            <EventChip
              label="All"
              on={event === "all"}
              onPick={() => setEvent("all")}
            />
            {FAL_EVENT_KEYS.map((k) => (
              <EventChip
                key={k}
                label={k}
                on={event === k}
                onPick={() => setEvent(k)}
              />
            ))}
          </div>

          <div style={RAIL_HEADING}>{FAL_LABEL_TIME_RANGE}</div>
          <select
            value={timeRange}
            onChange={(e) => {
              const next = e.currentTarget.value as FalTimeRange;
              setTimeRange(next);
              onTimeRangeChange?.(next);
            }}
            style={{ ...SELECT, marginBottom: 18 }}
            aria-label={FAL_LABEL_TIME_RANGE}
            data-field="time-range"
          >
            {FAL_TIME_RANGES.map((tr) => (
              <option key={tr} value={tr}>
                {tr}
              </option>
            ))}
          </select>

          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 11,
              padding: "11px 12px",
              borderWidth: 1,
              borderStyle: "solid",
              borderColor: "var(--line)",
              borderRadius: "var(--r-md)",
              background: "var(--bg)",
              cursor: "pointer",
            }}
          >
            <button
              type="button"
              role="switch"
              aria-checked={mineOnly}
              onClick={() => setMineOnly((v) => !v)}
              data-field="mine-only-switch"
              style={{
                position: "relative",
                width: 38,
                height: 22,
                borderRadius: 12,
                background: mineOnly
                  ? "var(--accent)"
                  : "var(--bg-3)",
                borderWidth: 1,
                borderStyle: "solid",
                borderColor: mineOnly
                  ? "var(--accent)"
                  : "var(--line-2)",
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
                  left: mineOnly ? 18 : 2,
                  width: 16,
                  height: 16,
                  borderRadius: "50%",
                  background: mineOnly
                    ? "var(--accent-ink)"
                    : "var(--ink-mute)",
                  transition: "left .18s ease",
                }}
              />
            </button>
            <span
              style={{
                fontFamily: "var(--font-ui)",
                fontSize: 13,
                color: "var(--ink-soft)",
              }}
            >
              {FAL_TOGGLE_MINE}
            </span>
          </label>
        </aside>

        <div className="scroll" style={MAIN}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              maxWidth: 920,
              marginBottom: 14,
            }}
          >
            <div
              style={{
                fontFamily: "var(--font-ui)",
                fontSize: 12.5,
                color: "var(--ink-mute)",
              }}
              data-field="count-label"
            >
              {countLabel}
            </div>
            <div
              style={{
                marginLeft: "auto",
                fontFamily: "var(--font-ui)",
                fontSize: 11,
                color: "var(--ink-mute)",
              }}
              data-field="zone-disclosure"
            >
              {FAL_ZONE_DISCLOSURE_PREFIX}
              {localZone}
              {FAL_ZONE_DISCLOSURE_SUFFIX}
            </div>
          </div>

          {filtered.length > 0 ? (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 7,
                maxWidth: 920,
              }}
              data-field="rows"
            >
              {filtered.map((row) => (
                <EventRow
                  key={row.id}
                  row={row}
                  open={openIds.has(row.id)}
                  onToggle={() => toggleOpen(row.id)}
                />
              ))}
            </div>
          ) : (
            <div
              data-field="empty-state"
              style={{
                maxWidth: 920,
                marginTop: 14,
                padding: 34,
                borderWidth: 1,
                borderStyle: "dashed",
                borderColor: "var(--line-2)",
                borderRadius: "var(--r-lg)",
                textAlign: "center",
              }}
            >
              <div
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: 18,
                  color: "var(--ink)",
                  marginBottom: 5,
                }}
              >
                {FAL_EMPTY_TITLE}
              </div>
              <div
                style={{
                  fontFamily: "var(--font-ui)",
                  fontSize: 13,
                  color: "var(--ink-mute)",
                }}
              >
                {FAL_EMPTY_BODY}
              </div>
            </div>
          )}

          <div
            data-field="export-band"
            style={{
              maxWidth: 920,
              marginTop: 22,
              padding: "15px 18px",
              borderWidth: 1,
              borderStyle: "solid",
              borderColor: "var(--line)",
              borderRadius: "var(--r-md)",
              background: "var(--bg-2)",
              display: "flex",
              alignItems: "center",
              gap: 14,
              flexWrap: "wrap",
            }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: 16,
                  color: "var(--ink)",
                }}
              >
                {FAL_EXPORT_TITLE}
              </div>
              <div
                style={{
                  fontFamily: "var(--font-ui)",
                  fontSize: 12,
                  color: "var(--ink-mute)",
                }}
                data-field="export-body"
              >
                {countLabel}
                {FAL_EXPORT_BODY_SUFFIX}
              </div>
            </div>
            <button
              type="button"
              onClick={() =>
                onExportCsv?.({
                  actor,
                  event,
                  timeRange,
                  mineOnly,
                  count: filtered.length,
                })
              }
              data-action="export-csv"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "9px 16px",
                borderWidth: 1,
                borderStyle: "solid",
                borderColor: "var(--line-2)",
                borderRadius: "var(--r-md)",
                background: "transparent",
                fontFamily: "var(--font-ui)",
                fontSize: 13,
                color: "var(--ink-soft)",
                cursor: "pointer",
              }}
            >
              <svg
                width={15}
                height={15}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.6}
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M12 4v11M8 11l4 4 4-4M5 19h14" />
              </svg>
              {FAL_EXPORT_CTA}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── EventChip ───────────────────────────────────────────────────

function EventChip({
  label,
  on,
  onPick,
}: {
  label: string;
  on: boolean;
  onPick: () => void;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={on}
      onClick={onPick}
      data-event-filter={label}
      data-on={on}
      style={{
        padding: "5px 10px",
        borderRadius: 20,
        borderWidth: 1,
        borderStyle: "solid",
        borderColor: on ? "var(--line-2)" : "var(--line)",
        background: on ? "var(--accent-soft)" : "var(--bg)",
        fontFamily: "var(--font-ui)",
        fontSize: 11.5,
        color: on ? "var(--ink)" : "var(--ink-soft)",
        cursor: "pointer",
      }}
    >
      {label}
    </button>
  );
}

// ─── EventRow ────────────────────────────────────────────────────

function EventRow({
  row,
  open,
  onToggle,
}: {
  row: FalEventRow;
  open: boolean;
  onToggle: () => void;
}) {
  const tone = TONE[FAL_EVENT_TONES[row.event]];
  const actorShort = row.actorDid.split(":").slice(-2).join(":");

  return (
    <div
      data-row-id={row.id}
      data-event={row.event}
      style={{
        borderWidth: 1,
        borderStyle: "solid",
        borderColor: "var(--line)",
        borderRadius: "var(--r-md)",
        background: "var(--bg-2)",
        overflow: "hidden",
      }}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        data-action="toggle-row"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 13,
          width: "100%",
          padding: "13px 15px",
          textAlign: "left",
          background: "transparent",
          border: "none",
          cursor: "pointer",
          color: "var(--ink)",
        }}
      >
        <span
          aria-hidden="true"
          style={{
            display: "flex",
            color: "var(--ink-mute)",
            flex: "none",
            transform: open ? "rotate(90deg)" : "none",
            transition: "transform .18s ease",
          }}
        >
          <svg
            width={13}
            height={13}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.8}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M9 6l6 6-6 6" />
          </svg>
        </span>
        <span
          data-field="row-time"
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 12,
            color: "var(--ink-mute)",
            flex: "none",
            width: 118,
          }}
        >
          {row.time}
        </span>
        <span
          data-field="row-event-chip"
          data-tone={FAL_EVENT_TONES[row.event]}
          style={{
            display: "inline-flex",
            alignItems: "center",
            padding: "2px 10px",
            borderWidth: 1,
            borderStyle: "solid",
            borderColor: tone.border,
            borderRadius: 20,
            background: tone.bg,
            fontFamily: "var(--font-ui)",
            fontSize: 11,
            color: tone.ink,
            flex: "none",
          }}
        >
          {row.event}
        </span>
        <span
          data-field="row-summary"
          style={{
            flex: 1,
            minWidth: 0,
            fontFamily: "var(--font-serif)",
            fontSize: 14,
            color: "var(--ink)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {row.summary}
        </span>
        <span
          data-field="row-actor-short"
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            color: "var(--ink-mute)",
            flex: "none",
            maxWidth: 220,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {actorShort}
        </span>
      </button>
      {open ? (
        <div
          style={{
            padding: "4px 16px 16px 46px",
            borderTop: "1px solid var(--line)",
          }}
        >
          <div
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: 10.5,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "var(--ink-mute)",
              margin: "12px 0 7px",
            }}
          >
            {FAL_SIGNED_ENVELOPE_LABEL}
          </div>
          <pre
            data-field="row-envelope"
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
              lineHeight: 1.65,
              color: "var(--ink-soft)",
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
            }}
          >
            {row.envelopeJson}
          </pre>
        </div>
      ) : null}
    </div>
  );
}
