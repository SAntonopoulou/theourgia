/**
 * ConsultationHistory — past castings of one oracle, read from the record.
 *
 * The phone shows a consultation's record beside the casting surface; the
 * web reads the same synced entries (kind `consultation`, filtered by
 * `systemId`), so a hexagram cast on the phone stands here too. Newest
 * first, the question leading, the cast and reading beneath it.
 */

import { type CSSProperties, useEffect, useState } from "react";

import { apiGet } from "./api.js";

interface WireConsultation {
  id: string;
  kind: string;
  doc: {
    row?: Record<string, unknown>;
  };
  deleted_at_utc: string | null;
}

interface PullPage {
  entries: WireConsultation[];
  next_since: number;
  more: boolean;
}

export interface PastConsultation {
  id: string;
  question: string;
  cast: string;
  reading: string;
  askedAt: string;
}

const caption: CSSProperties = {
  fontFamily: "var(--font-ui)",
  fontSize: 12,
  color: "var(--ink-mute)",
  lineHeight: 1.5,
};

export function ConsultationHistory({ systemId }: { systemId: string }) {
  const [past, setPast] = useState<PastConsultation[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const all: WireConsultation[] = [];
        let since = 0;
        for (;;) {
          const page = await apiGet<PullPage>(`/record/entries?since=${since}&limit=500`);
          all.push(...page.entries);
          since = page.next_since;
          if (!page.more) break;
        }
        const mine = all
          .filter((e) => e.kind === "consultation" && e.deleted_at_utc === null)
          .map((e) => {
            const row = e.doc.row ?? {};
            const str = (key: string): string =>
              typeof row[key] === "string" ? (row[key] as string) : "";
            return {
              id: e.id,
              systemId: str("systemId"),
              question: str("question"),
              cast: str("cast"),
              reading: str("reading"),
              askedAt: str("askedAt"),
            };
          })
          .filter((e) => e.systemId === systemId)
          .sort((a, b) => (a.askedAt < b.askedAt ? 1 : -1));
        if (!cancelled) setPast(mine);
      } catch {
        // A record that will not read is an empty history, not a broken
        // casting surface.
        if (!cancelled) setPast([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [systemId]);

  if (past === null || past.length === 0) return null;

  return (
    <section
      data-component="consultation-history"
      style={{ maxWidth: 1020, margin: "0 auto", padding: "0 28px 60px" }}
    >
      <h2
        style={{
          fontFamily: "var(--font-ui)",
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: "var(--ink-mute)",
          margin: "0 0 4px",
        }}
      >
        Past castings
      </h2>
      <p style={{ ...caption, margin: "0 0 10px" }}>
        Read from the record — a casting kept on the phone stands here too.
      </p>
      <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
        {past.slice(0, 20).map((one) => (
          <li
            key={one.id}
            style={{ borderTop: "1px solid var(--line)", padding: "10px 0" }}
          >
            <div style={{ display: "flex", gap: 12, alignItems: "baseline", flexWrap: "wrap" }}>
              <span style={{ fontFamily: "var(--font-serif)", fontSize: 14.5, color: "var(--ink)" }}>
                {one.question || "Unasked — cast for its own sake"}
              </span>
              {one.askedAt ? (
                <span style={caption}>
                  {new Date(one.askedAt).toLocaleString(undefined, {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </span>
              ) : null}
            </div>
            {one.cast ? (
              <div style={{ fontFamily: "var(--font-ui)", fontSize: 13, color: "var(--ink-soft)", marginTop: 2 }}>
                {one.cast}
              </div>
            ) : null}
            {one.reading ? (
              <div style={{ ...caption, marginTop: 2, whiteSpace: "pre-wrap" }}>{one.reading}</div>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
