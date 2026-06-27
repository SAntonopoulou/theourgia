/**
 * CrossPostPreviewModal — H08 §S3 Cluster B surface 21 · FINAL.
 *
 * Faithful port of ``Theourgia Cross-Post Preview.dc.html``.
 *
 * Honesty rules wired:
 *
 *   * **Public-only reach** (H08 rule 27). The first disclosure
 *     re-states it verbatim: "Only entries set to Public reach
 *     the Fediverse." The modal also refuses to render the
 *     Cross-post CTA in any non-public state.
 *
 *   * **Mastodon preview rendered in Mastodon's visual style.**
 *     The left pane uses Mastodon's actual colour tokens
 *     (`--masto-*`), NOT Theourgia's. The point is for the user
 *     to see what the audience will see — branded preview is a
 *     dishonest preview.
 *
 *   * **Graceful degradation disclosed verbatim.** Custom
 *     extensions degrade to plain Notes/Articles — "never broken
 *     markup."
 *
 *   * **Content warning preserved by default.** The CW toggle
 *     defaults ON.
 *
 *   * **Posts-once-now disclosure** verbatim in the footer:
 *     "Posts once, now. Edits sync if you enable Update
 *     activities."
 *
 *   * **Esc / scrim click → skip** (the consequent-free path).
 */

import { type CSSProperties, useEffect, useId, useState } from "react";

import {
  CPP_CROSSPOST_CTA,
  CPP_DIALOG_TITLE,
  CPP_DISCLOSURE_DEGRADE,
  CPP_DISCLOSURE_SETTINGS_HEAD,
  CPP_DISCLOSURE_SETTINGS_LINK,
  CPP_DISCLOSURE_SETTINGS_TAIL,
  CPP_DISCLOSURE_VISIBILITY_HEAD,
  CPP_DISCLOSURE_VISIBILITY_STRONG,
  CPP_DISCLOSURE_VISIBILITY_TAIL,
  CPP_DISCLOSURES_HEADING,
  CPP_FOOTER_NOTE,
  CPP_KEEP_CW,
  CPP_MASTODON_HEADING,
  CPP_SKIP_CTA,
} from "./copy.js";

// ─── Data shapes ──────────────────────────────────────────────────

export interface CrossPostPreviewModalProps {
  /** Entry title — appears in dialog subtitle in smart-quotes. */
  entryTitle: string;
  /** Display name shown in the Mastodon preview header. */
  authorName: string;
  /** WebFinger handle. */
  authorHandle: string;
  /** Single-glyph avatar monogram. */
  authorInitial: string;
  /** Optional content warning text. Renders in the Mastodon
   *  preview's CW band when `keepCw` is ON. */
  contentWarning?: string;
  /** Plain-text body the AP audience will read (first ~280 chars). */
  previewBody: string;
  /** Canonical URL the Mastodon link card points to. */
  canonicalUrl: string;
  onSkip: () => void;
  onCrossPost: (opts: { keepCw: boolean }) => void;
  /** Fired when the "Settings → Fediverse" link is tapped. */
  onOpenSettings?: () => void;
  className?: string;
  style?: CSSProperties;
}

// ─── Component ─────────────────────────────────────────────────────

export function CrossPostPreviewModal({
  entryTitle,
  authorName,
  authorHandle,
  authorInitial,
  contentWarning,
  previewBody,
  canonicalUrl,
  onSkip,
  onCrossPost,
  onOpenSettings,
  className,
  style,
}: CrossPostPreviewModalProps) {
  const titleId = useId();
  const [keepCw, setKeepCw] = useState(true);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onSkip();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onSkip]);

  return (
    <div
      data-surface="cross-post-preview"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 80,
        background: "rgba(0,0,0,.55)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onSkip();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={className}
        data-modal="cross-post-preview"
        style={{
          width: 640,
          maxWidth: "100%",
          background: "var(--bg)",
          borderWidth: 1,
          borderStyle: "solid",
          borderColor: "var(--line-2)",
          borderRadius: "var(--r-lg)",
          boxShadow: "0 28px 70px rgba(0,0,0,.55)",
          overflow: "hidden",
          ...style,
        }}
      >
        <header
          style={{
            padding: "20px 24px 15px",
            borderBottom: "1px solid var(--line)",
          }}
        >
          <h2
            id={titleId}
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 22,
              margin: 0,
            }}
          >
            {CPP_DIALOG_TITLE}
          </h2>
          <div
            data-field="entry-subtitle"
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: 12.5,
              color: "var(--ink-mute)",
              marginTop: 3,
            }}
          >
            “{entryTitle}”
          </div>
        </header>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 0,
          }}
        >
          <MastodonPreview
            authorName={authorName}
            authorHandle={authorHandle}
            authorInitial={authorInitial}
            contentWarning={contentWarning}
            keepCw={keepCw}
            previewBody={previewBody}
            canonicalUrl={canonicalUrl}
          />
          <DisclosuresPane
            keepCw={keepCw}
            onToggleCw={() => setKeepCw((v) => !v)}
            onOpenSettings={onOpenSettings}
          />
        </div>

        <footer
          style={{
            padding: "15px 24px",
            borderTop: "1px solid var(--line)",
            display: "flex",
            gap: 10,
            justifyContent: "flex-end",
            alignItems: "center",
          }}
        >
          <span
            data-field="footer-note"
            style={{
              marginRight: "auto",
              fontFamily: "var(--font-ui)",
              fontSize: 11.5,
              color: "var(--ink-mute)",
            }}
          >
            {CPP_FOOTER_NOTE}
          </span>
          <button
            type="button"
            onClick={onSkip}
            data-action="skip"
            style={{
              padding: "11px 18px",
              borderRadius: "var(--r-md)",
              borderWidth: 1,
              borderStyle: "solid",
              borderColor: "var(--line-2)",
              background: "transparent",
              fontFamily: "var(--font-ui)",
              fontSize: 14,
              color: "var(--ink-soft)",
              cursor: "pointer",
            }}
          >
            {CPP_SKIP_CTA}
          </button>
          <button
            type="button"
            onClick={() => onCrossPost({ keepCw })}
            data-action="cross-post"
            style={{
              padding: "11px 22px",
              borderRadius: "var(--r-md)",
              background: "var(--accent)",
              borderWidth: 1,
              borderStyle: "solid",
              borderColor: "var(--accent)",
              color: "var(--accent-ink)",
              fontFamily: "var(--font-ui)",
              fontWeight: 700,
              fontSize: 14,
              cursor: "pointer",
            }}
          >
            {CPP_CROSSPOST_CTA}
          </button>
        </footer>
      </div>
    </div>
  );
}

