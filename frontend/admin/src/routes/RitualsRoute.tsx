/**
 * Rituals — the library of rites the practitioner has written.
 *
 * Web parity with the phone's Rituals screen. A rite is written on the phone
 * (one field, marked up as typed) and crosses in the record sync as a `ritual`
 * document; this reads them back and renders each as it is performed. The site
 * does not author rites yet — that is the next step; for now it is the reading
 * room for what the phone holds.
 */

import {
  KeepingSheet,
  type KeepingValues,
  type RecordEntryWrite,
  type Rite,
  RitesLibrary,
  ritesFromEntries,
  Toast,
  useTopbar,
} from "@theourgia/shared";
import { useEffect, useState } from "react";

import { amendObservance, keepObservance } from "../data/keepObservance.js";
import { useMyLocation } from "../data/useLocation.js";
import { apiGet } from "../lib/api.js";
import { MOCK_LOCATION } from "../mocks/today.js";

type PullResult = {
  entries: {
    kind: string;
    deleted_at_utc?: string | null;
    doc?: { row?: Record<string, unknown> | null } | null;
  }[];
  next_since: number;
  more: boolean;
};

export function RitualsRoute() {
  useTopbar(() => ({ title: "Rituals", subtitle: "The rites you have written" }), []);

  const [rites, setRites] = useState<Rite[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sheet, setSheet] = useState<{ entry: RecordEntryWrite; title: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const location = useMyLocation({ enabled: true });
  const loc = location.data ?? MOCK_LOCATION;

  const perform = async (rite: Rite): Promise<void> => {
    setBusy(true);
    try {
      const entry = await keepObservance({
        subjectKey: `ritual:${rite.id}`,
        occurrenceAt: new Date().toISOString(),
        subjectName: rite.name,
        location: { lat: loc.lat, lng: loc.lng },
      });
      setSheet({ entry, title: rite.name || "Rite" });
    } catch (e) {
      Toast.push({
        tone: "warning",
        title: "That didn't keep",
        body: e instanceof Error ? e.message : "Check your connection and try again.",
      });
    } finally {
      setBusy(false);
    }
  };

  const keepDetails = async (values: KeepingValues): Promise<void> => {
    if (!sheet) return;
    setBusy(true);
    try {
      await amendObservance(sheet.entry, values);
    } catch (e) {
      Toast.push({
        tone: "warning",
        title: "The note didn't save",
        body: e instanceof Error ? e.message : "The mark itself stands.",
      });
    } finally {
      setBusy(false);
      setSheet(null);
    }
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const all: PullResult["entries"] = [];
        let since = 0;
        // Page until the record is read whole; the server caps each page.
        for (;;) {
          const page = await apiGet<PullResult>(`/record/entries?since=${since}&limit=500`);
          all.push(...page.entries);
          since = page.next_since;
          if (!page.more) break;
        }
        if (!cancelled) setRites(ritesFromEntries(all));
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
        A rite is written on the phone and read here. Instructions — what the body does — are set
        quietly; a name marked to be vibrated is drawn in the accent.
      </p>

      {error ? (
        <p style={{ fontFamily: "var(--font-ui)", fontSize: 13.5, color: "var(--danger)" }}>
          The record didn’t load: {error}
        </p>
      ) : rites === null ? (
        <p style={{ fontFamily: "var(--font-ui)", color: "var(--ink-mute)" }}>Loading…</p>
      ) : (
        <RitesLibrary rites={rites} onPerform={(r) => void perform(r)} />
      )}

      {sheet ? (
        <KeepingSheet
          title={sheet.title}
          subtitle="Kept. Add how the rite was, if you like."
          onKeep={(v) => void keepDetails(v)}
          onClose={() => setSheet(null)}
          busy={busy}
        />
      ) : null}
    </section>
  );
}
