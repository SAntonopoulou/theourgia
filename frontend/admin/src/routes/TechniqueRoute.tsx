/**
 * Techniques — admin route at ``/techniques``: the phone's techniques
 * screen, on the web.
 *
 * A technique arrives as a pack: it says which of the computations the
 * engine performs to run, and how the sources read the result. This route
 * is the seam made visible — everything numeric on it came from the
 * server's engines (profections, zodiacal releasing; the same canon the
 * phone computes, vector-held), and everything said about it came from the
 * pack. The nativity the techniques run against is entered once and kept
 * to the account (``astro.nativity``); the computed results render inside
 * each pack card, and a releasing card opens into the four-level descent —
 * one level at a time, the way to "now" lit the whole way down.
 */

import {
  type AstroNativity,
  type ProfectionResponse,
  type ReleasingPeriodRead,
  type ReleasingResponse,
  type Technique,
  TechniqueReference,
  fetchPackFeed,
  installedPackPayloads,
  packToTechniques,
  useTopbar,
} from "@theourgia/shared";
import { type CSSProperties, useEffect, useState } from "react";

import { apiMethods } from "../data/api.js";
import { fetchDisabledModuleIds } from "../data/packSettings.js";
import { useMyLocation } from "../data/useLocation.js";
import { SurfaceSkeleton } from "../lib/SurfaceSkeleton.js";

// \uFE0E pins the text presentation — several sign glyphs otherwise render
// as coloured emoji in list rows, where the font stack differs.
const SIGN_GLYPHS = ["", "♈", "♉", "♊", "♋", "♌", "♍", "♎", "♏", "♐", "♑", "♒", "♓"].map(
  (g) => (g ? `${g}\uFE0E` : g),
);
const PLANET_GLYPH: Record<string, string> = {
  sun: "☉", moon: "☽", mercury: "☿", venus: "♀", mars: "♂", jupiter: "♃", saturn: "♄",
};
const ORDINALS = [
  "", "first", "second", "third", "fourth", "fifth", "sixth", "seventh",
  "eighth", "ninth", "tenth", "eleventh", "twelfth",
];

function planetLabel(id: string): string {
  return id.charAt(0).toUpperCase() + id.slice(1);
}

const resultBox: CSSProperties = {
  border: "1px solid var(--line)",
  borderRadius: "var(--r-md, 10px)",
  background: "var(--bg-2)",
  padding: "12px 14px",
};

const caption: CSSProperties = {
  fontFamily: "var(--font-ui)",
  fontSize: 12,
  color: "var(--ink-mute)",
  lineHeight: 1.5,
};

/** What the engine computed — a headline, its detail, an optional note. */
function Said({ headline, detail, note }: { headline: string; detail: string; note?: string }) {
  return (
    <div style={resultBox}>
      <div
        style={{
          fontFamily: "var(--font-display, var(--font-serif))",
          fontSize: 16,
          color: "var(--ink)",
        }}
      >
        {headline}
      </div>
      <div style={{ ...caption, marginTop: 3 }}>{detail}</div>
      {note ? <div style={{ ...caption, marginTop: 6, color: "var(--ink-soft)" }}>{note}</div> : null}
    </div>
  );
}

