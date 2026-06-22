/**
 * TodayLedgerCards — render the four Phase-05 Today rail cards from a
 * `TodayLedger` payload.
 *
 * The cards are intentionally compact (each card sits in the right
 * rail of the Today surface):
 *
 *   1. Active practices — recurring offerings due in ≤ 24h.
 *   2. Obligations — overdue contract obligations + oath checkpoints.
 *      Sealed checkpoints render count-only (zero plaintext leak).
 *   3. Servitor feeding — servitors whose cadence has elapsed.
 *   4. Attestation activity — recent counter-sign / revocation events.
 *
 * Tone discipline carries over: no red/danger anywhere — overdue items
 * use `--warn` (amber), the sealed callout uses care/seal palette.
 *
 * The composer is presentational: it consumes a `TodayLedger` payload
 * and an optional `formatRelative(iso)` helper for "in 4 hours" /
 * "6 days ago" — the admin app supplies its own time-zone aware
 * formatter rather than baking one into the design kit.
 */

import { type CSSProperties } from "react";

import type {
  TodayActivePractice,
  TodayAttestationActivity,
  TodayContractObligationDue,
  TodayLedger,
  TodayOathCheckpointDue,
  TodayServitorFeedingDue,
} from "../api/types.js";

export interface TodayLedgerCardsProps {
  ledger: TodayLedger;
  /** Format an ISO timestamp as a short relative string. Required for
   *  the "in N hours" / "N days ago" hints. */
  formatRelative: (iso: string) => string;
  className?: string;
  style?: CSSProperties;
}

// ─── Card chrome ──────────────────────────────────────────────────

const CARD: CSSProperties = {
  background: "var(--bg-2)",
  borderWidth: 1,
  borderStyle: "solid",
  borderColor: "var(--line)",
  borderRadius: "var(--r-lg, 12px)",
  padding: "14px 16px",
  display: "flex",
  flexDirection: "column",
  gap: 10,
};

const CARD_TITLE: CSSProperties = {
  margin: 0,
  fontFamily: "var(--font-ui)",
  fontSize: 10.5,
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  color: "var(--ink-mute)",
};

const EMPTY: CSSProperties = {
  fontFamily: "var(--font-serif)",
  fontSize: 13.5,
  color: "var(--ink-mute)",
  lineHeight: 1.5,
};

const ROW: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 2,
};

const ROW_TITLE: CSSProperties = {
  fontFamily: "var(--font-display)",
  fontSize: 14.5,
  color: "var(--ink)",
  lineHeight: 1.25,
};

const ROW_META: CSSProperties = {
  fontFamily: "var(--font-ui)",
  fontSize: 11.5,
  color: "var(--ink-mute)",
};

// ─── Children ─────────────────────────────────────────────────────

function ActivePracticeRow({
  practice,
  formatRelative,
}: {
  practice: TodayActivePractice;
  formatRelative: (iso: string) => string;
}) {
  const dueLabel = practice.next_due_at
    ? formatRelative(practice.next_due_at)
    : "No due time";
  return (
    <li style={ROW} data-row-id={practice.recurring_offering_id}>
      <span style={ROW_TITLE}>{practice.label}</span>
      <span style={ROW_META}>
        {practice.cadence} · Due {dueLabel}
      </span>
    </li>
  );
}

function ContractObligationRow({
  obligation,
  formatRelative,
}: {
  obligation: TodayContractObligationDue;
  formatRelative: (iso: string) => string;
}) {
  const dueLabel = obligation.due_at
    ? formatRelative(obligation.due_at)
    : "No due date";
  return (
    <li style={ROW} data-row-id={obligation.obligation_id}>
      <span style={ROW_TITLE}>{obligation.contract_title}</span>
      <span style={ROW_META}>
        {obligation.description} · {dueLabel}
      </span>
    </li>
  );
}

function OathCheckpointRow({
  checkpoint,
  formatRelative,
}: {
  checkpoint: TodayOathCheckpointDue;
  formatRelative: (iso: string) => string;
}) {
  const dueLabel = formatRelative(checkpoint.due_at);
  return (
    <li style={ROW} data-row-id={checkpoint.oath_id}>
      <span style={ROW_TITLE}>
        {checkpoint.prompt ?? "Sealed oath checkpoint"}
      </span>
      <span style={ROW_META}>
        Due {dueLabel}
        {checkpoint.recipient ? ` · ${checkpoint.recipient}` : ""}
      </span>
    </li>
  );
}

function ServitorFeedingRow({
  feeding,
  formatRelative,
}: {
  feeding: TodayServitorFeedingDue;
  formatRelative: (iso: string) => string;
}) {
  const lastFedLabel = feeding.last_fed_at
    ? `Last fed ${formatRelative(feeding.last_fed_at)}`
    : "Never fed";
  return (
    <li style={ROW} data-row-id={feeding.servitor_id}>
      <span style={ROW_TITLE}>{feeding.name}</span>
      <span style={ROW_META}>
        {feeding.feeding_cadence ?? feeding.kind} · {lastFedLabel}
      </span>
    </li>
  );
}

