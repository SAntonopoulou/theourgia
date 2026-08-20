/**
 * Pranayama — the breath, counted in ratios and rounds.
 *
 * The web mirror of the phone's breath practice: set a ratio (in · hold · out ·
 * hold), a number of rounds or open, and a slow orb paces the breath — swelling
 * on the in-breath, holding, settling on the out. Self-contained; the arithmetic
 * of the cycle is the tested `practiceTimer` core.
 */

import {
  type BreathRatio,
  KeepingSheet,
  type KeepingValues,
  type RecordEntryWrite,
  Toast,
  breathPattern,
  cycleSeconds,
  phaseAt,
  useTopbar,
} from "@theourgia/shared";
import { useEffect, useRef, useState } from "react";

import { amendObservance, keepObservance } from "../data/keepObservance.js";
import { useMyLocation } from "../data/useLocation.js";
import { MOCK_LOCATION } from "../mocks/today.js";

type Status = "idle" | "running" | "paused" | "done";

const PRESETS: { label: string; ratio: BreathRatio }[] = [
  { label: "Box · 4·4·4·4", ratio: { inhale: 4, holdIn: 4, exhale: 4, holdOut: 4 } },
  { label: "Calm · 4·7·8", ratio: { inhale: 4, holdIn: 7, exhale: 8, holdOut: 0 } },
  { label: "Even · 5·5", ratio: { inhale: 5, holdIn: 0, exhale: 5, holdOut: 0 } },
  { label: "Coherent · 6·6", ratio: { inhale: 6, holdIn: 0, exhale: 6, holdOut: 0 } },
];

const MIN_SCALE = 0.55;
const MAX_SCALE = 1;

