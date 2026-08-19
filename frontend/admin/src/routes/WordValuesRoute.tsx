/**
 * Word values — admin route at ``/word-values``.
 *
 * The gematria concordance (#87): every word in a corpus that comes to a given
 * number. The corpora are the one pack kind too large to read on the main
 * thread, so this drives a Web Worker — it fetches the chosen corpus once,
 * indexes it off-thread, and answers lookups from memory. The download is a few
 * megabytes the first time a corpus is opened in a session; after that, instant.
 */

import { type FeedPack, fetchPackFeed, isWordCorpusPack, useTopbar } from "@theourgia/shared";
import { type CSSProperties, useEffect, useRef, useState } from "react";

import { apiMethods } from "../data/api.js";
import { SurfaceSkeleton } from "../lib/SurfaceSkeleton.js";
import type { CorpusMatch, CorpusRequest, CorpusResponse } from "../workers/corpusMessages.js";

function slugMatches(installedSlug: string, packId: string): boolean {
  return installedSlug === packId || installedSlug === packId.replaceAll(".", "-");
}

interface Loaded {
  name: string;
  system: string;
  conventions: string[];
  total: number;
}

interface Found {
  value: number;
  matches: CorpusMatch[];
  total: number;
  truncated: boolean;
}

const PILL: CSSProperties = {
  fontSize: 13,
  padding: "6px 12px",
  borderRadius: 999,
  borderWidth: 1,
  borderStyle: "solid",
  cursor: "pointer",
  background: "transparent",
};

export function WordValuesRoute() {
  useTopbar(
    () => ({
      title: "Word values",
      subtitle: "Every word that comes to a number, from an installed corpus",
    }),
    [],
  );

  const [corpora, setCorpora] = useState<FeedPack[] | null>(null);
  const [selected, setSelected] = useState<FeedPack | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [conventionIndex, setConventionIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [querying, setQuerying] = useState(false);
  const [found, setFound] = useState<Found | null>(null);

  const workerRef = useRef<Worker | null>(null);

  // Which corpora this account holds — the >2MB packs the client-readable path
  // deliberately skips, found from the feed by their namespace and matched to
  // what is installed.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const [feed, installed] = await Promise.all([
          fetchPackFeed(),
          apiMethods.bundlesInstalled(),
        ]);
        const slugs = installed.bundles.map((b) => b.slug);
        const found = feed.filter(
          (p) => isWordCorpusPack(p) && slugs.some((s) => slugMatches(s, p.id)),
        );
        if (!cancelled) setCorpora(found);
      } catch {
        if (!cancelled) setCorpora([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // A worker per chosen corpus. Rebuilt when the corpus changes, torn down on
  // leave, so a 21 MB index never outlives the surface that asked for it.
  useEffect(() => {
    if (selected === null) return;
    const worker = new Worker(new URL("../workers/corpusWorker.ts", import.meta.url), {
      type: "module",
    });
    workerRef.current = worker;
    setStatus("loading");
    setLoaded(null);
    setFound(null);
    setError(null);
    setConventionIndex(0);

    worker.onmessage = (event: MessageEvent<CorpusResponse>) => {
      const msg = event.data;
      if (msg.type === "loaded") {
        setLoaded({
          name: msg.name,
          system: msg.system,
          conventions: msg.conventions,
          total: msg.total,
        });
        setStatus("ready");
      } else if (msg.type === "result") {
        setFound({
          value: msg.value,
          matches: msg.matches,
          total: msg.total,
          truncated: msg.truncated,
        });
        setQuerying(false);
      } else {
        setError(msg.message);
        setStatus("error");
      }
    };
    worker.onerror = () => {
      setError("The corpus worker failed to start.");
      setStatus("error");
    };

    const load: CorpusRequest = { type: "load", mbfUrl: selected.mbfUrl };
    worker.postMessage(load);

    return () => {
      worker.terminate();
      workerRef.current = null;
    };
  }, [selected]);

  function run() {
    const value = Number.parseInt(input, 10);
    if (!Number.isFinite(value) || workerRef.current === null) return;
    setQuerying(true);
    const query: CorpusRequest = { type: "query", value, conventionIndex };
    workerRef.current.postMessage(query);
  }

  if (corpora === null) return <SurfaceSkeleton rowCount={3} />;

  return (
    <div style={{ padding: "8px 4px 40px", maxWidth: 720, margin: "0 auto" }}>
      {corpora.length === 0 ? (
        <p style={{ color: "var(--ink-mute)", fontSize: 13, lineHeight: 1.6 }}>
          No word corpora installed. Install one from Packs — the Greek Diorisis, the Hebrew Bible,
          Sepher Sephiroth — and you can ask here what else comes to a number. (These are the large
          packs; each is read in the background the first time you open it.)
        </p>
      ) : (
        <>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 18 }}>
            {corpora.map((pack) => {
              const active = selected?.id === pack.id;
              return (
                <button
                  type="button"
                  key={pack.id}
                  onClick={() => setSelected(pack)}
                  style={{
                    ...PILL,
                    borderColor: active ? "var(--accent)" : "var(--line)",
                    color: active ? "var(--accent)" : "var(--ink)",
                    background: active ? "var(--accent-soft)" : "transparent",
                  }}
                >
                  {pack.title}
                </button>
              );
            })}
          </div>

          {selected === null && (
            <p style={{ color: "var(--ink-mute)", fontSize: 13 }}>Choose a corpus to read from.</p>
          )}

          {status === "loading" && (
            <p style={{ color: "var(--ink-mute)", fontSize: 13, lineHeight: 1.6 }}>
              Reading {selected?.title} in the background — a large corpus takes a moment to
              download and index. This happens once per visit.
            </p>
          )}

          {status === "error" && (
            <p style={{ color: "var(--danger, #c0392b)", fontSize: 13 }}>{error}</p>
          )}

          {status === "ready" && loaded && (
            <>
              <p style={{ color: "var(--ink-mute)", fontSize: 12.5, marginBottom: 12 }}>
                {loaded.total.toLocaleString()} forms indexed.
              </p>

              {loaded.conventions.length > 1 && (
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
                  {loaded.conventions.map((convention, i) => {
                    const active = i === conventionIndex;
                    return (
                      <button
                        type="button"
                        key={convention}
                        onClick={() => {
                          setConventionIndex(i);
                          setFound(null);
                        }}
                        style={{
                          ...PILL,
                          fontSize: 12,
                          padding: "4px 10px",
                          borderColor: active ? "var(--accent)" : "var(--line)",
                          color: active ? "var(--accent)" : "var(--ink-mute)",
                        }}
                      >
                        {convention.replace("/", " · ")}
                      </button>
                    );
                  })}
                </div>
              )}

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  run();
                }}
                style={{ display: "flex", gap: 8, marginBottom: 20 }}
              >
                <input
                  type="number"
                  inputMode="numeric"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="A number"
                  aria-label="The value to look up"
                  style={{
                    flex: 1,
                    fontSize: 15,
                    padding: "8px 12px",
                    borderRadius: "var(--r-md, 8px)",
                    border: "1px solid var(--line)",
                    background: "var(--bg-2)",
                    color: "var(--ink)",
                  }}
                />
                <button
                  type="submit"
                  disabled={querying || input === ""}
                  style={{
                    ...PILL,
                    borderColor: "var(--accent)",
                    color: "var(--ink)",
                    background: "var(--accent-soft)",
                  }}
                >
                  {querying ? "…" : "Show"}
                </button>
              </form>

              {found && <Results found={found} />}
            </>
          )}
        </>
      )}
    </div>
  );
}

