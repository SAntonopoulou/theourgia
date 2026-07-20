/**
 * Initiations — sealed by design (v1-019).
 *
 * Composition tracks `Theourgia Initiations.dc.html`:
 *   Topbar    · "Initiations" + "Sealed by design · only tradition &
 *               status are stored in plaintext" + "Record initiation".
 *   Subnav    · BeingsTabs, active=initiations.
 *   Left      · sparse list — "N recorded" + InitiationListItem rows
 *               (tradition · Sealed · status chip · disclosed strip).
 *   Right     · detail: seal tile + tradition + InitiationStatusPill +
 *               plain-note, then the SealedContentsBlock (canonical
 *               zero-knowledge copy) + the always-personal notice.
 *   Drawer    · "Record an initiation" — plaintext tradition/status,
 *               sealed grade/date/place/notes encrypted client-side
 *               (PBKDF2 + AES-GCM via SealUnlock per-read passphrase)
 *               before POST.
 *
 * Unlocking (v1-033): the SealedContentsBlock's "Unlock to view"
 * opens the per-read SealUnlock; the passphrase fetches the selected
 * row's ciphertext from `GET /initiations/{id}/sealed-payload` and
 * decrypts it in memory (`decryptSealedPayloadB64`). Per-read policy:
 * the reveal applies to the selected row only and clears on
 * selection change; the opt-in "stay" toggle caches the passphrase
 * for five minutes, never longer.
 */

import {
  Button,
  Drawer,
  Field,
  InitiationListItem,
  type InitiationRead,
  InitiationStatusPill,
  type InitiationStatusWire,
  SealUnlock,
  SealedContentsBlock,
  Select,
  Skeleton,
  TextArea,
  TextInput,
  Toast,
  decryptSealedPayloadB64,
  sealToEnvelope,
  useApiCall,
  useTopbar,
} from "@theourgia/shared";
import { useRef, useState } from "react";

import { apiMethods } from "../data/api.js";
import { BeingsSubnav } from "../lib/BeingsSubnav.js";

const STATUS_OPTIONS: ReadonlyArray<{ value: InitiationStatusWire; label: string }> = [
  { value: "active", label: "Active" },
  { value: "suspended", label: "Suspended" },
  { value: "lapsed", label: "Lapsed" },
  { value: "resigned", label: "Resigned" },
];

function fmtDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getDate()} ${d.toLocaleDateString("en-GB", { month: "short" })} ${d.getFullYear()}`;
}

function LockGlyph({ size = 22 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      aria-hidden="true"
    >
      <rect x={5} y={11} width={14} height={9} rx={1.5} />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </svg>
  );
}

// ─── Record drawer ──────────────────────────────────────────────────────────

function RecordInitiationDrawer({
  open,
  onClose,
  onRecorded,
}: {
  open: boolean;
  onClose: () => void;
  onRecorded: () => Promise<void>;
}) {
  const [tradition, setTradition] = useState("");
  const [status, setStatus] = useState<InitiationStatusWire>("active");
  const [grade, setGrade] = useState("");
  const [received, setReceived] = useState("");
  const [place, setPlace] = useState("");
  const [notes, setNotes] = useState("");
  const [askPassphrase, setAskPassphrase] = useState(false);
  const [saving, setSaving] = useState(false);
  const [seeded, setSeeded] = useState(false);

  if (open && !seeded) {
    setSeeded(true);
    setTradition("");
    setStatus("active");
    setGrade("");
    setReceived("");
    setPlace("");
    setNotes("");
  }
  if (!open && seeded) setSeeded(false);

  async function record(passphrase?: string): Promise<void> {
    if (!tradition.trim()) {
      Toast.push({ tone: "error", title: "Tradition is required" });
      return;
    }
    if (!passphrase) {
      setAskPassphrase(true);
      return;
    }
    setSaving(true);
    try {
      // Everything below the drawer's sealed divider encrypts on this
      // device; only tradition + status travel in plaintext. Salt is
      // embedded in the ciphertext envelope, the IV joins it in a
      // JSON wrapper — one opaque string, decryptable only with the
      // passphrase.
      await apiMethods.createInitiation({
        tradition: tradition.trim(),
        status,
        encryption_mode: "sealed",
        encrypted_payload: await sealToEnvelope(
          {
            grade_or_degree: grade.trim() || null,
            received_at: received || null,
            location: place.trim() || null,
            experience_notes: notes.trim() || null,
          },
          passphrase,
        ),
      });
      Toast.push({ tone: "success", title: "Initiation sealed and recorded (personal)" });
      setAskPassphrase(false);
      onClose();
      await onRecorded();
    } catch (e) {
      Toast.push({
        tone: "error",
        title: "Couldn't record the initiation",
        body: e instanceof Error ? e.message : String(e),
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Drawer
        open={open}
        side="right"
        width={460}
        title="Record an initiation"
        onClose={onClose}
        closeOnBackdrop={false}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div
            style={{
              padding: "12px 14px",
              borderRadius: "var(--r-md, 8px)",
              border: "1px solid var(--seal-border)",
              background: "var(--seal-soft)",
              fontFamily: "var(--font-ui)",
              fontSize: 12,
              lineHeight: 1.55,
              color: "var(--ink-soft)",
            }}
          >
            Everything below the line is encrypted on this device before it is saved. Only the
            tradition and status are stored in plaintext.
          </div>
          <Field label="Tradition · plaintext">
            <TextInput
              value={tradition}
              onChange={(e) => setTradition(e.target.value)}
              placeholder="e.g. Hellenic mystery"
            />
          </Field>
          <Field label="Status · plaintext">
            <Select
              value={status}
              onChange={(e) => setStatus(e.target.value as InitiationStatusWire)}
              options={STATUS_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
            />
          </Field>

          {/* sealed-below divider */}
          <div
            aria-hidden="true"
            style={{ display: "flex", alignItems: "center", gap: 10, color: "var(--seal)" }}
          >
            <span style={{ flex: 1, borderTop: "1px solid var(--seal-border)" }} />
            <LockGlyph size={15} />
            <span style={{ flex: 1, borderTop: "1px solid var(--seal-border)" }} />
          </div>

          <Field label="Grade or degree">
            <TextInput
              value={grade}
              onChange={(e) => setGrade(e.target.value)}
              placeholder="(sealed)"
            />
          </Field>
          <div style={{ display: "flex", gap: 12 }}>
            <div style={{ flex: 1 }}>
              <Field label="Received">
                <TextInput
                  type="date"
                  value={received}
                  onChange={(e) => setReceived(e.target.value)}
                />
              </Field>
            </div>
            <div style={{ flex: 1 }}>
              <Field label="Place">
                <TextInput
                  value={place}
                  onChange={(e) => setPlace(e.target.value)}
                  placeholder="(sealed)"
                />
              </Field>
            </div>
          </div>
          <Field label="Experience notes">
            <TextArea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="(sealed)"
            />
          </Field>
          <div
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: 11.5,
              lineHeight: 1.55,
              color: "var(--ink-mute)",
            }}
          >
            Visibility is personal, always. There is no other option — that constraint is the
            protection.
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <Button variant="primary" onClick={() => void record()} loading={saving}>
              Seal & record
            </Button>
          </div>
        </div>
      </Drawer>

      <SealUnlock
        open={askPassphrase}
        policy="per-read"
        title="Seal these contents"
        body="Your passphrase encrypts this initiation on this device before it is saved. It is never sent to the server."
        onUnlock={(passphrase) => void record(passphrase)}
        onCancel={() => setAskPassphrase(false)}
      />
    </>
  );
}

// ─── Page ───────────────────────────────────────────────────────────────────

/** The fields the drawer seals — decrypted back for the reveal. */
interface SealedInitiationFields {
  grade_or_degree?: string | null;
  received_at?: string | null;
  location?: string | null;
  experience_notes?: string | null;
}

/** Five minutes — the only window the opt-in "stay" toggle offers. */
const STAY_WINDOW_MS = 5 * 60_000;

export function InitiationsRoute() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  // v1-033 — per-read reveal: decrypted fields for ONE row, cleared
  // on selection change. Only ever held in memory.
  const [revealed, setRevealed] = useState<{
    id: string;
    fields: SealedInitiationFields;
  } | null>(null);
  const [unlockOpen, setUnlockOpen] = useState(false);
  const [unlockError, setUnlockError] = useState<string | null>(null);
  // Opt-in 5-minute passphrase cache (per-read policy's "stay").
  const stayRef = useRef<{ passphrase: string; until: number } | null>(null);

  const initiations = useApiCall<InitiationRead[]>((signal) =>
    apiMethods.listInitiations({ signal }),
  );

  async function reveal(
    id: string,
    passphrase: string,
    opts: { fromCache?: boolean; stay?: boolean } = {},
  ): Promise<void> {
    try {
      const payload = await apiMethods.getInitiationSealedPayload(id);
      const fields = await decryptSealedPayloadB64<SealedInitiationFields>(
        payload.encrypted_payload_b64,
        passphrase,
      );
      setRevealed({ id, fields });
      setUnlockOpen(false);
      setUnlockError(null);
      if (opts.stay) {
        stayRef.current = { passphrase, until: Date.now() + STAY_WINDOW_MS };
      }
    } catch {
      if (opts.fromCache) {
        // The cached passphrase went stale or didn't decrypt this
        // row — drop it and fall back to the prompt.
        stayRef.current = null;
        setUnlockOpen(true);
      } else {
        setUnlockError("Passphrase didn't decrypt — try again.");
      }
    }
  }

  function onUnlockRequest(id: string): void {
    const cached = stayRef.current;
    if (cached && cached.until > Date.now()) {
      void reveal(id, cached.passphrase, { fromCache: true });
    } else {
      stayRef.current = null;
      setUnlockOpen(true);
    }
  }

  useTopbar(
    () => ({
      title: "Initiations",
      subtitle: "Sealed by design · only tradition & status are stored in plaintext",
      after: (
        <Button variant="primary" onClick={() => setDrawerOpen(true)}>
          Record initiation
        </Button>
      ),
    }),
    [],
  );

  const rows = initiations.data ?? [];
  const selected = rows.find((i) => i.id === selectedId) ?? rows[0] ?? null;

  return (
    <>
      <BeingsSubnav active="initiations" />
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-start", gap: 24 }}>
        {/* LIST */}
        <aside style={{ flex: "0 1 320px", minWidth: 240 }}>
          <div
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: 10.5,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "var(--ink-mute)",
              marginBottom: 10,
            }}
          >
            {rows.length} recorded
          </div>
          {initiations.status === "loading" ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {[0, 1].map((i) => (
                <div
                  key={`init-skel-${i}`}
                  style={{
                    background: "var(--bg-2)",
                    border: "1px solid var(--line)",
                    borderRadius: "var(--r-md, 8px)",
                    padding: 13,
                  }}
                >
                  <Skeleton kind="text" width="65%" />
                </div>
              ))}
            </div>
          ) : initiations.status === "error" ? (
            <div
              style={{
                fontFamily: "var(--font-serif)",
                fontSize: 14,
                color: "var(--ink-soft)",
              }}
            >
              Couldn't load initiations: {initiations.error?.message ?? "unknown error."}
            </div>
          ) : rows.length === 0 ? (
            <div
              data-empty="initiations"
              style={{
                border: "1px solid var(--seal-border)",
                borderRadius: "var(--r-lg, 14px)",
                background: "var(--seal-soft)",
                padding: "28px 22px",
                textAlign: "center",
                fontFamily: "var(--font-serif)",
                fontSize: 14,
                lineHeight: 1.6,
                color: "var(--ink-mute)",
              }}
            >
              No initiations recorded.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {rows.map((i) => (
                <InitiationListItem
                  key={i.id}
                  id={i.id}
                  tradition={i.tradition}
                  status={i.status}
                  {...(i.publicly_disclosed_at
                    ? { disclosed: `Disclosed ${fmtDate(i.publicly_disclosed_at)}` }
                    : {})}
                  selected={selected?.id === i.id}
                  onSelect={() => {
                    setSelectedId(i.id);
                    // Per-read: a reveal never survives a selection
                    // change.
                    setRevealed(null);
                  }}
                />
              ))}
            </div>
          )}
        </aside>

        {/* DETAIL */}
        <main style={{ flex: "3 1 420px", minWidth: 0, maxWidth: 720 }}>
          {selected ? (
            <>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
                <span
                  aria-hidden="true"
                  style={{
                    width: 52,
                    height: 52,
                    flex: "none",
                    borderRadius: 12,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "var(--seal)",
                    background: "var(--seal-soft)",
                    border: "1px solid var(--seal-border)",
                  }}
                >
                  <LockGlyph />
                </span>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 11, flexWrap: "wrap" }}>
                    <h2
                      style={{
                        margin: 0,
                        fontFamily: "var(--font-display, var(--font-serif))",
                        fontSize: 24,
                        fontWeight: 400,
                        lineHeight: 1.15,
                      }}
                    >
                      {selected.tradition}
                    </h2>
                    <InitiationStatusPill status={selected.status} />
                  </div>
                  <div
                    style={{
                      fontFamily: "var(--font-ui)",
                      fontSize: 12,
                      color: "var(--ink-mute)",
                      marginTop: 4,
                    }}
                  >
                    Tradition and status are the only fields stored in plaintext.
                  </div>
                </div>
              </div>

              <div style={{ marginTop: 20 }}>
                {revealed?.id === selected.id ? (
                  <div
                    data-role="initiation-revealed"
                    style={{
                      border: "1px solid var(--seal-border)",
                      borderRadius: "var(--r-lg, 14px)",
                      background: "var(--seal-soft)",
                      padding: "20px 22px",
                    }}
                  >
                    {(
                      [
                        ["Grade or degree", revealed.fields.grade_or_degree],
                        ["Received", revealed.fields.received_at],
                        ["Place", revealed.fields.location],
                        ["Experience notes", revealed.fields.experience_notes],
                      ] as const
                    ).map(([label, value]) => (
                      <div key={label} style={{ marginBottom: 12 }}>
                        <div
                          style={{
                            fontFamily: "var(--font-ui)",
                            fontSize: 10.5,
                            letterSpacing: "0.14em",
                            textTransform: "uppercase",
                            color: "var(--ink-mute)",
                            marginBottom: 3,
                          }}
                        >
                          {label}
                        </div>
                        <div
                          data-revealed-field={label}
                          style={{
                            fontFamily: "var(--font-serif)",
                            fontSize: 14.5,
                            lineHeight: 1.6,
                            color: "var(--ink)",
                          }}
                        >
                          {value || "—"}
                        </div>
                      </div>
                    ))}
                    <div
                      style={{
                        marginTop: 4,
                        fontFamily: "var(--font-ui)",
                        fontSize: 11,
                        color: "var(--ink-mute)",
                      }}
                    >
                      Decrypted on this device only. The server cannot read or recover them.
                    </div>
                  </div>
                ) : (
                  // Canonical zero-knowledge copy ships inside the
                  // primitive; the CTA opens the per-read SealUnlock
                  // (v1-033 payload-read endpoint).
                  <SealedContentsBlock onUnlock={() => onUnlockRequest(selected.id)} />
                )}
              </div>

              <div
                style={{
                  marginTop: 16,
                  fontFamily: "var(--font-ui)",
                  fontSize: 11.5,
                  lineHeight: 1.55,
                  color: "var(--ink-mute)",
                }}
              >
                Initiations are always personal visibility. There is no sharing toggle — the only
                way any of this leaves your vault is a lineage attestation you sign deliberately.
              </div>
            </>
          ) : null}
        </main>
      </div>

      {/* Per-read passphrase prompt for the sealed reveal (v1-033). */}
      <SealUnlock
        open={unlockOpen}
        policy="per-read"
        errorMessage={unlockError ?? undefined}
        onUnlock={(passphrase, stay) => {
          if (selected) void reveal(selected.id, passphrase, { stay });
        }}
        onCancel={() => {
          setUnlockOpen(false);
          setUnlockError(null);
        }}
      />

      <RecordInitiationDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onRecorded={() => initiations.refresh()}
      />
    </>
  );
}
