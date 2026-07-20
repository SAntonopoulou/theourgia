/**
 * Offerings — the "what you have given" ledger surface (v1-019).
 *
 * Composition tracks `Theourgia Offerings.dc.html`:
 *   Topbar    · "Offerings" + "What you have given, and how it was
 *               received" + "Record offering" primary action.
 *   Subnav    · BeingsTabs, active=offerings.
 *   Filters   · Being select + reception pills (Any / None / Faint /
 *               Clear / Strong / Overwhelming).
 *   Timeline  · day-grouped OfferingTimelineCard rows.
 *   Rail      · "Active practices" — ActivePracticeCard per recurring
 *               offering, pause/resume + Record prefill.
 *   Drawer    · "Record an offering" — ItemsComposer + ReceptionSelector
 *               + intention/outcome fields → POST /api/v1/offerings.
 *
 * Empty-state copy is verbatim from the mockup's two variants (ledger
 * empty vs filters exclude everything).
 */

import {
  ActivePracticeCard,
  Button,
  type ChosenItem,
  Drawer,
  EmptyState,
  type EntityRecord,
  Field,
  ItemsComposer,
  OFFERING_ITEM_META,
  type OfferingItemEntry,
  type OfferingItemKind,
  type OfferingItemWire,
  type OfferingRead,
  type OfferingRecord,
  OfferingTimelineCard,
  RECEPTION_META,
  RECEPTION_ORDER,
  type ReceptionLevel,
  ReceptionSelector,
  type RecurringOfferingRead,
  Select,
  Skeleton,
  TextArea,
  TextInput,
  Toast,
  useApiCall,
  useTopbar,
} from "@theourgia/shared";
import { useMemo, useState } from "react";

import { apiMethods } from "../data/api.js";
import { BeingsSubnav } from "../lib/BeingsSubnav.js";

// ─── Formatting helpers ─────────────────────────────────────────────────────

/** "21 June" (with year appended when it isn't the current year). */
function dayLabel(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const base = `${d.getDate()} ${d.toLocaleDateString("en-GB", { month: "long" })}`;
  const withYear = d.getFullYear() === now.getFullYear() ? base : `${base} ${d.getFullYear()}`;
  if (sameDay(d, now)) return `Today · ${base}`;
  if (sameDay(d, yesterday)) return `Yesterday · ${base}`;
  return withYear;
}

