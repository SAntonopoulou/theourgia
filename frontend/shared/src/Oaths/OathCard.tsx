/**
 * OathCard — one oath in the Oaths grid.
 *
 * Per `Theourgia Oaths.dc.html`. Each card shows:
 *   - title + meta (recipient · taken-at · renewal cadence)
 *   - status pill (OathStatusPill)
 *   - sealed-or-text body: either the italic vow text, or a sealed
 *     CTA block that prompts the user to unlock the vault.
 *   - optional checkpoint footer with a due-time hint and Review →.
 *
 * Sealed-by-default: oaths default to `sealed: true`. When sealed +
 * not unlocked-for-this-session, the body renders the sealed CTA
 * (composes the same --seal palette as B52's SealUnlock). When
 * unlocked, the body shows the verbatim vow text.
 */

import { type CSSProperties } from "react";

import { OathStatusPill, type OathStatus } from "./OathStatusPill.js";

export interface OathRecord {
  id: string;
  title: string;
  /** "To whom · taken N June 2026 · monthly". */
  meta: string;
  status: OathStatus;
  /** True if the oath is sealed (encrypted at rest). */
  sealed: boolean;
  /** Verbatim vow text — only rendered when sealed=false OR unlockedForSession. */
  text?: string;
  /** Optional checkpoint due hint ("Due in 3 days"). */
  checkpointDue?: string;
  /** When true, the checkpoint due hint renders in --warn (overdue). */
  checkpointOverdue?: boolean;
}

export interface OathCardProps {
  oath: OathRecord;
  /** True if the vault is currently unlocked for this session. */
  unlockedForSession?: boolean;
  /** Called when the user clicks the sealed CTA. The surface owns the
   *  SealUnlock dialog and the unlock policy. */
  onRequestUnlock?: () => void;
  /** Called when the user clicks "Review →" on a checkpoint. */
  onReviewCheckpoint?: () => void;
  className?: string;
  style?: CSSProperties;
}

function LockGlyph() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      aria-hidden="true"
    >
      <rect x={5} y={11} width={14} height={9} rx={1.5} />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </svg>
  );
}

function ClockIcon({ color }: { color: string }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx={12} cy={12} r={9} />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

function SealedCTA({ onClick }: { onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-sealed-cta
      style={{
        marginTop: 13,
        width: "100%",
        display: "flex",
        alignItems: "center",
        gap: 11,
        padding: 14,
        borderWidth: 1,
        borderStyle: "dashed",
        borderColor: "var(--seal-border)",
        borderRadius: "var(--r-md, 8px)",
        background: "var(--seal-soft)",
        textAlign: "left",
        cursor: "pointer",
      }}
    >
      <span
        aria-hidden="true"
        style={{
          width: 32,
          height: 32,
          flex: "none",
          borderRadius: 8,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--seal)",
          background: "var(--bg-sunk)",
        }}
      >
        <LockGlyph />
      </span>
      <span>
        <span
          style={{
            display: "block",
            fontFamily: "var(--font-ui)",
            fontSize: 12.5,
            color: "var(--ink)",
          }}
        >
          Sealed — tap to read
        </span>
        <span
          style={{
            display: "block",
            fontFamily: "var(--font-ui)",
            fontSize: 11,
            color: "var(--ink-mute)",
            marginTop: 1,
          }}
        >
          Only on a device with your passphrase
        </span>
      </span>
    </button>
  );
}

function SealedBadge() {
  return (
    <span
      data-sealed-badge
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "2px 8px",
        borderRadius: 999,
        background: "var(--seal-soft)",
        borderWidth: 1,
        borderStyle: "solid",
        borderColor: "var(--seal-border)",
        fontFamily: "var(--font-ui)",
        fontSize: 10.5,
        color: "var(--seal)",
      }}
    >
      <span style={{ display: "flex" }}>
        <LockGlyph />
      </span>
      Sealed
    </span>
  );
}

export function OathCard({
  oath,
  unlockedForSession = false,
  onRequestUnlock,
  onReviewCheckpoint,
  className,
  style,
}: OathCardProps) {
  const showText = !oath.sealed || unlockedForSession;
  const cpColor = oath.checkpointOverdue
    ? "var(--warn)"
    : "var(--accent)";

  return (
    <article
      className={className}
      data-component="oath-card"
      data-oath-id={oath.id}
      data-oath-status={oath.status}
      data-oath-sealed={oath.sealed ? "true" : "false"}
      data-oath-unlocked={unlockedForSession ? "true" : "false"}
      style={{
        padding: "16px 17px",
        borderWidth: 1,
        borderStyle: "solid",
        borderColor: "var(--line)",
        borderRadius: "var(--r-lg, 14px)",
        background: "var(--bg-2)",
        ...style,
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: 11 }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 18,
              lineHeight: 1.2,
              color: "var(--ink)",
            }}
          >
            {oath.title}
          </div>
          <div
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: 11.5,
              color: "var(--ink-mute)",
              marginTop: 3,
            }}
          >
            {oath.meta}
          </div>
        </div>
        <OathStatusPill status={oath.status} />
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginTop: 11,
        }}
      >
        {oath.sealed ? <SealedBadge /> : null}
      </div>

      {showText && oath.text ? (
        <p
          data-vow-text
          style={{
            margin: "13px 0 0",
            fontFamily: "var(--font-serif)",
            fontSize: 14.5,
            lineHeight: 1.6,
            color: "var(--ink-soft)",
            fontStyle: "italic",
          }}
        >
          {oath.text}
        </p>
      ) : null}
      {!showText && oath.sealed ? (
        <SealedCTA onClick={onRequestUnlock} />
      ) : null}

      {oath.checkpointDue ? (
        <div
          data-checkpoint
          data-overdue={oath.checkpointOverdue ? "true" : "false"}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 9,
            marginTop: 13,
            paddingTop: 12,
            borderTop: "1px solid var(--line)",
          }}
        >
          <ClockIcon color={cpColor} />
          <span
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: 12,
              color: "var(--ink-soft)",
            }}
          >
            {oath.checkpointDue}
          </span>
          {onReviewCheckpoint ? (
            <button
              type="button"
              onClick={onReviewCheckpoint}
              data-review-checkpoint
              style={{
                marginLeft: "auto",
                fontFamily: "var(--font-ui)",
                fontSize: 11.5,
                color: "var(--accent)",
                background: "transparent",
                border: "none",
                cursor: "pointer",
              }}
            >
              Review →
            </button>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}

