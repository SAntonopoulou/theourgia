/**
 * Elections — admin route at ``/elections``: the phone's elections screen,
 * on the web.
 *
 * Any installed election-rules pack is runnable, not merely readable: pick
 * the matter (or the planet a ruleset is taken for), the span, and how
 * finely to read, and the server's elector — the same engine as the
 * phone's, clause for clause — judges every sample and returns the windows
 * with their reasons. The strictness bar re-sorts what came back without
 * re-electing, exactly as the phone does. The rule-pack reference stays
 * below, because on the web there is room for both.
 */

import {
  type ElectFinding,
  type ElectionTemplates,
  ElectionReference,
  type ElectResponse,
  type ElectWindow,
  fetchPackFeed,
  installedPackPayloads,
  type Matter,
  packToElectionTemplates,
  type Ruleset,
  useTopbar,
} from "@theourgia/shared";
import { type CSSProperties, useEffect, useMemo, useState } from "react";

import { apiMethods } from "../data/api.js";
import { fetchDisabledModuleIds } from "../data/packSettings.js";
import { useMyLocation } from "../data/useLocation.js";
import { SurfaceSkeleton } from "../lib/SurfaceSkeleton.js";
import { MOCK_LOCATION } from "../mocks/today.js";

/** The seven, in Chaldean order — what a `takes: "body"` ruleset offers. */
const CHALDEAN: { key: string; glyph: string; label: string }[] = [
  { key: "saturn", glyph: "♄", label: "Saturn" },
  { key: "jupiter", glyph: "♃", label: "Jupiter" },
  { key: "mars", glyph: "♂", label: "Mars" },
  { key: "sun", glyph: "☉", label: "Sun" },
  { key: "venus", glyph: "♀", label: "Venus" },
  { key: "mercury", glyph: "☿", label: "Mercury" },
  { key: "moon", glyph: "☽", label: "Moon" },
];
const GLYPH: Record<string, string> = Object.fromEntries(
  CHALDEAN.map((b) => [b.key, b.glyph]),
);

const ORDINALS = [
  "", "first", "second", "third", "fourth", "fifth", "sixth", "seventh",
  "eighth", "ninth", "tenth", "eleventh", "twelfth",
];

/** The server computes at most this many charts per asking. */
const MAX_SAMPLES = 1500;

const eyebrow: CSSProperties = {
  fontFamily: "var(--font-ui)",
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  color: "var(--ink-mute)",
  margin: "0 0 6px",
};

const caption: CSSProperties = {
  fontFamily: "var(--font-ui)",
  fontSize: 12,
  color: "var(--ink-mute)",
  lineHeight: 1.5,
  margin: "0 0 10px",
};

function Pill(props: {
  label: string;
  chosen: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={props.chosen}
      onClick={props.onClick}
      style={{
        padding: "7px 13px",
        borderRadius: 999,
        border: `1px solid ${props.chosen ? "var(--accent)" : "var(--line)"}`,
        background: props.chosen ? "var(--accent-soft)" : "var(--bg)",
        color: "var(--ink)",
        fontFamily: "var(--font-ui)",
        fontSize: 12.5,
        cursor: "pointer",
      }}
    >
      {props.label}
    </button>
  );
}

