/**
 * The two gates — /verdicts (H12 Sprint F2, Surface 4).
 *
 * Declare before · judge after (rule 69). The Awaiting-judgment queue
 * (oldest first, with age) opens a per-working covenant panel:
 *
 *   undeclared → the declare-intent flow. POST once; the server seals
 *       the text with its hour and key fingerprint. No update route
 *       exists — the UI offers none either.
 *   sealed → the two gates (did it work? / is it true?), each
 *       pass/fail/open with a note, saved via PUT. Finalize (with a
 *       confirm) requires both gates non-open.
 *   judged → immutable. The controls disable; the record stands.
 *
 * Workings without a covenant are reachable through the "Declare an
 * intent" picker (entries of type working / magical_record).
 */

import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AwaitingJudgmentQueue,
  type AwaitingJudgmentRead,
  ConfirmDialog,
  type EntryRecord,
  GateCard,
  type GateResultWire,
  IntentCovenantField,
  Toast,
  type WorkingVerdictRead,
  canFinalize,
  useTopbar,
} from "@theourgia/shared";
import { useState } from "react";

import { apiMethods } from "../data/api.js";

const SECTION_LABEL: React.CSSProperties = {
  fontFamily: "var(--font-ui)",
  fontSize: 10.5,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  color: "var(--ink-mute)",
  marginBottom: 9,
};