/** Local-date key for grouping ("2026-06-21"). */
function dayKey(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function timeLabel(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

/** "YYYY-MM-DDTHH:MM" for a datetime-local input, in local time. */
function toLocalInputValue(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function dueHint(nextDueAt: string | null): { due: string; soon: boolean } {
  if (!nextDueAt) return { due: "—", soon: false };
  const days = Math.ceil((new Date(nextDueAt).getTime() - Date.now()) / 86_400_000);
  if (days < 0) return { due: "Elapsed", soon: true };
  if (days === 0) return { due: "Due today", soon: true };
  if (days === 1) return { due: "Due tomorrow", soon: true };
  return { due: `Due in ${days} days`, soon: days <= 2 };
}

function isKnownKind(kind: string | undefined): kind is OfferingItemKind {
  return !!kind && kind in OFFERING_ITEM_META;
}

function toItemEntries(items: OfferingItemWire[]): OfferingItemEntry[] {
  return items.map((it) => {
    const known = isKnownKind(it.kind);
    return {
      kind: known ? (it.kind as OfferingItemKind) : null,
      label: known
        ? OFFERING_ITEM_META[it.kind as OfferingItemKind].label
        : (it.kind ?? it.notes ?? "—"),
      ...(it.quantity ? { qty: it.quantity } : {}),
      ...(it.unit ? { unit: it.unit } : {}),
    };
  });
}

// ─── Reception filter pills ─────────────────────────────────────────────────

type ReceptionFilter = "all" | ReceptionLevel;

function ReceptionPills({
  active,
  onChange,
}: {
  active: ReceptionFilter;
  onChange: (next: ReceptionFilter) => void;
}) {
  const pillStyle = (selected: boolean): React.CSSProperties => ({
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "6px 12px",
    fontFamily: "var(--font-ui)",
    fontSize: 12,
    color: selected ? "var(--ink)" : "var(--ink-soft)",
    background: selected ? "var(--accent-soft)" : "transparent",
    border: `1px solid ${selected ? "var(--line-2)" : "var(--line)"}`,
    borderRadius: "var(--r-pill, 999px)",
    cursor: "pointer",
  });
  return (
    <div
      role="group"
      aria-label="Reception"
      style={{ display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap" }}
    >
      <button
        type="button"
        aria-pressed={active === "all"}
        onClick={() => onChange("all")}
        style={pillStyle(active === "all")}
      >
        Any
      </button>
      {RECEPTION_ORDER.map((level) => {
        const meta = RECEPTION_META[level];
        const selected = active === level;
        return (
          <button
            key={level}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(selected ? "all" : level)}
            style={pillStyle(selected)}
          >
            <span
              aria-hidden="true"
              style={{
                width: 7,
                height: 7,
                borderRadius: "50%",
                background: meta.color,
                display: "inline-block",
              }}
            />
            {meta.label}
          </button>
        );
      })}
    </div>
  );
}

// ─── Record drawer ──────────────────────────────────────────────────────────

interface DrawerPrefill {
  entityId?: string;
  items?: ChosenItem[];
}

function RecordOfferingDrawer({
  open,
  entities,
  prefill,
  onClose,
  onRecorded,
}: {
  open: boolean;
  entities: EntityRecord[];
  prefill: DrawerPrefill | null;
  onClose: () => void;
  onRecorded: () => Promise<void>;
}) {
  const [entityId, setEntityId] = useState("");
  const [offeredAt, setOfferedAt] = useState(() => toLocalInputValue(new Date()));
  const [place, setPlace] = useState("");
  const [items, setItems] = useState<ChosenItem[]>([]);
  const [intention, setIntention] = useState("");
  const [reception, setReception] = useState<ReceptionLevel>("none");
  const [outcome, setOutcome] = useState("");
  const [saving, setSaving] = useState(false);
  const [seeded, setSeeded] = useState(false);

  // Seed once per open: the prefill (from a practice's Record button)
  // or the first loaded entity.
  if (open && !seeded) {
    setSeeded(true);
    setEntityId(prefill?.entityId ?? entities[0]?.id ?? "");
    setItems(prefill?.items ?? []);
    setOfferedAt(toLocalInputValue(new Date()));
    setPlace("");
    setIntention("");
    setReception("none");
    setOutcome("");
  }
  if (!open && seeded) setSeeded(false);

  const entityName = entities.find((e) => e.id === entityId)?.name ?? "the being";

  async function submit(): Promise<void> {
    if (!entityId) {
      Toast.push({ tone: "error", title: "Choose a being first" });
      return;
    }
    setSaving(true);
    try {
      await apiMethods.createOffering({
        entity_id: entityId,
        offered_at: new Date(offeredAt).toISOString(),
        location: place.trim() ? place.trim() : null,
        items: items.map((c) => ({
          kind: c.k,
          ...(c.qty ? { quantity: c.qty } : {}),
          ...(c.unit ? { unit: c.unit } : {}),
        })),
        intention: intention.trim() ? intention.trim() : null,
        reception_perceived: reception,
        outcome_notes: outcome.trim() ? outcome.trim() : null,
      });
      Toast.push({ tone: "success", title: `Offering to ${entityName} recorded` });
      onClose();
      await onRecorded();
    } catch (e) {
      Toast.push({
        tone: "error",
        title: "Couldn't record the offering",
        body: e instanceof Error ? e.message : String(e),
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Drawer
      open={open}
      side="right"
      width={440}
      title="Record an offering"
      onClose={onClose}
      closeOnBackdrop={false}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <Field label="To whom">
          <Select
            value={entityId}
            onChange={(e) => setEntityId(e.target.value)}
            options={entities.map((ent) => ({ value: ent.id, label: ent.name }))}
          />
        </Field>
        <div style={{ display: "flex", gap: 12 }}>
          <div style={{ flex: 1 }}>
            <Field label="Offered at">
              <TextInput
                type="datetime-local"
                value={offeredAt}
                onChange={(e) => setOfferedAt(e.target.value)}
              />
            </Field>
          </div>
          <div style={{ flex: 1 }}>
            <Field label="Place">
              <TextInput
                value={place}
                onChange={(e) => setPlace(e.target.value)}
                placeholder="The household shrine"
              />
            </Field>
          </div>
        </div>
        <Field label="What was given">
          <ItemsComposer value={items} onChange={setItems} />
        </Field>
        <Field label="Intention">
          <TextArea
            rows={2}
            value={intention}
            onChange={(e) => setIntention(e.target.value)}
            placeholder="What was it for?"
          />
        </Field>
        <Field label="Reception perceived">
          <ReceptionSelector value={reception} onChange={setReception} showHint />
        </Field>
        <Field label="Outcome notes" hint="usually written later">
          <TextArea
            rows={2}
            value={outcome}
            onChange={(e) => setOutcome(e.target.value)}
            placeholder="Leave for now; return when something follows."
          />
        </Field>
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <Button variant="primary" onClick={() => void submit()} loading={saving}>
            Record
          </Button>
        </div>
      </div>
    </Drawer>
  );
}

// ─── Page ───────────────────────────────────────────────────────────────────

export function OfferingsRoute() {
  const [fEntity, setFEntity] = useState("all");
  const [fReception, setFReception] = useState<ReceptionFilter>("all");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [prefill, setPrefill] = useState<DrawerPrefill | null>(null);

  const offerings = useApiCall<OfferingRead[]>((signal) => apiMethods.listOfferings({ signal }));
  const practices = useApiCall<RecurringOfferingRead[]>((signal) =>
    apiMethods.listRecurringOfferings({ signal }),
  );
  const entities = useApiCall<EntityRecord[]>((signal) => apiMethods.listEntities({ signal }));

  const entityRows = useMemo(() => entities.data ?? [], [entities.data]);
  const entityName = useMemo(() => {
    const byId = new Map(entityRows.map((e) => [e.id, e.name] as const));
    return (id: string) => byId.get(id) ?? "—";
  }, [entityRows]);

  useTopbar(
    () => ({
      title: "Offerings",
      subtitle: "What you have given, and how it was received",
      after: (
        <Button
          variant="primary"
          onClick={() => {
            setPrefill(null);
            setDrawerOpen(true);
          }}
        >
          Record offering
        </Button>
      ),
    }),
    [],
  );

  const filtered = useMemo(() => {
    const rows = offerings.data ?? [];
    return rows.filter(
      (o) =>
        (fEntity === "all" || o.entity_id === fEntity) &&
        (fReception === "all" || (o.reception_perceived ?? "none") === fReception),
    );
  }, [offerings.data, fEntity, fReception]);

  // Day-grouped, preserving the backend's offered_at-desc order.
  const groups = useMemo(() => {
    const byDay = new Map<string, OfferingRead[]>();
    for (const o of filtered) {
      const key = dayKey(o.offered_at);
      const bucket = byDay.get(key);
      if (bucket) bucket.push(o);
      else byDay.set(key, [o]);
    }
    return Array.from(byDay.entries());
  }, [filtered]);

  const totalLoaded = offerings.data?.length ?? 0;

  function toRecord(o: OfferingRead): OfferingRecord {
    const stamp = [o.astro_snapshot, o.calendar_snapshot].filter(Boolean).join(" · ");
    return {
      id: o.id,
      time: timeLabel(o.offered_at),
      entityName: entityName(o.entity_id),
      reception: o.reception_perceived ?? "none",
      items: toItemEntries(o.items),
      intention: o.intention ?? "",
      stamp: stamp || "—",
    };
  }

  const activeCount = (practices.data ?? []).filter((p) => p.is_active).length;

  async function togglePractice(p: RecurringOfferingRead, next: boolean): Promise<void> {
    try {
      await apiMethods.updateRecurringOffering(p.id, { is_active: next });
      await practices.refresh();
    } catch (e) {
      Toast.push({
        tone: "error",
        title: next ? "Couldn't resume the practice" : "Couldn't pause the practice",
        body: e instanceof Error ? e.message : String(e),
      });
    }
  }

  function recordFromPractice(p: RecurringOfferingRead): void {
    setPrefill({
      entityId: p.entity_id,
      items: p.items_template.map((it) => ({
        k: it.kind ?? "",
        qty: it.quantity ?? "",
        unit: it.unit ?? "",
      })),
    });
    setDrawerOpen(true);
  }

  return (
    <>
      <BeingsSubnav active="offerings" />
      <div style={{ maxWidth: 1180, margin: "0 auto" }}>
        {/* Filters */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 18,
            flexWrap: "wrap",
            marginBottom: 22,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 9,
              fontFamily: "var(--font-ui)",
              fontSize: 12,
              color: "var(--ink-mute)",
            }}
          >
            <span aria-hidden="true">Being</span>
            <Select
              aria-label="Being"
              value={fEntity}
              onChange={(e) => setFEntity(e.target.value)}
              options={[
                { value: "all", label: "All" },
                ...entityRows.map((ent) => ({ value: ent.id, label: ent.name })),
              ]}
            />
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 9,
              fontFamily: "var(--font-ui)",
              fontSize: 12,
              color: "var(--ink-mute)",
            }}
          >
            <span aria-hidden="true">Reception</span>
            <ReceptionPills active={fReception} onChange={setFReception} />
          </div>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-start", gap: 24 }}>
          {/* TIMELINE */}
          <main style={{ flex: "3 1 540px", minWidth: 0 }}>
            {offerings.status === "loading" ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
                {[0, 1, 2].map((i) => (
                  <div
                    key={`off-skel-${i}`}
                    style={{
                      background: "var(--bg-2)",
                      border: "1px solid var(--line)",
                      borderRadius: "var(--r-lg, 14px)",
                      padding: 17,
                    }}
                  >
                    <Skeleton kind="text" width="40%" />
                    <div style={{ height: 8 }} />
                    <Skeleton kind="text" width="80%" />
                  </div>
                ))}
              </div>
            ) : offerings.status === "error" ? (
              <div
                style={{
                  border: "1px solid var(--line)",
                  borderRadius: "var(--r-lg, 14px)",
                  background: "var(--bg-2)",
                  padding: "20px 24px",
                  fontFamily: "var(--font-serif)",
                  fontSize: 14.5,
                  color: "var(--ink-soft)",
                }}
              >
                Couldn't load offerings: {offerings.error?.message ?? "unknown error."}
              </div>
            ) : filtered.length === 0 ? (
              totalLoaded === 0 ? (
                <EmptyState
                  glyph="flask"
                  title="The offerings ledger is empty"
                  body="Record what you've given so the relationship can be witnessed."
                />
              ) : (
                <EmptyState
                  glyph="flask"
                  title="Nothing matches those filters"
                  body="Loosen the being or reception filter to see more."
                  action={
                    <Button
                      variant="secondary"
                      onClick={() => {
                        setFEntity("all");
                        setFReception("all");
                      }}
                    >
                      Clear filters
                    </Button>
                  }
                />
              )
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
                {groups.map(([key, rows]) => (
                  <div key={key}>
                    <div
                      style={{
                        fontFamily: "var(--font-ui)",
                        fontSize: 11,
                        letterSpacing: "0.12em",
                        textTransform: "uppercase",
                        color: "var(--ink-mute)",
                        marginBottom: 11,
                      }}
                    >
                      {dayLabel(rows[0]!.offered_at)}
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
                      {rows.map((o) => (
                        <OfferingTimelineCard key={o.id} offering={toRecord(o)} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </main>

          {/* ACTIVE PRACTICES RAIL */}
          <aside style={{ flex: "1 1 280px", minWidth: 0 }}>
            <div
              style={{
                display: "flex",
                alignItems: "baseline",
                gap: 9,
                marginBottom: 6,
              }}
            >
              <div
                style={{
                  fontFamily: "var(--font-display, var(--font-serif))",
                  fontSize: 17,
                  color: "var(--ink)",
                }}
              >
                Active practices
              </div>
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 12,
                  color: "var(--ink-mute)",
                }}
              >
                {activeCount} active
              </span>
            </div>
            <p
              style={{
                margin: "0 0 14px",
                fontFamily: "var(--font-serif)",
                fontSize: 13,
                lineHeight: 1.5,
                color: "var(--ink-mute)",
              }}
            >
              Recurring offerings that build a relationship over time.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {(practices.data ?? []).map((p) => {
                const hint = dueHint(p.next_due_at);
                return (
                  <ActivePracticeCard
                    key={p.id}
                    practice={{
                      id: p.id,
                      label: p.label,
                      entityName: entityName(p.entity_id),
                      cadence: p.cadence,
                      due: p.is_active ? hint.due : "Paused",
                      soon: p.is_active && hint.soon,
                      active: p.is_active,
                    }}
                    onTogglePause={(next) => void togglePractice(p, next)}
                    onRecord={() => recordFromPractice(p)}
                  />
                );
              })}
            </div>
          </aside>
        </div>
      </div>

      <RecordOfferingDrawer
        open={drawerOpen}
        entities={entityRows}
        prefill={prefill}
        onClose={() => setDrawerOpen(false)}
        onRecorded={() => offerings.refresh()}
      />
    </>
  );
}
