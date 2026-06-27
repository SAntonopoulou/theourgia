/**
 * HubDiscoverySurface — H08 §S3 Cluster A surface 3.
 *
 * Faithful port of ``Theourgia Hub Discovery.dc.html``. A
 * search-band + 2-col grid of `HubDiscoveryCard`s — every hub
 * that's chosen to appear in the directory.
 *
 * Honesty rules wired (from agent_onboarding_H08.md):
 *
 *   1. **Alphabetical sort is the default; "recently active" is
 *      the only secondary** — NEVER popularity / engagement /
 *      "trending" (rules 18 + 19). The surface does not even
 *      expose a popularity sort; the prop has only two options.
 *   2. **Member counts are QUIET** — small monospace, `--ink-mute`.
 *      No celebratory ring or large number. The H08 supplement
 *      pins this as the rule (rule 9 + 18).
 *   3. **Private hubs explicitly carry "This hub is invitation-
 *      only"** — the CTA renders the disabled state, and the
 *      empty-state copy reinforces it ("many private hubs are
 *      joinable only by invitation").
 *   4. **Public / Open with approval / Private** is the closed
 *      policy enum — same three values as the H08 supplement's
 *      ``MembershipPolicy`` type.
 */

import {
  type CSSProperties,
  type ReactNode,
  useId,
  useMemo,
  useState,
} from "react";

import {
  HD_ALL_TRADITIONS,
  HD_CTA_ALREADY,
  HD_CTA_INVITATION_ONLY,
  HD_CTA_REQUEST,
  HD_EMPTY_BODY,
  HD_EMPTY_TITLE,
  HD_MEMBERS_SUFFIX,
  HD_POLICY_LABELS,
  HD_SEARCH_PLACEHOLDER,
  HD_SUBTITLE,
  HD_TITLE,
  HD_TRADITION_KEYS,
  type MembershipPolicy,
} from "./copy.js";

// ─── Data shape ───────────────────────────────────────────────────

/** Mirror of the H08 supplement's ``Hub`` shape — the subset that
 *  matters on the discovery card. */
export interface HubDiscoveryCard {
  id: string;
  slug: string;
  name: string;
  /** Single-line motto. The .dc.html limits to 120 chars; this
   *  surface respects whatever the caller passes. */
  motto: string;
  /** One or more tradition tags. Rendered as --network pills. */
  traditions: readonly string[];
  policy: MembershipPolicy;
  /** Member count. Quiet stat; never aggregated to a leaderboard. */
  memberCount: number;
  /** True only when the viewer is already a member of this hub —
   *  drives the disabled "Already a member" CTA. */
  isMember?: boolean;
  /** Optional CSS color or gradient for the banner band. When
   *  omitted, falls back to ``var(--network-soft)``. */
  bannerStyle?: string;
}

export type HubDiscoverySort = "alpha" | "recent";

export interface HubDiscoverySurfaceProps {
  /** Every hub visible to the practitioner. The surface filters +
   *  sorts in-memory; large directories should be paginated server-
   *  side before being passed in. */
  hubs: readonly HubDiscoveryCard[];
  /** Initial sort order. Defaults to alpha. The supplement locks
   *  these as the only two options — popularity sort doesn't exist
   *  as an option (rule 19). */
  initialSort?: HubDiscoverySort;
  /** Initial search query (rarely set externally — useful for
   *  shareable links). */
  initialQuery?: string;
  /** Initial active tradition filter ("all" for no filter, or one
   *  of HD_TRADITION_KEYS). */
  initialTradition?: string;
  /** Called when the practitioner clicks "Request to join" on a
   *  PUBLIC or OPEN_WITH_APPROVAL hub. */
  onRequestJoin?: (hubId: string) => void;
  className?: string;
  style?: CSSProperties;
}

// ─── Helpers ──────────────────────────────────────────────────────

function ctaCopyFor(
  policy: MembershipPolicy,
  isMember: boolean,
): string {
  if (isMember) return HD_CTA_ALREADY;
  if (policy === "private") return HD_CTA_INVITATION_ONLY;
  return HD_CTA_REQUEST;
}

function policyChipColor(policy: MembershipPolicy): string {
  // The .dc.html uses --peer-ok for Public (a calm green) and
  // --ink-mute for the other two. Open-with-approval is still a
  // door, but a door with a knock — render in the more muted
  // family so practitioners don't read "Public" as the loudest
  // signal by accident.
  return policy === "public" ? "var(--peer-ok)" : "var(--ink-mute)";
}

// ─── Style atoms ───────────────────────────────────────────────────

const HEADER: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 14,
  padding: "13px 24px",
  borderBottom: "1px solid var(--line)",
  background: "var(--bg)",
};

const MAIN: CSSProperties = {
  overflowY: "auto",
  minHeight: 0,
  padding: "22px 26px 50px",
};

