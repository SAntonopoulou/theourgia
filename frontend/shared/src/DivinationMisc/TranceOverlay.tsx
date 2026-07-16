/**
 * TranceOverlay — full-screen low-blue-light chrome for a live scrying
 * session, ported from `Theourgia Trance Mode.dc.html` (2026-06-21
 * design-system bundle). H04 agent_onboarding pairs the panel's
 * `--trance` entry affordance with exactly this chrome, so the amber
 * palette here is scoped verbatim from that design file — trance mode
 * is low-blue-light by design, which is why the blue-violet `--trance`
 * token marks the *entry* button but never appears inside the overlay.
 *
 * Scope (v1-014, minimal honest version):
 *   - real elapsed-time counter, starting at 0:00 on entry
 *   - the design's End control exits; Escape also closes (a11y-sweep
 *     modal contract via useEscapeToClose + useFocusOnOpen)
 *   - current planetary hour shown only when the composing route
 *     already has it — never fetched from here
 *   - vision text mirrors the panel's live capture; never seeds
 *     specimen prose
 *   - NOT ported: the Dim / Pause controls and the "auto-saves to the
 *     record" footer line — no dim, pause, or auto-save behaviour
 *     exists yet, and dead chrome would claim otherwise
 *
 * Animations match the design's breathe / drift / caret keyframes and
 * are disabled wholesale under `prefers-reduced-motion: reduce`,
 * exactly as the design file does.
 */

import { useEffect, useRef, useState } from "react";

import { useEscapeToClose } from "../hooks/useEscapeToClose.js";
import { useFocusOnOpen } from "../hooks/useFocusOnOpen.js";

// Scoped palette — verbatim from `Theourgia Trance Mode.dc.html`.
const TBG = "#0B0806";
const TBG2 = "#120C08";
const AMBER = "#C9925A";
const AMBER_SOFT = "#7A5A38";
const AMBER_DIM = "#4E3C28";
const EMBER = "#8A4A33";

const TRANCE_KEYFRAMES = `
@keyframes trance-breathe{0%,100%{transform:scale(1);opacity:.55}50%{transform:scale(1.05);opacity:.85}}
@keyframes trance-drift{0%,100%{opacity:.4}50%{opacity:.75}}
@keyframes trance-blink{50%{opacity:0}}
.trance-breathe{animation:trance-breathe 7s ease-in-out infinite;transform-origin:center}
.trance-drift{animation:trance-drift 5s ease-in-out infinite}
.trance-caret{animation:trance-blink 1.3s step-end infinite}
[data-trance-overlay] :focus-visible{outline:1px solid ${AMBER};outline-offset:3px}
@media (prefers-reduced-motion: reduce){.trance-breathe,.trance-drift,.trance-caret{animation:none}}
`;

