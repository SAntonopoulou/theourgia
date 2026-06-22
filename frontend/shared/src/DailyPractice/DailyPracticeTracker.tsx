/**
 * DailyPracticeTracker — Tier 1 surface (Daily Practice).
 *
 * Verbatim composition of the populated + empty + drawer states from
 * `Theourgia Daily Practice Tracker.dc.html`. The component is
 * presentation-only: callers supply the practitioner's data and the
 * action handlers. Header / VaultNav / topbar live one level up in
 * the AppShell.
 *
 * Per H04 §S3.4 ("quiet streaks") + §S3.1 (tone): no gamification,
 * no red, skipped days are information. The wellbeing copy lives in
 * `copy.ts` and is referenced here.
 */

import { type CSSProperties, type ReactNode, useState } from "react";

import type { CompletionStatus, TodayStatus } from "../practice/index.js";
import {
  EMPTY_STATE_BODY,
  EMPTY_STATE_CTA,
  EMPTY_STATE_TITLE,
} from "./copy.js";
import {
  DefinePracticeDrawer,
  type DefinePracticeDrawerProps,
  type DefinePracticeDraft,
} from "./DefinePracticeDrawer.js";
import { PracticeCard } from "./PracticeCard.js";
import { TodayStatusChip } from "./TodayStatusChip.js";

export interface DailyPractice {
  id: string;
  name: string;
  cadenceHuman: string;
  intention?: string | null;
  entity?: { name: string; glyph: string } | null;
  status: TodayStatus;
  streak: number;
  streakLabel: string;
  history: readonly CompletionStatus[];
}

export interface DailyPracticeTrackerProps {
  /** The practitioner's daily practices. Empty array → empty state. */
  practices: readonly DailyPractice[];
  /** Optional long-format today date shown on the Today band
   *  ("Sunday, 22 June 2026"). Caller supplies a locale-aware string. */
  todayLong?: string;
  /** Optional planetary-hour chip text (e.g. "Saturn — 13:42"). */
  hourChip?: string;
  /** Defaults to true; pass false to hide the Liber Resh reference
   *  card (e.g. when the practitioner has dismissed it). */
  showLiberResh?: boolean;
  /** Optional href for the Liber Resh "Open tracker →" link. */
  liberReshHref?: string;
  /** Optional callback for the Liber Resh card click (overrides href). */
  onOpenLiberResh?: () => void;
  /** Optional list of beings to populate the drawer's linked-being
   *  select. */
  beings?: readonly string[];

  onComplete?: (practiceId: string) => void;
  onSkip?: (practiceId: string) => void;
  onReset?: (practiceId: string) => void;
  /** Called when the user saves the Define Practice drawer. */
  onDefine?: (draft: DefinePracticeDraft) => void;

  className?: string;
  style?: CSSProperties;
}

const PAGE_STYLE: CSSProperties = {
  maxWidth: 1040,
  margin: "0 auto",
  padding: "28px 28px 60px",
};

const SECTION_HEADER_BTN: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  padding: "9px 16px",
  borderRadius: "var(--r-md)",
  borderWidth: 1,
  borderStyle: "solid",
  borderColor: "var(--line-2)",
  fontFamily: "var(--font-ui)",
  fontSize: 13,
  color: "var(--ink-soft)",
  background: "transparent",
  cursor: "pointer",
};

const PLUS_ICON: ReactNode = (
  <svg
    width={15}
    height={15}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.6}
    strokeLinecap="round"
    aria-hidden="true"
  >
    <path d="M12 5v14M5 12h14" />
  </svg>
);

const SUN_GLYPH: ReactNode = (
  <span
    style={{
      width: 38,
      height: 38,
      borderRadius: "50%",
      borderWidth: 1,
      borderStyle: "solid",
      borderColor: "var(--accent)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      flex: "none",
      color: "var(--accent)",
    }}
    aria-hidden="true"
  >
    <svg
      width={20}
      height={20}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.4}
      strokeLinecap="round"
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2.5v2.5M12 19v2.5M2.5 12H5M19 12h2.5M5.2 5.2l1.8 1.8M17 17l1.8 1.8M18.8 5.2L17 7M7 17l-1.8 1.8" />
    </svg>
  </span>
);

const TARGET_ICON: ReactNode = (
  <span
    style={{
      width: 72,
      height: 72,
      margin: "0 auto 22px",
      borderRadius: "50%",
      borderWidth: 1,
      borderStyle: "solid",
      borderColor: "var(--line-2)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      color: "var(--ink-mute)",
    }}
    aria-hidden="true"
  >
    <svg
      width={34}
      height={34}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.3}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5 15a7 7 0 0 1 14 0" />
      <path d="M3.5 19h17M12 3v5M9 6l3-3 3 3" />
    </svg>
  </span>
);

