/**
 * The four-station daily rite (né Liber Resh) — /daily-practice/resh.
 *
 * v1-058 upgrade: station labels are now SERVER-DRIVEN — the ``hellenic``
 * preset ships as default, ``thelemic`` remains available, and per-station
 * overrides layer on top. This surface composes:
 *
 *   Hero    · ReshNextAdoration — the next station + countdown, with the
 *             preset's own godform/direction/invocation.
 *   Cards   · one ReshStationCard per station. Rule 66 (H12): the
 *             minimum-viable station (dusk by default) carries the
 *             `minimum viable` chip and the only primary CTA.
 *   Streak  · ReshStreakGrid over the trailing ten weeks; the big number
 *             follows the minimum-viable-station rule.
 *   Config  · the rite configuration (GET/PUT /api/v1/resh/config):
 *             preset picker · minimum-viable-station select · per-station
 *             label overrides.
 *
 * Wire: ``GET /api/v1/resh/today`` · ``GET/POST /api/v1/resh/adorations``
 * · ``GET/PUT /api/v1/resh/config``.
 */

import {
  RESH_STATION_ORDER,
  type ReshAdorationRead,
  type ReshConfigRead,
  ReshNextAdoration,
  type ReshStation,
  ReshStationCard,
  type ReshStationOverride,
  type ReshStationRead,
  type ReshStreakDay,
  ReshStreakGrid,
  type ReshTodayRead,
  type ReshTransitionWire,
  Skeleton,
  Toast,
  useApiCall,
  useTopbar,
} from "@theourgia/shared";
import { useEffect, useMemo, useState } from "react";

import { apiMethods } from "../data/api.js";
import { useMyLocation } from "../data/useLocation.js";
import { STATION_LABEL } from "./TodayPractice.js";

/** Trailing window the streak grid renders (ten weeks). */
const STREAK_DAYS = 70;

const PRESET_LABEL: Record<"hellenic" | "thelemic", string> = {
  hellenic: "Hellenic",
  thelemic: "Thelemic",
};

const OVERRIDE_FIELDS = [
  ["godform", "Godform"],
  ["direction", "Direction"],
  ["short_invocation", "Invocation"],
] as const;

function minuteOfDayLocal(iso: string): number {
  const d = new Date(iso);
  return d.getHours() * 60 + d.getMinutes();
}

function minuteOfDayUtc(iso: string): number {
  const d = new Date(iso);
  return d.getUTCHours() * 60 + d.getUTCMinutes();
}

