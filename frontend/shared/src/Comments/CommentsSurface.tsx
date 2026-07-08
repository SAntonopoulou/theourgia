/**
 * CommentsSurface — display existing comments + a submission form.
 *
 * b108-2gw · FEATURES §2 + §12 · "Comments with moderation".
 *
 * Presentational primitive. The consumer wires the two callbacks
 * (`onLoad`, `onSubmit`) to the backend at
 *   GET /api/v1/comments/target/{kind}/{id}
 *   POST /api/v1/comments
 * so the surface stays trivially testable + reusable across the
 * blog reader, the publication reader, and the vault public page.
 *
 * The honeypot field (`website_ref`) is rendered off-screen so
 * screen readers ignore it. Bots that fill every text field trip
 * the backend spam classifier without user friction.
 */

import {
  type CSSProperties,
  type FormEvent,
  useCallback,
  useEffect,
  useState,
} from "react";

export interface Comment {
  id: string;
  target_kind: "entry" | "publication";
  target_id: string;
  author_name: string;
  author_url: string | null;
  body: string;
  created_at: string;
}

export interface CommentDraft {
  author_name: string;
  author_email?: string;
  author_url?: string;
  body: string;
  website_ref?: string;
}

export interface CommentsSurfaceProps {
  targetKind: "entry" | "publication";
  targetId: string;
  /** Fetch approved comments for the target. */
  onLoad: () => Promise<Comment[]>;
  /** Submit a new comment (goes to moderation). */
  onSubmit: (draft: CommentDraft) => Promise<Comment>;
  /** Optional label shown above the form. */
  formHeading?: string;
  className?: string;
  style?: CSSProperties;
}

const OFF_SCREEN: CSSProperties = {
  position: "absolute",
  left: "-9999px",
  top: "-9999px",
  width: 1,
  height: 1,
  opacity: 0,
  pointerEvents: "none",
};

