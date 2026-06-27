/**
 * HubPublicFaceSurface — H08 §S3 Cluster A surface 5.
 *
 * Faithful port of ``Theourgia Hub Public Face.dc.html``. The
 * **public** route a non-member visits at ``/hub/{slug}`` — no
 * VaultNav, no app shell. The outward face of a hub.
 *
 * Honesty rules wired:
 *
 *   1. **NO member count public** (rule 18). Hub member counts
 *      are admin-internal; the public face omits them entirely.
 *      The surface does not even accept a memberCount prop.
 *   2. **No "join the conversation" / "trending" copy** — only
 *      the explicit Join / Request to join / This hub is
 *      invitation-only CTAs matching the membership policy.
 *   3. **`‡ Powered by Theourgia (AGPLv3)`** footer verbatim per
 *      rule 7 (citation chrome on everything not authored here).
 *   4. **Member / pending chips** use --peer-ok-soft / --warn-soft
 *      respectively. NEVER --danger (rule 2 carry-forward).
 *   5. **Three viewer variants** — anonymous (the default; no
 *      chip), member (peer-ok chip), pending (warn-soft chip).
 *      The CTA disables for member/pending so accidental re-joins
 *      don't happen.
 */

import {
  type CSSProperties,
  useId,
} from "react";

import {
  HPF_ABOUT,
  HPF_AGPL_CREDIT,
  HPF_CTA_ALREADY_MEMBER,
  HPF_CTA_INVITATION_ONLY,
  HPF_CTA_JOIN_PUBLIC,
  HPF_CTA_REQUEST_PENDING,
  HPF_CTA_REQUEST_TO_JOIN,
  HPF_ESTABLISHED_PREFIX,
  HPF_FEATURED,
  HPF_MEMBER_CHIP,
  HPF_PENDING_CHIP,
  HPF_POLICY_COPY,
  type MembershipPolicy,
} from "./copy.js";

// ─── Data shapes ───────────────────────────────────────────────────

export type HubViewerState = "anonymous" | "member" | "pending";

export interface HubFeaturedItem {
  id: string;
  /** Display title. */
  title: string;
  /** Display-friendly author handle / DID. */
  author: string;
  /** Optional href — the consumer wires the navigation. */
  href?: string;
}

export interface HubPublicFaceSurfaceProps {
  /** Hub display name. */
  hubName: string;
  /** Hub tagline / motto (≤120ch). Rendered italic. */
  motto: string;
  /** Tradition pills — usually one, occasionally two. */
  traditions: readonly string[];
  /** Display-friendly "Established {when}" suffix.
   *  e.g. "March 2024". */
  establishedAt: string;
  /** Optional cover/banner image. When omitted, a calm
   *  --network-soft gradient stands in. */
  bannerImageUrl?: string | null;
  /** Single-glyph monogram tile in the hero. */
  monogram: string;
  /** Tiptap-lite output: a single paragraph for v1. The surface
   *  preserves whitespace and renders italics if present in the
   *  string. A future batch can take a `TiptapDoc` here when the
   *  renderer ships. */
  about: string;
  /** Featured publications / entries the hub admin pinned. */
  featured: readonly HubFeaturedItem[];
  policy: MembershipPolicy;
  /** Who's looking. */
  viewer: HubViewerState;
  /** Optional editorial footer epigraph — a single line above
   *  the AGPL credit. */
  footerEpigraph?: string;
  /** Fires when the CTA is in an enabled state and clicked. */
  onJoin?: () => void;
  /** Optional onClick handler for a featured-item card. The
   *  default is to follow the item's `href`. */
  onOpenFeatured?: (itemId: string) => void;
  className?: string;
  style?: CSSProperties;
}

// ─── Helpers ───────────────────────────────────────────────────────

function ctaForState(
  policy: MembershipPolicy,
  viewer: HubViewerState,
): { label: string; disabled: boolean } {
  if (viewer === "member") {
    return { label: HPF_CTA_ALREADY_MEMBER, disabled: true };
  }
  if (viewer === "pending") {
    return { label: HPF_CTA_REQUEST_PENDING, disabled: true };
  }
  if (policy === "public") {
    return { label: HPF_CTA_JOIN_PUBLIC, disabled: false };
  }
  if (policy === "open-with-approval") {
    return { label: HPF_CTA_REQUEST_TO_JOIN, disabled: false };
  }
  return { label: HPF_CTA_INVITATION_ONLY, disabled: true };
}

// ─── Styles ───────────────────────────────────────────────────────

const ROOT: CSSProperties = {
  minHeight: "100vh",
  background: "var(--bg)",
  color: "var(--ink)",
  fontFamily: "var(--font-serif)",
};

const HERO_BANNER: CSSProperties = {
  height: 200,
  background:
    "linear-gradient(120deg,var(--network-soft),var(--bg-sunk))",
  borderBottom: "1px solid var(--line)",
};

const HERO_INNER: CSSProperties = {
  maxWidth: 760,
  margin: "0 auto",
  padding: "0 28px",
  position: "relative",
};