function hhmm(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function whenLabel(iso: string): string {
  const d = new Date(iso);
  const day = d.toLocaleDateString(undefined, { weekday: "long", day: "numeric" });
  return `${day} · ${hhmm(iso)}`;
}

/** One reason as two sentences doing different work: the FACT first, which
 *  flips with the finding, then the pack's reason, which never flips. */
function Reason({ finding, showWeight = true }: { finding: ElectFinding; showWeight?: boolean }) {
  const failedVeto = finding.veto && !finding.held;
  return (
    <div style={{ display: "flex", gap: 8, alignItems: "baseline" }}>
      <span
        aria-hidden
        style={{
          fontFamily: "var(--font-ui)",
          fontSize: 12,
          color: finding.held ? "var(--accent)" : failedVeto ? "var(--danger)" : "var(--ink-mute)",
        }}
      >
        {finding.held ? "✓" : "✕"}
      </span>
      <div style={{ flex: 1 }}>
        <div style={{ display: "flex", gap: 8, alignItems: "baseline" }}>
          <span
            style={{
              flex: 1,
              fontFamily: "var(--font-ui)",
              fontSize: 13,
              lineHeight: 1.4,
              color: finding.held ? "var(--ink)" : "var(--ink-soft)",
            }}
          >
            {finding.says}
            {finding.detail ? ` — ${finding.detail}` : ""}
          </span>
          {showWeight && finding.held && !finding.veto && finding.weight > 0 ? (
            <span style={{ fontFamily: "var(--font-ui)", fontSize: 11.5, color: "var(--accent)" }}>
              +{finding.weight}
            </span>
          ) : null}
        </div>
        <div style={{ fontFamily: "var(--font-ui)", fontSize: 11.5, lineHeight: 1.45, color: "var(--ink-mute)" }}>
          {finding.because}
        </div>
      </div>
    </div>
  );
}

function WindowTile({ window: w }: { window: ElectWindow }) {
  const fraction = w.fraction ?? 0;
  const minutes = Math.round((new Date(w.end).getTime() - new Date(w.start).getTime()) / 60000);
  // The gates first and apart, because a veto is not a weight — shown
  // among the scoring reasons it makes the ticked weights sum past the
  // stated score.
  const gates = w.findings.filter((f) => f.veto);
  const scored = w.findings.filter((f) => !f.veto);
  return (
    <section
      style={{
        border: `1px solid ${w.vetoed ? "var(--line)" : fraction >= 0.75 ? "var(--accent)" : "var(--line)"}`,
        borderRadius: "var(--r-md, 10px)",
        background: "var(--bg-2)",
        padding: "12px 14px",
      }}
    >
      <div style={{ display: "flex", gap: 10, alignItems: "baseline" }}>
        <span
          style={{
            flex: 1,
            fontFamily: "var(--font-display, var(--font-serif))",
            fontSize: 15,
            color: "var(--ink)",
          }}
        >
          {whenLabel(w.start)} – {hhmm(w.end)}
        </span>
        <span
          style={{
            fontFamily: "var(--font-ui)",
            fontSize: 13,
            color: w.vetoed ? "var(--ink-mute)" : "var(--accent)",
          }}
        >
          {/* Out of what, not just a percentage: 13 of 21 can be argued
              with; a bare 62% cannot. */}
          {w.vetoed ? "ruled out" : `${w.score} of ${w.out_of}`}
        </span>
      </div>
      <div style={{ fontFamily: "var(--font-ui)", fontSize: 11.5, color: "var(--ink-mute)", marginBottom: 8 }}>
        {Math.floor(minutes / 60)}h {minutes % 60}m
        {w.vetoed ? "" : ` · ${Math.round(fraction * 100)}%`}
      </div>
      <div style={{ display: "grid", gap: 8 }}>
        {gates.map((f, i) => (
          <Reason key={`g${i}`} finding={f} showWeight={false} />
        ))}
        {scored.map((f, i) => (
          <Reason key={`s${i}`} finding={f} />
        ))}
      </div>
    </section>
  );
}

export function ElectionRoute() {
  useTopbar(
    () => ({
      title: "Elections",
      subtitle: "The hours a matter may be begun, judged clause by clause",
    }),
    [],
  );

  const location = useMyLocation({ enabled: true });
  const loc = location.data ?? MOCK_LOCATION;

  const [templates, setTemplates] = useState<ElectionTemplates | null>(null);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const [feed, installed] = await Promise.all([
          fetchPackFeed(),
          apiMethods.bundlesInstalled(),
        ]);
        const slugs = installed.bundles.map((b) => b.slug);
        // A record-store hiccup must not blank the elections screen —
        // an unreadable disabled-set reads as nothing disabled.
        const disabled = await fetchDisabledModuleIds().catch(() => []);
        const found = await installedPackPayloads(
          feed,
          slugs,
          "election-templates",
          disabled,
        );
        const merged: ElectionTemplates = { matters: [], rulesets: [] };
        for (const f of found) {
          const t = packToElectionTemplates(f.payload);
          merged.matters.push(...t.matters);
          merged.rulesets.push(...t.rulesets);
        }
        if (!cancelled) setTemplates(merged);
      } catch {
        if (!cancelled) setTemplates({ matters: [], rulesets: [] });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const [matterKey, setMatterKey] = useState<string | null>(null);
  const [directRulesetId, setDirectRulesetId] = useState<string | null>(null);
  const [significator, setSignificator] = useState<string | null>(null);
  const [days, setDays] = useState(7);
  const [stepMin, setStepMin] = useState(15);
  const [bar, setBar] = useState(0.6);
  const [result, setResult] = useState<ElectResponse | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const matter: Matter | null =
    templates?.matters.find((m) => m.key === matterKey) ?? null;
  const ruleset: Ruleset | null =
    (matter
      ? templates?.rulesets.find((r) => r.id === matter.ruleset)
      : templates?.rulesets.find((r) => r.id === directRulesetId)) ?? null;

  /** Rulesets no matter reads through — offered directly, as themselves. */
  const directRulesets = useMemo(() => {
    if (!templates) return [];
    const taken = new Set(templates.matters.map((m) => m.ruleset));
    return templates.rulesets.filter((r) => !taken.has(r.id));
  }, [templates]);

  const subjectChoices = useMemo(() => {
    if (ruleset?.takes === "body") return CHALDEAN;
    return (matter?.significators ?? []).map((key) => ({
      key,
      glyph: GLYPH[key] ?? "",
      label: key.charAt(0).toUpperCase() + key.slice(1),
    }));
  }, [ruleset, matter]);

  // The phone's default: the matter's first significator carries it
  // unless another is chosen.
  const chosenSubject =
    significator && subjectChoices.some((b) => b.key === significator)
      ? significator
      : subjectChoices[0]?.key ?? null;

  const samples = Math.floor((days * 24 * 60) / stepMin);
  const overCap = samples > MAX_SAMPLES;

  const run = async (): Promise<void> => {
    if (!ruleset) return;
    setRunning(true);
    setError(null);
    setResult(null);
    try {
      const now = new Date();
      const end = new Date(now.getTime() + days * 86_400_000);
      const res = await apiMethods.postElect({
        ruleset: {
          id: ruleset.id,
          name: ruleset.name,
          summary: ruleset.summary,
          clauses: ruleset.clausesRaw,
        },
        start: now.toISOString(),
        end: end.toISOString(),
        step_minutes: stepMin,
        latitude: loc.lat,
        longitude: loc.lng,
        ...(chosenSubject ? { subject_body: chosenSubject } : {}),
        ...(matter ? { subject_house: matter.house } : {}),
      });
      setResult(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : "The election failed.");
    } finally {
      setRunning(false);
    }
  };

  // Re-sorted, not re-elected: the same windows, a different line drawn
  // through them — the phone's Elections.sort, client-side.
  const sorted = useMemo(() => {
    if (!result) return null;
    const standing = [...result.favourable, ...result.weaker];
    if (bar === 0) return { favourable: standing, weaker: [], ruledOut: result.ruled_out };
    const clears = standing.filter((w) => (w.fraction ?? 0) >= bar);
    // When nothing clears the bar, the strongest are offered anyway with
    // the shortfall visible — the best of a poor week is a real answer.
    const favourable = clears.length > 0 ? clears : standing.slice(0, 5);
    const offered = new Set(favourable);
    return {
      favourable,
      weaker: standing.filter((w) => !offered.has(w)),
      ruledOut: result.ruled_out,
      nothingCleared: clears.length === 0 && standing.length > 0,
    };
  }, [result, bar]);

  if (templates === null) return <SurfaceSkeleton rowCount={5} />;

  const noRules = templates.matters.length === 0 && templates.rulesets.length === 0;

  return (
    <div style={{ maxWidth: 760, margin: "0 auto", padding: "var(--space-5, 24px)" }}>
      {noRules ? (
        <p style={{ ...caption, fontSize: 13 }}>
          No election rules installed. Which conditions matter, what they
          weigh, and what rules a moment out are the practitioner's own
          expertise — so they arrive as a pack rather than being decided
          here. Install an election pack from the pack feed.
        </p>
      ) : (
        <section style={{ marginBottom: 28 }}>
          <h2 style={eyebrow}>What for</h2>
          <p style={caption}>
            What separates one election from another is the place that
            signifies the matter and the planet that governs it — not a
            different set of rules. Money is the second place and Jupiter;
            study is the ninth and Mercury.
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {templates.matters.map((m) => (
              <Pill
                key={m.key}
                label={`${m.name} · the ${ORDINALS[m.house] ?? ""} place`}
                chosen={m.key === matterKey}
                onClick={() => {
                  setMatterKey(m.key);
                  setDirectRulesetId(null);
                  setSignificator(null);
                  setResult(null);
                }}
              />
            ))}
            {directRulesets.map((r) => (
              <Pill
                key={r.id}
                label={r.name}
                chosen={r.id === directRulesetId && matterKey === null}
                onClick={() => {
                  setDirectRulesetId(r.id);
                  setMatterKey(null);
                  setSignificator(null);
                  setResult(null);
                }}
              />
            ))}
          </div>
          {ruleset?.summary ? (
            <p style={{ ...caption, margin: "10px 0 0" }}>{ruleset.summary}</p>
          ) : null}
          {ruleset?.cautions.length ? (
            <div style={{ ...caption, margin: "8px 0 0", color: "var(--warn, var(--ink-soft))" }}>
              {ruleset.cautions.map((line) => (
                <p key={line} style={{ margin: "0 0 4px" }}>
                  {line}
                </p>
              ))}
            </div>
          ) : null}

          {subjectChoices.length > 0 ? (
            <>
              <h2 style={{ ...eyebrow, marginTop: 20 }}>Under which planet</h2>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {subjectChoices.map((b) => (
                  <Pill
                    key={b.key}
                    label={`${b.glyph} ${b.label}`.trim()}
                    chosen={b.key === chosenSubject}
                    onClick={() => {
                      setSignificator(b.key);
                      setResult(null);
                    }}
                  />
                ))}
              </div>
            </>
          ) : null}

          <h2 style={{ ...eyebrow, marginTop: 20 }}>Over what span</h2>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {[1, 3, 7, 14, 30].map((d) => (
              <Pill
                key={d}
                label={d === 1 ? "A day" : `${d} days`}
                chosen={d === days}
                onClick={() => {
                  setDays(d);
                  setResult(null);
                }}
              />
            ))}
          </div>

          <h2 style={{ ...eyebrow, marginTop: 20 }}>How finely</h2>
          <p style={caption}>
            The sky is read at each step and judged. A finer step finds
            shorter windows and takes proportionally longer — the cost is
            yours to weigh, so it is shown.
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {[5, 15, 30, 60].map((m) => (
              <Pill
                key={m}
                label={`${m} min`}
                chosen={m === stepMin}
                onClick={() => {
                  setStepMin(m);
                  setResult(null);
                }}
              />
            ))}
          </div>
          <p style={{ ...caption, margin: "8px 0 0" }}>
            {samples} readings of the sky.
            {overCap
              ? ` The server reads at most ${MAX_SAMPLES} per asking — widen the step or shorten the span.`
              : ""}
          </p>

          <h2 style={{ ...eyebrow, marginTop: 20 }}>How good is good enough</h2>
          <p style={caption}>
            A window is scored out of what its rules can give. This is how
            much of that it must reach before it is offered rather than
            merely counted. There is no right answer — a work that matters
            can wait for a better sky, and one that cannot wait takes what
            the week has.
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {[0, 0.5, 0.6, 0.75, 0.9].map((b) => (
              <Pill
                key={b}
                label={b === 0 ? "Anything" : `${Math.round(b * 100)}%`}
                chosen={b === bar}
                onClick={() => setBar(b)}
              />
            ))}
          </div>

          {location.data === null ? (
            <p style={{ ...caption, margin: "14px 0 0" }}>
              Every angle in an election depends on where you are — this ran
              from the fallback location until yours is known.
            </p>
          ) : null}

          <button
            type="button"
            disabled={!ruleset || running || overCap}
            onClick={() => void run()}
            style={{
              marginTop: 16,
              width: "100%",
              padding: "11px 18px",
              borderRadius: "var(--r-md, 8px)",
              border: "1px solid var(--accent)",
              background: !ruleset || running || overCap ? "var(--bg)" : "var(--accent)",
              color: !ruleset || running || overCap ? "var(--ink-mute)" : "var(--on-accent, #fff)",
              fontFamily: "var(--font-ui)",
              fontSize: 14,
              fontWeight: 600,
              cursor: !ruleset || running || overCap ? "default" : "pointer",
            }}
          >
            {running
              ? "Reading the skies…"
              : ruleset
                ? "Find the times"
                : "Choose a matter first"}
          </button>

          {error ? (
            <p style={{ fontFamily: "var(--font-ui)", fontSize: 13, color: "var(--danger)", marginTop: 12 }}>
              {error}
            </p>
          ) : null}

          {result && sorted ? (
            <div style={{ marginTop: 26 }}>
              {result.dropped.length > 0 ? (
                <p style={{ ...caption, color: "var(--warn, var(--ink-soft))" }}>
                  This build cannot answer {result.dropped.join(", ")} — the
                  windows below were judged without
                  {result.dropped.length === 1 ? " that clause" : " those clauses"}.
                </p>
              ) : null}

              <h2 style={eyebrow}>When</h2>
              {sorted.favourable.length === 0 ? (
                <p style={caption}>
                  Nothing in this span passes the rules. Waiting is a real
                  answer, and the sources say so plainly — but a wider span
                  or a different ruleset may serve.
                </p>
              ) : (
                <>
                  {sorted.nothingCleared ? (
                    <p style={caption}>
                      Nothing in this span is strongly favourable. These are
                      the best of it — read their reasons before trusting any
                      of them, and consider waiting or widening the span.
                    </p>
                  ) : null}
                  <div style={{ display: "grid", gap: 10 }}>
                    {sorted.favourable.map((w) => (
                      <WindowTile key={w.start} window={w} />
                    ))}
                  </div>
                </>
              )}

              {sorted.weaker.length > 0 ? (
                <p style={{ ...caption, margin: "14px 0 0" }}>
                  {sorted.weaker.length} weaker{" "}
                  {sorted.weaker.length === 1 ? "window" : "windows"} passed
                  the gates without scoring well. They are not offered here,
                  because a list of everything that was not disqualified is
                  not a recommendation.
                </p>
              ) : null}

              {sorted.ruledOut.length > 0 ? (
                <div style={{ marginTop: 22 }}>
                  <h2 style={eyebrow}>Ruled out</h2>
                  <p style={caption}>
                    Shown rather than hidden: somebody who cannot see what
                    was excluded cannot tell a working election from a broken
                    one.
                  </p>
                  <div style={{ display: "grid", gap: 10 }}>
                    {sorted.ruledOut.slice(0, 8).map((w) => (
                      <WindowTile key={w.start} window={w} />
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}
        </section>
      )}

      {noRules ? null : <ElectionReference templates={templates} />}
    </div>
  );
}
