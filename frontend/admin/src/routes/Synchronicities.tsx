/**
 * Synchronicities — the omen-record surface.
 *
 * Composition tracks ``Theourgia Synchronicities.dc.html``:
 *   Topbar   · "Synchronicities" + "X signs noted" subtitle (open/confirmed
 *              counts ship when the status field lands on Entry).
 *   Composer · "Note a sign" textarea + toolbar (Hour-of-X · Add place ·
 *              Charge segments · Capture). Charge is local-only until the
 *              field lands on Entry.
 *   Stream   · Existing entries with ``type=synchronicity``, date-grouped.
 *   Right    · Recurring motifs (empty — aggregation pending), A cluster
 *              (empty — pattern detection pending), Footer note (static).
 *
 * Sophia's intent (design's footer): "A sign noted is not a sign
 * interpreted. The record holds both — and lets the meaning arrive in
 * its own time." Reading + status fields land when the entry-detail
 * surface ships; for now the row shows text + when.
 */

import {
  type EntryRecord,
  Skeleton,
  Toast,
  useApiCall,
  useCelestial,
  useSession,
  useTopbar,
} from "@theourgia/shared";
import { useMemo, useState } from "react";

import { apiMethods } from "../data/api.js";
import { createEntry } from "../data/useEntries.js";
import { useMyLocation } from "../data/useLocation.js";
import { MOCK_LOCATION } from "../mocks/today.js";

// ─── Helpers ────────────────────────────────────────────────────────────────

const PLANET_LABEL: Record<string, string> = {
  sun: "Sun",
  moon: "Moon",
  mars: "Mars",
  mercury: "Mercury",
  jupiter: "Jupiter",
  venus: "Venus",
  saturn: "Saturn",
};