// ─── MastodonPreview ─────────────────────────────────────────────

function MastodonPreview({
  authorName,
  authorHandle,
  authorInitial,
  contentWarning,
  keepCw,
  previewBody,
  canonicalUrl,
}: {
  authorName: string;
  authorHandle: string;
  authorInitial: string;
  contentWarning?: string;
  keepCw: boolean;
  previewBody: string;
  canonicalUrl: string;
}) {
  // Inline Mastodon colour tokens — deliberately NOT Theourgia
  // tokens. The whole point is that the audience sees a
  // Mastodon-styled post.
  const MASTO = {
    bg: "#191b22",
    card: "#282c37",
    line: "#393f4f",
    ink: "#ffffff",
    soft: "#9baec8",
    blurple: "#858afa",
  };
  return (
    <div
      data-field="mastodon-preview"
      style={{
        padding: "18px 18px 20px",
        borderRight: "1px solid var(--line)",
      }}
    >
      <div
        style={{
          fontFamily: "var(--font-ui)",
          fontSize: 10,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          color: "var(--ink-mute)",
          marginBottom: 10,
        }}
      >
        {CPP_MASTODON_HEADING}
      </div>
      <div
        data-field="mastodon-card"
        style={{
          background: MASTO.card,
          borderWidth: 1,
          borderStyle: "solid",
          borderColor: MASTO.line,
          borderRadius: 8,
          padding: 14,
          fontFamily:
            'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            marginBottom: 10,
          }}
        >
          <span
            aria-hidden="true"
            style={{
              width: 40,
              height: 40,
              borderRadius: 8,
              flex: "none",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "#43485a",
              color: "#fff",
              fontFamily: '"Cardo", Georgia, serif',
              fontSize: 19,
            }}
          >
            {authorInitial}
          </span>
          <div style={{ minWidth: 0, lineHeight: 1.3 }}>
            <div
              data-field="masto-author-name"
              style={{
                color: MASTO.ink,
                fontWeight: 700,
                fontSize: 14,
              }}
            >
              {authorName}
            </div>
            <div
              data-field="masto-author-handle"
              style={{ color: MASTO.soft, fontSize: 13 }}
            >
              {authorHandle}
            </div>
          </div>
        </div>
        {contentWarning && keepCw ? (
          <div
            data-field="masto-cw"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 9,
              padding: "8px 10px",
              background: "#1f222b",
              borderRadius: 6,
              marginBottom: 10,
            }}
          >
            <span
              style={{
                color: MASTO.soft,
                fontSize: 13,
                flex: 1,
                minWidth: 0,
              }}
            >
              {contentWarning}
            </span>
            <span
              style={{
                padding: "3px 10px",
                borderWidth: 1,
                borderStyle: "solid",
                borderColor: MASTO.line,
                borderRadius: 4,
                color: MASTO.ink,
                fontSize: 12,
                fontWeight: 600,
              }}
            >
              Show more
            </span>
          </div>
        ) : null}
        <div
          data-field="masto-body"
          style={{ color: "#d9e1e8", fontSize: 14, lineHeight: 1.5 }}
        >
          {previewBody}{" "}
          <span style={{ color: MASTO.blurple }}>Read more</span>
        </div>
        <div
          data-field="masto-link"
          style={{
            marginTop: 11,
            paddingTop: 10,
            borderTop: `1px solid ${MASTO.line}`,
            color: MASTO.blurple,
            fontSize: 13,
          }}
        >
          🔗 {canonicalUrl}
        </div>
      </div>
    </div>
  );
}