function Results({ found }: { found: Found }) {
  if (found.total === 0) {
    return (
      <p style={{ color: "var(--ink-mute)", fontSize: 13 }}>
        Nothing in this corpus comes to {found.value.toLocaleString()}.
      </p>
    );
  }
  return (
    <div>
      <p style={{ fontSize: 13, color: "var(--ink)", marginBottom: 10 }}>
        {found.total.toLocaleString()} come to <strong>{found.value.toLocaleString()}</strong>
        {found.truncated && (
          <span style={{ color: "var(--ink-mute)" }}>
            {" "}
            — the {found.matches.length} most attested shown
          </span>
        )}
        .
      </p>
      <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
        {found.matches.map((m, i) => (
          <li
            key={`${m.word}-${i}`}
            style={{
              display: "flex",
              gap: 10,
              alignItems: "baseline",
              padding: "5px 0",
              borderBottom: "1px solid var(--line)",
            }}
          >
            <span style={{ fontFamily: "var(--font-display)", fontSize: 15, minWidth: 90 }}>
              {m.word}
            </span>
            {m.translit && (
              <span style={{ fontSize: 12.5, color: "var(--ink-mute)" }}>{m.translit}</span>
            )}
            {m.gloss && (
              <span style={{ fontSize: 12.5, color: "var(--ink-soft)", flex: 1 }}>{m.gloss}</span>
            )}
            <span
              style={{
                fontSize: 11.5,
                color: "var(--ink-mute)",
                fontVariantNumeric: "tabular-nums",
                marginLeft: "auto",
              }}
              title="How often the form is attested"
            >
              ×{m.count.toLocaleString()}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
