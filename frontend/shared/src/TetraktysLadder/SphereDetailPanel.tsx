/**
 * SphereDetailPanel — one sphere of the ladder, per
 * ``TetraktysLadder.dc.html``.
 *
 * Unlocked (current / walked): the curriculum items with kind chips,
 * dated evidence links into the journal, a complete action per open
 * item, the gate (requirements prose + required-work checklist) with
 * the pass action ONLY on the current sphere with all required items
 * done, and the sealed initiation record once the gate is passed.
 *
 * Locked: the sealed lockout — counts only, no titles. The seal
 * governs seeing and doing the work, not planning it.
 *
 * No bars, no percentages, no celebration — walking is the reward.
 */

import type { CSSProperties, ReactNode } from "react";

import type { CurriculumItemRead, SphereRead } from "../api/types.js";
import { _ } from "../i18n/index.js";
import { SERPENT_ORDER, type SphereNumber } from "../practice/tetraktys.js";
import { TETRAKTYS_STATE_LABELS } from "./TetraktysFigure.js";

export interface SphereDetailPanelProps {
  sphere: SphereRead;
  /** Href for an evidence journal entry. Default ``/editor/{id}``. */
  entryHref?: (entryId: string) => string;
  /** Fired for an open item's "Mark done" (the caller owns the
   *  evidence picker). Omit to render read-only. */
  onCompleteItem?: (item: CurriculumItemRead) => void;
  /** Pass action — rendered only when the sphere is current AND every
   *  required-for-gate item is complete (the caller may still refuse). */
  onPassGate?: () => void;
  className?: string;
  style?: CSSProperties;
}

const HEAD: CSSProperties = {
  fontFamily: "var(--font-ui)",
  fontSize: 10.5,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  color: "var(--ink-mute)",
  marginBottom: 10,
};

const STATE_COLOR = {
  current: "var(--sphere-current)",
  done: "var(--sphere-done)",
  locked: "var(--sphere-locked)",
} as const;

const STATE_SOFT = {
  current: "var(--sphere-current-soft)",
  done: "var(--sphere-done-soft)",
  locked: "transparent",
} as const;

const SEAL_ICON = (
  <svg
    width={17}
    height={17}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.5}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <rect x="5" y="11" width="14" height="9" rx="2" />
    <path d="M8 11V8a4 4 0 0 1 8 0v3" />
  </svg>
);

const TICK = (
  <svg
    width={12}
    height={12}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M20 6L9 17l-5-5" />
  </svg>
);

const RING = (
  <span
    aria-hidden="true"
    style={{
      width: 6,
      height: 6,
      borderRadius: "50%",
      borderWidth: 1,
      borderStyle: "solid",
      borderColor: "currentColor",
    }}
  />
);

function Mark({ done }: { done: boolean }) {
  return (
    <span
      data-mark={done ? "done" : "open"}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: 20,
        height: 20,
        borderRadius: "50%",
        borderWidth: 1,
        borderStyle: "solid",
        borderColor: done ? "var(--sphere-done)" : "var(--line-2)",
        background: done ? "var(--sphere-done-soft)" : "transparent",
        color: done ? "var(--sphere-done)" : "var(--ink-mute)",
        flex: "none",
      }}
    >
      {done ? TICK : RING}
    </span>
  );
}

function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** The sphere the gate opens onto — the next stop on the serpent walk. */
export function nextSphereOnWalk(number: number): SphereNumber | null {
  const idx = SERPENT_ORDER.indexOf(number as SphereNumber);
  if (idx < 0 || idx === SERPENT_ORDER.length - 1) return null;
  return SERPENT_ORDER[idx + 1] ?? null;
}

