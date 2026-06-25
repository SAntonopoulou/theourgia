/**
 * ReaderSurface — H07 §S3 surface 8 (PUBLIC, no VaultNav).
 *
 * The reader experience for a published book or essay. Public, no
 * auth required (or auth-required if "Subscribe to read"). The
 * chrome is intentionally minimal — typography dominates.
 *
 * Honesty rules (H07 §S3 #8):
 *   • Public surface — does NOT carry VaultNav. Minimal sticky
 *     topbar instead (title + author + Download/Read CTA).
 *   • 66-character measure for serif body (~ max-width 680px at
 *     19px serif). Drop cap on the first paragraph.
 *   • Download CTA uses --accent for the purchase moment;
 *     "Free" or "Already purchased" variants render the same
 *     button styled differently.
 *   • Reading state is NOT tracked by default — no "X% read"
 *     indicator unless the viewer opts in via vault settings
 *     (out of scope here; this surface stays read-only).
 *   • Footer: license + author byline + (if watermarked) buyer
 *     email + "Powered by Theourgia (AGPLv3)".
 *   • "More from this vault" rail shows 3 sibling publications;
 *     prices in --money if paid, --ink-mute if free.
 */

import {
  type CSSProperties,
  type ReactElement,
  type ReactNode,
} from "react";

export type ReaderPurchaseState =
  | { kind: "free" }
  | { kind: "for-sale"; price_label: string }
  | { kind: "purchased"; download_label?: string }
  | { kind: "subscribers-only"; subscribe_url?: string };

export interface ReaderSiblingPublication {
  id: string;
  title: string;
  href: string;
  /** "$24.00" | "Free" | "Subscribers" */
  price_label: string;
  /** When true, render price in --money; false renders in --ink-mute. */
  is_paid: boolean;
}

export interface ReaderPublicationRecord {
  id: string;
  title: string;
  /** Display-friendly chapter or section eyebrow. */
  chapter_eyebrow?: string | null;
  /** Display-friendly chapter / section title (large heading). */
  display_title: string;
  author_label: string;
  /** License code (e.g. "all-rights-reserved", "cc-by"). */
  license: string;
  /** License display text (e.g. "All rights reserved"). */
  license_label: string;
  /** Buyer email when this download is watermarked. Renders in
   *  the footer as a polite reminder, never a lock. */
  watermark_email?: string | null;
  /** Body — Tiptap HTML when published; either fed via
   *  `body_html` (the common shape from the Phase-10 renderer) or
   *  via the `children` prop for advanced consumers (e.g. tests). */
  body_html?: string;
}

export interface ReaderSurfaceProps {
  publication: ReaderPublicationRecord;
  purchase: ReaderPurchaseState;
  /** Optional sibling list (max 3 surfaced). */
  siblings?: readonly ReaderSiblingPublication[];
  /** Fired when the practitioner clicks the purchase CTA. The
   *  consumer either calls POST /publications/{id}/checkout-session
   *  (Stripe Checkout) or opens the subscriber-login flow. */
  onPurchase?: () => void;
  /** Fired when a sibling is clicked. The consumer navigates to
   *  the sibling's reader URL. */
  onOpenSibling?: (id: string) => void;
  /** Body content as React (overrides `body_html` when supplied —
   *  useful in tests + Storybook). */
  children?: ReactNode;
  className?: string;
  style?: CSSProperties;
}

// ── Styles ────────────────────────────────────────────────────────

const ROOT: CSSProperties = {
  minHeight: "100vh",
  background: "var(--bg)",
  color: "var(--ink)",
  fontFamily: "var(--font-serif)",
};

const TOPBAR: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 14,
  padding: "16px 28px",
  borderBottomWidth: 1,
  borderBottomStyle: "solid",
  borderBottomColor: "var(--line)",
  position: "sticky",
  top: 0,
  background: "var(--bg)",
  zIndex: 5,
};

const BODY_WRAP: CSSProperties = {
  display: "flex",
  gap: 40,
  maxWidth: 1080,
  margin: "0 auto",
  padding: "0 28px",
};

const ARTICLE: CSSProperties = {
  flex: "1 1 auto",
  minWidth: 0,
  maxWidth: 680,
  margin: "0 auto",
  padding: "56px 0 80px",
  fontSize: 19,
  lineHeight: 1.75,
  color: "var(--ink)",
};

const FOOTER: CSSProperties = {
  borderTopWidth: 1,
  borderTopStyle: "solid",
  borderTopColor: "var(--line)",
  padding: 28,
  textAlign: "center",
};

// ── Icons ─────────────────────────────────────────────────────────

function DownloadIcon(): ReactElement {
  return (
    <svg
      width={15}
      height={15}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 3v12M8 11l4 4 4-4M5 21h14" />
    </svg>
  );
}

// ── Helpers ───────────────────────────────────────────────────────

function purchaseButtonCopy(state: ReaderPurchaseState): {
  label: string;
  icon: ReactElement | null;
} {
  switch (state.kind) {
    case "free":
      return { label: "Read", icon: null };
    case "for-sale":
      return {
        label: `Download · ${state.price_label}`,
        icon: <DownloadIcon />,
      };
    case "purchased":
      return {
        label: state.download_label ?? "Download",
        icon: <DownloadIcon />,
      };
    case "subscribers-only":
      return { label: "Subscribe to read", icon: null };
  }
}

