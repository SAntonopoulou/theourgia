/**
 * Tetraktys ladder — /order/ladder (H12 Sprint F2, Surface 5).
 *
 * The figure (ten points in four rows) is the navigation: current lit,
 * walked marked, locked dimmed, the serpent path 10→9→8→7→4→5→6→3→2→1
 * dashed beneath. Clicking a sphere opens its detail — curriculum
 * items with kind chips and dated evidence links into the journal,
 * the complete action with an evidence picker, the gate requirements,
 * and the pass action ONLY on the current sphere with all required
 * work done. Locked spheres render sealed: counts, never titles.
 *
 * Progress is a phrase from GET /curriculum/progress — never a bar,
 * never a percentage.
 */

import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ConfirmDialog,
  type CurriculumItemRead,
  Drawer,
  type EntryRecord,
  LadderProgressPhrase,
  type LadderProgressRead,
  type LadderRead,
  Skeleton,
  SphereDetailPanel,
  type SphereNumber,
  type SphereRead,
  TetraktysFigure,
  type TetraktysFigureSphere,
  Toast,
  useTopbar,
} from "@theourgia/shared";
import { useState } from "react";

import { apiMethods } from "../data/api.js";

function isLadder(value: unknown): value is LadderRead {
  return (
    typeof value === "object" &&
    value !== null &&
    Array.isArray((value as { spheres?: unknown }).spheres)
  );
}

function isProgress(value: unknown): value is LadderProgressRead {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as { phrase?: unknown }).phrase === "string"
  );
}