function AttestationActivityRow({
  activity,
  formatRelative,
}: {
  activity: TodayAttestationActivity;
  formatRelative: (iso: string) => string;
}) {
  return (
    <li style={ROW} data-row-id={activity.attestation_id}>
      <span style={ROW_TITLE}>{activity.description}</span>
      <span style={ROW_META}>
        {activity.signer_label} · {activity.role} ·{" "}
        {formatRelative(activity.signed_at)}
      </span>
    </li>
  );
}

// ─── Composer ─────────────────────────────────────────────────────

export function TodayLedgerCards({
  ledger,
  formatRelative,
  className,
  style,
}: TodayLedgerCardsProps) {
  const { active_practices, obligations, servitor_feeding, attestation_activity } =
    ledger;

  return (
    <div
      className={className}
      data-component="today-ledger-cards"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 18,
        ...style,
      }}
    >
      {/* 1 — Active practices */}
      <section style={CARD} data-card="active-practices">
        <h3 style={CARD_TITLE}>Active practices</h3>
        {active_practices.practices.length > 0 ? (
          <ul
            style={{
              listStyle: "none",
              padding: 0,
              margin: 0,
              display: "flex",
              flexDirection: "column",
              gap: 10,
            }}
          >
            {active_practices.practices.map((p) => (
              <ActivePracticeRow
                key={p.recurring_offering_id}
                practice={p}
                formatRelative={formatRelative}
              />
            ))}
          </ul>
        ) : (
          <p style={EMPTY}>Nothing recurring is due in the next 24 hours.</p>
        )}
      </section>

      {/* 2 — Obligations */}
      <section style={CARD} data-card="obligations">
        <h3 style={CARD_TITLE}>Obligations</h3>
        {obligations.contract_obligations.length === 0 &&
        obligations.oath_checkpoints.length === 0 &&
        obligations.sealed_checkpoint_count === 0 ? (
          <p style={EMPTY}>No overdue obligations.</p>
        ) : (
          <ul
            style={{
              listStyle: "none",
              padding: 0,
              margin: 0,
              display: "flex",
              flexDirection: "column",
              gap: 10,
            }}
          >
            {obligations.contract_obligations.map((o) => (
              <ContractObligationRow
                key={o.obligation_id}
                obligation={o}
                formatRelative={formatRelative}
              />
            ))}
            {obligations.oath_checkpoints.map((c) => (
              <OathCheckpointRow
                key={c.oath_id}
                checkpoint={c}
                formatRelative={formatRelative}
              />
            ))}
          </ul>
        )}
        {obligations.sealed_checkpoint_count > 0 ? (
          <p
            data-sealed-callout
            style={{
              margin: 0,
              padding: "8px 11px",
              borderRadius: "var(--r-md, 8px)",
              background: "var(--seal-soft)",
              borderWidth: 1,
              borderStyle: "solid",
              borderColor: "var(--seal-border)",
              fontFamily: "var(--font-ui)",
              fontSize: 12,
              color: "var(--ink-soft)",
              lineHeight: 1.5,
            }}
          >
            {obligations.sealed_checkpoint_count} sealed checkpoint
            {obligations.sealed_checkpoint_count === 1 ? "" : "s"} due —
            unlock the vault to review.
          </p>
        ) : null}
      </section>

      {/* 3 — Servitor feeding */}
      <section style={CARD} data-card="servitor-feeding">
        <h3 style={CARD_TITLE}>Servitor feeding</h3>
        {servitor_feeding.feedings_due.length > 0 ? (
          <ul
            style={{
              listStyle: "none",
              padding: 0,
              margin: 0,
              display: "flex",
              flexDirection: "column",
              gap: 10,
            }}
          >
            {servitor_feeding.feedings_due.map((f) => (
              <ServitorFeedingRow
                key={f.servitor_id}
                feeding={f}
                formatRelative={formatRelative}
              />
            ))}
          </ul>
        ) : (
          <p style={EMPTY}>All servitor cadences are current.</p>
        )}
      </section>

      {/* 4 — Attestation activity */}
      <section style={CARD} data-card="attestation-activity">
        <h3 style={CARD_TITLE}>Attestation activity</h3>
        {attestation_activity.activity.length > 0 ? (
          <ul
            style={{
              listStyle: "none",
              padding: 0,
              margin: 0,
              display: "flex",
              flexDirection: "column",
              gap: 10,
            }}
          >
            {attestation_activity.activity.map((a) => (
              <AttestationActivityRow
                key={`${a.attestation_id}-${a.signed_at}`}
                activity={a}
                formatRelative={formatRelative}
              />
            ))}
          </ul>
        ) : (
          <p style={EMPTY}>No recent signing or revocation activity.</p>
        )}
      </section>
    </div>
  );
}