function shortStamp(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function VerdictsRoute() {
  useTopbar(() => ({ title: "The two gates", subtitle: "Declare before · judge after" }), []);
  const queryClient = useQueryClient();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [gate1, setGate1] = useState<GateResultWire>("open");
  const [gate2, setGate2] = useState<GateResultWire>("open");
  const [note1, setNote1] = useState("");
  const [note2, setNote2] = useState("");
  const [saving, setSaving] = useState(false);
  const [confirmFinalize, setConfirmFinalize] = useState(false);

  const queue = useQuery({
    queryKey: ["awaiting-judgment"],
    queryFn: ({ signal }) => apiMethods.listAwaitingJudgment({ signal }),
  });

  // Workings (both judgeable entry kinds) for the declare-intent picker.
  const workings = useQuery({
    queryKey: ["workings-for-intent"],
    queryFn: async ({ signal }) => {
      const [w, m] = await Promise.all([
        apiMethods.listEntries({ type: "working", signal }),
        apiMethods.listEntries({ type: "magical_record", signal }),
      ]);
      const a = Array.isArray(w) ? w : [];
      const b = Array.isArray(m) ? m : [];
      return [...a, ...b];
    },
  });

  const verdict = useQuery({
    queryKey: ["working-verdict", selectedId],
    queryFn: ({ signal }) => apiMethods.getWorkingVerdict(selectedId as string, { signal }),
    enabled: selectedId !== null,
  });

  function hydrateFromVerdict(v: WorkingVerdictRead): void {
    setGate1(v.gate1.result);
    setGate2(v.gate2.result);
    setNote1(v.gate1.notes ?? "");
    setNote2(v.gate2.notes ?? "");
  }

  function openWorking(entryId: string): void {
    setSelectedId(entryId);
    // Gate state re-hydrates when the verdict query settles.
    setGate1("open");
    setGate2("open");
    setNote1("");
    setNote2("");
  }

  // Re-hydrate the editable gate state whenever a fresh verdict arrives.
  const verdictData =
    verdict.data && typeof verdict.data === "object" && "entry_id" in verdict.data
      ? (verdict.data as WorkingVerdictRead)
      : null;
  const [hydratedFor, setHydratedFor] = useState<string | null>(null);
  if (verdictData && hydratedFor !== `${verdictData.entry_id}:${verdictData.judged_at ?? ""}`) {
    setHydratedFor(`${verdictData.entry_id}:${verdictData.judged_at ?? ""}`);
    hydrateFromVerdict(verdictData);
  }

  async function declareIntent(text: string): Promise<void> {
    if (!selectedId) return;
    try {
      await apiMethods.declareWorkingIntent(selectedId, { text });
      Toast.push({ tone: "success", title: "The intent is sealed" });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["working-verdict", selectedId] }),
        queryClient.invalidateQueries({ queryKey: ["awaiting-judgment"] }),
      ]);
    } catch (e) {
      Toast.push({
        tone: "warning",
        title: "The intent was not sealed",
        body: e instanceof Error ? e.message : "Try again — nothing was recorded.",
      });
    }
  }

  async function saveVerdict(finalize: boolean): Promise<void> {
    if (!selectedId || saving) return;
    setSaving(true);
    try {
      await apiMethods.putWorkingVerdict(selectedId, {
        gate1: { result: gate1, notes: note1.trim() ? note1.trim() : null },
        gate2: { result: gate2, notes: note2.trim() ? note2.trim() : null },
        finalize,
      });
      Toast.push({
        tone: "success",
        title: finalize ? "Verdict recorded — the working leaves the queue" : "Judgment saved",
      });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["working-verdict", selectedId] }),
        queryClient.invalidateQueries({ queryKey: ["awaiting-judgment"] }),
      ]);
    } catch (e) {
      Toast.push({
        tone: "warning",
        title: "The judgment was not saved",
        body: e instanceof Error ? e.message : "Try again — the record was not changed.",
      });
    } finally {
      setSaving(false);
      setConfirmFinalize(false);
    }
  }

  const queueItems: AwaitingJudgmentRead[] = Array.isArray(queue.data) ? queue.data : [];
  const workingOptions: EntryRecord[] = Array.isArray(workings.data) ? workings.data : [];
  const judged = verdictData?.finalized_at != null;
  const finalizable = canFinalize(gate1, gate2);

  return (
    <div style={{ maxWidth: 800, margin: "0 auto", minWidth: 0 }}>
      {/* ── The queue ── */}
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          gap: 10,
          marginBottom: 11,
          flexWrap: "wrap",
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-display, var(--font-serif))",
            fontSize: 17,
            color: "var(--ink)",
          }}
        >
          Awaiting judgment
        </span>
        <span style={{ fontFamily: "var(--font-ui)", fontSize: 11.5, color: "var(--ink-mute)" }}>
          {queueItems.length === 1 ? "1 working" : `${queueItems.length} workings`} · oldest first
        </span>
      </div>
      <AwaitingJudgmentQueue
        items={queueItems}
        selectedId={selectedId}
        onSelect={(item) => openWorking(item.entry_id)}
        style={{ marginBottom: 22 }}
      />

      {/* ── Declare an intent on a working without one ── */}
      {workingOptions.length > 0 ? (
        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            flexWrap: "wrap",
            marginBottom: 26,
            fontFamily: "var(--font-ui)",
            fontSize: 12,
            color: "var(--ink-mute)",
          }}
        >
          Declare an intent on a working
          <select
            data-working-picker
            value={selectedId ?? ""}
            onChange={(e) => {
              if (e.target.value) openWorking(e.target.value);
            }}
            style={{
              padding: "8px 10px",
              border: "1px solid var(--line-2)",
              borderRadius: "var(--r-md, 8px)",
              background: "var(--bg-2)",
              color: "var(--ink)",
              fontFamily: "var(--font-ui)",
              fontSize: 12.5,
              minHeight: 34,
              maxWidth: "100%",
            }}
          >
            <option value="">Choose a working…</option>
            {workingOptions.map((w) => (
              <option key={w.id} value={w.id}>
                {w.title}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      {/* ── The covenant panel ── */}
      {selectedId !== null && verdictData ? (
        <>
          <div style={SECTION_LABEL}>The working</div>
          <div
            style={{
              padding: "15px 17px",
              border: "1px solid var(--line)",
              borderRadius: "var(--r-lg, 14px)",
              background: "var(--bg-2)",
              marginBottom: 16,
            }}
          >
            <div
              data-working-title
              style={{
                fontFamily: "var(--font-display, var(--font-serif))",
                fontSize: 19,
                color: "var(--ink)",
                lineHeight: 1.15,
              }}
            >
              {verdictData.title}
            </div>
          </div>

          <div style={SECTION_LABEL}>Before — the declared intent</div>
          <IntentCovenantField
            intent={verdictData.intent}
            onSeal={(text) => declareIntent(text)}
            style={{ marginBottom: 20 }}
          />

          {verdictData.intent ? (
            <>
              <div style={SECTION_LABEL}>After — the judgment</div>
              <div
                className="td-two"
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 13,
                  marginBottom: 14,
                }}
              >
                <GateCard
                  num="Gate 1"
                  question="Did it work?"
                  test="Repeatable — did the effect appear, and would it appear again?"
                  value={gate1}
                  note={note1}
                  onChange={setGate1}
                  onNoteChange={setNote1}
                  disabled={judged}
                  stamp={
                    judged && verdictData.judged_at
                      ? `judged ${shortStamp(verdictData.judged_at)}`
                      : null
                  }
                />
                <GateCard
                  num="Gate 2"
                  question="Is it true?"
                  test="Coherent — does it hold with the rest of what you know?"
                  value={gate2}
                  note={note2}
                  onChange={setGate2}
                  onNoteChange={setNote2}
                  disabled={judged}
                  stamp={
                    judged && verdictData.judged_at
                      ? `judged ${shortStamp(verdictData.judged_at)}`
                      : null
                  }
                />
              </div>

              {judged ? (
                <div
                  data-judged-banner
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "13px 16px",
                    border: "1px solid var(--peer-ok-border)",
                    borderRadius: "var(--r-md, 8px)",
                    background: "var(--peer-ok-soft)",
                    marginBottom: 26,
                    fontFamily: "var(--font-serif)",
                    fontSize: 13.5,
                    color: "var(--ink)",
                    lineHeight: 1.5,
                  }}
                >
                  Verdict recorded
                  {verdictData.finalized_at ? ` ${shortStamp(verdictData.finalized_at)}` : ""}. It
                  is part of the record now and cannot be revised — declare a new working to test
                  again.
                </div>
              ) : (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "13px 16px",
                    border: "1px solid var(--warn-border)",
                    borderRadius: "var(--r-md, 8px)",
                    background: "var(--warn-soft)",
                    marginBottom: 26,
                    flexWrap: "wrap",
                  }}
                >
                  <div
                    style={{
                      flex: 1,
                      minWidth: 220,
                      fontFamily: "var(--font-serif)",
                      fontSize: 13.5,
                      color: "var(--ink)",
                      lineHeight: 1.5,
                    }}
                  >
                    {finalizable
                      ? "Both gates are judged. Recording the verdict seals it — the record does not quietly forget an unfinished judgment, nor does it let a finished one be rewritten."
                      : "A gate is still open. This working sits in Awaiting judgment until you close them both — the record does not quietly forget an unfinished verdict."}
                  </div>
                  <div style={{ display: "flex", gap: 8, flex: "none", flexWrap: "wrap" }}>
                    <button
                      type="button"
                      data-action="save-judgment"
                      disabled={saving}
                      onClick={() => void saveVerdict(false)}
                      style={{
                        padding: "10px 15px",
                        borderRadius: "var(--r-md, 8px)",
                        border: "1px solid var(--line-2)",
                        background: "transparent",
                        fontFamily: "var(--font-ui)",
                        fontSize: 13,
                        color: "var(--ink-soft)",
                        cursor: saving ? "default" : "pointer",
                        minHeight: 38,
                      }}
                    >
                      Save without sealing
                    </button>
                    <button
                      type="button"
                      data-action="finalize"
                      disabled={!finalizable || saving}
                      onClick={() => setConfirmFinalize(true)}
                      style={{
                        padding: "10px 17px",
                        borderRadius: "var(--r-md, 8px)",
                        border: "1px solid var(--warn-border)",
                        background: "transparent",
                        fontFamily: "var(--font-ui)",
                        fontWeight: 700,
                        fontSize: 13,
                        color: finalizable ? "var(--warn)" : "var(--ink-mute)",
                        cursor: finalizable && !saving ? "pointer" : "not-allowed",
                        minHeight: 38,
                      }}
                    >
                      Record the verdict
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : null}
        </>
      ) : null}

      <ConfirmDialog
        open={confirmFinalize}
        title="Record the verdict?"
        body="Both gates close and the verdict seals. After this it cannot be revised — a finished judgment is part of the record, like the intent it answers."
        confirmLabel="Record it"
        onConfirm={() => void saveVerdict(true)}
        onCancel={() => setConfirmFinalize(false)}
      />
    </div>
  );
}
