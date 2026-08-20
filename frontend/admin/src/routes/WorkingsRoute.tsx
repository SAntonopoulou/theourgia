/**
 * Workings — the long operations the practitioner is running.
 *
 * Web parity with the phone's Workings screen. A working is written and begun on
 * the phone and crosses in the record sync as a `working` document, its phases
 * as `working-stage` documents; this reads them back and lays each operation out
 * with its stages in order. Read-only for now, as the rituals surface is.
 */

import { type Working, WorkingsLibrary, useTopbar, workingsFromEntries } from "@theourgia/shared";
import { useEffect, useState } from "react";

import { apiGet } from "../lib/api.js";

type PullResult = {
  entries: {
    kind: string;
    deleted_at_utc?: string | null;
    doc?: { row?: Record<string, unknown> | null } | null;
  }[];
  next_since: number;
  more: boolean;
};

export function WorkingsRoute() {
  useTopbar(
    () => ({ title: "Workings", subtitle: "The operations that run over days and months" }),
    [],
  );

  const [workings, setWorkings] = useState<Working[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const all: PullResult["entries"] = [];
        let since = 0;
        for (;;) {
          const page = await apiGet<PullResult>(`/record/entries?since=${since}&limit=500`);
          all.push(...page.entries);
          since = page.next_since;
          if (!page.more) break;
        }
        if (!cancelled) setWorkings(workingsFromEntries(all));
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section style={{ maxWidth: 960, margin: "0 auto", padding: "var(--space-5, 24px)" }}>
      <p
        style={{
          margin: "0 0 20px",
          fontFamily: "var(--font-ui)",
          fontSize: 14,
          color: "var(--ink-soft)",
          lineHeight: 1.5,
          maxWidth: 560,
        }}
      >
        A working is a rite kept over time — its phases open on completion, on a date, after a span,
        or when a sign is received. What each phase asks is shown here; whether it was met is the
        practitioner’s to declare on the phone.
      </p>

      {error ? (
        <p style={{ fontFamily: "var(--font-ui)", fontSize: 13.5, color: "var(--danger)" }}>
          The record didn’t load: {error}
        </p>
      ) : workings === null ? (
        <p style={{ fontFamily: "var(--font-ui)", color: "var(--ink-mute)" }}>Loading…</p>
      ) : (
        <WorkingsLibrary workings={workings} />
      )}
    </section>
  );
}
