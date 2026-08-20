/**
 * Meditation — a sitting, timed and quiet.
 *
 * The web mirror of the phone's sitting: choose how long (or sit open-ended),
 * begin, and a soft note marks the end. Self-contained — it needs nothing
 * synced. Recording a finished sitting to the record (so it crosses to the
 * phone) is a later step; for now it is the sitting itself.
 */

import {
  KeepingSheet,
  type KeepingValues,
  type RecordEntryWrite,
  Toast,
  formatClock,
  useTopbar,
} from "@theourgia/shared";
import { useCallback, useEffect, useRef, useState } from "react";

import { amendObservance, keepObservance } from "../data/keepObservance.js";
import { useMyLocation } from "../data/useLocation.js";
import { MOCK_LOCATION } from "../mocks/today.js";

type Status = "idle" | "running" | "paused" | "done";

/** Preset lengths, in minutes; null is an open-ended sit that counts up. */
const PRESETS: { label: string; minutes: number | null }[] = [
  { label: "5 min", minutes: 5 },
  { label: "10 min", minutes: 10 },
  { label: "20 min", minutes: 20 },
  { label: "30 min", minutes: 30 },
  { label: "Open", minutes: null },
];

const RING = 118; // radius
const CIRC = 2 * Math.PI * RING;

/** A soft bell at the end of a sitting, via Web Audio — a gentle sine that
 *  swells and fades. No-op where audio isn't available. */
function playChime(): void {
  try {
    const Ctx =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(528, now);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.22, now + 0.08);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 2.4);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 2.5);
    osc.onended = () => ctx.close();
  } catch {
    // Audio unavailable — the sitting still ends, just in silence.
  }
}

