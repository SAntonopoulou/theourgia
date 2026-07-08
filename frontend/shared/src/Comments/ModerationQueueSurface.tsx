/**
 * ModerationQueueSurface — vault-owner comment moderation.
 *
 * b108-2gw · admin surface for `GET /api/v1/comments/queue` plus
 * `PATCH /api/v1/comments/{id}` and `DELETE /api/v1/comments/{id}`.
 *
 * Optimistically removes rows the moderator approves / rejects /
 * spams / deletes; the row disappears from the pane immediately and
 * the promise is expected to reconcile with the backend.
 */

import {
  type CSSProperties,
  useCallback,
  useEffect,
  useState,
} from "react";

export type ModerationState = "pending" | "approved" | "rejected" | "spam";

export interface ModeratorComment {
  id: string;
  target_kind: "entry" | "publication";
  target_id: string;
  author_name: string;
  author_email: string | null;
  author_url: string | null;
  body: string;
  state: ModerationState;
  moderator_note: string | null;
  ip_address: string | null;
  created_at: string;
}

export interface ModerationQueueSurfaceProps {
  /** Fetch the queue for the currently-signed-in vault owner. */
  onLoad: (
    state: ModerationState | "all",
  ) => Promise<ModeratorComment[]>;
  onModerate: (
    id: string,
    patch: { state?: ModerationState; moderator_note?: string },
  ) => Promise<ModeratorComment>;
  onDelete: (id: string) => Promise<void>;
  className?: string;
  style?: CSSProperties;
}

const STATE_LABELS: Record<ModerationState | "all", string> = {
  all: "All",
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
  spam: "Spam",
};

const STATE_TABS: (ModerationState | "all")[] = [
  "pending",
  "approved",
  "rejected",
  "spam",
  "all",
];