export function SphereDetailPanel({
  sphere,
  entryHref = (id) => `/editor/${id}`,
  onCompleteItem,
  onPassGate,
  className,
  style,
}: SphereDetailPanelProps) {
  const state = sphere.state;
  const color = STATE_COLOR[state];
  const items = sphere.items ?? [];
  const requiredOpen = items.filter((i) => i.required_for_gate && i.completed_at === null);
  const canPass = state === "current" && requiredOpen.length === 0 && onPassGate !== undefined;
  const next = nextSphereOnWalk(sphere.number);

  const header: ReactNode = (
    <div
      style={{
        display: "flex",
        alignItems: "baseline",
        gap: 11,
        flexWrap: "wrap",
        marginBottom: 5,
      }}
    >
      <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color }}>
        {_("Sphere {n}", { n: sphere.number })}
      </span>
      <h2
        style={{
          fontFamily: "var(--font-display, var(--font-serif))",
          fontSize: 27,
          margin: 0,
          lineHeight: 1.1,
          color: "var(--ink)",
        }}
      >
        {sphere.name}
      </h2>
      <span
        data-state-chip={state}
        style={{
          display: "inline-flex",
          alignItems: "center",
          padding: "2px 11px",
          borderRadius: "var(--r-pill, 20px)",
          borderWidth: 1,
          borderStyle: "solid",
          borderColor: color,
          background: STATE_SOFT[state],
          fontFamily: "var(--font-ui)",
          fontSize: 11,
          color,
        }}
      >
        {_(TETRAKTYS_STATE_LABELS[state])}
      </span>
    </div>
  );

  // ── Sealed lockout — counts only, no titles ─────────────────────────
  if (sphere.sealed) {
    return (
      <div data-component="sphere-detail" data-sealed="true" className={className} style={style}>
        {header}
        <div
          data-sealed-lockout
          style={{
            position: "relative",
            padding: "19px 21px",
            borderWidth: 1,
            borderStyle: "solid",
            borderColor: "var(--seal-border)",
            borderRadius: "var(--r-lg, 14px)",
            background: "var(--seal-soft)",
            overflow: "hidden",
            marginTop: 14,
          }}
        >
          <div
            aria-hidden="true"
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              bottom: 0,
              width: 3,
              background: "var(--seal)",
            }}
          />
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 11 }}>
            <span style={{ display: "flex", color: "var(--seal)", flex: "none" }}>{SEAL_ICON}</span>
            <span
              style={{
                fontFamily: "var(--font-ui)",
                fontSize: 10.5,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: "var(--seal)",
              }}
            >
              {_("Sealed — the walk has not reached it")}
            </span>
          </div>
          <div
            style={{
              fontFamily: "var(--font-serif)",
              fontSize: 14.5,
              color: "var(--ink)",
              lineHeight: 1.6,
              marginBottom: 11,
            }}
          >
            {_(
              "The curriculum for this sphere opens when you arrive at it. Until then it is held as counts, not names.",
            )}
          </div>
          <div
            data-sealed-counts
            style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--ink-mute)" }}
          >
            {_("{total} items · {completed} complete · {required} required for the gate", {
              total: sphere.item_counts.total,
              completed: sphere.item_counts.completed,
              required: sphere.item_counts.required_for_gate,
            })}
          </div>
        </div>
      </div>
    );
  }

  // ── Unlocked ────────────────────────────────────────────────────────
  return (
    <div data-component="sphere-detail" data-sealed="false" className={className} style={style}>
      {header}

      <div style={{ ...HEAD, marginTop: 18 }}>{_("Curriculum")}</div>
      {items.length === 0 ? (
        <div
          style={{
            padding: "14px 16px",
            borderWidth: 1,
            borderStyle: "dashed",
            borderColor: "var(--line)",
            borderRadius: "var(--r-md, 8px)",
            fontFamily: "var(--font-serif)",
            fontSize: 13.5,
            color: "var(--ink-mute)",
            marginBottom: 22,
          }}
        >
          {_("No curriculum items are written for this sphere yet.")}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 22 }}>
          {items.map((item) => {
            const done = item.completed_at !== null;
            return (
              <div
                key={item.id}
                data-curriculum-item={item.id}
                data-complete={done ? "true" : "false"}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 12,
                  padding: "12px 14px",
                  borderWidth: 1,
                  borderStyle: "solid",
                  borderColor: "var(--line)",
                  borderRadius: "var(--r-md, 8px)",
                  background: "var(--bg-2)",
                }}
              >
                <Mark done={done} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontFamily: "var(--font-serif)",
                      fontSize: 14,
                      color: "var(--ink)",
                      lineHeight: 1.35,
                    }}
                  >
                    {item.title}
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 9,
                      flexWrap: "wrap",
                      marginTop: 3,
                    }}
                  >
                    <span
                      data-kind-chip={item.kind}
                      style={{
                        fontFamily: "var(--font-ui)",
                        fontSize: 10.5,
                        letterSpacing: "0.06em",
                        textTransform: "uppercase",
                        color: "var(--ink-mute)",
                      }}
                    >
                      {_(item.kind)}
                    </span>
                    {item.required_for_gate ? (
                      <span
                        data-required-chip
                        style={{
                          fontFamily: "var(--font-ui)",
                          fontSize: 10.5,
                          color: "var(--ink-mute)",
                          borderWidth: 1,
                          borderStyle: "solid",
                          borderColor: "var(--line-2)",
                          borderRadius: "var(--r-pill, 20px)",
                          padding: "0 8px",
                        }}
                      >
                        {_("gate")}
                      </span>
                    ) : null}
                    {done && item.evidence_entry_id ? (
                      <a
                        data-evidence-link
                        href={entryHref(item.evidence_entry_id)}
                        style={{
                          fontFamily: "var(--font-ui)",
                          fontSize: 11.5,
                          color: "var(--network)",
                          textDecoration: "none",
                        }}
                      >
                        {_("evidence · {date}", {
                          date: item.completed_at ? shortDate(item.completed_at) : "",
                        })}
                      </a>
                    ) : null}
                    {done && !item.evidence_entry_id && item.completed_at ? (
                      <span
                        style={{
                          fontFamily: "var(--font-mono)",
                          fontSize: 10.5,
                          color: "var(--ink-mute)",
                        }}
                      >
                        {_("done {date}", { date: shortDate(item.completed_at) })}
                      </span>
                    ) : null}
                  </div>
                </div>
                {!done && onCompleteItem && state === "current" ? (
                  <button
                    type="button"
                    data-action="complete-item"
                    onClick={() => onCompleteItem(item)}
                    style={{
                      padding: "7px 13px",
                      borderRadius: "var(--r-md, 8px)",
                      borderWidth: 1,
                      borderStyle: "solid",
                      borderColor: "var(--line-2)",
                      background: "transparent",
                      fontFamily: "var(--font-ui)",
                      fontSize: 12,
                      color: "var(--ink-soft)",
                      cursor: "pointer",
                      flex: "none",
                      minHeight: 32,
                    }}
                  >
                    {_("Mark done")}
                  </button>
                ) : null}
              </div>
            );
          })}
        </div>
      )}

      <div style={HEAD}>
        {next !== null ? _("Gate to sphere {n}", { n: next }) : _("The final gate")}
      </div>
      <div
        data-gate-panel
        style={{
          padding: "15px 17px",
          borderWidth: 1,
          borderStyle: "solid",
          borderColor: "var(--line-2)",
          borderRadius: "var(--r-lg, 14px)",
          background: "var(--bg-2)",
          marginBottom: 22,
        }}
      >
        {sphere.gate?.requirements ? (
          <div
            style={{
              fontFamily: "var(--font-serif)",
              fontSize: 13.5,
              color: "var(--ink)",
              lineHeight: 1.55,
              marginBottom: 12,
            }}
          >
            {sphere.gate.requirements}
          </div>
        ) : null}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {items
            .filter((i) => i.required_for_gate)
            .map((i) => (
              <div
                key={i.id}
                data-gate-requirement={i.id}
                style={{ display: "flex", alignItems: "flex-start", gap: 11 }}
              >
                <Mark done={i.completed_at !== null} />
                <div
                  style={{
                    flex: 1,
                    minWidth: 0,
                    fontFamily: "var(--font-serif)",
                    fontSize: 13.5,
                    color: "var(--ink)",
                    lineHeight: 1.45,
                  }}
                >
                  {i.title}
                  {i.completed_at ? (
                    <div
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: 10.5,
                        color: "var(--ink-mute)",
                        marginTop: 2,
                      }}
                    >
                      {_("closed {date}", { date: shortDate(i.completed_at) })}
                    </div>
                  ) : null}
                </div>
              </div>
            ))}
        </div>
        {sphere.gate?.passed_at ? (
          <div
            data-gate-passed
            style={{
              marginTop: 13,
              paddingTop: 12,
              borderTop: "1px solid var(--line)",
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              color: "var(--sphere-done)",
            }}
          >
            {_("Gate passed {date}", { date: shortDate(sphere.gate.passed_at) })}
            {sphere.gate.countersign
              ? ` · ${_("countersigned by {name}", { name: sphere.gate.countersign })}`
              : ""}
          </div>
        ) : (
          <div
            style={{
              marginTop: 13,
              paddingTop: 12,
              borderTop: "1px solid var(--line)",
              display: "flex",
              alignItems: "center",
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            <div
              style={{
                flex: 1,
                minWidth: 200,
                fontFamily: "var(--font-ui)",
                fontSize: 11.5,
                color: "var(--ink-mute)",
                lineHeight: 1.55,
              }}
            >
              {_(
                "The gate opens when the requirements are met and your preceptor countersigns. There is no way to hurry it and no reward for hurrying.",
              )}
            </div>
            {state === "current" ? (
              <button
                type="button"
                data-action="pass-gate"
                disabled={!canPass}
                onClick={() => onPassGate?.()}
                style={{
                  padding: "10px 18px",
                  borderRadius: "var(--r-md, 8px)",
                  borderWidth: 1,
                  borderStyle: "solid",
                  borderColor: canPass ? "var(--sphere-current)" : "var(--line)",
                  background: canPass ? "var(--sphere-current-soft)" : "var(--bg-3)",
                  color: canPass ? "var(--sphere-current)" : "var(--ink-mute)",
                  fontFamily: "var(--font-ui)",
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: canPass ? "pointer" : "not-allowed",
                  flex: "none",
                  minHeight: 38,
                }}
              >
                {_("Pass the gate")}
              </button>
            ) : null}
          </div>
        )}
      </div>

      {sphere.gate?.passed_at ? (
        <>
          <div style={HEAD}>{_("Oath & initiation")}</div>
          <div
            data-initiation-record
            style={{
              position: "relative",
              padding: "17px 19px",
              borderWidth: 1,
              borderStyle: "solid",
              borderColor: "var(--seal-border)",
              borderRadius: "var(--r-lg, 14px)",
              background: "var(--seal-soft)",
              overflow: "hidden",
            }}
          >
            <div
              aria-hidden="true"
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                bottom: 0,
                width: 3,
                background: "var(--seal)",
              }}
            />
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 11 }}>
              <span style={{ display: "flex", color: "var(--seal)", flex: "none" }}>
                {SEAL_ICON}
              </span>
              <span
                style={{
                  fontFamily: "var(--font-ui)",
                  fontSize: 10.5,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: "var(--seal)",
                }}
              >
                {_("Sealed record")}
              </span>
              <span
                style={{
                  marginLeft: "auto",
                  fontFamily: "var(--font-mono)",
                  fontSize: 11,
                  color: "var(--ink-mute)",
                }}
              >
                {shortDate(sphere.gate.passed_at)}
              </span>
            </div>
            <div
              style={{
                fontFamily: "var(--font-serif)",
                fontSize: 15,
                color: "var(--ink)",
                lineHeight: 1.6,
                marginBottom: 11,
              }}
            >
              {sphere.gate.countersign
                ? _("Received into this sphere, countersigned by {name}.", {
                    name: sphere.gate.countersign,
                  })
                : _("Received into this sphere.")}
            </div>
            <div
              style={{
                fontFamily: "var(--font-ui)",
                fontSize: 11,
                color: "var(--ink-mute)",
              }}
            >
              {_("Oath text held sealed — visible only to you")}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