const HERO_ROW: CSSProperties = {
  display: "flex",
  alignItems: "flex-end",
  gap: 18,
  marginTop: -44,
  marginBottom: 18,
};

const MONOGRAM_TILE: CSSProperties = {
  width: 88,
  height: 88,
  borderRadius: "var(--r-lg)",
  background: "var(--network-soft)",
  border: "3px solid var(--bg)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flex: "none",
  fontFamily: "var(--font-display)",
  fontSize: 40,
  color: "var(--network)",
};

const HUB_TITLE: CSSProperties = {
  fontFamily: "var(--font-display)",
  fontSize: 34,
  lineHeight: 1.05,
  margin: 0,
};

const MEMBER_CHIP: CSSProperties = {
  display: "inline-flex",
  marginTop: 6,
  padding: "2px 10px",
  border: "1px solid var(--peer-ok)",
  borderRadius: "999px",
  background: "var(--peer-ok-soft)",
  fontFamily: "var(--font-ui)",
  fontSize: 11.5,
  color: "var(--peer-ok)",
};

const PENDING_CHIP: CSSProperties = {
  display: "inline-flex",
  marginTop: 6,
  padding: "2px 10px",
  border: "1px solid var(--warn-border)",
  borderRadius: "999px",
  background: "var(--warn-soft)",
  fontFamily: "var(--font-ui)",
  fontSize: 11.5,
  color: "var(--warn)",
};

const MOTTO: CSSProperties = {
  fontFamily: "var(--font-serif)",
  fontStyle: "italic",
  fontSize: 18,
  color: "var(--ink-soft)",
  margin: "0 0 12px",
};

const META_ROW: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  flexWrap: "wrap",
};

const TRADITION_PILL: CSSProperties = {
  padding: "3px 10px",
  border: "1px solid var(--network-line)",
  borderRadius: "999px",
  background: "var(--network-soft)",
  fontFamily: "var(--font-ui)",
  fontSize: 11.5,
  color: "var(--network)",
};

const ESTABLISHED: CSSProperties = {
  fontFamily: "var(--font-ui)",
  fontSize: 12,
  color: "var(--ink-mute)",
};

const MAIN: CSSProperties = {
  maxWidth: 760,
  margin: "0 auto",
  padding: "34px 28px 60px",
};

const EYEBROW: CSSProperties = {
  fontFamily: "var(--font-ui)",
  fontSize: 10.5,
  letterSpacing: ".14em",
  textTransform: "uppercase",
  color: "var(--ink-mute)",
  marginBottom: 12,
};

const ABOUT_BODY: CSSProperties = {
  fontFamily: "var(--font-serif)",
  fontSize: 16.5,
  lineHeight: 1.7,
  color: "var(--ink)",
  margin: 0,
};

const FEATURED_GRID: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 14,
};

const FEATURED_CARD: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  border: "1px solid var(--line)",
  borderRadius: "var(--r-lg)",
  background: "var(--bg-2)",
  overflow: "hidden",
  textDecoration: "none",
  color: "inherit",
};

const FEATURED_THUMB: CSSProperties = {
  aspectRatio: "5/3",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 14,
  background: "linear-gradient(180deg,var(--bg-3),var(--bg-sunk))",
  borderBottom: "1px solid var(--line)",
};

const FEATURED_TITLE: CSSProperties = {
  fontFamily: "var(--font-display)",
  fontSize: 16,
  textAlign: "center",
  color: "var(--ink)",
  lineHeight: 1.2,
};

const FEATURED_AUTHOR: CSSProperties = {
  padding: "11px 13px",
  fontFamily: "var(--font-ui)",
  fontSize: 11.5,
  color: "var(--ink-mute)",
};

const POLICY_BAND: CSSProperties = {
  border: "1px solid var(--network-line)",
  borderRadius: "var(--r-lg)",
  background: "var(--network-soft)",
  padding: "22px 24px",
  textAlign: "center",
  marginBottom: 30,
};

const POLICY_TITLE: CSSProperties = {
  fontFamily: "var(--font-display)",
  fontSize: 19,
  marginBottom: 8,
};

const POLICY_SUB: CSSProperties = {
  fontFamily: "var(--font-ui)",
  fontSize: 13,
  color: "var(--ink-soft)",
  margin: "0 0 16px",
};

const CTA_ENABLED: CSSProperties = {
  padding: "11px 26px",
  borderRadius: "var(--r-md)",
  background: "var(--accent)",
  color: "var(--accent-ink)",
  fontFamily: "var(--font-ui)",
  fontWeight: 700,
  fontSize: 14,
  border: "none",
  cursor: "pointer",
};

const CTA_DISABLED: CSSProperties = {
  padding: "11px 26px",
  borderRadius: "var(--r-md)",
  background: "var(--bg-3)",
  color: "var(--ink-mute)",
  fontFamily: "var(--font-ui)",
  fontSize: 14,
  cursor: "not-allowed",
  border: "1px solid var(--line)",
};

