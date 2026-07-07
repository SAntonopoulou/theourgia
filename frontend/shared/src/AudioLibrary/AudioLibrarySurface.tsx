/**
 * AudioLibrarySurface — H07 §S3 surface 17.
 *
 * "By-ear" alternative to the visual Media Library: voces, ritual
 * recordings, and lectures in a single sortable list, with a
 * persistent mini-player along the bottom that always reflects
 * the currently-active track.
 *
 * Honesty + H07 rules:
 *   • NO play counts. (Per H07 rule #4 — anti-gamification.) The
 *     row meta is the descriptive trail ("voce · linked to Hekate
 *     · 15 Jun"), never a play count.
 *   • Sealed rows still show their title — the design's H07
 *     guidance for audio is that the title may be a working-name
 *     the practitioner needs to find. The seal glyph is in
 *     --seal (calm), never --warn or --danger.
 *   • The active play button uses --accent / --accent-ink fill.
 *     Inactive rows use a hollow --line-2 ring + --accent ink.
 *     Never --danger.
 *   • Filter chips: All · Voces · Workings · Lectures · Other.
 *   • Mini-player is presentational only — the surface signals
 *     play / pause / scrub intent; the route owns the audio
 *     element + lifecycle.
 */

import {
  type CSSProperties,
  type ReactElement,
  useMemo,
  useState,
} from "react";

// ── Types ──────────────────────────────────────────────────────────

export type AudioCategory = "voce" | "working" | "lecture" | "other";

export type AudioLibraryFilter = "all" | AudioCategory;

export interface AudioTrack {
  id: string;
  title: string;
  /** Descriptive meta line, e.g. "voce · linked to Hekate · 15 Jun".
   *  NEVER a play count. */
  meta_label: string;
  category: AudioCategory;
  duration_label: string;
  /** Total duration in seconds, for the mini-player. */
  duration_seconds: number;
  sealed: boolean;
}

export interface AudioLibrarySurfaceProps {
  tracks: readonly AudioTrack[];
  active_id?: string | null;
  is_playing?: boolean;
  /** Current position in seconds — used by the mini-player. */
  position_seconds?: number;
  onTogglePlay?: (id: string) => void;
  onScrub?: (seconds: number) => void;
  className?: string;
  style?: CSSProperties;
}

// ── Filter chips ──────────────────────────────────────────────────

const FILTERS: AudioLibraryFilter[] = [
  "all",
  "voce",
  "working",
  "lecture",
  "other",
];

const FILTER_LABELS: Record<AudioLibraryFilter, string> = {
  all: "All",
  voce: "Voces",
  working: "Workings",
  lecture: "Lectures",
  other: "Other",
};

// ── Glyphs ────────────────────────────────────────────────────────