// ── Surface ───────────────────────────────────────────────────────

export function ReaderSurface({
  publication,
  purchase,
  siblings,
  onPurchase,
  onOpenSibling,
  children,
  className,
  style,
}: ReaderSurfaceProps) {
  const cta = purchaseButtonCopy(purchase);
  const trimmedSiblings = (siblings ?? []).slice(0, 3);

  return (
    <div
      data-component="reader-surface"
      className={className}
      style={{ ...ROOT, ...style }}
    >
      {/* Minimal topbar */}
      <header data-reader-topbar style={TOPBAR}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            minWidth: 0,
          }}
        >
          <span
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 17,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {publication.title}
          </span>
          <span
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: 12.5,
              color: "var(--ink-mute)",
              whiteSpace: "nowrap",
            }}
          >
            {publication.author_label}
          </span>
        </div>
        <div
          style={{
            marginLeft: "auto",
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <button
            type="button"
            data-action="purchase"
            data-purchase-state={purchase.kind}
            onClick={onPurchase}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "9px 17px",
              borderRadius: "var(--r-md)",
              background: "var(--accent)",
              color: "var(--accent-ink)",
              fontFamily: "var(--font-ui)",
              fontWeight: 700,
              fontSize: 13.5,
              border: "none",
              cursor: "pointer",
            }}
          >
            {cta.icon}
            {cta.label}
          </button>
        </div>
      </header>

      {/* Body */}
      <div style={BODY_WRAP}>
        <article
          data-reader-article
          className="rd-body"
          style={ARTICLE}
        >
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            {publication.chapter_eyebrow ? (
              <div
                style={{
                  fontFamily: "var(--font-ui)",
                  fontSize: 11,
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                  color: "var(--ink-mute)",
                  marginBottom: 14,
                }}
              >
                {publication.chapter_eyebrow}
              </div>
            ) : null}
            <h1
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 38,
                lineHeight: 1.15,
                margin: 0,
              }}
            >
              {publication.display_title}
            </h1>
          </div>

          {children ? (
            <div data-reader-body>{children}</div>
          ) : publication.body_html ? (
            <div
              data-reader-body
              // The body_html is server-rendered Tiptap output sanitized
              // by the backend's renderer. Setting it via
              // dangerouslySetInnerHTML is the only honest way to
              // render Tiptap-authored prose; alternative components
              // would re-implement the editor's render path. The
              // backend MUST sanitize; rule 1 of the H07 reader.
              dangerouslySetInnerHTML={{ __html: publication.body_html }}
            />
          ) : null}
        </article>

        {trimmedSiblings.length > 0 ? (
          <aside
            data-reader-siblings
            className="rd-aside"
            style={{ flex: "0 0 240px", padding: "56px 0 80px" }}
          >
            <div style={{ position: "sticky", top: 90 }}>
              <div
                style={{
                  fontFamily: "var(--font-ui)",
                  fontSize: 10.5,
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  color: "var(--ink-mute)",
                  marginBottom: 14,
                }}
              >
                More from this vault
              </div>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 14,
                }}
              >
                {trimmedSiblings.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => onOpenSibling?.(s.id)}
                    data-sibling-id={s.id}
                    style={{
                      display: "block",
                      textDecoration: "none",
                      background: "transparent",
                      border: "none",
                      padding: 0,
                      textAlign: "left",
                      cursor: "pointer",
                    }}
                  >
                    <div
                      style={{
                        fontFamily: "var(--font-display)",
                        fontSize: 15.5,
                        color: "var(--ink)",
                        lineHeight: 1.25,
                        marginBottom: 3,
                      }}
                    >
                      {s.title}
                    </div>
                    <div
                      style={{
                        fontFamily: "var(--font-ui)",
                        fontSize: 11.5,
                        color: s.is_paid
                          ? "var(--money)"
                          : "var(--ink-mute)",
                      }}
                    >
                      {s.price_label}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </aside>
        ) : null}
      </div>

      {/* Footer */}
      <footer data-reader-footer style={FOOTER}>
        <div
          style={{
            fontFamily: "var(--font-ui)",
            fontSize: 12.5,
            color: "var(--ink-soft)",
            marginBottom: 6,
          }}
        >
          © {publication.author_label} · {publication.license_label}
        </div>
        {publication.watermark_email ? (
          <div
            data-reader-watermark
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: 11,
              color: "var(--ink-mute)",
              fontStyle: "italic",
              marginBottom: 6,
            }}
          >
            Downloaded by {publication.watermark_email} · a polite
            attribution, not DRM.
          </div>
        ) : null}
        <div
          style={{
            fontFamily: "var(--font-ui)",
            fontSize: 11.5,
            color: "var(--ink-mute)",
          }}
        >
          Published via Theourgia · author's vault · Powered by
          Theourgia (AGPLv3)
        </div>
      </footer>
    </div>
  );
}
