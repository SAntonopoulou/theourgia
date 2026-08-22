/**
 * Rituals — the rites the practitioner has written, read, performed, and now
 * written on the web.
 *
 * A rite is one field marked up as typed (see `riteScript.ts`); the site reads
 * the rites synced from the phone, lets each be performed (kept), and — new —
 * lets one be written or edited here, crossing back to the phone as a `ritual`
 * document. Everything goes through the record store, last-writer-wins.
 */

import {
  KeepingSheet,
  type KeepingValues,
  type RecordEntryWrite,
  type Rite,
  type RiteDraft,
  RiteEditor,
  RitesLibrary,
  Toast,
  ritesFromEntries,
  useTopbar,
} from "@theourgia/shared";
import { useEffect, useState } from "react";

import {
  amendObservance,
  deleteRitual,
  keepObservance,
  writeRitual,
} from "../data/keepObservance.js";
import {
  type PackedRite,
  adoptRite,
  flattenRiteScript,
  usePackedRites,
} from "../data/packedRites.js";
import { useMyLocation } from "../data/useLocation.js";
import { AdoptLibrary, type AdoptOffering } from "../lib/AdoptLibrary.js";
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

async function loadRites(): Promise<Rite[]> {
  const all: PullResult["entries"] = [];
  let since = 0;
  for (;;) {
    const page = await apiGet<PullResult>(`/record/entries?since=${since}&limit=500`);
    all.push(...(page.entries ?? []));
    since = page.next_since;
    if (!page.more) break;
  }
  return ritesFromEntries(all);
}