export function ModerationQueueSurface({
  onLoad,
  onModerate,
  onDelete,
  className,
  style,
}: ModerationQueueSurfaceProps) {
  const [tab, setTab] = useState<ModerationState | "all">("pending");
  const [rows, setRows] = useState<ModeratorComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setRows(await onLoad(tab));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load queue");
    } finally {
      setLoading(false);
    }
  }, [onLoad, tab]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const removeLocally = (id: string) =>
    setRows((r) => r.filter((row) => row.id !== id));

  const transition = async (
    id: string,
    state: ModerationState,
  ) => {
    removeLocally(id);
    try {
      await onModerate(id, { state });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Moderation failed");
      void reload();
    }
  };

  const hardDelete = async (id: string) => {
    removeLocally(id);
    try {
      await onDelete(id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
      void reload();
    }
  };

  return (
    <div
      data-surface="moderation-queue"
      className={className}
      style={{
        maxWidth: 960,
        margin: "0 auto",
        padding: "32px 28px 80px",
        fontFamily: "var(--font-serif)",
        color: "var(--ink)",
        ...style,
      }}
    >
      <h1
        style={{
          fontFamily: "var(--font-display)",
          fontSize: 28,
          margin: "0 0 6px",
          color: "var(--ink)",
        }}
      >
        Comment moderation
      </h1>
      <p
        style={{
          margin: "0 0 24px",
          fontFamily: "var(--font-ui)",
          fontSize: 13,
          color: "var(--ink-mute)",
        }}
      >
        Approve, reject, or mark comments as spam. Only approved comments
        appear on public pages.
      </p>

      <div
        role="tablist"
        aria-label="Moderation filter"
        style={{
          display: "flex",
          gap: 4,
          borderBottom: "1px solid var(--line)",
          marginBottom: 20,
        }}
      >
        {STATE_TABS.map((k) => (
          <button
            key={k}
            role="tab"
            aria-selected={tab === k}
            onClick={() => setTab(k)}
            style={{
              padding: "9px 16px",
              border: "none",
              background: "transparent",
              borderBottom:
                tab === k
                  ? "2px solid var(--accent)"
                  : "2px solid transparent",
              color: tab === k ? "var(--ink)" : "var(--ink-mute)",
              fontFamily: "var(--font-ui)",
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            {STATE_LABELS[k]}
          </button>
        ))}
      </div>

      {loading ? (
        <p style={muted}>Loading…</p>
      ) : error ? (
        <p role="alert" style={{ ...muted, color: "var(--danger, var(--ink))" }}>
          {error}
        </p>
      ) : rows.length === 0 ? (
        <p style={muted}>Nothing here.</p>
      ) : (
        <ul
          style={{
            listStyle: "none",
            padding: 0,
            margin: 0,
            display: "flex",
            flexDirection: "column",
            gap: 14,
          }}
        >
          {rows.map((c) => (
            <li
              key={c.id}
              data-comment-id={c.id}
              style={{
                padding: "16px 18px",
                border: "1px solid var(--line)",
                borderRadius: "var(--r-md)",
                background: "var(--bg-2)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  gap: 10,
                  alignItems: "baseline",
                  marginBottom: 10,
                  fontFamily: "var(--font-ui)",
                  fontSize: 12.5,
                  flexWrap: "wrap",
                }}
              >
                <span style={{ color: "var(--ink)", fontWeight: 600 }}>
                  {c.author_name}
                </span>
                {c.author_email && (
                  <span style={{ color: "var(--ink-mute)" }}>{c.author_email}</span>
                )}
                <span
                  style={{
                    padding: "2px 8px",
                    borderRadius: "var(--r-sm)",
                    background: stateBg(c.state),
                    color: stateFg(c.state),
                    fontFamily: "var(--font-mono)",
                    fontSize: 10.5,
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                  }}
                >
                  {c.state}
                </span>
                <span style={{ marginLeft: "auto", color: "var(--ink-mute)" }}>
                  on {c.target_kind} · {c.target_id.slice(0, 8)}…
                </span>
              </div>
              <p
                style={{
                  margin: "0 0 12px",
                  fontFamily: "var(--font-serif)",
                  fontSize: 14.5,
                  lineHeight: 1.55,
                  whiteSpace: "pre-wrap",
                }}
              >
                {c.body}
              </p>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {c.state !== "approved" && (
                  <button
                    type="button"
                    onClick={() => void transition(c.id, "approved")}
                    style={ctaStyle("var(--peer-ok, var(--accent))")}
                  >
                    Approve
                  </button>
                )}
                {c.state !== "rejected" && (
                  <button
                    type="button"
                    onClick={() => void transition(c.id, "rejected")}
                    style={ctaStyle("var(--warn, var(--ink-mute))")}
                  >
                    Reject
                  </button>
                )}
                {c.state !== "spam" && (
                  <button
                    type="button"
                    onClick={() => void transition(c.id, "spam")}
                    style={ctaStyle("var(--seal, var(--ink-mute))")}
                  >
                    Spam
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => void hardDelete(c.id)}
                  style={{
                    ...ctaStyle("transparent"),
                    color: "var(--ink-mute)",
                    border: "1px solid var(--line-2)",
                  }}
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ctaStyle(bg: string): CSSProperties {
  return {
    padding: "6px 12px",
    border: "none",
    borderRadius: "var(--r-sm)",
    background: bg,
    color: "var(--bg)",
    fontFamily: "var(--font-ui)",
    fontSize: 12,
    fontWeight: 600,
    cursor: "pointer",
  };
}

function stateBg(s: ModerationState): string {
  switch (s) {
    case "approved":
      return "var(--peer-ok-soft, var(--bg-3))";
    case "rejected":
      return "var(--warn-soft, var(--bg-3))";
    case "spam":
      return "var(--seal-soft, var(--bg-3))";
    default:
      return "var(--bg-3)";
  }
}

function stateFg(s: ModerationState): string {
  switch (s) {
    case "approved":
      return "var(--peer-ok, var(--ink))";
    case "rejected":
      return "var(--warn, var(--ink))";
    case "spam":
      return "var(--seal, var(--ink))";
    default:
      return "var(--ink)";
  }
}

const muted: CSSProperties = {
  margin: 0,
  fontFamily: "var(--font-ui)",
  fontSize: 13,
  color: "var(--ink-mute)",
};