/** "0:00" → "12:48" — the design's top-bar timer format. */
export function formatTranceElapsed(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export interface TranceOverlayProps {
  /** The panel's selected medium label, e.g. "Black mirror". */
  mediumLabel: string;
  /** Current planetary hour — shown only when the composing route
   *  already has the data. Omitted entirely when absent. */
  planetaryHour?: string;
  /** Live vision text from the capture textarea (may be empty). */
  visionText?: string;
  onExit: () => void;
}

export function TranceOverlay({
  mediumLabel,
  planetaryHour,
  visionText,
  onExit,
}: TranceOverlayProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, []);

  useEscapeToClose(true, onExit);
  useFocusOnOpen(rootRef, true);

  return (
    <div
      ref={rootRef}
      data-trance-overlay
      role="dialog"
      aria-modal="true"
      aria-label="Trance · scrying"
      tabIndex={-1}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        background: `radial-gradient(ellipse at 50% 42%, ${TBG2}, ${TBG} 70%)`,
        color: AMBER,
        fontFamily: "var(--font-display)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        outline: "none",
      }}
    >
      <style>{TRANCE_KEYFRAMES}</style>

      {/* vignette */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          boxShadow: "inset 0 0 220px 60px rgba(0,0,0,.7)",
        }}
      />

      {/* top bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "22px 30px",
          position: "relative",
          zIndex: 2,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            fontFamily: "var(--font-ui)",
            fontSize: 12,
            letterSpacing: ".18em",
            textTransform: "uppercase",
            color: AMBER_SOFT,
          }}
        >
          <svg width={18} height={18} viewBox="0 0 40 40" fill="none" aria-hidden="true">
            <circle cx="20" cy="20" r="17.5" stroke={AMBER_SOFT} strokeWidth={1.4} />
            <line x1="9.5" y1="20" x2="30.5" y2="20" stroke={AMBER_SOFT} strokeWidth={1.4} />
          </svg>
          Trance · scrying
        </div>
        <div
          data-trance-elapsed
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 13,
            color: AMBER_SOFT,
            letterSpacing: ".1em",
          }}
        >
          {formatTranceElapsed(elapsed)}
        </div>
      </div>

      {/* centre */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "0 30px",
          position: "relative",
          zIndex: 2,
          minHeight: 0,
        }}
      >
        <div
          style={{
            position: "relative",
            width: 260,
            height: 260,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 18,
          }}
        >
          <svg
            className="trance-breathe"
            viewBox="0 0 200 200"
            width={260}
            height={260}
            style={{ position: "absolute", inset: 0 }}
            aria-hidden="true"
          >
            <circle cx="100" cy="100" r="92" fill="none" stroke={AMBER_DIM} strokeWidth={1} />
            <circle
              cx="100"
              cy="100"
              r="74"
              fill="none"
              stroke={AMBER_DIM}
              strokeWidth={0.8}
              opacity={0.7}
            />
            <circle
              cx="100"
              cy="100"
              r="48"
              fill="none"
              stroke={AMBER_SOFT}
              strokeWidth={0.8}
              opacity={0.5}
            />
          </svg>
          <div
            className="trance-drift"
            style={{
              width: 120,
              height: 120,
              borderRadius: "50%",
              background: `radial-gradient(circle at 50% 45%, ${EMBER}, transparent 68%)`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <span
              aria-hidden="true"
              style={{
                fontFamily: "var(--font-glyph)",
                fontSize: 30,
                color: AMBER,
                opacity: 0.85,
              }}
            >
              ☽
            </span>
          </div>
        </div>

        <div style={{ maxWidth: 680, textAlign: "center" }}>
          <div
            data-trance-session
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: 11,
              letterSpacing: ".24em",
              textTransform: "uppercase",
              color: AMBER_DIM,
              marginBottom: 20,
            }}
          >
            {planetaryHour ? `${mediumLabel} · ${planetaryHour}` : mediumLabel}
          </div>
          {visionText ? (
            <p
              data-trance-vision
              style={{
                fontFamily: "var(--font-display)",
                fontStyle: "italic",
                fontSize: "clamp(22px,3.2vw,30px)",
                lineHeight: 1.6,
                color: AMBER,
                margin: 0,
                opacity: 0.92,
              }}
            >
              {visionText}
              <span className="trance-caret" style={{ color: EMBER }} aria-hidden="true">
                ▏
              </span>
            </p>
          ) : null}
        </div>
      </div>

      {/* bottom controls */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 30,
          padding: "26px 30px 40px",
          position: "relative",
          zIndex: 2,
        }}
      >
        <button
          type="button"
          aria-label="End session"
          data-action="end-trance"
          onClick={onExit}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            color: AMBER_SOFT,
            fontFamily: "var(--font-ui)",
            fontSize: 12,
            letterSpacing: ".1em",
            background: "none",
            border: "none",
            cursor: "pointer",
          }}
        >
          <svg
            width={17}
            height={17}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.4}
            strokeLinecap="round"
            aria-hidden="true"
          >
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
          </svg>
          End
        </button>
      </div>
    </div>
  );
}