function PlayGlyph(): ReactElement {
  return (
    <svg
      width={14}
      height={14}
      viewBox="0 0 24 24"
      fill="currentColor"
      stroke="none"
      aria-hidden="true"
    >
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

function PauseGlyph(): ReactElement {
  return (
    <svg
      width={15}
      height={15}
      viewBox="0 0 24 24"
      fill="currentColor"
      stroke="none"
      aria-hidden="true"
    >
      <rect x={6} y={5} width={4} height={14} rx={1} />
      <rect x={14} y={5} width={4} height={14} rx={1} />
    </svg>
  );
}

function SealGlyph(): ReactElement {
  return (
    <svg
      width={13}
      height={13}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x={5} y={11} width={14} height={9} rx={2} />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </svg>
  );
}

// ── Animated waveform stand-in ────────────────────────────────────

function MiniWaveform({ seed }: { seed: number }): ReactElement {
  // Deterministic 16-column waveform shape using a tiny PRNG.
  let x = (seed * 2654435761) >>> 0;
  const rnd = () => {
    x ^= x << 13;
    x >>>= 0;
    x ^= x >> 17;
    x ^= x << 5;
    x >>>= 0;
    return x / 4294967296;
  };
  const heights = Array.from(
    { length: 16 },
    () => 20 + Math.round(rnd() * 70),
  );
  return (
    <span
      data-mini-waveform
      style={{
        display: "flex",
        alignItems: "center",
        gap: 2,
        height: 22,
      }}
      aria-hidden="true"
    >
      {heights.map((h, i) => (
        <span
          key={i}
          style={{
            width: 2,
            height: `${h}%`,
            background: "var(--accent)",
            borderRadius: 1,
          }}
        />
      ))}
    </span>
  );
}

// ── Formatting ────────────────────────────────────────────────────

function formatTime(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, "0")}`;
}

// ── Surface ───────────────────────────────────────────────────────

export function AudioLibrarySurface({
  tracks,
  active_id,
  is_playing = false,
  position_seconds = 0,
  onTogglePlay,
  onScrub,
  className,
  style,
}: AudioLibrarySurfaceProps) {
  const [filter, setFilter] = useState<AudioLibraryFilter>("all");

  const visible = useMemo(() => {
    if (filter === "all") return tracks;
    return tracks.filter((t) => t.category === filter);
  }, [tracks, filter]);

  const active = useMemo(
    () => (active_id ? tracks.find((t) => t.id === active_id) : null),
    [tracks, active_id],
  );

  return (
    <div
      data-component="audio-library-surface"
      className={className}
      style={{
        display: "grid",
        gridTemplateRows: "auto auto 1fr auto",
        minWidth: 0,
        minHeight: 0,
        height: "100%",
        ...style,
      }}
    >
      <header
        style={{
          display: "flex",
          alignItems: "center",
          gap: 14,
          padding: "13px 24px",
          borderBottom: "1px solid var(--line)",
          background: "var(--bg)",
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 21,
              lineHeight: 1.1,
            }}
          >
            Audio library
          </div>
          <div
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: 12.5,
              color: "var(--ink-mute)",
              marginTop: 2,
            }}
          >
            Voces, ritual recordings, lectures — by ear.
          </div>
        </div>
      </header>

      <div
        className="scroll"
        role="group"
        aria-label="Category filter"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 7,
          overflowX: "auto",
          padding: "12px 24px",
          borderBottom: "1px solid var(--line)",
          background: "var(--bg)",
        }}
      >
        {FILTERS.map((f) => {
          const on = filter === f;
          return (
            <button
              key={f}
              type="button"
              data-filter={f}
              aria-pressed={on}
              onClick={() => setFilter(f)}
              style={{
                padding: "7px 13px",
                borderRadius: 20,
                border: `1px solid ${on ? "var(--accent)" : "var(--line)"}`,
                background: on ? "var(--accent-soft)" : "var(--bg-2)",
                fontFamily: "var(--font-ui)",
                fontSize: 12.5,
                color: on ? "var(--ink)" : "var(--ink-mute)",
                whiteSpace: "nowrap",
                flex: "none",
                cursor: "pointer",
              }}
            >
              {FILTER_LABELS[f]}
            </button>
          );
        })}
      </div>

      <div
        className="scroll"
        style={{ overflowY: "auto", minHeight: 0, padding: "14px 24px 30px" }}
      >
        <div
          style={{
            maxWidth: 880,
            margin: "0 auto",
            display: "flex",
            flexDirection: "column",
            gap: 2,
          }}
        >
          {visible.length === 0 ? (
            <div
              data-audio-empty
              style={{
                textAlign: "center",
                padding: "8vh 0",
                color: "var(--ink-mute)",
              }}
            >
              <p
                style={{
                  fontFamily: "var(--font-serif)",
                  fontSize: 16,
                  margin: 0,
                  color: "var(--ink-soft)",
                }}
              >
                No audio in this category yet.
              </p>
            </div>
          ) : (
            visible.map((r, i) => {
              const on = r.id === active_id && is_playing;
              const isActive = r.id === active_id;
              return (
                <div
                  key={r.id}
                  data-audio-row={r.id}
                  data-active={isActive}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 15,
                    padding: "13px 14px",
                    borderBottom: "1px solid var(--line)",
                    background: isActive ? "var(--accent-soft)" : "transparent",
                  }}
                >
                  <button
                    type="button"
                    data-row-play={r.id}
                    onClick={() => onTogglePlay?.(r.id)}
                    aria-label={`${on ? "Pause" : "Play"} ${r.title}`}
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: "50%",
                      border: `1px solid ${
                        on ? "var(--accent)" : "var(--line-2)"
                      }`,
                      color: on ? "var(--accent-ink)" : "var(--accent)",
                      background: on ? "var(--accent)" : "transparent",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flex: "none",
                      cursor: "pointer",
                    }}
                  >
                    {on ? <PauseGlyph /> : <PlayGlyph />}
                  </button>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{ display: "flex", alignItems: "center", gap: 9 }}
                    >
                      <span
                        style={{
                          fontFamily: "var(--font-serif)",
                          fontSize: 15.5,
                          color: "var(--ink)",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {r.title}
                      </span>
                      {r.sealed ? (
                        <span
                          data-row-seal
                          style={{
                            display: "flex",
                            color: "var(--seal)",
                          }}
                        >
                          <SealGlyph />
                        </span>
                      ) : null}
                    </div>
                    <div
                      data-row-meta
                      style={{
                        fontFamily: "var(--font-ui)",
                        fontSize: 11.5,
                        color: "var(--ink-mute)",
                        marginTop: 2,
                      }}
                    >
                      {r.meta_label}
                    </div>
                  </div>
                  {on ? <MiniWaveform seed={(i + 1) * 7} /> : null}
                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 12,
                      color: "var(--ink-mute)",
                      flex: "none",
                      width: 48,
                      textAlign: "right",
                    }}
                  >
                    {r.duration_label}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Persistent mini-player */}
      <footer
        data-mini-player
        style={{
          display: "flex",
          alignItems: "center",
          gap: 14,
          padding: "12px 22px",
          borderTop: "1px solid var(--line)",
          background: "var(--bg-2)",
        }}
      >
        <button
          type="button"
          data-mini-toggle
          aria-label={
            !active ? "No track" : is_playing ? "Pause" : "Play"
          }
          disabled={!active}
          onClick={() => active && onTogglePlay?.(active.id)}
          style={{
            width: 40,
            height: 40,
            borderRadius: "50%",
            background: "var(--accent)",
            color: "var(--accent-ink)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flex: "none",
            border: "none",
            cursor: active ? "pointer" : "not-allowed",
            opacity: active ? 1 : 0.55,
          }}
        >
          {is_playing ? <PauseGlyph /> : <PlayGlyph />}
        </button>
        <div style={{ flex: "0 0 200px", minWidth: 0 }}>
          <div
            data-mini-title
            style={{
              fontFamily: "var(--font-serif)",
              fontSize: 14,
              color: "var(--ink)",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {active?.title ?? "—"}
          </div>
          <div
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: 11,
              color: "var(--ink-mute)",
            }}
          >
            {active?.meta_label ?? "Pick a track to begin"}
          </div>
        </div>
        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              color: "var(--ink-mute)",
            }}
          >
            {formatTime(position_seconds)}
          </span>
          <div
            data-mini-scrub
            role="slider"
            aria-label="Scrub"
            aria-valuemin={0}
            aria-valuemax={active?.duration_seconds ?? 0}
            aria-valuenow={Math.round(position_seconds)}
            onClick={(e) => {
              if (!active) return;
              const rect = e.currentTarget.getBoundingClientRect();
              const ratio = Math.max(
                0,
                Math.min(1, (e.clientX - rect.left) / rect.width),
              );
              onScrub?.(ratio * active.duration_seconds);
            }}
            style={{
              flex: 1,
              height: 4,
              borderRadius: 2,
              background: "var(--bg-3)",
              position: "relative",
              cursor: active ? "pointer" : "not-allowed",
            }}
          >
            <div
              data-mini-progress
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                bottom: 0,
                width: active
                  ? `${Math.min(
                      100,
                      Math.max(
                        0,
                        (position_seconds / active.duration_seconds) * 100,
                      ),
                    )}%`
                  : "0%",
                background: "var(--accent)",
                borderRadius: 2,
              }}
            />
          </div>
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              color: "var(--ink-mute)",
            }}
          >
            {active?.duration_label ?? "0:00"}
          </span>
        </div>
      </footer>
    </div>
  );
}