export function RitualsRoute() {
  useTopbar(() => ({ title: "Rituals", subtitle: "The rites you have written" }), []);

  const [rites, setRites] = useState<Rite[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sheet, setSheet] = useState<{ entry: RecordEntryWrite; title: string } | null>(null);
  const [busy, setBusy] = useState(false);
  // null = browsing; { rite: null } = writing a new one; { rite } = editing.
  const [editing, setEditing] = useState<{ rite: Rite | null } | null>(null);
  const location = useMyLocation({ enabled: true });
  const loc = location.data ?? MOCK_LOCATION;

  const refresh = async (): Promise<void> => {
    try {
      setRites(await loadRites());
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const loaded = await loadRites();
        if (!cancelled) setRites(loaded);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // The library: what installed rite packs offer, browsed and adopted in a
  // dialog — the page itself stays the practitioner's own rites.
  const packedRites = usePackedRites();
  const [libraryOpen, setLibraryOpen] = useState(false);
  const heldNames = new Set((rites ?? []).map((r) => r.name.trim().toLowerCase()));
  const packedByKey = new Map<string, PackedRite>();
  const offerings: AdoptOffering[] = (packedRites.data ?? []).map((rite, i) => {
    const key = `${rite.name}-${i}`;
    packedByKey.set(key, rite);
    return {
      key,
      name: rite.name,
      summary: rite.summary,
      badges: rite.steps.length > 0 ? [`${rite.steps.length} steps`] : [],
      packTitle: rite.packTitle || undefined,
      held: heldNames.has(rite.name.trim().toLowerCase()),
      sections: [{ title: "The rite, as written", body: flattenRiteScript(rite) }],
    };
  });

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

  const save = async (draft: RiteDraft): Promise<void> => {
    setBusy(true);
    try {
      await writeRitual({
        id: editing?.rite?.id,
        name: draft.name,
        summary: draft.summary,
        script: draft.script,
        createdAt: editing?.rite?.createdAt,
      });
      await refresh();
      setEditing(null);
      Toast.push({ tone: "success", title: editing?.rite ? "Rite saved" : "Rite written" });
    } catch (e) {
      Toast.push({
        tone: "warning",
        title: "That didn't save",
        body: e instanceof Error ? e.message : "Check your connection and try again.",
      });
    } finally {
      setBusy(false);
    }
  };

  const remove = async (rite: Rite): Promise<void> => {
    if (!window.confirm(`Delete "${rite.name || "this rite"}"? It is removed on the phone too.`)) {
      return;
    }
    setBusy(true);
    try {
      await deleteRitual(rite);
      await refresh();
      setEditing(null);
      Toast.push({ tone: "info", title: "Rite deleted" });
    } catch (e) {
      Toast.push({
        tone: "warning",
        title: "That didn't delete",
        body: e instanceof Error ? e.message : "Try again.",
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <section style={{ maxWidth: 960, margin: "0 auto", padding: "var(--space-5, 24px)" }}>
      {editing ? (
        <RiteEditor
          initial={
            editing.rite
              ? {
                  name: editing.rite.name,
                  summary: editing.rite.summary,
                  script: editing.rite.script,
                }
              : undefined
          }
          onSave={(d) => void save(d)}
          onCancel={() => setEditing(null)}
          onDelete={editing.rite ? () => void remove(editing.rite as Rite) : undefined}
          busy={busy}
        />
      ) : (
        <>
          {/* One composed head: what this page is, and the two ways in —
              write a rite, or open the library of what your packs offer. */}
          <div
            style={{
              display: "flex",
              alignItems: "flex-end",
              justifyContent: "space-between",
              gap: 16,
              flexWrap: "wrap",
              marginBottom: 22,
            }}
          >
            <p
              style={{
                margin: 0,
                fontFamily: "var(--font-ui)",
                fontSize: 13.5,
                color: "var(--ink-soft)",
                lineHeight: 1.55,
                maxWidth: 480,
              }}
            >
              Write a rite as one field — <code>(instructions)</code> for what the body does,{" "}
              <code>#</code> for a section, <code>*a name*</code> to vibrate — perform it to keep
              it, and it crosses to the phone.
            </p>
            <div style={{ display: "flex", gap: 10, flexShrink: 0 }}>
              <button
                type="button"
                onClick={() => setLibraryOpen(true)}
                style={{
                  padding: "8px 16px",
                  borderRadius: "var(--r-md, 10px)",
                  border: "1px solid var(--line)",
                  background: "var(--bg-2)",
                  color: "var(--ink-soft)",
                  fontFamily: "var(--font-ui)",
                  fontSize: 13,
                  cursor: "pointer",
                }}
              >
                The library{offerings.length > 0 ? ` · ${offerings.length}` : ""}
              </button>
              <button
                type="button"
                onClick={() => setEditing({ rite: null })}
                style={{
                  padding: "8px 16px",
                  borderRadius: "var(--r-md, 10px)",
                  border: "1px solid var(--accent)",
                  background: "var(--accent-soft)",
                  color: "var(--ink)",
                  fontFamily: "var(--font-ui)",
                  fontSize: 13,
                  cursor: "pointer",
                }}
              >
                New rite
              </button>
            </div>
          </div>

          {error ? (
            <p style={{ fontFamily: "var(--font-ui)", fontSize: 13.5, color: "var(--danger)" }}>
              The record didn’t load: {error}
            </p>
          ) : rites === null ? (
            <p style={{ fontFamily: "var(--font-ui)", color: "var(--ink-mute)" }}>Loading…</p>
          ) : (
            <RitesLibrary
              rites={rites}
              emptyMessage="No rites of your own yet. Open the library to adopt one from your installed packs, or write your own."
              onPerform={(r) => void perform(r)}
              onEdit={(r) => setEditing({ rite: r })}
            />
          )}

          <AdoptLibrary
            open={libraryOpen}
            onClose={() => setLibraryOpen(false)}
            title="Rites"
            intro="What your installed packs offer this practice. Adopting copies a rite into one of your own to edit and perform — a pack is a source, never a link, and nothing is scheduled on your behalf."
            kinds={["rite"]}
            offerings={offerings}
            emptyText="None of your installed packs carries rites yet. Install one above and its rites appear here."
            onAdopt={async (o) => {
              const rite = packedByKey.get(o.key);
              if (rite) {
                await adoptRite(rite);
                await refresh();
              }
            }}
            onInstalled={() => void packedRites.refetch()}
          />
        </>
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
