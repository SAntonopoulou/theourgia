/**
 * Servitors — constructed beings: purpose, sigil, feeding, lifespan
 * (v1-019).
 *
 * Composition tracks `Theourgia Servitors.dc.html`:
 *   Topbar    · "Servitors" + "Constructed beings — purpose, sigil,
 *               feeding, lifespan" + "New servitor".
 *   Subnav    · BeingsTabs, active=servitors.
 *   Left      · ServitorListItem rows (sigil tile · name · kind ·
 *               ServitorStatusPill · feed-hint strip).
 *   Right     · detail: kind badge + status pill + name + purpose,
 *               then Feeding → Members (egregores) → Tasks → Lifespan
 *               sections.
 *
 * The mockup ships no full new-servitor composer (its button only
 * flashes a toast) — creation uses the PromptDialog pattern the
 * Entities surface established. "Record feeding" posts the /feed
 * action directly (the backend persists only last_fed_at). No
 * gamification: feeding language stays matter-of-fact, task statuses
 * use the --ts-* care palette, never red.
 */

import {
  Button,
  PromptDialog,
  type ServitorKindWire,
  ServitorListItem,
  type ServitorRead,
  ServitorStatusPill,
  ServitorTaskCard,
  type ServitorTaskRead,
  Skeleton,
  Toast,
  useApiCall,
  useTopbar,
} from "@theourgia/shared";
import { useState } from "react";

import { apiMethods } from "../data/api.js";
import { BeingsSubnav } from "../lib/BeingsSubnav.js";

const KIND_LABEL: Record<ServitorKindWire, string> = {
  servitor: "Servitor",
  egregore: "Egregore",
};

/** Rough cadence window in days for the feed-elapsed hint. */
function cadenceDays(cadence: string | null): number | null {
  if (!cadence) return null;
  const c = cadence.toLowerCase();
  if (c.includes("daily")) return 1;
  if (c.includes("weekly")) return 7;
  if (c.includes("monthly")) return 30;
  return null;
}

function daysSince(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
}

function feedHintOf(s: ServitorRead): { hint?: string; overdue: boolean } {
  if (!s.last_fed_at) return { overdue: false };
  const elapsed = daysSince(s.last_fed_at);
  const window = cadenceDays(s.feeding_cadence);
  if (window !== null && elapsed > window) {
    return {
      hint: s.kind === "egregore" ? "Group feeding elapsed" : "Feeding elapsed",
      overdue: true,
    };
  }
  return {
    hint: elapsed === 0 ? "Fed today" : elapsed === 1 ? "Fed yesterday" : `Fed ${elapsed} days ago`,
    overdue: false,
  };
}

function fmtDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getDate()} ${d.toLocaleDateString("en-GB", { month: "short" })} ${d.getFullYear()}`;
}

function taskMeta(t: ServitorTaskRead): string {
  if (t.completed_at) return `Completed ${fmtDate(t.completed_at)}`;
  if (t.target_completion_at) return `Due ${fmtDate(t.target_completion_at)}`;
  return `Standing charge · since ${fmtDate(t.given_at)}`;
}

const sectionStyle: React.CSSProperties = {
  background: "var(--bg-2)",
  border: "1px solid var(--line)",
  borderRadius: "var(--r-lg, 14px)",
  padding: "16px 18px",
};

const sectionLabel: React.CSSProperties = {
  fontFamily: "var(--font-ui)",
  fontSize: 10.5,
  letterSpacing: "0.16em",
  textTransform: "uppercase",
  color: "var(--ink-mute)",
  marginBottom: 12,
};

// ─── Detail (keyed by servitor id so tasks refetch per selection) ───────────

function ServitorDetail({
  servitor,
  onChanged,
}: {
  servitor: ServitorRead;
  onChanged: () => Promise<void>;
}) {
  const [assigning, setAssigning] = useState(false);
  const [feeding, setFeeding] = useState(false);

  const tasks = useApiCall<ServitorTaskRead[]>((signal) =>
    apiMethods.listServitorTasks(servitor.id, { signal }),
  );

  const feedLine = [servitor.feeding_cadence ?? "—", servitor.feeding_method ?? "—"].join(" · ");

  async function recordFeeding(): Promise<void> {
    setFeeding(true);
    try {
      await apiMethods.feedServitor(servitor.id, { fed_at: new Date().toISOString() });
      Toast.push({ tone: "success", title: "Feeding recorded" });
      await onChanged();
    } catch (e) {
      Toast.push({
        tone: "error",
        title: "Couldn't record the feeding",
        body: e instanceof Error ? e.message : String(e),
      });
    } finally {
      setFeeding(false);
    }
  }

  async function assignTask(description: string): Promise<void> {
    setAssigning(false);
    try {
      await apiMethods.createServitorTask(servitor.id, {
        description: description.trim(),
        given_at: new Date().toISOString(),
      });
      Toast.push({ tone: "success", title: "Task assigned" });
      await tasks.refresh();
    } catch (e) {
      Toast.push({
        tone: "error",
        title: "Couldn't assign the task",
        body: e instanceof Error ? e.message : String(e),
      });
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
        <span
          aria-hidden="true"
          style={{
            width: 72,
            height: 72,
            flex: "none",
            borderRadius: 14,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "var(--font-glyph, var(--font-serif))",
            fontSize: 30,
            color: "var(--accent)",
            background: "var(--bg-2)",
            border: "1px solid var(--line-2)",
          }}
        >
          {servitor.name.slice(0, 1).toUpperCase()}
        </span>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <span
              style={{
                fontFamily: "var(--font-ui)",
                fontSize: 10.5,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: "var(--ink-mute)",
              }}
            >
              {KIND_LABEL[servitor.kind]}
            </span>
            <ServitorStatusPill status={servitor.status} />
          </div>
          <h2
            style={{
              margin: "4px 0 0",
              fontFamily: "var(--font-display, var(--font-serif))",
              fontSize: 27,
              fontWeight: 400,
              lineHeight: 1.15,
            }}
          >
            {servitor.name}
          </h2>
          {servitor.purpose ? (
            <p
              style={{
                margin: "8px 0 0",
                fontFamily: "var(--font-serif)",
                fontSize: 14.5,
                lineHeight: 1.6,
                color: "var(--ink-soft)",
              }}
            >
              {servitor.purpose}
            </p>
          ) : null}
        </div>
      </div>

      {/* Feeding */}
      <section style={sectionStyle} aria-label="Feeding">
        <div style={sectionLabel}>Feeding</div>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <span
            style={{
              fontFamily: "var(--font-serif)",
              fontSize: 14,
              color: "var(--ink-soft)",
            }}
          >
            {feedLine}
          </span>
          <span
            style={{
              marginLeft: "auto",
              fontFamily: "var(--font-ui)",
              fontSize: 12,
              color: "var(--ink-mute)",
            }}
          >
            {servitor.last_fed_at ? `Last fed ${fmtDate(servitor.last_fed_at)}` : "Never fed"}
          </span>
          <Button variant="secondary" onClick={() => void recordFeeding()} loading={feeding}>
            Record feeding
          </Button>
        </div>
      </section>

      {/* Members — egregores only */}
      {servitor.kind === "egregore" ? (
        <section style={sectionStyle} aria-label="Members">
          <div style={sectionLabel}>Members</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
            {servitor.members.map((m) => (
              <div
                key={m}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  fontFamily: "var(--font-ui)",
                  fontSize: 13,
                  color: "var(--ink-soft)",
                }}
              >
                <span
                  aria-hidden="true"
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "var(--accent-soft)",
                    border: "1px solid var(--line-2)",
                    fontSize: 12,
                    color: "var(--accent)",
                  }}
                >
                  {m.slice(0, 1).toUpperCase()}
                </span>
                {m}
              </div>
            ))}
          </div>
          <div
            style={{
              marginTop: 12,
              fontFamily: "var(--font-ui)",
              fontSize: 11.5,
              color: "var(--ink-mute)",
            }}
          >
            Any confirmed member can record a feeding; the log notes who.
          </div>
        </section>
      ) : null}

      {/* Tasks */}
      <section style={sectionStyle} aria-label="Tasks">
        <div style={{ display: "flex", alignItems: "center", marginBottom: 12 }}>
          <div style={{ ...sectionLabel, marginBottom: 0 }}>Tasks</div>
          <span style={{ marginLeft: "auto" }}>
            <Button variant="secondary" size="sm" onClick={() => setAssigning(true)}>
              Assign a task
            </Button>
          </span>
        </div>
        {tasks.status === "loading" ? (
          <Skeleton kind="text" width="50%" />
        ) : (tasks.data ?? []).length === 0 ? (
          <div
            style={{
              fontFamily: "var(--font-serif)",
              fontStyle: "italic",
              fontSize: 13.5,
              color: "var(--ink-mute)",
            }}
          >
            No tasks assigned.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
            {(tasks.data ?? []).map((t) => (
              <ServitorTaskCard
                key={t.id}
                id={t.id}
                description={t.description}
                status={t.status}
                meta={taskMeta(t)}
                {...(t.outcome_notes ? { outcome: t.outcome_notes } : {})}
              />
            ))}
          </div>
        )}
      </section>

      {/* Lifespan */}
      <section style={sectionStyle} aria-label="Lifespan">
        <div style={sectionLabel}>Lifespan</div>
        <p
          style={{
            margin: 0,
            fontFamily: "var(--font-serif)",
            fontSize: 14,
            lineHeight: 1.6,
            color: "var(--ink-soft)",
          }}
        >
          {servitor.lifespan_limit
            ? `Planned end on ${fmtDate(servitor.lifespan_limit)}.`
            : "No planned end. It stands as long as it is fed."}
        </p>
      </section>

      <PromptDialog
        open={assigning}
        title="Assign a task"
        label="Description"
        placeholder="What is it charged to do?"
        validate={(v) => (v.trim().length < 1 ? "Description required." : null)}
        confirmLabel="Assign"
        onSubmit={(value) => void assignTask(value)}
        onCancel={() => setAssigning(false)}
      />
    </div>
  );
}

// ─── Page ───────────────────────────────────────────────────────────────────

export function ServitorsRoute() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [composing, setComposing] = useState(false);

  const servitors = useApiCall<ServitorRead[]>((signal) => apiMethods.listServitors({ signal }));
  const rows = servitors.data ?? [];
  const selected = rows.find((s) => s.id === selectedId) ?? rows[0] ?? null;

  useTopbar(
    () => ({
      title: "Servitors",
      subtitle: "Constructed beings — purpose, sigil, feeding, lifespan",
      after: (
        <Button variant="primary" onClick={() => setComposing(true)}>
          New servitor
        </Button>
      ),
    }),
    [],
  );

  async function createServitor(name: string): Promise<void> {
    setComposing(false);
    try {
      await apiMethods.createServitor({ name: name.slice(0, 256) });
      Toast.push({ tone: "success", title: "Servitor added" });
      await servitors.refresh();
    } catch (e) {
      Toast.push({
        tone: "error",
        title: "Couldn't add the servitor",
        body: e instanceof Error ? e.message : String(e),
      });
    }
  }

  return (
    <>
      <BeingsSubnav active="servitors" />
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-start", gap: 24 }}>
        {/* LIST */}
        <aside style={{ flex: "0 1 316px", minWidth: 240 }}>
          {servitors.status === "loading" ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {[0, 1, 2].map((i) => (
                <div
                  key={`sv-skel-${i}`}
                  style={{
                    background: "var(--bg-2)",
                    border: "1px solid var(--line)",
                    borderRadius: "var(--r-md, 8px)",
                    padding: 13,
                  }}
                >
                  <Skeleton kind="text" width="60%" />
                </div>
              ))}
            </div>
          ) : servitors.status === "error" ? (
            <div
              style={{
                fontFamily: "var(--font-serif)",
                fontSize: 14,
                color: "var(--ink-soft)",
              }}
            >
              Couldn't load servitors: {servitors.error?.message ?? "unknown error."}
            </div>
          ) : rows.length === 0 ? (
            <div
              data-empty="servitors"
              style={{
                border: "1px solid var(--line)",
                borderRadius: "var(--r-lg, 14px)",
                background: "var(--bg-2)",
                padding: "28px 22px",
                textAlign: "center",
                fontFamily: "var(--font-serif)",
                fontSize: 14,
                lineHeight: 1.6,
                color: "var(--ink-mute)",
              }}
            >
              No servitors recorded.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {rows.map((s) => {
                const feed = feedHintOf(s);
                return (
                  <ServitorListItem
                    key={s.id}
                    id={s.id}
                    name={s.name}
                    kindLabel={KIND_LABEL[s.kind]}
                    status={s.status}
                    sigil={s.name.slice(0, 1).toUpperCase()}
                    {...(feed.hint ? { feedHint: feed.hint } : {})}
                    feedOverdue={feed.overdue}
                    selected={selected?.id === s.id}
                    onSelect={() => setSelectedId(s.id)}
                  />
                );
              })}
            </div>
          )}
        </aside>

        {/* DETAIL — keyed so the tasks call refires per selection. */}
        <main style={{ flex: "3 1 460px", minWidth: 0, maxWidth: 880 }}>
          {selected ? (
            <ServitorDetail
              key={selected.id}
              servitor={selected}
              onChanged={() => servitors.refresh()}
            />
          ) : null}
        </main>
      </div>

      <PromptDialog
        open={composing}
        title="New servitor"
        label="Name"
        placeholder="e.g. Phylax"
        validate={(v) => (v.trim().length < 1 ? "Name required." : null)}
        confirmLabel="Add"
        onSubmit={(value) => void createServitor(value)}
        onCancel={() => setComposing(false)}
      />
    </>
  );
}