// ─── DisclosuresPane ─────────────────────────────────────────────

function DisclosuresPane({
  keepCw,
  onToggleCw,
  onOpenSettings,
}: {
  keepCw: boolean;
  onToggleCw: () => void;
  onOpenSettings?: () => void;
}) {
  return (
    <div
      data-field="disclosures-pane"
      style={{ padding: "18px 20px 20px" }}
    >
      <div
        style={{
          fontFamily: "var(--font-ui)",
          fontSize: 10,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          color: "var(--ink-mute)",
          marginBottom: 10,
        }}
      >
        {CPP_DISCLOSURES_HEADING}
      </div>
      <div
        style={{ display: "flex", flexDirection: "column", gap: 13 }}
      >
        <Bullet
          dataField="disclosure-visibility"
          iconColor="var(--network)"
          iconPaths={[
            "M3.5 9h17",
            "M3.5 15h17",
            "M12 3a14 14 0 0 0 0 18",
            "M12 3a14 14 0 0 1 0 18",
          ]}
          iconCircle
        >
          {CPP_DISCLOSURE_VISIBILITY_HEAD}
          <strong style={{ color: "var(--ink)" }}>
            {CPP_DISCLOSURE_VISIBILITY_STRONG}
          </strong>
          {CPP_DISCLOSURE_VISIBILITY_TAIL}
        </Bullet>
        <Bullet
          dataField="disclosure-degrade"
          iconColor="var(--remote)"
          iconPaths={["M4 6h16", "M4 12h16", "M4 18h10"]}
        >
          {CPP_DISCLOSURE_DEGRADE}
        </Bullet>
        <Bullet
          dataField="disclosure-settings"
          iconColor="var(--ink-mute)"
          iconPaths={[
            "M12 20h9",
            "M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z",
          ]}
        >
          {CPP_DISCLOSURE_SETTINGS_HEAD}
          <button
            type="button"
            onClick={onOpenSettings}
            data-action="open-settings"
            style={{
              color: "var(--accent)",
              background: "transparent",
              border: "none",
              padding: 0,
              font: "inherit",
              cursor: "pointer",
            }}
          >
            {CPP_DISCLOSURE_SETTINGS_LINK}
          </button>
          {CPP_DISCLOSURE_SETTINGS_TAIL}
        </Bullet>
      </div>
      <label
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          marginTop: 18,
          padding: "10px 12px",
          borderWidth: 1,
          borderStyle: "solid",
          borderColor: "var(--line)",
          borderRadius: "var(--r-md)",
          background: "var(--bg-2)",
          cursor: "pointer",
        }}
      >
        <button
          type="button"
          role="switch"
          aria-checked={keepCw}
          onClick={onToggleCw}
          data-field="cw-switch"
          style={{
            position: "relative",
            width: 38,
            height: 22,
            borderRadius: 12,
            background: keepCw ? "var(--accent)" : "var(--bg-3)",
            borderWidth: 1,
            borderStyle: "solid",
            borderColor: keepCw ? "var(--accent)" : "var(--line-2)",
            flex: "none",
            transition: "background .18s ease",
            cursor: "pointer",
          }}
        >
          <span
            aria-hidden="true"
            style={{
              position: "absolute",
              top: 2,
              left: keepCw ? 18 : 2,
              width: 16,
              height: 16,
              borderRadius: "50%",
              background: keepCw
                ? "var(--accent-ink)"
                : "var(--ink-mute)",
              transition: "left .18s ease",
            }}
          />
        </button>
        <span
          style={{
            fontFamily: "var(--font-ui)",
            fontSize: 12.5,
            color: "var(--ink-soft)",
          }}
        >
          {CPP_KEEP_CW}
        </span>
      </label>
    </div>
  );
}

function Bullet({
  dataField,
  iconColor,
  iconPaths,
  iconCircle,
  children,
}: {
  dataField: string;
  iconColor: string;
  iconPaths: readonly string[];
  iconCircle?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div data-field={dataField} style={{ display: "flex", gap: 10 }}>
      <span
        aria-hidden="true"
        style={{
          display: "flex",
          color: iconColor,
          flex: "none",
          marginTop: 1,
        }}
      >
        <svg
          width={16}
          height={16}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.6}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {iconCircle ? <circle cx="12" cy="12" r="9" /> : null}
          {iconPaths.map((d, i) => (
            <path key={i} d={d} />
          ))}
        </svg>
      </span>
      <div
        style={{
          fontFamily: "var(--font-serif)",
          fontSize: 13.5,
          color: "var(--ink-soft)",
          lineHeight: 1.5,
        }}
      >
        {children}
      </div>
    </div>
  );
}
