/**
 * Contracts — structured agreements with witnessed obligations (v1-019).
 *
 * Composition tracks `Theourgia Contracts.dc.html`:
 *   Topbar    · "Contracts" + "Structured agreements, with their
 *               obligations witnessed" + "Compose a pact".
 *   Subnav    · BeingsTabs, active=contracts.
 *   Left      · collapsible status sections (Active / Drafts /
 *               Fulfilled / Dissolved / Expired — plus Breached so no
 *               row can vanish), ContractListItem rows with
 *               BindingKindIcon + status dot + next-due strip.
 *   Right     · detail: header (glyph · title · ContractStatusPill ·
 *               meta) → status actions → Terms card → ObligationTable
 *               → Witnesses row.
 *   Compose   · drawer form covering the wizard's five steps (being &
 *               binding · terms · obligations · witnesses · dates) →
 *               POST /api/v1/contracts as draft or active.
 *
 * Status transitions use the mockup's confirm copy verbatim (Begin /
 * Dissolve / Mark breached). Breach never uses --danger — the care
 * palette rule; a breach is information about the contract.
 */

import {
  BindingKindIcon,
  Button,
  ConfirmDialog,
  ContractListItem,
  type ContractRead,
  type ContractStatus,
  ContractStatusPill,
  Drawer,
  type EntityRecord,
  Field,
  type FulfillObligationInput,
  type Obligation,
  ObligationTable,
  type ObligationWire,
  Select,
  Skeleton,
  Switch,
  TextArea,
  TextInput,
  Toast,
  useApiCall,
  useTopbar,
} from "@theourgia/shared";
import type { BindingKind } from "@theourgia/shared";
import { useMemo, useState } from "react";

import { apiMethods } from "../data/api.js";
import { BeingsSubnav } from "../lib/BeingsSubnav.js";

// ─── Section config (order + default collapse per the mockup) ───────────────

const SECTIONS: ReadonlyArray<{ status: ContractStatus; label: string }> = [
  { status: "active", label: "Active" },
  { status: "draft", label: "Drafts" },
  { status: "fulfilled", label: "Fulfilled" },
  { status: "dissolved", label: "Dissolved" },
  { status: "expired", label: "Expired" },
  // Not in the mockup's seed — appended so breached rows never vanish
  // from the list. Same collapse default as the other closed states.
  { status: "breached", label: "Breached" },
];

const DEFAULT_COLLAPSED: Record<string, boolean> = {
  fulfilled: true,
  dissolved: true,
  expired: true,
  breached: true,
};

const BINDING_KINDS: ReadonlyArray<{ kind: BindingKind; label: string }> = [
  { kind: "verbal", label: "Verbal" },
  { kind: "written", label: "Written" },
  { kind: "blood", label: "Blood" },
  { kind: "breath", label: "Breath" },
  { kind: "item-bound", label: "Item-bound" },
  { kind: "name-bound", label: "Name-bound" },
];

function bindingLabel(kind: string): string {
  return BINDING_KINDS.find((b) => b.kind === kind)?.label ?? "Other";
}

// ─── Formatting ─────────────────────────────────────────────────────────────

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return `${d.getDate()} ${d.toLocaleDateString("en-GB", { month: "short" })} ${d.getFullYear()}`;
}

function relativeDays(iso: string): { days: number; label: string } {
  const days = Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000);
  if (days < 0) return { days, label: `${Math.abs(days)} days ago` };
  if (days === 0) return { days, label: "today" };
  if (days === 1) return { days, label: "tomorrow" };
  return { days, label: `in ${days} days` };
}

/** Earliest open obligation across both sides — drives the list-item
 *  next-due strip on active contracts. */
