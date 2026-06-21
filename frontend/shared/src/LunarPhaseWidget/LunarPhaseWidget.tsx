/**
 * LunarPhaseWidget — the bigger lunar phase embed for the Today
 * surface (and the Calendar / Moon dedicated pages later).
 *
 * Per `Theourgia Today Widgets.dc.html`. A parametric SVG moon
 * (the terminator-ellipse math in `moonPath.ts` — lifted verbatim
 * from the designer's mockup), phase name, illumination %, "next
 * quarter in N days M hours" ETA, phase angle, an 8-cell phase
 * cycle rail, and a hemisphere toggle (north / south).
 *
 * The hemisphere toggle flips the illuminated limb via a single
 * horizontal mirror — northern: waxing brightens on the right;
 * southern: on the left. Default is the caller's choice (latitude
 * lookup happens upstream).
 */

import { type CSSProperties, useId, useMemo } from "react";

import {
  PHASE_CYCLE,
  moonPath,
  phaseMetricsFromDays,
  phaseName,
} from "./moonPath.js";

export type LunarHemisphere = "north" | "south";
export type LunarPhaseState = "normal" | "loading" | "error";

export interface LunarPhaseWidgetProps {
  /** Days since the last new moon. Synodic month = 29.53059 days. */
  daysSinceNewMoon: number;
  /** Synodic-month override (default 29.53059). */
  synodicDays?: number;
  hemisphere?: LunarHemisphere;
  onHemisphereChange?: (next: LunarHemisphere) => void;
  /** Caller-supplied next-phase ETA — the math here doesn't predict
   *  future astronomy. */
  nextPhase?: { label: string; in: string };
  state?: LunarPhaseState;
  className?: string;
  style?: CSSProperties;
}

const cardShell: CSSProperties = {
  borderWidth: 1,
  borderStyle: "solid",
  borderColor: "var(--line-2)",
  borderRadius: "var(--r-lg, 14px)",
  background: "var(--bg-2)",
  overflow: "hidden",
};

function smallBtnStyle(active: boolean): CSSProperties {
  return {
    padding: "4px 9px",
    fontFamily: "var(--font-ui)",
    fontSize: 11,
    borderRadius: 6,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: active ? "var(--line-2)" : "transparent",
    background: active ? "var(--accent-soft)" : "transparent",
    color: active ? "var(--ink)" : "var(--ink-mute)",
    cursor: "pointer",
  };
}

function MoonGlyph({
  litPath,
  flip,
  clipId,
  size = 120,
  highlight = false,
}: {
  litPath: string;
  flip: string;
  clipId: string;
  size?: number;
  highlight?: boolean;
}) {
  const litColor = highlight ? "var(--accent)" : "var(--moon-light)";
  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      aria-hidden="true"
    >
      <defs>
        <clipPath id={clipId}>
          <circle cx={50} cy={50} r={44} />
        </clipPath>
      </defs>
      <circle
        cx={50}
        cy={50}
        r={44}
        fill="var(--moon-dark)"
        stroke="var(--line-2)"
        strokeWidth={1}
      />
      <g clipPath={`url(#${clipId})`} transform={flip}>
        {litPath ? <path d={litPath} fill={litColor} /> : null}
      </g>
      <circle
        cx={50}
        cy={50}
        r={44}
        fill="none"
        stroke="var(--line-2)"
        strokeWidth={1}
      />
    </svg>
  );
}

function LoadingSkeleton() {
  return (
    <div
      style={{
        padding: "30px 22px",
        display: "flex",
        alignItems: "center",
        gap: 22,
      }}
    >
      <span
        className="skel"
        style={{
          width: 120,
          height: 120,
          borderRadius: "50%",
          background: "var(--bg-3)",
          flex: "none",
          display: "block",
        }}
      />
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          gap: 9,
        }}
      >
        <span
          className="skel"
          style={{
            width: "60%",
            height: 18,
            borderRadius: 4,
            background: "var(--bg-3)",
            display: "block",
          }}
        />
        <span
          className="skel"
          style={{
            width: "42%",
            height: 26,
            borderRadius: 4,
            background: "var(--bg-3)",
            display: "block",
          }}
        />
        <span
          className="skel"
          style={{
            width: "72%",
            height: 13,
            borderRadius: 4,
            background: "var(--bg-3)",
            display: "block",
          }}
        />
      </div>
    </div>
  );
}

function ErrorState() {
  return (
    <div style={{ padding: "30px 24px", textAlign: "center" }}>
      <div
        style={{
          width: 120,
          height: 120,
          borderRadius: "50%",
          borderWidth: 1,
          borderStyle: "dashed",
          borderColor: "var(--line-2)",
          margin: "0 auto 12px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--ink-mute)",
        }}
      >
        <svg
          width="30"
          height="30"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.4}
          aria-hidden="true"
        >
          <path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z" />
        </svg>
      </div>
      <div
        style={{
          fontFamily: "var(--font-serif)",
          fontSize: 15,
          color: "var(--ink-soft)",
        }}
      >
        Lunar data unavailable
      </div>
    </div>
  );
}