export function TetraktysLadderRoute() {
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<number | null>(null);
  const [pickingFor, setPickingFor] = useState<CurriculumItemRead | null>(null);
  const [confirmPass, setConfirmPass] = useState(false);
  const [countersign, setCountersign] = useState("");
  const [busy, setBusy] = useState(false);

  const ladder = useQuery({
    queryKey: ["curriculum-ladder"],
    queryFn: ({ signal }) => apiMethods.getCurriculumLadder({ signal }),
  });
  const progress = useQuery({
    queryKey: ["curriculum-progress"],
    queryFn: ({ signal }) => apiMethods.getCurriculumProgress({ signal }),
  });
  // Recent workings/records for the evidence picker — loaded lazily.
  const entries = useQuery({
    queryKey: ["ladder-evidence-entries"],
    queryFn: ({ signal }) => apiMethods.listEntries({ signal }),
    enabled: pickingFor !== null,
  });

  const ladderData = isLadder(ladder.data) ? ladder.data : null;
  const progressData = isProgress(progress.data) ? progress.data : null;

  useTopbar(
    () => ({
      title: "Tetraktys",
      subtitle: progressData ? progressData.phrase : "The Order · the ladder of ten",
    }),
    [progressData?.phrase],
  );

  const spheres = ladderData?.spheres ?? [];
  const figureSpheres: TetraktysFigureSphere[] = spheres.map((s) => ({
    number: s.number as SphereNumber,
    name: s.name,
    state: s.state,
  }));
  const activeNumber = selected ?? ladderData?.current_sphere ?? null;
  const activeSphere: SphereRead | null = spheres.find((s) => s.number === activeNumber) ?? null;

  async function refresh(): Promise<void> {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["curriculum-ladder"] }),
      queryClient.invalidateQueries({ queryKey: ["curriculum-progress"] }),
    ]);
  }

  async function completeItem(evidenceEntryId: string | null): Promise<void> {
    if (!pickingFor || busy) return;
    setBusy(true);
    try {
      await apiMethods.completeCurriculumItem(pickingFor.id, {
        evidence_entry_id: evidenceEntryId,
      });
      Toast.push({ tone: "success", title: "Item recorded as done" });
      setPickingFor(null);
      await refresh();
    } catch (e) {
      Toast.push({
        tone: "warning",
        title: "Could not record the item",
        body: e instanceof Error ? e.message : "Try again — the record was not changed.",
      });
    } finally {
      setBusy(false);
    }
  }

  async function passGate(): Promise<void> {
    if (!activeSphere || busy) return;
    setBusy(true);
    try {
      await apiMethods.passSphereGate(activeSphere.number, {
        countersign: countersign.trim() ? countersign.trim() : null,
      });
      Toast.push({ tone: "success", title: "The gate is passed — the walk continues" });
      setConfirmPass(false);
      setCountersign("");
      await refresh();
    } catch (e) {
      Toast.push({
        tone: "warning",
        title: "The gate does not open",
        body: e instanceof Error ? e.message : "Required work is incomplete.",
      });
      setConfirmPass(false);
    } finally {
      setBusy(false);
    }
  }

  if (ladder.status === "pending") {
    return (
      <div style={{ maxWidth: 960, margin: "0 auto" }}>
        <Skeleton kind="text" width="40%" />
      </div>
    );
  }
  if (ladder.status === "error" || !ladderData) {
    return (
      <div
        style={{
          maxWidth: 960,
          margin: "0 auto",
          padding: "16px 18px",
          border: "1px solid var(--line)",
          borderRadius: "var(--r-lg, 14px)",
          background: "var(--bg-2)",
          fontFamily: "var(--font-ui)",
          fontSize: 12.5,
          color: "var(--ink-mute)",
          lineHeight: 1.5,
        }}
      >
        The ladder could not be loaded
        {ladder.error instanceof Error ? ` — ${ladder.error.message}` : "."}
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 960, margin: "0 auto", minWidth: 0 }}>
      <div
        className="tk-cols"
        style={{
          display: "grid",
          gridTemplateColumns: "360px 1fr",
          gap: 26,
          alignItems: "start",
        }}
      >
        {/* ── The figure, as navigation ── */}
        <div style={{ maxWidth: 360, width: "100%" }}>
          <div
            style={{
              padding: "20px 18px",
              border: "1px solid var(--line)",
              borderRadius: "var(--r-lg, 14px)",
              background: "var(--bg-2)",
            }}
          >
            <TetraktysFigure
              spheres={figureSpheres}
              selected={activeNumber}
              onSelect={(n) => setSelected(n)}
            />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 7, marginTop: 13 }}>
            {(
              [
                ["Walked", "var(--sphere-done)", "var(--sphere-done-soft)", 1],
                ["Where you stand", "var(--sphere-current)", "var(--sphere-current-soft)", 1],
                ["Not yet opened", "var(--sphere-locked)", "transparent", 0.5],
              ] as const
            ).map(([label, border, bg, opacity]) => (
              <div key={label} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span
                  aria-hidden="true"
                  style={{
                    width: 12,
                    height: 12,
                    borderRadius: "50%",
                    border: `1px solid ${border}`,
                    background: bg,
                    opacity,
                    flex: "none",
                  }}
                />
                <span
                  style={{ fontFamily: "var(--font-ui)", fontSize: 11.5, color: "var(--ink-mute)" }}
                >
                  {label}
                </span>
              </div>
            ))}
          </div>
          <div
            style={{
              marginTop: 14,
              padding: "12px 14px 0",
              borderTop: "1px solid var(--line)",
              fontFamily: "var(--font-ui)",
              fontSize: 11,
              color: "var(--ink-mute)",
              lineHeight: 1.6,
            }}
          >
            The serpent descends from the tenth and returns to the first: 10 · 9 · 8 · 7 · 4 · 5 · 6
            · 3 · 2 · 1. The order is fixed; the pace is not.
          </div>
          {progressData ? (
            <div style={{ marginTop: 10 }}>
              <LadderProgressPhrase progress={progressData} />
            </div>
          ) : null}
        </div>

        {/* ── Sphere detail ── */}
        <div>
          {activeSphere ? (
            <SphereDetailPanel
              sphere={activeSphere}
              entryHref={(id) => `/editor/${id}`}
              onCompleteItem={(item) => setPickingFor(item)}
              onPassGate={() => setConfirmPass(true)}
            />
          ) : (
            <div
              style={{
                padding: "16px 18px",
                border: "1px dashed var(--line)",
                borderRadius: "var(--r-lg, 14px)",
                fontFamily: "var(--font-serif)",
                fontSize: 13.5,
                color: "var(--ink-mute)",
              }}
            >
              Choose a sphere on the figure.
            </div>
          )}
        </div>
      </div>

      {/* ── Evidence picker ── */}
      <Drawer
        open={pickingFor !== null}
        onClose={() => setPickingFor(null)}
        title="Evidence for the record"
        width={400}
      >
        {pickingFor ? (
          <div data-component="evidence-picker">
            <div
              style={{
                fontFamily: "var(--font-serif)",
                fontSize: 14,
                color: "var(--ink)",
                lineHeight: 1.5,
                marginBottom: 6,
              }}
            >
              {pickingFor.title}
            </div>
            <div
              style={{
                fontFamily: "var(--font-ui)",
                fontSize: 11.5,
                color: "var(--ink-mute)",
                lineHeight: 1.55,
                marginBottom: 14,
              }}
            >
              Link the journal entry that evidences the work, or record it done without one — the
              link is what lets the record answer for itself later.
            </div>
            <button
              type="button"
              data-action="complete-without-evidence"
              disabled={busy}
              onClick={() => void completeItem(null)}
              style={{
                width: "100%",
                textAlign: "left",
                padding: "11px 13px",
                border: "1px dashed var(--line-2)",
                borderRadius: "var(--r-md, 8px)",
                background: "transparent",
                fontFamily: "var(--font-ui)",
                fontSize: 12.5,
                color: "var(--ink-soft)",
                cursor: "pointer",
                marginBottom: 12,
                minHeight: 40,
              }}
            >
              Mark done without evidence
            </button>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {(Array.isArray(entries.data) ? (entries.data as EntryRecord[]) : []).map((e) => (
                <button
                  key={e.id}
                  type="button"
                  data-evidence-entry={e.id}
                  disabled={busy}
                  onClick={() => void completeItem(e.id)}
                  style={{
                    width: "100%",
                    textAlign: "left",
                    padding: "10px 13px",
                    border: "1px solid var(--line)",
                    borderRadius: "var(--r-md, 8px)",
                    background: "var(--bg-2)",
                    cursor: "pointer",
                    minHeight: 44,
                  }}
                >
                  <span
                    style={{
                      display: "block",
                      fontFamily: "var(--font-serif)",
                      fontSize: 13.5,
                      color: "var(--ink)",
                    }}
                  >
                    {e.title}
                  </span>
                  <span
                    style={{
                      display: "block",
                      fontFamily: "var(--font-mono)",
                      fontSize: 10.5,
                      color: "var(--ink-mute)",
                      marginTop: 2,
                    }}
                  >
                    {new Date(e.created_at).toLocaleDateString()}
                  </span>
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </Drawer>

      {/* ── Pass-gate confirm (with optional countersign) ── */}
      <ConfirmDialog
        open={confirmPass}
        title="Pass the gate?"
        body={
          // ConfirmDialog wraps the body in a <p>; keep to phrasing
          // content (spans + label/input) so the DOM nesting is valid.
          <>
            <span style={{ display: "block", marginBottom: 10, lineHeight: 1.55 }}>
              Every required item of this sphere is complete. Passing the gate opens the next sphere
              on the serpent walk; the passed gate becomes part of the record.
            </span>
            <label
              style={{
                display: "block",
                fontFamily: "var(--font-ui)",
                fontSize: 11.5,
                color: "var(--ink-mute)",
              }}
            >
              Preceptor countersign (optional)
              <input
                value={countersign}
                onChange={(e) => setCountersign(e.target.value)}
                placeholder="Who countersigns…"
                style={{
                  width: "100%",
                  marginTop: 6,
                  padding: "9px 11px",
                  border: "1px solid var(--line-2)",
                  borderRadius: "var(--r-md, 8px)",
                  background: "var(--bg)",
                  color: "var(--ink)",
                  fontFamily: "var(--font-serif)",
                  fontSize: 13.5,
                  boxSizing: "border-box",
                }}
              />
            </label>
          </>
        }
        confirmLabel="Pass it"
        onConfirm={() => void passGate()}
        onCancel={() => setConfirmPass(false)}
      />
    </div>
  );
}