export function CommentsSurface({
  targetKind,
  targetId,
  onLoad,
  onSubmit,
  formHeading = "Leave a comment",
  className,
  style,
}: CommentsSurfaceProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [url, setUrl] = useState("");
  const [body, setBody] = useState("");
  const [honeypot, setHoneypot] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const rows = await onLoad();
      setComments(rows);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Failed to load comments");
    } finally {
      setLoading(false);
    }
  }, [onLoad]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!name.trim() || !body.trim()) {
      setSubmitError("Name and comment body are required.");
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    try {
      await onSubmit({
        author_name: name.trim(),
        author_email: email.trim() || undefined,
        author_url: url.trim() || undefined,
        body,
        website_ref: honeypot,
      });
      setSubmitted(true);
      setName("");
      setEmail("");
      setUrl("");
      setBody("");
      setHoneypot("");
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Failed to send comment");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section
      data-surface="comments"
      data-target-kind={targetKind}
      data-target-id={targetId}
      aria-labelledby="comments-heading"
      className={className}
      style={{
        marginTop: 48,
        borderTop: "1px solid var(--line)",
        paddingTop: 32,
        fontFamily: "var(--font-serif)",
        color: "var(--ink)",
        ...style,
      }}
    >
      <h2
        id="comments-heading"
        style={{
          fontFamily: "var(--font-display)",
          fontSize: 22,
          margin: "0 0 24px",
          color: "var(--ink)",
        }}
      >
        Comments
      </h2>

      {loading ? (
        <p style={mutedNote}>Loading…</p>
      ) : loadError ? (
        <p role="alert" style={{ ...mutedNote, color: "var(--danger, var(--ink))" }}>
          {loadError}
        </p>
      ) : comments.length === 0 ? (
        <p style={mutedNote}>No comments yet.</p>
      ) : (
        <ul
          style={{
            listStyle: "none",
            padding: 0,
            margin: 0,
            display: "flex",
            flexDirection: "column",
            gap: 20,
            marginBottom: 32,
          }}
        >
          {comments.map((c) => (
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
                  marginBottom: 8,
                  fontFamily: "var(--font-ui)",
                  fontSize: 12.5,
                }}
              >
                <span style={{ color: "var(--ink)", fontWeight: 600 }}>
                  {c.author_url ? (
                    <a
                      href={c.author_url}
                      rel="noopener nofollow ugc"
                      style={{ color: "inherit", textDecoration: "underline" }}
                    >
                      {c.author_name}
                    </a>
                  ) : (
                    c.author_name
                  )}
                </span>
                <time
                  dateTime={c.created_at}
                  style={{ color: "var(--ink-mute)", fontSize: 11.5 }}
                >
                  {formatDate(c.created_at)}
                </time>
              </div>
              <p
                style={{
                  margin: 0,
                  fontFamily: "var(--font-serif)",
                  fontSize: 15,
                  lineHeight: 1.6,
                  whiteSpace: "pre-wrap",
                }}
              >
                {c.body}
              </p>
            </li>
          ))}
        </ul>
      )}

      <div
        style={{
          marginTop: 12,
          padding: "20px 22px",
          border: "1px solid var(--line)",
          borderRadius: "var(--r-lg)",
          background: "var(--bg-2)",
        }}
      >
        <h3
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 17,
            margin: "0 0 4px",
            color: "var(--ink)",
          }}
        >
          {formHeading}
        </h3>
        <p
          style={{
            margin: "0 0 16px",
            fontFamily: "var(--font-ui)",
            fontSize: 12.5,
            color: "var(--ink-mute)",
          }}
        >
          Comments enter a moderation queue. They appear only after the vault owner approves them.
        </p>

        {submitted ? (
          <div
            role="status"
            style={{
              padding: "14px 16px",
              border: "1px solid var(--peer-ok, var(--accent))",
              borderRadius: "var(--r-md)",
              background: "var(--peer-ok-soft, var(--bg))",
              fontFamily: "var(--font-serif)",
              fontSize: 14,
              color: "var(--ink)",
            }}
          >
            Thank you — your comment has been submitted for moderation.
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate>
            <label style={labelStyle}>
              <span>Name *</span>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={inputStyle}
                aria-label="Your name"
              />
            </label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <label style={labelStyle}>
                <span>Email (private)</span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={inputStyle}
                  aria-label="Your email"
                />
              </label>
              <label style={labelStyle}>
                <span>Website (optional)</span>
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  style={inputStyle}
                  aria-label="Your website"
                />
              </label>
            </div>
            <label style={labelStyle}>
              <span>Comment *</span>
              <textarea
                required
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={4}
                style={{ ...inputStyle, resize: "vertical", minHeight: 96 }}
                aria-label="Your comment"
              />
            </label>

            {/* Honeypot — visually + programmatically off-screen. Bots
             *   that indiscriminately fill fields trip the trap; humans
             *   never see it. */}
            <label style={OFF_SCREEN} aria-hidden="true">
              <span>Website reference</span>
              <input
                type="text"
                tabIndex={-1}
                autoComplete="off"
                value={honeypot}
                onChange={(e) => setHoneypot(e.target.value)}
              />
            </label>

            {submitError && (
              <p
                role="alert"
                style={{ margin: "0 0 12px", ...mutedNote, color: "var(--danger, var(--ink))" }}
              >
                {submitError}
              </p>
            )}

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button
                type="submit"
                disabled={submitting}
                style={{
                  padding: "10px 20px",
                  border: "none",
                  borderRadius: "var(--r-md)",
                  background: submitting ? "var(--bg-3)" : "var(--accent)",
                  color: "var(--accent-ink)",
                  fontFamily: "var(--font-ui)",
                  fontWeight: 700,
                  fontSize: 14,
                  cursor: submitting ? "wait" : "pointer",
                }}
              >
                {submitting ? "Sending…" : "Submit for moderation"}
              </button>
            </div>
          </form>
        )}
      </div>
    </section>
  );
}

const labelStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 5,
  marginBottom: 12,
  fontFamily: "var(--font-ui)",
  fontSize: 12.5,
  color: "var(--ink-soft)",
};

const inputStyle: CSSProperties = {
  padding: "9px 11px",
  border: "1px solid var(--line-2)",
  borderRadius: "var(--r-sm)",
  background: "var(--bg)",
  color: "var(--ink)",
  fontFamily: "var(--font-serif)",
  fontSize: 14,
  width: "100%",
};

const mutedNote: CSSProperties = {
  margin: 0,
  fontFamily: "var(--font-ui)",
  fontSize: 13,
  color: "var(--ink-mute)",
};

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}