export function LunarPhaseWidget({
  daysSinceNewMoon,
  synodicDays,
  hemisphere = "north",
  onHemisphereChange,
  nextPhase,
  state = "normal",
  className,
  style,
}: LunarPhaseWidgetProps) {
  const clipBaseId = useId();
  const metrics = useMemo(
    () => phaseMetricsFromDays(daysSinceNewMoon, synodicDays),
    [daysSinceNewMoon, synodicDays],
  );
  const name = phaseName(metrics.illumination, metrics.waxing);
  const flip =
    hemisphere === "north" ? "translate(0,0)" : "translate(100,0) scale(-1,1)";
  const litPath = moonPath(metrics.illumination, metrics.waxing);
  const illumPct = Math.round(metrics.illumination * 100);
  const north = hemisphere === "north";

  if (state === "loading" || state === "error") {
    return (
      <div
        className={className}
        data-component="lunar-phase-widget"
        data-state={state}
        style={{ ...cardShell, ...style }}
      >
        {state === "loading" ? <LoadingSkeleton /> : <ErrorState />}
      </div>
    );
  }

  return (
    <div
      className={className}
      data-component="lunar-phase-widget"
      data-state="normal"
      data-hemisphere={hemisphere}
      style={{ ...cardShell, ...style }}
    >
      <div
        style={{
          padding: "22px 22px 18px",
          display: "flex",
          alignItems: "center",
          gap: 22,
          flexWrap: "wrap",
        }}
      >
        <div style={{ flex: "none" }} role="img" aria-label={`${name}, ${illumPct}% illuminated`}>
          <MoonGlyph
            litPath={litPath}
            flip={flip}
            clipId={`${clipBaseId}-main`}
            size={120}
          />
        </div>
        <div style={{ flex: 1, minWidth: 140 }}>
          <div
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 23,
              lineHeight: 1.1,
            }}
            data-testid="phase-name"
          >
            {name}
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              gap: 6,
              marginTop: 6,
            }}
          >
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 30,
                color: "var(--ink)",
              }}
            >
              {illumPct}%
            </span>
            <span
              style={{
                fontFamily: "var(--font-ui)",
                fontSize: 13,
                color: "var(--ink-mute)",
              }}
            >
              illuminated
            </span>
          </div>
          {nextPhase ? (
            <div
              style={{
                fontFamily: "var(--font-ui)",
                fontSize: 13,
                color: "var(--ink-soft)",
                marginTop: 8,
              }}
            >
              {nextPhase.label}{" "}
              <span style={{ color: "var(--ink)" }}>{nextPhase.in}</span>
            </div>
          ) : null}
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              color: "var(--ink-mute)",
              marginTop: 5,
            }}
          >
            phase angle {metrics.angleDeg}°
          </div>
        </div>
      </div>

      {/* 8-cell phase cycle rail */}
      <div
        style={{
          display: "flex",
          gap: 0,
          borderTop: "1px solid var(--line)",
        }}
      >
        {PHASE_CYCLE.map((step, i) => {
          const isCurrent = step.name === name;
          return (
            <div
              key={step.name}
              title={step.name}
              data-cycle-step={step.name}
              data-current={isCurrent ? "true" : "false"}
              style={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "9px 0",
                background: isCurrent ? "var(--accent-soft)" : "transparent",
                borderRight:
                  i < PHASE_CYCLE.length - 1
                    ? "1px solid var(--line)"
                    : "none",
              }}
            >
              <MoonGlyph
                litPath={moonPath(step.f, step.waxing)}
                flip={flip}
                clipId={`${clipBaseId}-cycle-${i}`}
                size={26}
                highlight={isCurrent}
              />
            </div>
          );
        })}
      </div>

      {/* Hemisphere toggle */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "12px 16px",
          borderTop: "1px solid var(--line)",
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-ui)",
            fontSize: 11.5,
            color: "var(--ink-mute)",
          }}
        >
          Oriented for
        </span>
        <div
          role="group"
          aria-label="Hemisphere"
          style={{
            display: "flex",
            gap: 2,
            padding: 3,
            borderWidth: 1,
            borderStyle: "solid",
            borderColor: "var(--line)",
            borderRadius: 8,
            background: "var(--bg-sunk)",
          }}
        >
          <button
            type="button"
            onClick={() => onHemisphereChange?.("north")}
            aria-pressed={north}
            style={smallBtnStyle(north)}
          >
            Northern
          </button>
          <button
            type="button"
            onClick={() => onHemisphereChange?.("south")}
            aria-pressed={!north}
            style={smallBtnStyle(!north)}
          >
            Southern
          </button>
        </div>
        <span
          style={{
            fontFamily: "var(--font-ui)",
            fontSize: 11,
            color: "var(--ink-mute)",
            marginLeft: "auto",
          }}
        >
          limb brightens on the {north ? "right" : "left"}
        </span>
      </div>
    </div>
  );
}