function fmtCountdown(ms: number): string {
  const totalMin = Math.max(0, Math.round(ms / 60_000));
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

/** Local civil date (YYYY-MM-DD) ``offset`` days before today. */
function localIsoDate(offsetDays: number): string {
  const d = new Date();
  d.setDate(d.getDate() - offsetDays);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

function buildStreakDays(adorations: ReshAdorationRead[]): ReshStreakDay[] {
  const counts = new Map<string, number>();
  for (const a of adorations) {
    counts.set(a.civil_date, (counts.get(a.civil_date) ?? 0) + 1);
  }
  const days: ReshStreakDay[] = [];
  for (let i = STREAK_DAYS - 1; i >= 0; i--) {
    const date = localIsoDate(i);
    days.push({ date, count: Math.min(4, counts.get(date) ?? 0) });
  }
  return days;
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "8px 10px",
  border: "1px solid var(--line-2)",
  borderRadius: "var(--r-md, 8px)",
  background: "var(--bg)",
  color: "var(--ink)",
  fontFamily: "var(--font-ui)",
  fontSize: 13,
};

const fieldLabelStyle: React.CSSProperties = {
  display: "block",
  fontFamily: "var(--font-ui)",
  fontSize: 11,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "var(--ink-mute)",
  marginBottom: 5,
};

type OverrideDraft = Partial<
  Record<ReshTransitionWire, { godform: string; direction: string; short_invocation: string }>
>;

function draftFromConfig(config: ReshConfigRead): OverrideDraft {
  const draft: OverrideDraft = {};
  for (const key of RESH_STATION_ORDER) {
    const o = config.stations[key];
    draft[key] = {
      godform: o?.godform ?? "",
      direction: o?.direction ?? "",
      short_invocation: o?.short_invocation ?? "",
    };
  }
  return draft;
}

/** The rite configuration panel (GET/PUT /api/v1/resh/config). */
function RiteConfigPanel({
  today,
  onSaved,
}: {
  today: ReshTodayRead | null;
  onSaved: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const config = useApiCall<ReshConfigRead>((signal) => apiMethods.getReshConfig({ signal }));

  const [preset, setPreset] = useState<"hellenic" | "thelemic" | null>(null);
  const [minStation, setMinStation] = useState<ReshTransitionWire | null>(null);
  const [overrides, setOverrides] = useState<OverrideDraft | null>(null);
  const [saving, setSaving] = useState(false);

  const loaded = config.status === "ok" && config.data ? config.data : null;
  const effPreset = preset ?? loaded?.preset ?? "hellenic";
  const effMin = minStation ?? loaded?.minimum_viable_station ?? "sunset";
  const effOverrides = overrides ?? (loaded ? draftFromConfig(loaded) : null);

  function setOverrideField(
    station: ReshTransitionWire,
    field: (typeof OVERRIDE_FIELDS)[number][0],
    value: string,
  ): void {
    const base = effOverrides ?? {};
    setOverrides({
      ...base,
      [station]: {
        godform: "",
        direction: "",
        short_invocation: "",
        ...base[station],
        [field]: value,
      },
    });
  }

  async function save(): Promise<void> {
    setSaving(true);
    try {
      const stations: Partial<Record<ReshTransitionWire, ReshStationOverride>> = {};
      if (effOverrides) {
        for (const key of RESH_STATION_ORDER) {
          const o = effOverrides[key];
          if (!o) continue;
          const cleaned: ReshStationOverride = {};
          if (o.godform.trim()) cleaned.godform = o.godform.trim();
          if (o.direction.trim()) cleaned.direction = o.direction.trim();
          if (o.short_invocation.trim()) cleaned.short_invocation = o.short_invocation.trim();
          if (Object.keys(cleaned).length > 0) stations[key] = cleaned;
        }
      }
      await apiMethods.putReshConfig({
        preset: effPreset,
        minimum_viable_station: effMin,
        stations,
      });
      Toast.push({ tone: "success", title: "Rite configuration saved" });
      await Promise.all([config.refresh(), onSaved()]);
      setPreset(null);
      setMinStation(null);
      setOverrides(null);
    } catch (e) {
      Toast.push({
        tone: "warning",
        title: "Could not save the configuration",
        body: e instanceof Error ? e.message : "Try again.",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <section
      data-component="rite-config"
      style={{
        border: "1px solid var(--line)",
        borderRadius: "var(--r-lg, 14px)",
        background: "var(--bg-2)",
        overflow: "hidden",
      }}
    >
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          width: "100%",
          padding: "13px 17px",
          background: "transparent",
          border: "none",
          color: "var(--ink)",
          fontFamily: "var(--font-display, var(--font-serif))",
          fontSize: 15.5,
          textAlign: "left",
          cursor: "pointer",
        }}
      >
        <span style={{ flex: 1 }}>Configure the rite</span>
        <span
          style={{
            fontFamily: "var(--font-ui)",
            fontSize: 11.5,
            color: "var(--ink-mute)",
          }}
        >
          {PRESET_LABEL[effPreset]} preset · {STATION_LABEL[effMin].toLowerCase()} minimum
        </span>
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          style={{
            color: "var(--ink-mute)",
            transform: open ? "rotate(180deg)" : "none",
          }}
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {open ? (
        config.status === "loading" || config.status === "idle" ? (
          <div style={{ padding: "0 17px 15px" }}>
            <Skeleton kind="text" width="40%" />
          </div>
        ) : config.status === "error" ? (
          <div
            style={{
              padding: "0 17px 15px",
              fontFamily: "var(--font-ui)",
              fontSize: 12.5,
              color: "var(--ink-mute)",
            }}
          >
            Couldn't load the rite configuration
            {config.error?.message ? ` — ${config.error.message}` : "."}
          </div>
        ) : (
          <div
            style={{
              padding: "2px 17px 16px",
              borderTop: "1px solid var(--line)",
              display: "flex",
              flexDirection: "column",
              gap: 16,
            }}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                gap: 14,
                paddingTop: 14,
              }}
            >
              <div>
                <label style={fieldLabelStyle} htmlFor="resh-preset">
                  Preset
                </label>
                <select
                  id="resh-preset"
                  value={effPreset}
                  onChange={(e) => setPreset(e.target.value as "hellenic" | "thelemic")}
                  style={inputStyle}
                >
                  <option value="hellenic">Hellenic</option>
                  <option value="thelemic">Thelemic</option>
                </select>
              </div>
              <div>
                <label style={fieldLabelStyle} htmlFor="resh-min-station">
                  Minimum-viable station
                </label>
                <select
                  id="resh-min-station"
                  value={effMin}
                  onChange={(e) => setMinStation(e.target.value as ReshTransitionWire)}
                  style={inputStyle}
                >
                  {RESH_STATION_ORDER.map((key) => (
                    <option key={key} value={key}>
                      {STATION_LABEL[key]}
                    </option>
                  ))}
                </select>
                <div
                  style={{
                    fontFamily: "var(--font-ui)",
                    fontSize: 11.5,
                    color: "var(--ink-mute)",
                    marginTop: 5,
                    lineHeight: 1.45,
                  }}
                >
                  The streak holds if this station is done; the other three are kept or
                  not, without penalty.
                </div>
              </div>
            </div>

            <div>
              <div style={{ ...fieldLabelStyle, marginBottom: 8 }}>
                Station overrides — leave blank to use the preset
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                  gap: 12,
                }}
              >
                {RESH_STATION_ORDER.map((key) => {
                  const stationToday = today?.stations.find((s) => s.transition === key);
                  const draft = effOverrides?.[key];
                  return (
                    <div
                      key={key}
                      style={{
                        border: "1px solid var(--line)",
                        borderRadius: "var(--r-md, 8px)",
                        padding: "11px 12px",
                        display: "flex",
                        flexDirection: "column",
                        gap: 8,
                      }}
                    >
                      <div
                        style={{
                          fontFamily: "var(--font-display, var(--font-serif))",
                          fontSize: 14.5,
                          color: "var(--ink)",
                        }}
                      >
                        {STATION_LABEL[key]}
                      </div>
                      {OVERRIDE_FIELDS.map(([field, label]) => (
                        <div key={field}>
                          <label style={fieldLabelStyle} htmlFor={`resh-${key}-${field}`}>
                            {label}
                          </label>
                          <input
                            id={`resh-${key}-${field}`}
                            type="text"
                            value={draft?.[field] ?? ""}
                            placeholder={stationToday?.[field] ?? ""}
                            onChange={(e) => setOverrideField(key, field, e.target.value)}
                            style={inputStyle}
                          />
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button
                type="button"
                onClick={() => void save()}
                disabled={saving}
                style={{
                  padding: "9px 18px",
                  borderRadius: "var(--r-md, 8px)",
                  background: "var(--accent)",
                  color: "var(--accent-ink, white)",
                  fontFamily: "var(--font-ui)",
                  fontWeight: 700,
                  fontSize: 13,
                  border: "none",
                  cursor: saving ? "default" : "pointer",
                  opacity: saving ? 0.7 : 1,
                }}
              >
                {saving ? "Saving…" : "Save configuration"}
              </button>
            </div>
          </div>
        )
      ) : null}
    </section>
  );
}

export function LiberReshRoute() {
  useTopbar(
    () => ({
      title: "Daily rite",
      subtitle: "The four stations of the sun — dawn, noon, dusk, night",
    }),
    [],
  );

  const location = useMyLocation({ enabled: true });
  const tz = useMemo(() => Intl.DateTimeFormat().resolvedOptions().timeZone, []);
  const lat = location.data?.lat;
  const lng = location.data?.lng;

  const today = useApiCall<ReshTodayRead>(
    (signal) => apiMethods.reshToday({ lat: lat ?? 0, lng: lng ?? 0, tz, signal }),
    { skip: lat === undefined || lng === undefined },
  );
  const adorations = useApiCall<ReshAdorationRead[]>((signal) =>
    apiMethods.listReshAdorations({ since: localIsoDate(STREAK_DAYS - 1), signal }),
  );

  // A slow clock so the countdown + next-station highlight stay honest
  // without re-rendering every second.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);

  const [marking, setMarking] = useState<ReshStation | null>(null);

  async function markObserved(transition: ReshStation): Promise<void> {
    setMarking(transition);
    try {
      await apiMethods.createReshAdoration({
        transition,
        civil_date: today.data?.civil_date ?? null,
      });
      await Promise.all([today.refresh(), adorations.refresh()]);
    } catch (e) {
      Toast.push({
        tone: "warning",
        title: "Could not record the adoration",
        body: e instanceof Error ? e.message : "Try again — the record was not saved.",
      });
    } finally {
      setMarking(null);
    }
  }

  const data = today.data ?? null;
  const stations: ReshStationRead[] = data?.stations ?? [];
  const minimumStation: ReshTransitionWire = data?.minimum_viable_station ?? "sunset";
  // The next upcoming station of the civil day, by clock time.
  const next = stations.find((s) => s.at !== null && new Date(s.at).getTime() > now) ?? null;

  const streakDays = useMemo(
    () => buildStreakDays(Array.isArray(adorations.data) ? adorations.data : []),
    [adorations.data],
  );
  const observedToday = stations.filter((s) => s.observed_at !== null).length;

  const loading =
    location.status === "loading" ||
    location.status === "idle" ||
    today.status === "loading" ||
    today.status === "idle";

  return (
    <div
      className="scroll"
      style={{ overflowY: "auto", overflowX: "hidden", minHeight: 0, padding: "24px 28px" }}
    >
      <div
        // .td-rite — container-query root: the .td-stations grid below
        // sizes against this column's real width (v1-068).
        className="td-rite"
        style={{
          maxWidth: "min(860px, var(--shell-content-max, 860px))",
          margin: "0 auto",
          display: "flex",
          flexDirection: "column",
          gap: 18,
        }}
      >
        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {[0, 1, 2].map((i) => (
              <div
                key={`resh-skel-${i}`}
                style={{
                  background: "var(--bg-2)",
                  border: "1px solid var(--line)",
                  borderRadius: "var(--r-lg, 14px)",
                  padding: 18,
                }}
              >
                <Skeleton kind="text" width="50%" />
              </div>
            ))}
          </div>
        ) : today.status === "error" ? (
          <div
            style={{
              border: "1px solid var(--line)",
              borderRadius: "var(--r-lg, 14px)",
              background: "var(--bg-2)",
              padding: "22px 24px",
              fontFamily: "var(--font-serif)",
              fontSize: 14.5,
              lineHeight: 1.55,
              color: "var(--ink-soft)",
            }}
          >
            Couldn't compute today's stations:{" "}
            {today.error?.message ?? location.error?.message ?? "unknown error."}
          </div>
        ) : (
          <>
            {next?.at ? (
              <ReshNextAdoration
                station={next.transition}
                label={STATION_LABEL[next.transition]}
                adoration={{
                  godform: next.godform,
                  direction: next.direction,
                  invocation: next.short_invocation,
                }}
                stationMin={minuteOfDayLocal(next.at)}
                stationMinUtc={minuteOfDayUtc(next.at)}
                countdown={fmtCountdown(new Date(next.at).getTime() - now)}
              />
            ) : null}

            {/* Rule 66 in words. */}
            <div
              data-rite-rule
              style={{
                fontFamily: "var(--font-ui)",
                fontSize: 12,
                color: "var(--ink-mute)",
              }}
            >
              {STATION_LABEL[minimumStation]} is the station that must be kept — the
              streak holds if {STATION_LABEL[minimumStation].toLowerCase()} is done. The
              other three are kept or not, without penalty.
            </div>

            {/* Same container-driven 1 → 2×2 → 4 column contract as the
                Today rite row (theourgia.shared.css .td-stations). */}
            <div
              className="td-stations"
              style={{
                display: "grid",
                gap: 14,
              }}
            >
              {stations.map((s) => {
                const observed = s.observed_at !== null;
                const passed = s.at !== null && new Date(s.at).getTime() < now;
                return s.at !== null ? (
                  <ReshStationCard
                    key={s.transition}
                    station={s.transition}
                    label={STATION_LABEL[s.transition]}
                    adoration={{
                      godform: s.godform,
                      direction: s.direction,
                      invocation: s.short_invocation,
                    }}
                    stationMin={minuteOfDayLocal(s.at)}
                    stationMinUtc={minuteOfDayUtc(s.at)}
                    isNext={next?.transition === s.transition}
                    isMinimum={s.transition === minimumStation}
                    isFaded={passed && !observed}
                    {...(observed && s.observed_at
                      ? {
                          observation: {
                            atMin: minuteOfDayLocal(s.observed_at),
                            ...(s.note ? { note: s.note } : {}),
                          },
                        }
                      : {})}
                    onMarkObserved={
                      observed || marking !== null
                        ? undefined
                        : () => void markObserved(s.transition)
                    }
                  />
                ) : (
                  <div
                    key={s.transition}
                    style={{
                      border: "1px dashed var(--line)",
                      borderRadius: "var(--r-lg, 14px)",
                      padding: "15px 16px",
                      fontFamily: "var(--font-ui)",
                      fontSize: 12.5,
                      color: "var(--ink-mute)",
                    }}
                  >
                    {STATION_LABEL[s.transition]} — no transition at this latitude today
                    (polar day or night).
                  </div>
                );
              })}
            </div>

            <ReshStreakGrid
              days={streakDays}
              streakOverride={data?.streak_days ?? 0}
              subtitle={`${observedToday} of ${stations.length || 4} kept so far today · the streak follows ${STATION_LABEL[minimumStation].toLowerCase()} — a record, not a scoreboard`}
            />

            <RiteConfigPanel
              today={data}
              onSaved={async () => {
                await today.refresh();
              }}
            />
          </>
        )}
      </div>
    </div>
  );
}