const FOOTER: CSSProperties = {
  textAlign: "center",
  borderTop: "1px solid var(--line)",
  paddingTop: 22,
};

// ─── Component ─────────────────────────────────────────────────────

export function HubPublicFaceSurface({
  hubName,
  motto,
  traditions,
  establishedAt,
  bannerImageUrl,
  monogram,
  about,
  featured,
  policy,
  viewer,
  footerEpigraph,
  onJoin,
  onOpenFeatured,
  className,
  style,
}: HubPublicFaceSurfaceProps) {
  const titleId = useId();
  const policyCopy = HPF_POLICY_COPY[policy];
  const { label: ctaLabel, disabled: ctaDisabled } = ctaForState(
    policy,
    viewer,
  );

  return (
    <article
      aria-labelledby={titleId}
      className={className}
      data-surface="hub-public-face"
      style={{ ...ROOT, ...style }}
    >
      <header style={{ position: "relative" }}>
        <div
          style={{
            ...HERO_BANNER,
            backgroundImage: bannerImageUrl
              ? `url(${bannerImageUrl})`
              : HERO_BANNER.background as string,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
          aria-hidden="true"
          data-block="banner"
        />
        <div style={HERO_INNER}>
          <div style={HERO_ROW}>
            <span style={MONOGRAM_TILE} aria-hidden="true">
              {monogram}
            </span>
            <div style={{ paddingBottom: 6 }}>
              <h1 id={titleId} style={HUB_TITLE}>
                {hubName}
              </h1>
              {viewer === "member" ? (
                <span style={MEMBER_CHIP} data-chip="member">
                  {HPF_MEMBER_CHIP}
                </span>
              ) : null}
              {viewer === "pending" ? (
                <span style={PENDING_CHIP} data-chip="pending">
                  {HPF_PENDING_CHIP}
                </span>
              ) : null}
            </div>
          </div>
          <p style={MOTTO} data-field="motto">
            {motto}
          </p>
          <div style={META_ROW}>
            {traditions.map((t) => (
              <span
                key={t}
                style={TRADITION_PILL}
                data-pill="tradition"
              >
                {t}
              </span>
            ))}
            <span style={ESTABLISHED} data-field="established">
              {HPF_ESTABLISHED_PREFIX}
              {establishedAt}
            </span>
          </div>
        </div>
      </header>

      <main style={MAIN}>
        <section style={{ marginBottom: 34 }} data-block="about">
          <div style={EYEBROW}>{HPF_ABOUT}</div>
          <p style={ABOUT_BODY} data-field="about">
            {about}
          </p>
        </section>

        {featured.length > 0 ? (
          <section
            style={{ marginBottom: 34 }}
            data-block="featured"
          >
            <div style={EYEBROW}>{HPF_FEATURED}</div>
            <div className="hp-feat" style={FEATURED_GRID}>
              {featured.map((f) => {
                const Tag = f.href ? "a" : "button";
                const props =
                  Tag === "a"
                    ? { href: f.href }
                    : { type: "button" as const };
                return (
                  <Tag
                    key={f.id}
                    {...(props as Record<string, unknown>)}
                    style={
                      Tag === "a"
                        ? FEATURED_CARD
                        : { ...FEATURED_CARD, cursor: "pointer" }
                    }
                    data-feature-id={f.id}
                    onClick={
                      Tag === "button"
                        ? () => onOpenFeatured?.(f.id)
                        : undefined
                    }
                  >
                    <span style={FEATURED_THUMB} aria-hidden="true">
                      <span style={FEATURED_TITLE}>{f.title}</span>
                    </span>
                    <div style={FEATURED_AUTHOR} data-field="author">
                      {f.author}
                    </div>
                  </Tag>
                );
              })}
            </div>
          </section>
        ) : null}

        <section
          style={POLICY_BAND}
          data-block="policy"
          data-policy={policy}
        >
          <div style={POLICY_TITLE} data-field="policy-title">
            {policyCopy.title}
          </div>
          <p style={POLICY_SUB} data-field="policy-subtitle">
            {policyCopy.subtitle}
          </p>
          <button
            type="button"
            disabled={ctaDisabled}
            onClick={() => !ctaDisabled && onJoin?.()}
            data-action="join"
            data-disabled={ctaDisabled}
            style={ctaDisabled ? CTA_DISABLED : CTA_ENABLED}
          >
            {ctaLabel}
          </button>
        </section>

        <footer style={FOOTER} data-block="footer">
          {footerEpigraph ? (
            <div
              style={{
                fontFamily: "var(--font-ui)",
                fontSize: 12,
                color: "var(--ink-soft)",
                marginBottom: 5,
              }}
              data-field="epigraph"
            >
              {footerEpigraph}
            </div>
          ) : null}
          <div
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: 11.5,
              color: "var(--ink-mute)",
            }}
            data-field="agpl-credit"
          >
            {HPF_AGPL_CREDIT}
          </div>
        </footer>
      </main>
    </article>
  );
}