export function PranayamaRoute() {
  useTopbar(
    () => ({ title: "Pranayama", subtitle: "The breath, counted in ratios and rounds" }),
    [],
  );

  const [ratio, setRatio] = useState<BreathRatio>(
    PRESETS[0]?.ratio ?? {
      inhale: 4,
      holdIn: 4,
      exhale: 4,
      holdOut: 4,
    },
  );
  const [roundsTarget, setRoundsTarget] = useState<number | null>(6);
  const [status, setStatus] = useState<Status>("idle");
  const [elapsed, setElapsed] = useState(0);
  const tick = useRef<ReturnType<typeof setInterval> | null>(null);
  const startedAt = useRef<string | null>(null);

  const [sheet, setSheet] = useState<{ entry: RecordEntryWrite; title: string } | null>(null);
  const [kept, setKept] = useState(false);
  const [keepBusy, setKeepBusy] = useState(false);
  const location = useMyLocation({ enabled: true });
  const loc = location.data ?? MOCK_LOCATION;

  const phases = breathPattern(ratio);
  const cycle = cycleSeconds(phases);

  useEffect(() => {
    if (status !== "running") return;
    tick.current = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => {
      if (tick.current !== null) clearInterval(tick.current);
      tick.current = null;
    };
  }, [status]);

  const round = cycle > 0 ? Math.floor(elapsed / cycle) : 0;

  // End when the last round's final breath completes.
  useEffect(() => {
    if (status === "running" && roundsTarget !== null && cycle > 0 && round >= roundsTarget) {
      setStatus("done");
    }
  }, [status, round, roundsTarget, cycle]);

  const info = phases.length > 0 ? phaseAt(elapsed, phases) : null;

  const begin = (): void => {
    setElapsed(0);
    setKept(false);
    startedAt.current = new Date().toISOString();
    setStatus("running");
  };
  const reset = (): void => {
    setElapsed(0);
    setStatus("idle");
  };

  const keepBreath = async (): Promise<void> => {
    setKeepBusy(true);
    try {
      const entry = await keepObservance({
        subjectKey: "meditation:web-breath",
        occurrenceAt: startedAt.current ?? new Date().toISOString(),
        durationSeconds: elapsed,
        location: { lat: loc.lat, lng: loc.lng },
      });
      setKept(true);
      setSheet({ entry, title: "Breath" });
    } catch (e) {
      Toast.push({
        tone: "warning",
        title: "That didn't keep",
        body: e instanceof Error ? e.message : "Check your connection and try again.",
      });
    } finally {
      setKeepBusy(false);
    }
  };

  const keepDetails = async (values: KeepingValues): Promise<void> => {
    if (!sheet) return;
    setKeepBusy(true);
    try {
      await amendObservance(sheet.entry, values);
    } catch {
      // The breath is kept; the note simply didn't attach.
    } finally {
      setKeepBusy(false);
      setSheet(null);
    }
  };

  // The orb's size follows the phase: growing across the in-breath, holding,
  // settling across the out. Per-second targets, smoothed by a CSS transition.
  let scale = MIN_SCALE;
  if (info && status !== "idle") {
    const frac = info.phase.seconds > 0 ? info.intoPhase / info.phase.seconds : 0;
    if (info.phase.key === "inhale") scale = MIN_SCALE + (MAX_SCALE - MIN_SCALE) * frac;
    else if (info.phase.key === "holdIn") scale = MAX_SCALE;
    else if (info.phase.key === "exhale") scale = MAX_SCALE - (MAX_SCALE - MIN_SCALE) * frac;
    else scale = MIN_SCALE;
  }

  const cue =
    status === "done"
      ? "Done"
      : status === "idle"
        ? "Ready"
        : info
          ? info.phase.label
          : "Set a breath";

  return (
    <section
      style={{
        maxWidth: 520,
        margin: "0 auto",
        padding: "var(--space-5, 24px)",
        textAlign: "center",
      }}
    >
      {/* Ratio + rounds, set before the breath and locked while it runs. */}
      <div style={{ opacity: status === "idle" ? 1 : 0.5, marginBottom: 26 }}>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 8,
            justifyContent: "center",
            marginBottom: 14,
          }}
        >
          {PRESETS.map((p) => {
            const active =
              p.ratio.inhale === ratio.inhale &&
              p.ratio.holdIn === ratio.holdIn &&
              p.ratio.exhale === ratio.exhale &&
              p.ratio.holdOut === ratio.holdOut;
            return (
              <button
                key={p.label}
                type="button"
                disabled={status !== "idle"}
                aria-pressed={active}
                onClick={() => setRatio(p.ratio)}
                style={{
                  padding: "7px 13px",
                  borderRadius: 999,
                  border: `1px solid ${active ? "var(--accent)" : "var(--line)"}`,
                  background: active ? "var(--accent-soft)" : "var(--bg-2)",
                  color: "var(--ink)",
                  fontFamily: "var(--font-ui)",
                  fontSize: 12.5,
                  cursor: status === "idle" ? "pointer" : "default",
                }}
              >
                {p.label}
              </button>
            );
          })}
        </div>
        <div
          style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}
          aria-label="Breath counts, in seconds"
        >
          {(["inhale", "holdIn", "exhale", "holdOut"] as const).map((key) => (
            <label
              key={key}
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 2,
                fontFamily: "var(--font-ui)",
                fontSize: 11,
                color: "var(--ink-mute)",
              }}
            >
              {{ inhale: "In", holdIn: "Hold", exhale: "Out", holdOut: "Hold" }[key]}
              <input
                type="number"
                min={0}
                max={60}
                disabled={status !== "idle"}
                value={ratio[key]}
                onChange={(e) =>
                  setRatio((r) => ({ ...r, [key]: Math.max(0, Number(e.target.value) || 0) }))
                }
                style={{
                  width: 54,
                  padding: "6px 8px",
                  textAlign: "center",
                  border: "1px solid var(--line)",
                  borderRadius: "var(--r-sm, 6px)",
                  background: "var(--bg)",
                  color: "var(--ink)",
                  fontFamily: "var(--font-ui)",
                  fontSize: 14,
                }}
              />
            </label>
          ))}
          <label
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 2,
              fontFamily: "var(--font-ui)",
              fontSize: 11,
              color: "var(--ink-mute)",
            }}
          >
            Rounds
            <input
              type="number"
              min={0}
              max={99}
              disabled={status !== "idle"}
              value={roundsTarget ?? 0}
              onChange={(e) => {
                const n = Math.max(0, Number(e.target.value) || 0);
                setRoundsTarget(n === 0 ? null : n);
              }}
              style={{
                width: 54,
                padding: "6px 8px",
                textAlign: "center",
                border: "1px solid var(--line)",
                borderRadius: "var(--r-sm, 6px)",
                background: "var(--bg)",
                color: "var(--ink)",
                fontFamily: "var(--font-ui)",
                fontSize: 14,
              }}
            />
          </label>
        </div>
        <p
          style={{
            fontFamily: "var(--font-ui)",
            fontSize: 11.5,
            color: "var(--ink-mute)",
            marginTop: 8,
          }}
        >
          A count of 0 drops that hold. Rounds 0 means an open breath.
        </p>
      </div>

      {/* The orb. */}
      <div
        style={{
          height: 260,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 18,
        }}
      >
        <div
          aria-hidden="true"
          style={{
            width: 200,
            height: 200,
            borderRadius: "50%",
            background: "radial-gradient(circle at 50% 45%, var(--accent-soft), var(--bg-2))",
            border: "1px solid var(--accent)",
            transform: `scale(${scale})`,
            transition: "transform 0.95s linear",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div>
            <div
              aria-live="polite"
              style={{
                fontFamily: "var(--font-display, var(--font-serif))",
                fontSize: 22,
                color: "var(--ink)",
              }}
            >
              {cue}
            </div>
            {info && status === "running" ? (
              <div
                style={{
                  fontFamily: "var(--font-ui)",
                  fontSize: 14,
                  color: "var(--ink-soft)",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {info.remaining}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <div
        style={{
          fontFamily: "var(--font-ui)",
          fontSize: 13,
          color: "var(--ink-mute)",
          marginBottom: 16,
        }}
      >
        {status === "done"
          ? `${round} round${round === 1 ? "" : "s"} breathed.`
          : status === "idle"
            ? cycle > 0
              ? `${cycle}s a round${roundsTarget ? ` · ${roundsTarget} rounds` : " · open"}`
              : "Set a breath with some length."
            : `Round ${round + 1}${roundsTarget ? ` of ${roundsTarget}` : ""}`}
      </div>

      <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
        {status === "idle" ? (
          <PrimaryButton disabled={cycle === 0} onClick={begin}>
            Begin
          </PrimaryButton>
        ) : status === "running" ? (
          <>
            <QuietButton onClick={() => setStatus("paused")}>Pause</QuietButton>
            <QuietButton onClick={reset}>Stop</QuietButton>
          </>
        ) : status === "paused" ? (
          <>
            <PrimaryButton onClick={() => setStatus("running")}>Resume</PrimaryButton>
            <QuietButton onClick={reset}>Reset</QuietButton>
          </>
        ) : (
          <>
            {kept ? (
              <div
                style={{
                  fontFamily: "var(--font-ui)",
                  fontSize: 13,
                  color: "var(--accent)",
                  alignSelf: "center",
                }}
              >
                Kept ✓
              </div>
            ) : (
              <QuietButton onClick={() => void keepBreath()}>Keep this breath</QuietButton>
            )}
            <PrimaryButton onClick={reset}>Breathe again</PrimaryButton>
          </>
        )}
      </div>

      {sheet ? (
        <KeepingSheet
          title={sheet.title}
          subtitle="Kept. Add how the breath was, if you like."
          onKeep={(v) => void keepDetails(v)}
          onClose={() => setSheet(null)}
          busy={keepBusy}
        />
      ) : null}
    </section>
  );
}

const buttonBase = {
  padding: "10px 22px",
  borderRadius: "var(--r-md, 8px)",
  fontFamily: "var(--font-ui)",
  fontSize: 14,
  cursor: "pointer",
} as const;

function PrimaryButton({
  onClick,
  disabled,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        ...buttonBase,
        border: "1px solid var(--accent)",
        background: disabled ? "var(--bg-2)" : "var(--accent)",
        color: disabled ? "var(--ink-mute)" : "var(--on-accent, #fff)",
        fontWeight: 600,
        cursor: disabled ? "default" : "pointer",
      }}
    >
      {children}
    </button>
  );
}

function QuietButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        ...buttonBase,
        border: "1px solid var(--line)",
        background: "var(--bg-2)",
        color: "var(--ink)",
      }}
    >
      {children}
    </button>
  );
}