export function MeditationRoute() {
  useTopbar(() => ({ title: "Meditation", subtitle: "A sitting, timed and quiet" }), []);

  const [targetMin, setTargetMin] = useState<number | null>(10);
  const [status, setStatus] = useState<Status>("idle");
  const [elapsed, setElapsed] = useState(0);
  const tick = useRef<ReturnType<typeof setInterval> | null>(null);
  const startedAt = useRef<string | null>(null);

  // Keeping the finished sitting to the record.
  const [sheet, setSheet] = useState<{ entry: RecordEntryWrite; title: string } | null>(null);
  const [kept, setKept] = useState(false);
  const [keepBusy, setKeepBusy] = useState(false);
  const location = useMyLocation({ enabled: true });
  const loc = location.data ?? MOCK_LOCATION;

  const keepSitting = async (): Promise<void> => {
    setKeepBusy(true);
    try {
      const entry = await keepObservance({
        // A plan-less web sitting groups under one synthetic id; a saved plan
        // (later) records under its own.
        subjectKey: "meditation:web-sitting",
        occurrenceAt: startedAt.current ?? new Date().toISOString(),
        durationSeconds: elapsed,
        location: { lat: loc.lat, lng: loc.lng },
      });
      setKept(true);
      setSheet({ entry, title: "Sitting" });
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
      // The sitting itself is kept; the note simply didn't attach.
    } finally {
      setKeepBusy(false);
      setSheet(null);
    }
  };

  const stopTick = useCallback((): void => {
    if (tick.current !== null) {
      clearInterval(tick.current);
      tick.current = null;
    }
  }, []);

  // The one second-hand. Runs only while sitting; cleared on pause, finish and
  // unmount so a left page keeps no timer alive.
  useEffect(() => {
    if (status !== "running") return;
    tick.current = setInterval(() => setElapsed((e) => e + 1), 1000);
    return stopTick;
  }, [status, stopTick]);

  const targetSeconds = targetMin === null ? null : targetMin * 60;
  const remaining = targetSeconds === null ? null : Math.max(0, targetSeconds - elapsed);

  // A timed sit ends itself when the last second falls.
  useEffect(() => {
    if (status === "running" && remaining === 0) {
      setStatus("done");
      playChime();
    }
  }, [status, remaining]);

  const begin = (): void => {
    setElapsed(0);
    setKept(false);
    startedAt.current = new Date().toISOString();
    setStatus("running");
  };
  const reset = (): void => {
    stopTick();
    setElapsed(0);
    setStatus("idle");
  };
  const finish = (): void => {
    stopTick();
    setStatus("done");
    playChime();
  };

  const shown = remaining === null ? elapsed : remaining;
  const progress =
    targetSeconds === null
      ? (elapsed % 60) / 60 // a slow minute-sweep when open-ended
      : Math.min(1, elapsed / targetSeconds);

  return (
    <section
      style={{
        maxWidth: 520,
        margin: "0 auto",
        padding: "var(--space-5, 24px)",
        textAlign: "center",
      }}
    >
      {/* Length — chosen before the sit, locked while it runs. */}
      <div
        role="group"
        aria-label="Sitting length"
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 8,
          justifyContent: "center",
          marginBottom: 28,
          opacity: status === "idle" ? 1 : 0.5,
        }}
      >
        {PRESETS.map((p) => {
          const active = p.minutes === targetMin;
          return (
            <button
              key={p.label}
              type="button"
              disabled={status !== "idle"}
              aria-pressed={active}
              onClick={() => setTargetMin(p.minutes)}
              style={{
                padding: "7px 14px",
                borderRadius: 999,
                border: `1px solid ${active ? "var(--accent)" : "var(--line)"}`,
                background: active ? "var(--accent-soft)" : "var(--bg-2)",
                color: "var(--ink)",
                fontFamily: "var(--font-ui)",
                fontSize: 13,
                cursor: status === "idle" ? "pointer" : "default",
              }}
            >
              {p.label}
            </button>
          );
        })}
      </div>

      {/* The dial. */}
      <div style={{ position: "relative", width: 280, height: 280, margin: "0 auto 28px" }}>
        <svg width="280" height="280" viewBox="0 0 280 280" aria-hidden="true">
          <circle cx="140" cy="140" r={RING} fill="none" stroke="var(--line)" strokeWidth="6" />
          <circle
            cx="140"
            cy="140"
            r={RING}
            fill="none"
            stroke="var(--accent)"
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={CIRC}
            strokeDashoffset={CIRC * (1 - progress)}
            transform="rotate(-90 140 140)"
            style={{ transition: "stroke-dashoffset 0.9s linear" }}
          />
        </svg>
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            aria-live="off"
            style={{
              fontFamily: "var(--font-display, var(--font-serif))",
              fontSize: 46,
              color: "var(--ink)",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {formatClock(shown)}
          </div>
          <div style={{ fontFamily: "var(--font-ui)", fontSize: 12.5, color: "var(--ink-mute)" }}>
            {status === "done"
              ? "Sitting complete"
              : targetMin === null
                ? "Open sitting"
                : status === "running"
                  ? "remaining"
                  : status === "paused"
                    ? "paused"
                    : "ready"}
          </div>
        </div>
      </div>

      {/* Controls, by state. */}
      <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
        {status === "idle" ? (
          <PrimaryButton onClick={begin}>Begin</PrimaryButton>
        ) : status === "running" ? (
          <>
            <QuietButton onClick={() => setStatus("paused")}>Pause</QuietButton>
            <QuietButton onClick={finish}>Finish</QuietButton>
          </>
        ) : status === "paused" ? (
          <>
            <PrimaryButton onClick={() => setStatus("running")}>Resume</PrimaryButton>
            <QuietButton onClick={reset}>Reset</QuietButton>
          </>
        ) : (
          <>
            <div
              style={{
                fontFamily: "var(--font-ui)",
                fontSize: 14,
                color: "var(--ink-soft)",
                alignSelf: "center",
                marginRight: 6,
              }}
            >
              You sat {formatClock(elapsed)}.
            </div>
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
              <QuietButton onClick={() => void keepSitting()}>Keep this sitting</QuietButton>
            )}
            <PrimaryButton onClick={reset}>Sit again</PrimaryButton>
          </>
        )}
      </div>

      {sheet ? (
        <KeepingSheet
          title={sheet.title}
          subtitle="Kept. Add how the sitting was, if you like."
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

function PrimaryButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        ...buttonBase,
        border: "1px solid var(--accent)",
        background: "var(--accent)",
        color: "var(--on-accent, #fff)",
        fontWeight: 600,
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