export function DailyPracticeTracker({
  practices,
  todayLong,
  hourChip,
  showLiberResh = true,
  liberReshHref,
  onOpenLiberResh,
  beings,
  onComplete,
  onSkip,
  onReset,
  onDefine,
  className,
  style,
}: DailyPracticeTrackerProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const isEmpty = practices.length === 0;

  const handleSave: DefinePracticeDrawerProps["onSave"] = (draft) => {
    onDefine?.(draft);
    setDrawerOpen(false);
  };

  return (
    <div
      data-component="daily-practice-tracker"
      data-state={isEmpty ? "empty" : "populated"}
      className={className}
      style={style}
    >
      <div style={PAGE_STYLE}>
        {isEmpty ? (
          <div
            data-empty
            style={{
              maxWidth: 560,
              margin: "8vh auto 0",
              textAlign: "center",
            }}
          >
            {TARGET_ICON}
            <h2
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 26,
                margin: "0 0 12px",
              }}
            >
              {EMPTY_STATE_TITLE}
            </h2>
            <p
              style={{
                fontFamily: "var(--font-serif)",
                fontSize: 16,
                lineHeight: 1.6,
                color: "var(--ink-soft)",
                margin: "0 0 26px",
              }}
            >
              {EMPTY_STATE_BODY}
            </p>
            <button
              type="button"
              data-action="define-first"
              onClick={() => setDrawerOpen(true)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 9,
                padding: "12px 24px",
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
              {PLUS_ICON}
              {EMPTY_STATE_CTA}
            </button>
          </div>
        ) : (
          <>
            {/* Today band */}
            {todayLong ? (
              <section
                data-today-band
                aria-label="Today"
                style={{
                  borderWidth: 1,
                  borderStyle: "solid",
                  borderColor: "var(--line-2)",
                  borderRadius: "var(--r-lg)",
                  background:
                    "linear-gradient(180deg, var(--bg-2), var(--bg))",
                  padding: "20px 24px",
                  marginBottom: 26,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-end",
                    justifyContent: "space-between",
                    gap: 16,
                    flexWrap: "wrap",
                    marginBottom: 16,
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontFamily: "var(--font-ui)",
                        fontSize: 11,
                        letterSpacing: "0.16em",
                        textTransform: "uppercase",
                        color: "var(--ink-mute)",
                        marginBottom: 5,
                      }}
                    >
                      Today
                    </div>
                    <div
                      style={{
                        fontFamily: "var(--font-display)",
                        fontSize: 24,
                        lineHeight: 1.1,
                      }}
                    >
                      {todayLong}
                    </div>
                  </div>
                  {hourChip ? (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        padding: "7px 13px",
                        borderWidth: 1,
                        borderStyle: "solid",
                        borderColor: "var(--line)",
                        borderRadius: "var(--r-pill, 20px)",
                        background: "var(--bg)",
                        fontFamily: "var(--font-ui)",
                        fontSize: 12.5,
                        color: "var(--ink-soft)",
                      }}
                    >
                      <span
                        style={{
                          fontFamily: "var(--font-glyph)",
                          color: "var(--accent)",
                        }}
                        aria-hidden="true"
                      >
                        ☉
                      </span>
                      {hourChip}
                    </div>
                  ) : null}
                </div>
                <div
                  style={{
                    display: "flex",
                    gap: 10,
                    flexWrap: "wrap",
                  }}
                >
                  {practices.map((p) => (
                    <TodayStatusChip
                      key={p.id}
                      name={p.name}
                      status={p.status}
                    />
                  ))}
                </div>
              </section>
            ) : null}

            {/* Liber Resh reference */}
            {showLiberResh ? (
              <a
                data-liber-resh-ref
                href={liberReshHref ?? "#"}
                onClick={
                  onOpenLiberResh
                    ? (e) => {
                        e.preventDefault();
                        onOpenLiberResh();
                      }
                    : undefined
                }
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  padding: "14px 18px",
                  borderWidth: 1,
                  borderStyle: "solid",
                  borderColor: "var(--line)",
                  borderRadius: "var(--r-md)",
                  background: "var(--bg-2)",
                  marginBottom: 26,
                  textDecoration: "none",
                  color: "var(--ink)",
                }}
              >
                {SUN_GLYPH}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontFamily: "var(--font-display)",
                      fontSize: 17,
                    }}
                  >
                    Liber Resh — solar adoration
                  </div>
                  <div
                    style={{
                      fontFamily: "var(--font-ui)",
                      fontSize: 12.5,
                      color: "var(--ink-mute)",
                    }}
                  >
                    A tradition practice with its own four-station tracker.
                    It shares the Today rail with these.
                  </div>
                </div>
                <span
                  style={{
                    fontFamily: "var(--font-ui)",
                    fontSize: 12.5,
                    color: "var(--ink-soft)",
                    whiteSpace: "nowrap",
                  }}
                >
                  Open tracker →
                </span>
              </a>
            ) : null}

            {/* Your practices header */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 14,
                marginBottom: 14,
              }}
            >
              <h2
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: 18,
                  margin: 0,
                  color: "var(--ink-soft)",
                }}
              >
                Your practices
              </h2>
              <button
                type="button"
                data-action="define"
                onClick={() => setDrawerOpen(true)}
                style={SECTION_HEADER_BTN}
              >
                {PLUS_ICON}
                Define a practice
              </button>
            </div>

            {/* Practice list */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 18,
              }}
            >
              {practices.map((p) => (
                <PracticeCard
                  key={p.id}
                  id={p.id}
                  name={p.name}
                  cadenceHuman={p.cadenceHuman}
                  intention={p.intention ?? undefined}
                  entity={p.entity ?? null}
                  status={p.status}
                  streak={p.streak}
                  streakLabel={p.streakLabel}
                  history={p.history}
                  onComplete={onComplete}
                  onSkip={onSkip}
                  onReset={onReset}
                />
              ))}
            </div>
          </>
        )}
      </div>

      <DefinePracticeDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onSave={handleSave}
        beings={beings}
      />
    </div>
  );
}
