/**
 * Oaths — vows with edges, most sealed by default (v1-019).
 *
 * Composition tracks `Theourgia Oaths.dc.html`:
 *   Topbar    · "Oaths" + "Vows with edges — most sealed by default" +
 *               SessionLockIndicator + "Take an oath".
 *   Subnav    · BeingsTabs, active=oaths.
 *   Segments  · All + kind pills (Self / Deity / Order / Community /
 *               Partner / Other) with counts.
 *   Grid      · OathCard per row (auto-fill 340px min), sealed cards
 *               render the sealed CTA — never plaintext.
 *   Drawer    · "Take an oath" — kind pills, recipient, vow, dates,
 *               sealed-by-default switch (make-public is a conscious
 *               step via ConfirmDialog), checkpoints repeater.
 *
 * Sealing: a sealed oath is encrypted client-side (`sealToEnvelope`,
 * PBKDF2 + AES-GCM with the salt and IV embedded in a JSON envelope)
 * before POST — the server only ever holds ciphertext.
 *
 * Unlocking (v1-033): the SealUnlock passphrase fetches each sealed
 * oath's ciphertext from `GET /oaths/{id}/sealed-payload` and
 * decrypts it in memory (`decryptSealedPayloadB64`) — session policy
 * per S3.1. Rows whose ciphertext the server does not hold (legacy)
 * keep their sealed block; locking drops the decrypted texts.
 */

import {
  Button,
  ConfirmDialog,
  Drawer,
  EmptyState,
  type EntityRecord,
  Field,
  OathCard,
  type OathKindWire,
  type OathRead,
  type OathRecord,
  SealUnlock,
  Select,
  SessionLockIndicator,
  Skeleton,
  TextArea,
  TextInput,
  Toast,
  decryptSealedPayloadB64,
  sealToEnvelope,
  useApiCall,
  useTopbar,
} from "@theourgia/shared";
import { useMemo, useState } from "react";

import { apiMethods } from "../data/api.js";
import { BeingsSubnav } from "../lib/BeingsSubnav.js";

// ─── Kind vocabulary (segment order per the mockup) ─────────────────────────

const KIND_LABEL: Record<OathKindWire, string> = {
  self: "Self",
  deity: "Deity",
  order: "Order",
  community: "Community",
  partner: "Partner",
  tradition: "Tradition",
  other: "Other",
};

const SEGMENT_KINDS: readonly OathKindWire[] = [
  "self",
  "deity",
  "order",
  "community",
  "partner",
  "other",
];

function fmtDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getDate()} ${d.toLocaleDateString("en-GB", { month: "short" })} ${d.getFullYear()}`;
}

// ─── Take-oath drawer ───────────────────────────────────────────────────────

interface CheckpointDraft {
  date: string;
  prompt: string;
}

function TakeOathDrawer({
  open,
  onClose,
  onRecorded,
}: {
  open: boolean;
  onClose: () => void;
  onRecorded: () => Promise<void>;
}) {
  const [kind, setKind] = useState<OathKindWire>("self");
  const [recipient, setRecipient] = useState("");
  const [vow, setVow] = useState("");
  const [takenAt, setTakenAt] = useState(() => new Date().toISOString().slice(0, 10));
  const [renewal, setRenewal] = useState("");
  const [sealed, setSealed] = useState(true);
  const [confirmUnseal, setConfirmUnseal] = useState(false);
  const [checkpoints, setCheckpoints] = useState<CheckpointDraft[]>([]);
  const [askPassphrase, setAskPassphrase] = useState(false);
  const [saving, setSaving] = useState(false);
  const [seeded, setSeeded] = useState(false);

  if (open && !seeded) {
    setSeeded(true);
    setKind("self");
    setRecipient("");
    setVow("");
    setTakenAt(new Date().toISOString().slice(0, 10));
    setRenewal("");
    setSealed(true);
    setCheckpoints([]);
  }
  if (!open && seeded) setSeeded(false);

  async function record(passphrase?: string): Promise<void> {
    setSaving(true);
    try {
      const checkpointWire = checkpoints
        .filter((c) => c.date || c.prompt.trim())
        .map((c) => ({
          due_at: c.date ? new Date(c.date).toISOString() : null,
          reflection_text: c.prompt.trim() ? c.prompt.trim() : null,
        }));
      if (sealed) {
        if (!passphrase) {
          setAskPassphrase(true);
          setSaving(false);
          return;
        }
        // Client-side seal: salt rides in-band (first 16 bytes of the
        // ciphertext envelope); the IV joins it in a JSON wrapper so a
        // single opaque string carries everything but the passphrase.
        await apiMethods.createOath({
          kind,
          recipient_text: recipient.trim() ? recipient.trim() : null,
          encryption_mode: "sealed",
          encrypted_payload: await sealToEnvelope({ text: vow }, passphrase),
          taken_at: new Date(takenAt).toISOString(),
          renewal_cadence: renewal ? renewal : null,
          accountability_checkpoints: checkpointWire,
        });
        Toast.push({ tone: "success", title: "Oath sealed and recorded" });
      } else {
        await apiMethods.createOath({
          kind,
          recipient_text: recipient.trim() ? recipient.trim() : null,
          text: vow.trim() ? vow.trim() : null,
          encryption_mode: "none",
          taken_at: new Date(takenAt).toISOString(),
          renewal_cadence: renewal ? renewal : null,
          accountability_checkpoints: checkpointWire,
        });
        Toast.push({ tone: "success", title: "Oath recorded" });
      }
      setAskPassphrase(false);
      onClose();
      await onRecorded();
    } catch (e) {
      Toast.push({
        tone: "error",
        title: "Couldn't record the oath",
        body: e instanceof Error ? e.message : String(e),
      });
    } finally {
      setSaving(false);
    }
  }

  const pillStyle = (selected: boolean): React.CSSProperties => ({
    display: "inline-flex",
    alignItems: "center",
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
    <>
      <Drawer
        open={open}
        side="right"
        width={460}
        title="Take an oath"
        onClose={onClose}
        closeOnBackdrop={false}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Field label="Kind">
            <div
              role="group"
              aria-label="Kind"
              style={{ display: "flex", gap: 7, flexWrap: "wrap" }}
            >
              {SEGMENT_KINDS.map((k) => (
                <button
                  key={k}
                  type="button"
                  aria-pressed={kind === k}
                  onClick={() => setKind(k)}
                  style={pillStyle(kind === k)}
                >
                  {KIND_LABEL[k]}
                </button>
              ))}
            </div>
          </Field>
          <Field label="To whom">
            <TextInput
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              placeholder="An entity, a tradition, a person — or yourself"
            />
          </Field>
          <Field label="The vow">
            <TextArea
              rows={3}
              value={vow}
              onChange={(e) => setVow(e.target.value)}
              placeholder="The words of the oath."
            />
          </Field>
          <div style={{ display: "flex", gap: 12 }}>
            <div style={{ flex: 1 }}>
              <Field label="Taken at">
                <TextInput
                  type="date"
                  value={takenAt}
                  onChange={(e) => setTakenAt(e.target.value)}
                />
              </Field>
            </div>
            <div style={{ flex: 1 }}>
              <Field label="Renewal">
                <Select
                  value={renewal}
                  onChange={(e) => setRenewal(e.target.value)}
                  options={[
                    { value: "", label: "No renewal" },
                    { value: "Each lunar month", label: "Each lunar month" },
                    { value: "Yearly", label: "Yearly" },
                  ]}
                />
              </Field>
            </div>
          </div>

          {/* Sealed-by-default block */}
          <div
            data-seal-block
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "13px 14px",
              borderRadius: "var(--r-md, 8px)",
              border: `1px solid ${sealed ? "var(--seal-border)" : "var(--line)"}`,
              background: sealed ? "var(--seal-soft)" : "var(--bg-2)",
            }}
          >
            <div style={{ minWidth: 0, flex: 1 }}>
              <div
                style={{
                  fontFamily: "var(--font-ui)",
                  fontSize: 12.5,
                  color: "var(--ink)",
                }}
              >
                {sealed ? "Sealed by default" : "Unsealed — stored as plain text"}
              </div>
              <div
                style={{
                  fontFamily: "var(--font-ui)",
                  fontSize: 11,
                  color: "var(--ink-mute)",
                  marginTop: 2,
                }}
              >
                {sealed
                  ? "Encrypted on this device; the server can't read it."
                  : "Readable by the server; can be shown publicly."}
              </div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={sealed}
              aria-label="Sealed"
              onClick={() => {
                if (sealed) setConfirmUnseal(true);
                else setSealed(true);
              }}
              style={{
                width: 36,
                height: 22,
                flex: "none",
                borderRadius: 999,
                padding: 2,
                background: sealed ? "var(--seal)" : "var(--bg-sunk)",
                border: "1px solid var(--line-2)",
                display: "inline-flex",
                justifyContent: sealed ? "flex-end" : "flex-start",
                cursor: "pointer",
              }}
            >
              <span
                style={{
                  width: 16,
                  height: 16,
                  borderRadius: "50%",
                  background: sealed ? "#fff" : "var(--ink-mute)",
                  display: "block",
                }}
              />
            </button>
          </div>

          <Field label="Accountability checkpoints">
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {checkpoints.map((c, i) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: positional repeater rows
                <div key={i} style={{ display: "flex", gap: 8 }}>
                  <TextInput
                    type="date"
                    aria-label="Checkpoint date"
                    value={c.date}
                    onChange={(e) =>
                      setCheckpoints(
                        checkpoints.map((cc, j) =>
                          j === i ? { ...cc, date: e.target.value } : cc,
                        ),
                      )
                    }
                  />
                  <TextInput
                    value={c.prompt}
                    onChange={(e) =>
                      setCheckpoints(
                        checkpoints.map((cc, j) =>
                          j === i ? { ...cc, prompt: e.target.value } : cc,
                        ),
                      )
                    }
                    placeholder="A reflection prompt"
                    style={{ flex: 1 }}
                  />
                  <Button
                    variant="ghost"
                    aria-label={`Remove checkpoint ${i + 1}`}
                    onClick={() => setCheckpoints(checkpoints.filter((_, j) => j !== i))}
                  >
                    ×
                  </Button>
                </div>
              ))}
              <Button
                variant="secondary"
                onClick={() => setCheckpoints([...checkpoints, { date: "", prompt: "" }])}
              >
                Add a checkpoint
              </Button>
            </div>
          </Field>

          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <Button variant="primary" onClick={() => void record()} loading={saving}>
              {sealed ? "Seal & record oath" : "Record oath (unsealed)"}
            </Button>
          </div>
        </div>
      </Drawer>

      {/* Make-public: the conscious step. Copy verbatim from the mockup. */}
      <ConfirmDialog
        open={confirmUnseal}
        title="Leave this oath unsealed?"
        body="Most oaths are sealed. An unsealed oath is stored as plain text — the server can read it, and you may choose to show it publicly. You can reseal it later. This is the conscious step."
        confirmLabel="Leave unsealed"
        cancelLabel="Keep sealed"
        onConfirm={() => {
          setSealed(false);
          setConfirmUnseal(false);
        }}
        onCancel={() => setConfirmUnseal(false)}
      />

      {/* Passphrase collection for the client-side seal at record time. */}
      <SealUnlock
        open={askPassphrase}
        policy="session"
        onUnlock={(passphrase) => void record(passphrase)}
        onCancel={() => setAskPassphrase(false)}
      />
    </>
  );
}

// ─── Page ───────────────────────────────────────────────────────────────────

type KindFilter = "all" | OathKindWire;

export function OathsRoute() {
  const [kindFilter, setKindFilter] = useState<KindFilter>("all");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [unlockOpen, setUnlockOpen] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  // v1-033 — decrypted vow texts (id → text), populated on unlock,
  // dropped on lock. Only ever held in memory.
  const [sealedTexts, setSealedTexts] = useState<Record<string, string>>({});
  const [unlockError, setUnlockError] = useState<string | null>(null);

  const oaths = useApiCall<OathRead[]>((signal) => apiMethods.listOaths({ signal }));
  const entities = useApiCall<EntityRecord[]>((signal) => apiMethods.listEntities({ signal }));

  // Fetch + decrypt every sealed oath's ciphertext with the vault
  // passphrase (session policy). Rows without server-held ciphertext
  // (legacy) skip quietly and keep their sealed block; a passphrase
  // that does not decrypt keeps the dialog open with an inline error.
  async function handleUnlock(passphrase: string): Promise<void> {
    const sealedRows = (oaths.data ?? []).filter((o) => o.sealed);
    try {
      const revealed: Record<string, string> = {};
      for (const o of sealedRows) {
        let payloadB64: string;
        try {
          payloadB64 = (await apiMethods.getOathSealedPayload(o.id)).encrypted_payload_b64;
        } catch {
          continue; // no ciphertext held server-side for this row
        }
        const value = await decryptSealedPayloadB64<{ text?: string }>(payloadB64, passphrase);
        if (typeof value.text === "string") revealed[o.id] = value.text;
      }
      setSealedTexts(revealed);
      setUnlocked(true);
      setUnlockError(null);
      setUnlockOpen(false);
      Toast.push({ tone: "success", title: "Vault unlocked for this session" });
    } catch {
      setUnlockError("Passphrase didn't decrypt — try again.");
    }
  }

  const entityName = useMemo(() => {
    const byId = new Map((entities.data ?? []).map((e) => [e.id, e.name] as const));
    return (id: string | null) => (id ? (byId.get(id) ?? null) : null);
  }, [entities.data]);

  useTopbar(
    () => ({
      title: "Oaths",
      subtitle: "Vows with edges — most sealed by default",
      after: (
        <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
          <SessionLockIndicator
            locked={!unlocked}
            onToggle={() => {
              if (unlocked) {
                // Locking drops the decrypted texts from memory.
                setUnlocked(false);
                setSealedTexts({});
              } else {
                setUnlockOpen(true);
              }
            }}
          />
          <Button variant="primary" onClick={() => setDrawerOpen(true)}>
            Take an oath
          </Button>
        </span>
      ),
    }),
    [unlocked],
  );

  const rows = oaths.data ?? [];
  const counts = useMemo(() => {
    const c = new Map<KindFilter, number>([["all", rows.length]]);
    for (const o of rows) c.set(o.kind, (c.get(o.kind) ?? 0) + 1);
    return c;
  }, [rows]);

  const filtered = kindFilter === "all" ? rows : rows.filter((o) => o.kind === kindFilter);

  function toRecord(o: OathRead): OathRecord {
    const recipient = o.recipient_text ?? entityName(o.recipient_entity_id);
    const meta = [
      KIND_LABEL[o.kind],
      `taken ${fmtDate(o.taken_at)}`,
      o.renewal_cadence ?? (o.expires_at ? `expires ${fmtDate(o.expires_at)}` : null),
    ]
      .filter(Boolean)
      .join(" · ");
    const openCheckpoint = o.accountability_checkpoints.find((c) => !c.completed_at && c.due_at);
    const overdue = openCheckpoint?.due_at
      ? new Date(openCheckpoint.due_at).getTime() < Date.now()
      : false;
    const checkpointDue = openCheckpoint
      ? o.sealed
        ? "A sealed checkpoint is due"
        : `Reflection due ${fmtDate(String(openCheckpoint.due_at))}`
      : undefined;
    // v1-033: sealed rows carry no wire text — the decrypted-in-memory
    // vow (if the vault is unlocked) fills in.
    const text = o.text ?? sealedTexts[o.id];
    return {
      id: o.id,
      title: recipient ?? KIND_LABEL[o.kind],
      meta,
      status: o.status,
      sealed: o.sealed,
      ...(text ? { text } : {}),
      ...(checkpointDue ? { checkpointDue } : {}),
      ...(overdue ? { checkpointOverdue: true } : {}),
    };
  }

  const segStyle = (selected: boolean): React.CSSProperties => ({
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
    <>
      <BeingsSubnav active="oaths" />
      <div style={{ maxWidth: 1120, margin: "0 auto" }}>
        {/* Kind segments */}
        <div
          role="group"
          aria-label="Oath kind"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            flexWrap: "wrap",
            marginBottom: 22,
          }}
        >
          <button
            type="button"
            aria-pressed={kindFilter === "all"}
            onClick={() => setKindFilter("all")}
            style={segStyle(kindFilter === "all")}
          >
            All
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, opacity: 0.7 }}>
              {counts.get("all") ?? 0}
            </span>
          </button>
          {SEGMENT_KINDS.map((k) => (
            <button
              key={k}
              type="button"
              aria-pressed={kindFilter === k}
              onClick={() => setKindFilter(kindFilter === k ? "all" : k)}
              style={segStyle(kindFilter === k)}
            >
              {KIND_LABEL[k]}
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, opacity: 0.7 }}>
                {counts.get(k) ?? 0}
              </span>
            </button>
          ))}
        </div>

        {oaths.status === "loading" ? (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))",
              gap: 16,
            }}
          >
            {[0, 1, 2].map((i) => (
              <div
                key={`oath-skel-${i}`}
                style={{
                  background: "var(--bg-2)",
                  border: "1px solid var(--line)",
                  borderRadius: "var(--r-lg, 14px)",
                  padding: 17,
                }}
              >
                <Skeleton kind="text" width="55%" />
                <div style={{ height: 10 }} />
                <Skeleton kind="text" width="85%" />
              </div>
            ))}
          </div>
        ) : oaths.status === "error" ? (
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
            Couldn't load oaths: {oaths.error?.message ?? "unknown error."}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            glyph="lock"
            title="No oaths recorded"
            body="An oath is a vow with edges — to self, tradition, deity, partner, community. Most are sealed by default; the record is yours alone."
          />
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))",
              gap: 16,
              alignItems: "start",
            }}
          >
            {filtered.map((o) => {
              const record = toRecord(o);
              return (
                <OathCard
                  key={o.id}
                  oath={record}
                  // An unlocked session reveals rows whose ciphertext
                  // decrypted; rows without server-held ciphertext
                  // keep their sealed block — never fabricated text.
                  unlockedForSession={unlocked && !!record.text}
                  onRequestUnlock={() => setUnlockOpen(true)}
                />
              );
            })}
          </div>
        )}
      </div>

      <SealUnlock
        open={unlockOpen}
        policy="session"
        errorMessage={unlockError ?? undefined}
        onUnlock={(passphrase) => void handleUnlock(passphrase)}
        onCancel={() => {
          setUnlockOpen(false);
          setUnlockError(null);
        }}
      />

      <TakeOathDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onRecorded={() => oaths.refresh()}
      />
    </>
  );
}