function timeOfDay(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

type DateGroupKey = "today" | "thisWeek" | "earlier";

function dateGroupOf(iso: string, now: Date): DateGroupKey {
  const d = new Date(iso);
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  if (d.getTime() >= start.getTime()) return "today";
  const weekAgo = new Date(start);
  weekAgo.setDate(weekAgo.getDate() - 7);
  if (d.getTime() >= weekAgo.getTime()) return "thisWeek";
  return "earlier";
}

function groupHeading(key: DateGroupKey): string {
  switch (key) {
    case "today":
      return "Today";
    case "thisWeek":
      return "This week";
    case "earlier":
      return "Earlier";
  }
}

type Charge = 1 | 2 | 3;

const CHARGE_GLYPH: Record<Charge, string> = {
  1: "·",
  2: "∷",
  3: "✸",
};

const CHARGE_LABEL: Record<Charge, string> = {
  1: "Faint",
  2: "Clear",
  3: "Striking",
};

// ─── Composer ───────────────────────────────────────────────────────────────

function Composer({
  hourRulerLabel,
  onSubmit,
}: {
  hourRulerLabel: string;
  onSubmit: (text: string, charge: Charge) => void;
}) {
  const [text, setText] = useState("");
  const [charge, setCharge] = useState<Charge>(2);

  function handleSubmit(): void {
    const t = text.trim();
    if (t.length < 3) return;
    onSubmit(t, charge);
    setText("");
    setCharge(2);
  }

  return (
    <article
      style={{
        border: "1px solid var(--line-2)",
        borderRadius: "var(--r-lg, 14px)",
        background: "var(--bg-2)",
        overflow: "hidden",
        marginBottom: 30,
      }}
    >
      <div style={{ padding: "18px 20px" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            marginBottom: 13,
          }}
        >
          <span
            aria-hidden="true"
            style={{
              fontFamily: "var(--font-glyph, var(--font-serif))",
              color: "var(--c-synchronicity)",
              fontSize: 18,
            }}
          >
            ✶
          </span>
          <span
            style={{
              fontFamily: "var(--font-display, var(--font-serif))",
              fontSize: 18,
            }}
          >
            Note a sign
          </span>
        </div>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="A raven on the sill at the hour I closed the working…"
          rows={3}
          style={{
            display: "block",
            width: "100%",
            minHeight: 70,
            padding: "12px 14px",
            border: "1px solid var(--line)",
            borderRadius: "var(--r-md, 8px)",
            background: "var(--bg)",
            fontFamily: "var(--font-serif)",
            fontSize: 16,
            lineHeight: 1.55,
            color: "var(--ink)",
            resize: "vertical",
            outline: "none",
          }}
        />
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 14,
          flexWrap: "wrap",
          padding: "13px 20px",
          borderTop: "1px solid var(--line)",
          background: "var(--bg-sunk, var(--bg))",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 7,
            fontFamily: "var(--font-ui)",
            fontSize: 12,
            color: "var(--ink-mute)",
          }}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7v5l3 2" />
          </svg>
          Now · Hour of {hourRulerLabel}
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 7,
            fontFamily: "var(--font-ui)",
            fontSize: 12,
            color: "var(--ink-mute)",
          }}
          title="Place tagging lands when the location field ships."
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M12 21s7-5.5 7-11a7 7 0 0 0-14 0c0 5.5 7 11 7 11z" />
            <circle cx="12" cy="10" r="2.5" />
          </svg>
          Add place
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginLeft: "auto",
          }}
        >
          <span
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: 11,
              color: "var(--ink-mute)",
            }}
          >
            Charge
          </span>
          <div role="group" aria-label="Charge" style={{ display: "flex", gap: 4 }}>
            {([1, 2, 3] as Charge[]).map((value) => {
              const selected = charge === value;
              return (
                <button
                  key={value}
                  type="button"
                  data-charge
                  aria-pressed={selected}
                  aria-label={CHARGE_LABEL[value]}
                  onClick={() => setCharge(value)}
                  style={{
                    width: 30,
                    height: 30,
                    border: "1px solid var(--line-2)",
                    borderRadius: "var(--r-sm, 4px)",
                    background: selected ? "var(--accent-soft)" : "transparent",
                    color: selected ? "var(--ink)" : "var(--ink-mute)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontFamily: value === 3 ? "var(--font-glyph, var(--font-serif))" : "inherit",
                    fontSize: value === 3 ? 13 : value === 2 ? 12 : 14,
                    cursor: "pointer",
                  }}
                >
                  {CHARGE_GLYPH[value]}
                </button>
              );
            })}
          </div>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={text.trim().length < 3}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 7,
              padding: "8px 16px",
              borderRadius: "var(--r-md, 8px)",
              background: "var(--c-synchronicity)",
              color: "var(--bg)",
              fontFamily: "var(--font-ui)",
              fontWeight: 700,
              fontSize: 13,
              border: "none",
              cursor: text.trim().length < 3 ? "not-allowed" : "pointer",
              opacity: text.trim().length < 3 ? 0.6 : 1,
            }}
          >
            Capture
          </button>
        </div>
      </div>
    </article>
  );
}

// ─── Stream item + grouped section ──────────────────────────────────────────