function nextDueLabel(c: ContractRead): string | undefined {
  if (c.status !== "active") return undefined;
  const open = [...c.our_obligations, ...c.their_obligations].filter(
    (o) =>
      (o.status === "pending" || o.status === "in-progress" || o.status === "overdue") && o.due_at,
  );
  if (open.length === 0) return undefined;
  open.sort((a, b) => String(a.due_at).localeCompare(String(b.due_at)));
  const first = open[0]!;
  const rel = relativeDays(String(first.due_at));
  return rel.days < 0 ? `Overdue · ${Math.abs(rel.days)} days` : `Next: due ${rel.label}`;
}

function toObligations(wire: ObligationWire[]): Obligation[] {
  return wire.map((o) => ({
    id: o.id,
    description: o.description,
    status: o.status,
    dueAt: o.due_at ?? null,
    ...(o.due_at ? { dueRelative: relativeDays(o.due_at).label } : {}),
    fulfilledAt: o.fulfilled_at ?? null,
    ...(o.notes ? { notes: o.notes } : {}),
  }));
}

// ─── Compose drawer ─────────────────────────────────────────────────────────

function ComposePactDrawer({
  open,
  entities,
  onClose,
  onComposed,
}: {
  open: boolean;
  entities: EntityRecord[];
  onClose: () => void;
  onComposed: () => Promise<void>;
}) {
  const [entityId, setEntityId] = useState("");
  const [title, setTitle] = useState("");
  const [binding, setBinding] = useState<BindingKind>("verbal");
  const [terms, setTerms] = useState("");
  const [obligations, setObligations] = useState<string[]>([""]);
  const [witnesses, setWitnesses] = useState<string[]>([]);
  const [effective, setEffective] = useState("");
  const [expires, setExpires] = useState("");
  const [renewable, setRenewable] = useState(false);
  const [saving, setSaving] = useState(false);
  const [seeded, setSeeded] = useState(false);

  if (open && !seeded) {
    setSeeded(true);
    setEntityId(entities[0]?.id ?? "");
    setTitle("");
    setBinding("verbal");
    setTerms("");
    setObligations([""]);
    setWitnesses([]);
    setEffective("");
    setExpires("");
    setRenewable(false);
  }
  if (!open && seeded) setSeeded(false);

  async function submit(activate: boolean): Promise<void> {
    if (!entityId || !title.trim()) {
      Toast.push({ tone: "error", title: "A being and a title are required" });
      return;
    }
    setSaving(true);
    try {
      await apiMethods.createContract({
        entity_id: entityId,
        title: title.trim(),
        terms: terms.trim() ? terms.trim() : null,
        our_obligations: obligations
          .map((text) => text.trim())
          .filter((text) => text.length > 0)
          .map((description, i) => ({
            id: `ob-${i + 1}`,
            description,
            status: "pending" as const,
          })),
        status: activate ? "active" : "draft",
        effective_at: effective ? new Date(effective).toISOString() : null,
        expires_at: expires ? new Date(expires).toISOString() : null,
        renewable,
        binding_kind: binding,
        witness_entity_ids: witnesses,
      });
      Toast.push({
        tone: "success",
        title: activate ? "Pact composed and activated" : "Pact saved as draft",
      });
      onClose();
      await onComposed();
    } catch (e) {
      Toast.push({
        tone: "error",
        title: "Couldn't compose the pact",
        body: e instanceof Error ? e.message : String(e),
      });
    } finally {
      setSaving(false);
    }
  }

  const pillStyle = (selected: boolean): React.CSSProperties => ({
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "6px 11px",
    fontFamily: "var(--font-ui)",
    fontSize: 12,
    color: selected ? "var(--ink)" : "var(--ink-soft)",
    background: selected ? "var(--accent-soft)" : "transparent",
    border: `1px solid ${selected ? "var(--line-2)" : "var(--line)"}`,
    borderRadius: "var(--r-pill, 999px)",
    cursor: "pointer",
  });

  return (
    <Drawer
      open={open}
      side="right"
      width={560}
      title="Compose a pact"
      onClose={onClose}
      closeOnBackdrop={false}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <Field label="The being">
          <Select
            value={entityId}
            onChange={(e) => setEntityId(e.target.value)}
            options={entities.map((ent) => ({ value: ent.id, label: ent.name }))}
          />
        </Field>
        <Field label="Title">
          <TextInput
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Midsummer accord"
          />
        </Field>
        <Field label="Binding kind">
          <div
            role="group"
            aria-label="Binding kind"
            style={{ display: "flex", gap: 7, flexWrap: "wrap" }}
          >
            {BINDING_KINDS.map((b) => (
              <button
                key={b.kind}
                type="button"
                aria-pressed={binding === b.kind}
                onClick={() => setBinding(b.kind)}
                style={pillStyle(binding === b.kind)}
              >
                <BindingKindIcon kind={b.kind} size={14} />
                {b.label}
              </button>
            ))}
          </div>
        </Field>
        <Field label="The terms">
          <TextArea
            rows={6}
            value={terms}
            onChange={(e) => setTerms(e.target.value)}
            placeholder="Set down what is agreed, in plain words."
          />
        </Field>
        <Field label="Your obligations">
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {obligations.map((text, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: positional repeater rows
              <div key={i} style={{ display: "flex", gap: 8 }}>
                <TextInput
                  value={text}
                  onChange={(e) =>
                    setObligations(obligations.map((t, j) => (j === i ? e.target.value : t)))
                  }
                  placeholder="An obligation…"
                  style={{ flex: 1 }}
                />
                <Button
                  variant="ghost"
                  aria-label={`Remove obligation ${i + 1}`}
                  onClick={() => setObligations(obligations.filter((_, j) => j !== i))}
                >
                  ×
                </Button>
              </div>
            ))}
            <Button variant="secondary" onClick={() => setObligations([...obligations, ""])}>
              Add an obligation
            </Button>
          </div>
        </Field>
        <Field label="Witnesses (entities invoked)">
          <div
            role="group"
            aria-label="Witnesses"
            style={{ display: "flex", gap: 7, flexWrap: "wrap" }}
          >
            {entities
              .filter((ent) => ent.id !== entityId)
              .map((ent) => {
                const selected = witnesses.includes(ent.id);
                return (
                  <button
                    key={ent.id}
                    type="button"
                    aria-pressed={selected}
                    onClick={() =>
                      setWitnesses(
                        selected ? witnesses.filter((w) => w !== ent.id) : [...witnesses, ent.id],
                      )
                    }
                    style={pillStyle(selected)}
                  >
                    {ent.name}
                  </button>
                );
              })}
          </div>
        </Field>
        <div style={{ display: "flex", gap: 12 }}>
          <div style={{ flex: 1 }}>
            <Field label="Effective from">
              <TextInput
                type="date"
                value={effective}
                onChange={(e) => setEffective(e.target.value)}
              />
            </Field>
          </div>
          <div style={{ flex: 1 }}>
            <Field label="Expires">
              <TextInput type="date" value={expires} onChange={(e) => setExpires(e.target.value)} />
            </Field>
          </div>
        </div>
        <Switch checked={renewable} onChange={setRenewable} label="Renewable at expiry" />
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <Button variant="secondary" onClick={() => void submit(false)} loading={saving}>
            Save as draft
          </Button>
          <Button variant="primary" onClick={() => void submit(true)} loading={saving}>
            Activate pact
          </Button>
        </div>
      </div>
    </Drawer>
  );
}