const INNER: CSSProperties = {
  maxWidth: 980,
  margin: "0 auto",
};

const SEARCH_WRAP: CSSProperties = {
  position: "relative",
  marginBottom: 14,
};

const SEARCH_INPUT: CSSProperties = {
  width: "100%",
  padding: "12px 14px 12px 38px",
  border: "1px solid var(--line-2)",
  borderRadius: "var(--r-md)",
  background: "var(--bg-2)",
  color: "var(--ink)",
  fontFamily: "var(--font-ui)",
  fontSize: 14,
};

const TRAD_ROW: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 7,
  overflowX: "auto",
  marginBottom: 22,
};

const TRAD_BASE: CSSProperties = {
  padding: "7px 13px",
  borderRadius: "999px",
  borderWidth: 1,
  borderStyle: "solid",
  borderColor: "var(--line)",
  background: "var(--bg-2)",
  fontFamily: "var(--font-ui)",
  fontSize: 12.5,
  color: "var(--ink-mute)",
  whiteSpace: "nowrap",
  flex: "none",
  textTransform: "capitalize",
  cursor: "pointer",
};

const TRAD_ON: CSSProperties = {
  ...TRAD_BASE,
  color: "var(--ink)",
  background: "var(--network-soft)",
  borderColor: "var(--network)",
};

const GRID: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 16,
};

const CARD: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  border: "1px solid var(--line)",
  borderRadius: "var(--r-lg)",
  background: "var(--bg-2)",
  overflow: "hidden",
};

const BANNER: CSSProperties = {
  height: 84,
  borderBottom: "1px solid var(--line)",
};

const CARD_BODY: CSSProperties = {
  padding: "16px 18px 18px",
};

const CARD_NAME_ROW: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 9,
  flexWrap: "wrap",
  marginBottom: 6,
};

const CARD_NAME: CSSProperties = {
  fontFamily: "var(--font-display)",
  fontSize: 18,
  color: "var(--ink)",
};

const POLICY_CHIP: CSSProperties = {
  padding: "2px 8px",
  border: "1px solid var(--line-2)",
  borderRadius: "999px",
  fontFamily: "var(--font-ui)",
  fontSize: 10.5,
};

const MOTTO: CSSProperties = {
  fontFamily: "var(--font-serif)",
  fontStyle: "italic",
  fontSize: 14.5,
  color: "var(--ink-soft)",
  lineHeight: 1.45,
  margin: "0 0 12px",
};

const TRAD_PILL_ON_CARD: CSSProperties = {
  padding: "2px 9px",
  border: "1px solid var(--network-line)",
  borderRadius: "999px",
  background: "var(--network-soft)",
  fontFamily: "var(--font-ui)",
  fontSize: 11,
  color: "var(--network)",
};

const QUIET_MEMBERS: CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 11,
  color: "var(--ink-mute)",
  marginLeft: "auto",
};

const CTA_ENABLED: CSSProperties = {
  width: "100%",
  padding: 10,
  borderRadius: "var(--r-md)",
  background: "var(--network-soft)",
  color: "var(--ink)",
  fontFamily: "var(--font-ui)",
  fontWeight: 700,
  fontSize: 13,
  border: "1px solid var(--network-line)",
  cursor: "pointer",
};

const CTA_DISABLED: CSSProperties = {
  width: "100%",
  padding: 10,
  borderRadius: "var(--r-md)",
  background: "var(--bg-3)",
  color: "var(--ink-mute)",
  fontFamily: "var(--font-ui)",
  fontSize: 13,
  cursor: "not-allowed",
  border: "1px solid var(--line)",
};

const EMPTY_WRAP: CSSProperties = {
  maxWidth: 480,
  margin: "8vh auto 0",
  textAlign: "center",
};

const EMPTY_TITLE: CSSProperties = {
  fontFamily: "var(--font-display)",
  fontSize: 22,
  margin: "0 0 12px",
};

const EMPTY_BODY: CSSProperties = {
  fontFamily: "var(--font-serif)",
  fontSize: 15,
  lineHeight: 1.6,
  color: "var(--ink-soft)",
  margin: 0,
};

// ─── Glyphs ───────────────────────────────────────────────────────

function SearchGlyph(): ReactNode {
  return (
    <svg
      width={16}
      height={16}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-3.5-3.5" />
    </svg>
  );
}

// ─── Component ─────────────────────────────────────────────────────