function StreamItem({ entry }: { entry: EntryRecord }) {
  return (
    <article
      className="entry-row"
      style={{
        border: "1px solid var(--line)",
        borderLeft: "3px solid var(--c-synchronicity)",
        borderRadius: "var(--r-md, 8px)",
        background: "var(--bg-2)",
        padding: "16px 18px",
        transition: "background-color 0.15s ease",
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
        <span
          aria-hidden="true"
          style={{
            fontFamily: "var(--font-glyph, var(--font-serif))",
            color: "var(--c-synchronicity)",
            fontSize: 17,
            flex: "none",
            marginTop: 1,
          }}
        >
          ✶
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p
            style={{
              fontFamily: "var(--font-serif)",
              fontSize: 16,
              lineHeight: 1.55,
              color: "var(--ink)",
              margin: "0 0 8px",
            }}
          >
            {entry.excerpt || entry.title}
          </p>
          {/* Reading + link + status fields aren't on Entry yet — design's
              row shows them when present; ours leaves them out for now. */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              flexWrap: "wrap",
            }}
          >
            <span
              style={{
                fontFamily: "var(--font-ui)",
                fontSize: 11.5,
                color: "var(--ink-mute)",
              }}
            >
              {timeOfDay(entry.created_at)}
            </span>
            <span
              style={{
                fontFamily: "var(--font-ui)",
                fontSize: 11.5,
                color: "var(--ink-mute)",
                marginLeft: "auto",
              }}
            >
              Noted
            </span>
          </div>
        </div>
      </div>
    </article>
  );
}

function GroupedStream({
  heading,
  items,
}: {
  heading: string;
  items: EntryRecord[];
}) {
  if (items.length === 0) return null;
  return (
    <section style={{ marginBottom: 26 }}>
      <div
        style={{
          fontFamily: "var(--font-ui)",
          fontSize: 11,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: "var(--ink-mute)",
          marginBottom: 12,
        }}
      >
        {heading}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {items.map((entry) => (
          <StreamItem key={entry.id} entry={entry} />
        ))}
      </div>
    </section>
  );
}

// ─── Right rail ─────────────────────────────────────────────────────────────

const railCardStyle: React.CSSProperties = {
  background: "var(--bg-2)",
  border: "1px solid var(--line)",
  borderRadius: "var(--r-lg, 14px)",
  padding: "18px 20px",
};

const railLabel: React.CSSProperties = {
  fontFamily: "var(--font-ui)",
  fontSize: 10.5,
  letterSpacing: "0.16em",
  textTransform: "uppercase",
  color: "var(--ink-mute)",
  marginBottom: 14,
};

function RecurringMotifsCard() {
  return (
    <article style={railCardStyle}>
      <div style={railLabel}>Recurring motifs</div>
      <div
        style={{
          fontFamily: "var(--font-ui)",
          fontSize: 12,
          color: "var(--ink-mute)",
          lineHeight: 1.55,
        }}
      >
        Motif aggregation lights up after enough signs accumulate — the ingest engine reads
        recurring symbols, places, and phrases from your captures.
      </div>
    </article>
  );
}

function ClusterCard() {
  return (
    <article style={railCardStyle}>
      <div style={{ ...railLabel, marginBottom: 11 }}>A cluster</div>
      <div
        style={{
          fontFamily: "var(--font-ui)",
          fontSize: 12,
          color: "var(--ink-mute)",
          lineHeight: 1.55,
        }}
      >
        Pattern detection across signs and rites lands with the analytics surface.
      </div>
    </article>
  );
}

function FooterNote() {
  return (
    <article
      style={{
        background: "var(--bg-2)",
        border: "1px solid var(--line)",
        borderRadius: "var(--r-lg, 14px)",
        padding: "16px 20px",
      }}
    >
      <div style={{ display: "flex", gap: 10 }}>
        <svg
          width="17"
          height="17"
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--ink-mute)"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ flex: "none", marginTop: 1 }}
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="9" />
          <path d="M12 16v-4M12 8h.01" />
        </svg>
        <p
          style={{
            fontFamily: "var(--font-ui)",
            fontSize: 12,
            lineHeight: 1.55,
            color: "var(--ink-mute)",
            margin: 0,
          }}
        >
          A sign noted is not a sign interpreted. The record holds both — and lets the meaning
          arrive in its own time.
        </p>
      </div>
    </article>
  );
}

// ─── Page ───────────────────────────────────────────────────────────────────