function periodWhen(iso: string, level: number): string {
  const d = new Date(iso);
  const date = d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
  if (level < 3) return date;
  return `${date} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

/**
 * The four levels, walked one at a time. The first level holds a dozen
 * periods; the fourth holds thousands — a table would be an almanac, and
 * what the technique asks is narrower: THIS year into its months, one
 * month into its days. The path stands above the list; "now" is marked at
 * every level.
 */
function Descent({
  nativity,
  lot,
}: {
  nativity: AstroNativity;
  lot: "fortune" | "spirit";
}) {
  const [path, setPath] = useState<number[]>([]);
  const [data, setData] = useState<ReleasingResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setData(null);
    setError(null);
    void (async () => {
      try {
        const res = await apiMethods.getReleasing({
          birth: nativity.birth,
          latitude: nativity.latitude,
          longitude: nativity.longitude,
          from_lot: lot,
          ...(path.length ? { path: path.join(",") } : {}),
        });
        if (!cancelled) setData(res);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "The descent failed.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [nativity, lot, path]);

  const level = path.length + 1;
  const levelName = ["the years", "its months", "its days", "its hours"][path.length] ?? "";

  return (
    <div style={{ marginTop: 10, border: "1px solid var(--line)", borderRadius: "var(--r-md, 10px)", overflow: "hidden" }}>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 6,
          alignItems: "baseline",
          background: "var(--bg-2)",
          padding: "8px 12px",
          borderBottom: "1px solid var(--line)",
        }}
      >
        <button
          type="button"
          onClick={() => setPath([])}
          style={{
            border: "none", background: "none", padding: 0, cursor: "pointer",
            fontFamily: "var(--font-ui)", fontSize: 12,
            color: path.length === 0 ? "var(--ink)" : "var(--accent)",
          }}
        >
          Years
        </button>
        {(data?.path ?? []).map((step, i) => (
          <span key={`${step.level}-${step.index}`} style={{ display: "inline-flex", gap: 6 }}>
            <span style={{ ...caption }}>→</span>
            <button
              type="button"
              onClick={() => setPath(path.slice(0, i + 1))}
              style={{
                border: "none", background: "none", padding: 0, cursor: "pointer",
                fontFamily: "var(--font-ui)", fontSize: 12,
                color: i === path.length - 1 ? "var(--ink)" : "var(--accent)",
              }}
            >
              {SIGN_GLYPHS[step.sign]} {step.sign_name}
            </button>
          </span>
        ))}
        <span style={caption}>{levelName}</span>
      </div>
      {error ? (
        <p style={{ ...caption, color: "var(--danger)", padding: "10px 12px" }}>{error}</p>
      ) : data === null ? (
        <p style={{ ...caption, padding: "10px 12px" }}>Reading the periods…</p>
      ) : (
        <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
          {data.shown.map((p: ReleasingPeriodRead) => (
            <li key={p.index} style={{ borderBottom: "1px solid var(--line)" }}>
              <button
                type="button"
                disabled={level >= 4}
                onClick={() => setPath([...path, p.index])}
                style={{
                  display: "block", width: "100%", textAlign: "left",
                  border: "none", cursor: level < 4 ? "pointer" : "default",
                  background: p.holds_now ? "var(--bg-2)" : "transparent",
                  padding: level >= 3 ? "6px 12px" : "9px 12px",
                }}
              >
                <span
                  style={{
                    fontFamily: "var(--font-ui)", fontSize: 13.5,
                    color: p.holds_now ? "var(--accent)" : "var(--ink)",
                  }}
                >
                  {SIGN_GLYPHS[p.sign]} {p.sign_name}
                  {p.holds_now ? " · now" : ""}
                </span>
                <span
                  style={{
                    display: "block", ...caption, marginTop: 1,
                    color: p.is_loosing_of_the_bond ? "var(--water, var(--accent))" : "var(--ink-mute)",
                  }}
                >
                  {periodWhen(p.start, level)} — {periodWhen(p.until, level)}
                  {" · "}
                  {PLANET_GLYPH[p.lord]} {planetLabel(p.lord)}
                  {p.is_peak ? " · a peak" : ""}
                  {p.is_loosing_of_the_bond ? " · the loosing of the bond" : ""}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** The releasing card's result: the chain of "now", the descent one tap away. */
function ReleasingResult({
  nativity,
  lot,
}: {
  nativity: AstroNativity;
  lot: "fortune" | "spirit";
}) {
  const [data, setData] = useState<ReleasingResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await apiMethods.getReleasing({
          birth: nativity.birth,
          latitude: nativity.latitude,
          longitude: nativity.longitude,
          from_lot: lot,
        });
        if (!cancelled) setData(res);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "The releasing failed.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [nativity, lot]);

  if (error) return <p style={{ ...caption, color: "var(--danger)" }}>{error}</p>;
  if (data === null) return <div style={resultBox}><span style={caption}>Computing…</span></div>;
  const first = data.chain[0];
  if (!first) {
    return (
      <Said
        headline="Beyond the periods computed"
        detail="The first level runs a hundred and twenty years."
      />
    );
  }
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        style={{ display: "block", width: "100%", textAlign: "left", border: "none", background: "none", padding: 0, cursor: "pointer" }}
      >
        <Said
          headline={[
            `${SIGN_GLYPHS[first.sign]} ${first.sign_name}`,
            ...data.chain.slice(1).map((p) => SIGN_GLYPHS[p.sign]),
          ].join(" → ")}
          detail={[
            `releasing from ${data.from_lot === "fortune" ? "Fortune" : "Spirit"}`,
            `the ${ORDINALS[first.house_from_lot]} place from the lot`,
            `until ${new Date(first.until).getFullYear()}`,
            ...(first.is_loosing_of_the_bond ? ["the loosing of the bond"] : []),
            open ? "close the levels" : "the four levels open from here",
          ].join(" · ")}
        />
      </button>
      {open ? <Descent nativity={nativity} lot={lot} /> : null}
    </div>
  );
}

export function TechniqueRoute() {
  const location = useMyLocation({ enabled: true });

  const [nativity, setNativity] = useState<AstroNativity | null | "unset">(null);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [birth, setBirth] = useState("");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [saveNote, setSaveNote] = useState<string | null>(null);

  useTopbar(
    () => ({
      title:
        nativity && nativity !== "unset" && nativity.name
          ? `Techniques · ${nativity.name}`
          : "Techniques",
      subtitle: "How the year and the life are timed, run against a nativity",
    }),
    [nativity],
  );

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const saved = await apiMethods.getAstroNativity();
        if (!cancelled) setNativity(saved);
      } catch {
        // 404 (none saved) and 401 (signed out) both land here: the form
        // shows, and the techniques run from what is typed either way.
        if (!cancelled) setNativity("unset");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Seed the form's place from the saved location once known.
  useEffect(() => {
    if (location.data && lat === "" && lng === "") {
      setLat(String(location.data.lat));
      setLng(String(location.data.lng));
    }
  }, [location.data, lat, lng]);

  const [techniques, setTechniques] = useState<Technique[] | null>(null);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const [feed, installed] = await Promise.all([
          fetchPackFeed(),
          apiMethods.bundlesInstalled(),
        ]);
        const slugs = installed.bundles.map((b) => b.slug);
        const disabled = await fetchDisabledModuleIds().catch(() => []);
        const found = await installedPackPayloads(feed, slugs, "astro-techniques", disabled);
        const parsed = found.flatMap((f) => packToTechniques(f.payload));
        if (!cancelled) setTechniques(parsed);
      } catch {
        if (!cancelled) setTechniques([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const [prof, setProf] = useState<ProfectionResponse | null>(null);
  const active = nativity !== null && nativity !== "unset" && !editing ? nativity : null;
  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    setProf(null);
    void (async () => {
      try {
        const res = await apiMethods.getProfections({
          birth: active.birth,
          latitude: active.latitude,
          longitude: active.longitude,
        });
        if (!cancelled) setProf(res);
      } catch {
        if (!cancelled) setProf(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [active]);

  const save = async (): Promise<void> => {
    const payload: AstroNativity = {
      name: name.trim(),
      birth: new Date(birth).toISOString(),
      latitude: Number(lat),
      longitude: Number(lng),
    };
    setSaveNote(null);
    try {
      await apiMethods.putAstroNativity(payload);
      setSaveNote(null);
    } catch {
      setSaveNote("Could not keep it to the account — it runs for this visit only.");
    }
    setNativity(payload);
    setEditing(false);
  };

  const houseNote = (t: Technique, house: number): string | undefined =>
    t.houses?.find((h) => h.house === house)?.meaning;

  const resultFor = (t: Technique) => {
    if (!active) return null;
    switch (t.primitive) {
      case "profect-annual":
        return prof ? (
          <Said
            headline={`${SIGN_GLYPHS[prof.profected_sign]} ${prof.profected_sign_name} · the ${ORDINALS[prof.profected_house]} place`}
            detail={`Lord of the year: ${PLANET_GLYPH[prof.year_lord]} ${planetLabel(prof.year_lord)} · age ${prof.age}`}
            note={houseNote(t, prof.profected_house)}
          />
        ) : (
          <div style={resultBox}><span style={caption}>Computing…</span></div>
        );
      case "profect-monthly":
        return prof ? (
          <Said
            headline={`${SIGN_GLYPHS[prof.month_sign]} ${prof.month_sign_name} · the ${ORDINALS[prof.month_house]} place`}
            detail={`Lord of the month: ${PLANET_GLYPH[prof.month_lord]} ${planetLabel(prof.month_lord)}`}
            note={houseNote(t, prof.month_house)}
          />
        ) : (
          <div style={resultBox}><span style={caption}>Computing…</span></div>
        );
      case "zodiacal-releasing":
        return (
          <ReleasingResult
            nativity={active}
            lot={t.from === "spirit" ? "spirit" : "fortune"}
          />
        );
      case "solar-return":
        return (
          <Said
            headline="Cast from the chart"
            detail="A return is a chart of its own, not a figure."
          />
        );
      default:
        return t.primitive ? (
          <Said
            headline={t.primitive}
            detail="This build computes it but has nowhere to show it yet."
          />
        ) : null;
    }
  };

  if (techniques === null || nativity === null) return <SurfaceSkeleton rowCount={3} />;

  const showForm = nativity === "unset" || editing;

  return (
    <div style={{ maxWidth: 760, margin: "0 auto", padding: "var(--space-5, 24px)" }}>
      <section style={{ marginBottom: 24 }}>
        <h2
          style={{
            fontFamily: "var(--font-ui)", fontSize: 11, fontWeight: 700,
            letterSpacing: "0.14em", textTransform: "uppercase",
            color: "var(--ink-mute)", margin: "0 0 6px",
          }}
        >
          The nativity
        </h2>
        {showForm ? (
          <div style={{ ...resultBox, display: "grid", gap: 10 }}>
            <p style={{ ...caption, margin: 0 }}>
              The techniques are chart arithmetic from a birth — profection
              counts its years, releasing divides its life. Entered once,
              kept to the account.
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
              <label style={{ ...caption, display: "grid", gap: 4 }}>
                Whose
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Mine"
                  style={{ padding: "7px 10px", borderRadius: 8, border: "1px solid var(--line)", background: "var(--bg)", color: "var(--ink)", fontFamily: "var(--font-ui)", fontSize: 13 }}
                />
              </label>
              <label style={{ ...caption, display: "grid", gap: 4 }}>
                Born
                <input
                  type="datetime-local"
                  value={birth}
                  onChange={(e) => setBirth(e.target.value)}
                  style={{ padding: "7px 10px", borderRadius: 8, border: "1px solid var(--line)", background: "var(--bg)", color: "var(--ink)", fontFamily: "var(--font-ui)", fontSize: 13 }}
                />
              </label>
              <label style={{ ...caption, display: "grid", gap: 4 }}>
                Latitude
                <input
                  value={lat}
                  onChange={(e) => setLat(e.target.value)}
                  style={{ width: 110, padding: "7px 10px", borderRadius: 8, border: "1px solid var(--line)", background: "var(--bg)", color: "var(--ink)", fontFamily: "var(--font-ui)", fontSize: 13 }}
                />
              </label>
              <label style={{ ...caption, display: "grid", gap: 4 }}>
                Longitude
                <input
                  value={lng}
                  onChange={(e) => setLng(e.target.value)}
                  style={{ width: 110, padding: "7px 10px", borderRadius: 8, border: "1px solid var(--line)", background: "var(--bg)", color: "var(--ink)", fontFamily: "var(--font-ui)", fontSize: 13 }}
                />
              </label>
            </div>
            <div>
              <button
                type="button"
                disabled={!birth || lat === "" || lng === ""}
                onClick={() => void save()}
                style={{
                  padding: "8px 16px", borderRadius: 8, border: "1px solid var(--accent)",
                  background: !birth ? "var(--bg)" : "var(--accent)",
                  color: !birth ? "var(--ink-mute)" : "var(--on-accent, #fff)",
                  fontFamily: "var(--font-ui)", fontSize: 13, fontWeight: 600,
                  cursor: !birth ? "default" : "pointer",
                }}
              >
                Run the techniques
              </button>
            </div>
          </div>
        ) : (
          <p style={{ ...caption, margin: 0 }}>
            For {active?.name || "the practitioner"} · born{" "}
            {active ? new Date(active.birth).toLocaleString() : ""} ·{" "}
            {active?.latitude.toFixed(2)}, {active?.longitude.toFixed(2)}{" "}
            <button
              type="button"
              onClick={() => {
                if (active) {
                  setName(active.name);
                  const d = new Date(active.birth);
                  const pad = (n: number) => String(n).padStart(2, "0");
                  setBirth(
                    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`,
                  );
                  setLat(String(active.latitude));
                  setLng(String(active.longitude));
                }
                setEditing(true);
              }}
              style={{ border: "none", background: "none", padding: 0, color: "var(--accent)", cursor: "pointer", fontFamily: "var(--font-ui)", fontSize: 12 }}
            >
              Edit
            </button>
          </p>
        )}
        {saveNote ? <p style={{ ...caption, color: "var(--warn, var(--ink-soft))", margin: "6px 0 0" }}>{saveNote}</p> : null}
      </section>

      <TechniqueReference techniques={techniques} resultFor={resultFor} />
    </div>
  );
}