// ─── Page ───────────────────────────────────────────────────────────────────

type PendingTransition = "begin" | "dissolve" | "breach" | null;

export function ContractsRoute() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>(DEFAULT_COLLAPSED);
  const [composing, setComposing] = useState(false);
  const [transition, setTransition] = useState<PendingTransition>(null);

  const contracts = useApiCall<ContractRead[]>((signal) => apiMethods.listContracts({ signal }));
  const entities = useApiCall<EntityRecord[]>((signal) => apiMethods.listEntities({ signal }));

  const entityRows = useMemo(() => entities.data ?? [], [entities.data]);
  const entityName = useMemo(() => {
    const byId = new Map(entityRows.map((e) => [e.id, e.name] as const));
    return (id: string) => byId.get(id) ?? "—";
  }, [entityRows]);

  useTopbar(
    () => ({
      title: "Contracts",
      subtitle: "Structured agreements, with their obligations witnessed",
      after: (
        <Button variant="primary" onClick={() => setComposing(true)}>
          Compose a pact
        </Button>
      ),
    }),
    [],
  );

  const rows = contracts.data ?? [];
  const selected =
    rows.find((c) => c.id === selectedId) ??
    rows.find((c) => c.status === "active") ??
    rows[0] ??
    null;

  async function applyTransition(kind: Exclude<PendingTransition, null>): Promise<void> {
    if (!selected) return;
    const nextStatus = kind === "begin" ? "active" : kind === "dissolve" ? "dissolved" : "breached";
    setTransition(null);
    try {
      await apiMethods.updateContract(selected.id, { status: nextStatus });
      Toast.push({
        tone: "success",
        title:
          kind === "begin"
            ? "Pact begun"
            : kind === "dissolve"
              ? "Pact dissolved"
              : "Pact marked breached",
      });
      await contracts.refresh();
    } catch (e) {
      Toast.push({
        tone: "error",
        title: "Couldn't update the pact",
        body: e instanceof Error ? e.message : String(e),
      });
    }
  }

  async function handleFulfill(
    side: FulfillObligationInput["side"],
    obligationId: string,
    payload: { fulfilledAt: string; notes: string },
  ): Promise<void> {
    if (!selected) return;
    try {
      await apiMethods.fulfillObligation(selected.id, {
        side,
        obligation_id: obligationId,
        new_status: "fulfilled",
        fulfilled_at: payload.fulfilledAt ? new Date(payload.fulfilledAt).toISOString() : null,
        notes: payload.notes ? payload.notes : null,
      });
      await contracts.refresh();
    } catch (e) {
      Toast.push({
        tone: "error",
        title: "Couldn't mark the obligation fulfilled",
        body: e instanceof Error ? e.message : String(e),
      });
    }
  }

  const sectionHeaderStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: 8,
    width: "100%",
    padding: "8px 4px",
    background: "transparent",
    border: "none",
    cursor: "pointer",
    fontFamily: "var(--font-ui)",
    fontSize: 10.5,
    letterSpacing: "0.14em",
    textTransform: "uppercase",
    color: "var(--ink-mute)",
    textAlign: "left",
  };

  const metaLine = selected
    ? [
        `with ${entityName(selected.entity_id)}`,
        `${bindingLabel(selected.binding_kind)} binding`,
        selected.effective_at ? `effective ${fmtDate(selected.effective_at)}` : null,
        selected.expires_at ? `expires ${fmtDate(selected.expires_at)}` : null,
        selected.renewable ? "renewable" : null,
      ]
        .filter(Boolean)
        .join(" · ")
    : "";

  return (
    <>
      <BeingsSubnav active="contracts" />
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-start", gap: 24 }}>
        {/* LIST */}
        <aside style={{ flex: "0 1 340px", minWidth: 260 }}>
          {contracts.status === "loading" ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {[0, 1, 2].map((i) => (
                <div
                  key={`ct-skel-${i}`}
                  style={{
                    background: "var(--bg-2)",
                    border: "1px solid var(--line)",
                    borderRadius: "var(--r-md, 8px)",
                    padding: 13,
                  }}
                >
                  <Skeleton kind="text" width="70%" />
                </div>
              ))}
            </div>
          ) : contracts.status === "error" ? (
            <div
              style={{
                fontFamily: "var(--font-serif)",
                fontSize: 14,
                color: "var(--ink-soft)",
              }}
            >
              Couldn't load contracts: {contracts.error?.message ?? "unknown error."}
            </div>
          ) : rows.length === 0 ? (
            <div
              data-empty="contracts"
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
              No contracts recorded.
            </div>
          ) : (
            SECTIONS.map(({ status, label }) => {
              const members = rows.filter((c) => c.status === status);
              if (members.length === 0) return null;
              const isCollapsed = collapsed[status] ?? false;
              return (
                <section key={status} style={{ marginBottom: 10 }}>
                  <button
                    type="button"
                    aria-expanded={!isCollapsed}
                    onClick={() => setCollapsed({ ...collapsed, [status]: !isCollapsed })}
                    style={sectionHeaderStyle}
                  >
                    <span aria-hidden="true">{isCollapsed ? "▸" : "▾"}</span>
                    {label}
                    <span style={{ marginLeft: "auto", fontFamily: "var(--font-mono)" }}>
                      {members.length}
                    </span>
                  </button>
                  {isCollapsed ? null : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {members.map((c) => (
                        <ContractListItem
                          key={c.id}
                          id={c.id}
                          title={c.title}
                          entityName={`with ${entityName(c.entity_id)}`}
                          status={c.status}
                          bindingGlyph={<BindingKindIcon kind={c.binding_kind} size={16} />}
                          {...(c.binding_kind === "blood"
                            ? { bindingColor: "var(--bind-blood)" }
                            : {})}
                          nextDue={nextDueLabel(c)}
                          selected={selected?.id === c.id}
                          onSelect={() => setSelectedId(c.id)}
                        />
                      ))}
                    </div>
                  )}
                </section>
              );
            })
          )}
        </aside>

        {/* DETAIL */}
        <main style={{ flex: "3 1 480px", minWidth: 0, maxWidth: 880 }}>
          {selected ? (
            <>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 13 }}>
                <span
                  aria-hidden="true"
                  style={{
                    width: 40,
                    height: 40,
                    flex: "none",
                    borderRadius: 9,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color:
                      selected.binding_kind === "blood" ? "var(--bind-blood)" : "var(--ink-soft)",
                    background: "var(--bg-2)",
                    border: "1px solid var(--line)",
                  }}
                >
                  <BindingKindIcon kind={selected.binding_kind} size={20} />
                </span>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 11,
                      flexWrap: "wrap",
                    }}
                  >
                    <h2
                      style={{
                        margin: 0,
                        fontFamily: "var(--font-display, var(--font-serif))",
                        fontSize: 24,
                        fontWeight: 400,
                        lineHeight: 1.15,
                      }}
                    >
                      {selected.title}
                    </h2>
                    <ContractStatusPill status={selected.status} />
                  </div>
                  <div
                    style={{
                      fontFamily: "var(--font-ui)",
                      fontSize: 12,
                      color: "var(--ink-mute)",
                      marginTop: 4,
                    }}
                  >
                    {metaLine}
                  </div>
                </div>
              </div>

              {/* Status actions */}
              {selected.status === "draft" || selected.status === "active" ? (
                <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
                  {selected.status === "draft" ? (
                    <Button variant="primary" onClick={() => setTransition("begin")}>
                      Begin this pact
                    </Button>
                  ) : (
                    <>
                      <Button variant="secondary" onClick={() => setTransition("dissolve")}>
                        Dissolve
                      </Button>
                      <Button variant="secondary" onClick={() => setTransition("breach")}>
                        Mark breached
                      </Button>
                    </>
                  )}
                </div>
              ) : null}

              {/* Terms */}
              <article
                style={{
                  marginTop: 20,
                  background: "var(--bg-2)",
                  border: "1px solid var(--line)",
                  borderRadius: "var(--r-lg, 14px)",
                  padding: "16px 18px",
                }}
              >
                <div
                  style={{
                    fontFamily: "var(--font-ui)",
                    fontSize: 10.5,
                    letterSpacing: "0.16em",
                    textTransform: "uppercase",
                    color: "var(--ink-mute)",
                    marginBottom: 10,
                  }}
                >
                  Terms
                </div>
                <p
                  style={{
                    margin: 0,
                    fontFamily: "var(--font-serif)",
                    fontSize: 14.5,
                    lineHeight: 1.6,
                    color: "var(--ink-soft)",
                    fontStyle: selected.terms ? "normal" : "italic",
                  }}
                >
                  {selected.terms ?? "—"}
                </p>
              </article>

              {/* Obligations */}
              <div style={{ marginTop: 20 }}>
                <ObligationTable
                  ours={toObligations(selected.our_obligations)}
                  theirs={toObligations(selected.their_obligations)}
                  onFulfill={(side, obligationId, payload) =>
                    void handleFulfill(side, obligationId, payload)
                  }
                />
              </div>

              {/* Witnesses */}
              <article
                style={{
                  marginTop: 20,
                  background: "var(--bg-2)",
                  border: "1px solid var(--line)",
                  borderRadius: "var(--r-lg, 14px)",
                  padding: "16px 18px",
                }}
              >
                <div
                  style={{
                    fontFamily: "var(--font-ui)",
                    fontSize: 10.5,
                    letterSpacing: "0.16em",
                    textTransform: "uppercase",
                    color: "var(--ink-mute)",
                    marginBottom: 10,
                  }}
                >
                  Witnesses
                </div>
                {selected.witness_entity_ids.length === 0 ? (
                  <span
                    style={{
                      fontFamily: "var(--font-serif)",
                      fontStyle: "italic",
                      fontSize: 13.5,
                      color: "var(--ink-mute)",
                    }}
                  >
                    None recorded.
                  </span>
                ) : (
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {selected.witness_entity_ids.map((id) => (
                      <span
                        key={id}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          padding: "4px 11px",
                          borderRadius: "var(--r-pill, 999px)",
                          border: "1px solid var(--line)",
                          background: "var(--bg-3)",
                          fontFamily: "var(--font-ui)",
                          fontSize: 12,
                          color: "var(--ink-soft)",
                        }}
                      >
                        {entityName(id)}
                      </span>
                    ))}
                  </div>
                )}
              </article>
            </>
          ) : contracts.status === "ok" ? (
            <div
              style={{
                fontFamily: "var(--font-serif)",
                fontStyle: "italic",
                fontSize: 14,
                color: "var(--ink-mute)",
              }}
            >
              Select a contract to read its terms.
            </div>
          ) : null}
        </main>
      </div>

      {/* Status-transition confirms — copy verbatim from the mockup. */}
      <ConfirmDialog
        open={transition === "begin"}
        title="Begin this pact?"
        body="Activating the pact starts its obligations and their due-dates. The agreement becomes part of the active record."
        confirmLabel="Begin pact"
        onConfirm={() => void applyTransition("begin")}
        onCancel={() => setTransition(null)}
      />
      <ConfirmDialog
        open={transition === "dissolve"}
        title="Dissolve this pact?"
        body="Dissolution closes the agreement and attaches the rite that marks its ending. The record is kept, not erased."
        confirmLabel="Dissolve"
        onConfirm={() => void applyTransition("dissolve")}
        onCancel={() => setTransition(null)}
      />
      <ConfirmDialog
        open={transition === "breach"}
        title="Mark this pact breached?"
        body="Breaches are part of the record. Document what happened — the obligations and their history are preserved."
        confirmLabel="Mark breached"
        onConfirm={() => void applyTransition("breach")}
        onCancel={() => setTransition(null)}
      />

      <ComposePactDrawer
        open={composing}
        entities={entityRows}
        onClose={() => setComposing(false)}
        onComposed={() => contracts.refresh()}
      />
    </>
  );
}
