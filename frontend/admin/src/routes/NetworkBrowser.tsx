/**
 * NetworkBrowser — admin route at ``/networks/peers``.
 *
 * v1-026: wired to the live peer directory. Lists peers from
 * ``GET /api/v1/federation/peers``, adds by URL via the topbar CTA
 * (the backend verifies the peer's ``/.well-known/theourgia/actor``
 * document before storing), and removes via the per-row kebab with a
 * confirm. The surface itself renders exactly what the design shows —
 * no reputation labels, no invented heartbeats: ``last_seen_at`` is
 * either a real timestamp or "never".
 */

import {
  Button,
  ConfirmDialog,
  Drawer,
  type FederationPeerRead,
  Field,
  NetworkBrowserSurface,
  type PeerInstance,
  TextInput,
  Toast,
  useApiCall,
  useTopbar,
} from "@theourgia/shared";
import { useMemo, useState } from "react";

import { apiMethods } from "../data/api.js";

// ─── Wire → surface mapping ─────────────────────────────────────────

const KNOWN_STATES = new Set(["successful", "pending", "refused", "blocked"]);

function relativeTime(iso: string | null): string {
  if (!iso) return "never";
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 60_000) return "just now";
  const minutes = Math.floor(ms / 60_000);
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

function hostOf(baseUrl: string): string {
  return baseUrl.replace(/^https?:\/\//, "").replace(/\/+$/, "");
}

function toPeerInstance(row: FederationPeerRead): PeerInstance {
  return {
    domain: hostOf(row.base_url),
    ...(row.label ? { tradition: row.label } : {}),
    handshake: (KNOWN_STATES.has(row.status) ? row.status : "pending") as PeerInstance["handshake"],
    heartbeat: relativeTime(row.last_seen_at),
    isLocal: false,
  };
}

// ─── Add-peer drawer ────────────────────────────────────────────────

function AddPeerDrawer({
  open,
  onClose,
  onAdded,
}: {
  open: boolean;
  onClose: () => void;
  onAdded: () => Promise<void>;
}) {
  const [baseUrl, setBaseUrl] = useState("");
  const [label, setLabel] = useState("");
  const [saving, setSaving] = useState(false);
  const [seeded, setSeeded] = useState(false);

  if (open && !seeded) {
    setSeeded(true);
    setBaseUrl("");
    setLabel("");
  }
  if (!open && seeded) setSeeded(false);

  async function submit(): Promise<void> {
    const trimmed = baseUrl.trim();
    if (!trimmed) {
      Toast.push({ tone: "error", title: "A peer URL is required" });
      return;
    }
    setSaving(true);
    try {
      await apiMethods.addFederationPeer({
        base_url: trimmed,
        label: label.trim() ? label.trim() : null,
      });
      Toast.push({ tone: "success", title: "Peer added to the directory" });
      onClose();
      await onAdded();
    } catch (e) {
      Toast.push({
        tone: "error",
        title: "Couldn't add the peer",
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
      width={480}
      title="Add a peer instance"
      onClose={onClose}
      closeOnBackdrop={false}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <Field label="Instance URL">
          <TextInput
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
            placeholder="https://aurora.example"
          />
        </Field>
        <Field label="Label (optional)">
          <TextInput
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="e.g. Hermetic"
          />
        </Field>
        <p
          style={{
            margin: 0,
            fontFamily: "var(--font-ui)",
            fontSize: 12,
            lineHeight: 1.5,
            color: "var(--ink-mute)",
          }}
        >
          The instance is verified before it is stored — its published actor document is fetched and
          its identity recorded.
        </p>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={() => void submit()} loading={saving}>
            Add peer
          </Button>
        </div>
      </div>
    </Drawer>
  );
}

// ─── Route ──────────────────────────────────────────────────────────

export function NetworkBrowser() {
  const [adding, setAdding] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);

  const peersQuery = useApiCall<FederationPeerRead[]>((signal) =>
    apiMethods.listFederationPeers({ signal }),
  );

  useTopbar(
    () => ({
      title: "Network browser",
      subtitle: "Federated instances your vault has handshaken with",
      after: (
        <Button variant="primary" onClick={() => setAdding(true)}>
          Add peer
        </Button>
      ),
    }),
    [],
  );

  const rows = useMemo(() => peersQuery.data ?? [], [peersQuery.data]);

  const peers: PeerInstance[] = useMemo(() => {
    const local: PeerInstance = {
      domain: typeof window !== "undefined" ? window.location.host : "this instance",
      handshake: "successful",
      heartbeat: "",
      isLocal: true,
    };
    return [local, ...rows.map(toPeerInstance)];
  }, [rows]);

  async function confirmRemove(): Promise<void> {
    const target = rows.find((r) => hostOf(r.base_url) === removing);
    setRemoving(null);
    if (!target) return;
    try {
      await apiMethods.removeFederationPeer(target.id);
      Toast.push({ tone: "success", title: "Peer removed" });
      await peersQuery.refresh();
    } catch (e) {
      Toast.push({
        tone: "error",
        title: "Couldn't remove the peer",
        body: e instanceof Error ? e.message : String(e),
      });
    }
  }

  if (peersQuery.status === "error") {
    return (
      <div
        data-error="federation-peers"
        style={{
          fontFamily: "var(--font-serif)",
          fontSize: 14,
          color: "var(--ink-soft)",
          padding: "24px 0",
        }}
      >
        Couldn't load the peer directory: {peersQuery.error?.message ?? "unknown error."}
      </div>
    );
  }

  return (
    <>
      <NetworkBrowserSurface
        peers={peers}
        traditions={[]}
        blocklistSubscribed={false}
        onConfigureBlocklist={() => {
          // Blocklist subscription settings surface is a Phase-12
          // follow-up. Deliberately no-op instead of pretending to
          // open something.
        }}
        onPeerAction={(domain) => setRemoving(domain)}
      />
      <ConfirmDialog
        open={removing !== null}
        title="Remove this peer?"
        body="The instance leaves your directory. Nothing is sent to the peer — removal is a local decision."
        confirmLabel="Remove"
        onConfirm={() => void confirmRemove()}
        onCancel={() => setRemoving(null)}
      />
      <AddPeerDrawer
        open={adding}
        onClose={() => setAdding(false)}
        onAdded={() => peersQuery.refresh()}
      />
    </>
  );
}