export function HubDiscoverySurface({
  hubs,
  initialSort = "alpha",
  initialQuery = "",
  initialTradition = "all",
  onRequestJoin,
  className,
  style,
}: HubDiscoverySurfaceProps) {
  const titleId = useId();
  const [query, setQuery] = useState(initialQuery);
  const [tradition, setTradition] = useState(initialTradition);
  const [sort] = useState<HubDiscoverySort>(initialSort);

  /** Filter then sort. Popularity is intentionally NOT an option
   *  (rule 19). */
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = hubs.filter((h) => {
      if (tradition !== "all") {
        const traditionMatch = h.traditions
          .map((t) => t.toLowerCase())
          .includes(tradition);
        if (!traditionMatch) return false;
      }
      if (q === "") return true;
      const hay = [h.name, h.motto, ...h.traditions]
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
    const sorted = [...filtered];
    if (sort === "alpha") {
      sorted.sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
      );
    }
    // "recent" sort would order by lastActivity if we carried one; the
    // .dc.html doesn't render that data, so we leave it as caller-
    // order for now. The contract is: never popularity.
    return sorted;
  }, [hubs, query, tradition, sort]);

  const showEmpty = visible.length === 0;

  return (
    <section
      aria-labelledby={titleId}
      className={className}
      data-surface="hub-discovery"
      style={{ minWidth: 0, minHeight: 0, ...style }}
    >
      <header style={HEADER}>
        <div style={{ minWidth: 0 }}>
          <h1
            id={titleId}
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 21,
              lineHeight: 1.1,
              margin: 0,
            }}
          >
            {HD_TITLE}
          </h1>
          <div
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: 12.5,
              color: "var(--ink-mute)",
              marginTop: 2,
            }}
          >
            {HD_SUBTITLE}
          </div>
        </div>
      </header>

      <main className="scroll" style={MAIN}>
        <div style={INNER}>
          <div style={SEARCH_WRAP}>
            <span
              style={{
                position: "absolute",
                left: 13,
                top: "50%",
                transform: "translateY(-50%)",
                color: "var(--ink-mute)",
              }}
            >
              <SearchGlyph />
            </span>
            <input
              type="text"
              placeholder={HD_SEARCH_PLACEHOLDER}
              value={query}
              onChange={(e) => setQuery(e.currentTarget.value)}
              data-field="search"
              aria-label={HD_SEARCH_PLACEHOLDER}
              style={SEARCH_INPUT}
            />
          </div>

          <div
            className="scroll"
            style={TRAD_ROW}
            role="group"
            aria-label="Tradition filter"
          >
            <button
              type="button"
              onClick={() => setTradition("all")}
              aria-pressed={tradition === "all"}
              data-filter-tradition="all"
              style={tradition === "all" ? TRAD_ON : TRAD_BASE}
            >
              {HD_ALL_TRADITIONS}
            </button>
            {HD_TRADITION_KEYS.map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setTradition(k)}
                aria-pressed={tradition === k}
                data-filter-tradition={k}
                style={tradition === k ? TRAD_ON : TRAD_BASE}
              >
                {k}
              </button>
            ))}
          </div>

          {showEmpty ? (
            <div style={EMPTY_WRAP} data-state="empty">
              <h2 style={EMPTY_TITLE}>{HD_EMPTY_TITLE}</h2>
              <p style={EMPTY_BODY}>{HD_EMPTY_BODY}</p>
            </div>
          ) : (
            <div
              className="hd-grid"
              style={GRID}
              data-grid="hubs"
            >
              {visible.map((h) => {
                const isMember = !!h.isMember;
                const disabled = isMember || h.policy === "private";
                const cta = ctaCopyFor(h.policy, isMember);
                return (
                  <article
                    key={h.id}
                    style={CARD}
                    data-hub-id={h.id}
                    data-policy={h.policy}
                  >
                    <div
                      style={{
                        ...BANNER,
                        background:
                          h.bannerStyle ?? "var(--network-soft)",
                      }}
                      data-block="banner"
                      aria-hidden="true"
                    />
                    <div style={CARD_BODY}>
                      <div style={CARD_NAME_ROW}>
                        <span style={CARD_NAME} data-field="name">
                          {h.name}
                        </span>
                        <span
                          style={{
                            ...POLICY_CHIP,
                            color: policyChipColor(h.policy),
                          }}
                          data-pill="policy"
                        >
                          {HD_POLICY_LABELS[h.policy]}
                        </span>
                      </div>
                      <p style={MOTTO} data-field="motto">
                        {h.motto}
                      </p>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          flexWrap: "wrap",
                          marginBottom: 14,
                        }}
                      >
                        {h.traditions.map((t) => (
                          <span
                            key={t}
                            style={TRAD_PILL_ON_CARD}
                            data-pill="tradition"
                          >
                            {t}
                          </span>
                        ))}
                        <span
                          style={QUIET_MEMBERS}
                          data-field="members"
                        >
                          {h.memberCount}
                          {HD_MEMBERS_SUFFIX}
                        </span>
                      </div>
                      <button
                        type="button"
                        disabled={disabled}
                        onClick={() =>
                          !disabled && onRequestJoin?.(h.id)
                        }
                        data-action="cta"
                        style={disabled ? CTA_DISABLED : CTA_ENABLED}
                      >
                        {cta}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </section>
  );
}