export function Synchronicities() {
  const session = useSession();
  const locationCall = useMyLocation({ enabled: session !== null });
  const location = locationCall.data ?? MOCK_LOCATION;
  const celestial = useCelestial({ lat: location.lat, lng: location.lng });

  // Only synchronicities. listEntries supports a ?type= filter.
  const entries = useApiCall<EntryRecord[]>((signal) =>
    apiMethods.listEntries({ signal, type: "synchronicity" }),
  );

  const total = entries.data?.length ?? 0;
  const subtitle = `${total.toLocaleString()} signs noted`;
  useTopbar(
    () => ({
      title: "Synchronicities",
      subtitle,
    }),
    [subtitle],
  );

  const now = useMemo(() => new Date(), []);
  const groups = useMemo(() => {
    const buckets: Record<DateGroupKey, EntryRecord[]> = {
      today: [],
      thisWeek: [],
      earlier: [],
    };
    for (const e of entries.data ?? []) {
      buckets[dateGroupOf(e.created_at, now)].push(e);
    }
    return buckets;
  }, [entries.data, now]);

  async function handleCapture(text: string, _charge: Charge): Promise<void> {
    // ``_charge`` is local-only until Entry gains a charge field.
    try {
      await createEntry({
        title: text.slice(0, 80),
        type: "synchronicity",
        excerpt: text,
        glyph: "synchronicity",
      });
      Toast.push({ tone: "success", title: "Sign noted" });
      await entries.refresh();
    } catch (e) {
      Toast.push({
        tone: "error",
        title: "Couldn't note the sign",
        body: e instanceof Error ? e.message : String(e),
      });
    }
  }

  const hourRulerLabel = PLANET_LABEL[celestial.planetary.ruler] ?? "—";

  return (
    <div style={{ maxWidth: 1080, margin: "0 auto" }}>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "flex-start",
          gap: 26,
        }}
      >
        {/* LEFT */}
        <div style={{ flex: "2 1 460px", minWidth: 0 }}>
          <Composer hourRulerLabel={hourRulerLabel} onSubmit={handleCapture} />

          {entries.status === "loading" ? (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 12,
                marginBottom: 26,
              }}
            >
              {[0, 1, 2].map((i) => (
                <div
                  key={`sync-skel-${i}`}
                  style={{
                    border: "1px solid var(--line)",
                    borderLeft: "3px solid var(--c-synchronicity)",
                    borderRadius: "var(--r-md, 8px)",
                    background: "var(--bg-2)",
                    padding: "16px 18px",
                  }}
                >
                  <Skeleton kind="text" width="100%" />
                  <div style={{ height: 6 }} />
                  <Skeleton kind="text" width="70%" />
                </div>
              ))}
            </div>
          ) : entries.status === "error" ? (
            <div
              style={{
                border: "1px solid var(--line)",
                borderRadius: "var(--r-lg, 14px)",
                background: "var(--bg-2)",
                padding: "20px 24px",
                fontFamily: "var(--font-serif)",
                fontSize: 14.5,
                color: "var(--ink-soft)",
              }}
            >
              Couldn't load signs: {entries.error?.message ?? "unknown error."}
            </div>
          ) : total === 0 ? (
            <div
              style={{
                border: "1px solid var(--line)",
                borderRadius: "var(--r-lg, 14px)",
                background: "var(--bg-2)",
                padding: "32px 24px",
                textAlign: "center",
                fontFamily: "var(--font-serif)",
                fontSize: 14.5,
                color: "var(--ink-mute)",
                lineHeight: 1.6,
              }}
            >
              No signs noted yet. Note the first one above — even small things, even ones that don't
              yet feel like signs.
            </div>
          ) : (
            <>
              <GroupedStream heading={groupHeading("today")} items={groups.today} />
              <GroupedStream heading={groupHeading("thisWeek")} items={groups.thisWeek} />
              <GroupedStream heading={groupHeading("earlier")} items={groups.earlier} />
            </>
          )}
        </div>

        {/* RIGHT RAIL */}
        <aside
          style={{
            flex: "1 1 280px",
            minWidth: 0,
            display: "flex",
            flexDirection: "column",
            gap: 18,
          }}
        >
          <RecurringMotifsCard />
          <ClusterCard />
          <FooterNote />
        </aside>
      </div>
    </div>
  );
}
