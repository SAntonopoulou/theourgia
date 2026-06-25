/**
 * PublicVaultPageSurface — H07 §S3 surface 12 (PUBLIC, no VaultNav).
 *
 * The outward face of a vault. Hero (sigil + magickal name +
 * pronouns + bio + links) above a tab cluster: Publications ·
 * Newsletter · Support. Public surface — no app chrome beyond a
 * minimal theme/mode strip and the AGPLv3 footer credit.
 *
 * Honesty rules (H07 §S3 #12):
 *   • PUBLIC: no VaultNav. The page is what a non-Theourgia
 *     visitor lands on.
 *   • "Popular" sort on the Publications tab is OPT-IN per the
 *     vault's settings — default is Newest with no Popular
 *     option in the picker (this surface accepts `popular_sort_opt_in`
 *     to gate it).
 *   • Newsletter signup is DOUBLE-OPT-IN — the form acknowledges
 *     submission with "Check your email to confirm — you're not
 *     subscribed until you do."
 *   • Tier cards on Support use --money for prices; primary tier
 *     accent is --money-line border.
 *   • Footer: license + AGPLv3 credit (the project's licensing
 *     ethos surfaces on every public page).
 */

import {
  type CSSProperties,
  type ReactElement,
  useState,
} from "react";

// ── Types ──────────────────────────────────────────────────────────

export interface PublicVaultPublication {
  id: string;
  title: string;
  href: string;
  /** Display price, e.g. "$18.00" / "Free" / "Subscribers". */
  price_label: string;
  /** When true, price renders --money; false renders --ink-mute. */
  is_paid: boolean;
  /** When true, the `‡` glyph appears (CC / PD / etc.). */
  cited: boolean;
  /** ISO timestamp for sorting; the surface uses it ad hoc. */
  published_at: string;
}

export interface PublicVaultNewsletterIssue {
  id: string;
  title: string;
  date_label: string;
  href?: string;
}

export interface PublicVaultTier {
  id: string;
  name: string;
  /** Display monthly price (the consumer formats from cents). */
  monthly_label: string;
  description: string;
  /** When true, this tier is highlighted as the recommended pick. */
  is_primary: boolean;
  subscribe_href: string;
}

export interface PublicVaultPageRecord {
  /** Display label shown in the hero (magickal name preferred). */
  display_name: string;
  pronouns?: string | null;
  /** Optional one-paragraph bio. */
  bio?: string | null;
  /** External links — website, mastodon, etc. */
  links: { label: string; href: string }[];
  /** License label shown in the footer. */
  license_label: string;
  /** When false, the Publications sort picker hides the "Popular"
   *  option. Defaults to false (the H07 rule §S3 #12 default). */
  popular_sort_opt_in: boolean;
}

export type PublicVaultTab = "publications" | "newsletter" | "support";

export interface PublicVaultPageSurfaceProps {
  vault: PublicVaultPageRecord;
  publications: readonly PublicVaultPublication[];
  /** Newsletter copy + the recent-issues list. */
  newsletter: {
    title: string;
    description: string;
    recent_issues: readonly PublicVaultNewsletterIssue[];
  };
  tiers: readonly PublicVaultTier[];
  /** Tip-jar option (Pricing surface enabled it). null hides. */
  tip_jar_href?: string | null;
  /** Fired when the practitioner signs up — the consumer POSTs to
   *  /api/v1/public/{vault}/newsletter/signup which then triggers
   *  the double-opt-in confirmation email. */
  onNewsletterSignup?: (email: string) => void;
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

const HERO: CSSProperties = {
  maxWidth: 760,
  margin: "0 auto",
  padding: "80px 28px 40px",
  textAlign: "center",
};

const TABS: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 4,
  borderBottomWidth: 1,
  borderBottomStyle: "solid",
  borderBottomColor: "var(--line)",
  position: "sticky",
  top: 0,
  background: "var(--bg)",
  zIndex: 5,
};

const TAB_BASE: CSSProperties = {
  padding: "14px 18px",
  fontFamily: "var(--font-ui)",
  fontSize: 14,
  color: "var(--ink-mute)",
  background: "transparent",
  border: "none",
  borderBottomWidth: 2,
  borderBottomStyle: "solid",
  borderBottomColor: "transparent",
  cursor: "pointer",
};

const TAB_ACTIVE: CSSProperties = {
  ...TAB_BASE,
  color: "var(--ink)",
  borderBottomColor: "var(--accent)",
};

const MAIN: CSSProperties = {
  maxWidth: 900,
  margin: "0 auto",
  padding: "36px 28px 80px",
};

const FOOTER: CSSProperties = {
  borderTopWidth: 1,
  borderTopStyle: "solid",
  borderTopColor: "var(--line)",
  padding: 26,
  textAlign: "center",
  fontFamily: "var(--font-ui)",
  fontSize: 11.5,
  color: "var(--ink-mute)",
};

// ── Icons ─────────────────────────────────────────────────────────

function ChevronDown(): ReactElement {
  return (
    <svg
      width={12}
      height={12}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

// ── Surface ───────────────────────────────────────────────────────

export function PublicVaultPageSurface({
  vault,
  publications,
  newsletter,
  tiers,
  tip_jar_href,
  onNewsletterSignup,
  className,
  style,
}: PublicVaultPageSurfaceProps) {
  const [tab, setTab] = useState<PublicVaultTab>("publications");
  const [sortKey, setSortKey] = useState<"newest" | "oldest" | "popular">(
    "newest",
  );
  const [signupEmail, setSignupEmail] = useState("");
  const [signupSubmitted, setSignupSubmitted] = useState(false);

  const sortedPubs = [...publications].sort((a, b) => {
    if (sortKey === "newest") {
      return b.published_at.localeCompare(a.published_at);
    }
    if (sortKey === "oldest") {
      return a.published_at.localeCompare(b.published_at);
    }
    // popular — surface does not have a real "popular" signal; preserve
    // input order as a stable fallback when opted-in.
    return 0;
  });

  function submitSignup() {
    const email = signupEmail.trim();
    if (email === "") return;
    onNewsletterSignup?.(email);
    setSignupSubmitted(true);
    setSignupEmail("");
  }

  const TABS_DEF: { kind: PublicVaultTab; label: string }[] = [
    { kind: "publications", label: "Publications" },
    { kind: "newsletter", label: "Newsletter" },
    { kind: "support", label: "Support" },
  ];

  return (
    <div
      data-component="public-vault-page-surface"
      className={className}
      style={{ ...ROOT, ...style }}
    >
      {/* Hero */}
      <header data-public-hero style={HERO}>
        <div
          aria-hidden="true"
          style={{
            width: 60,
            height: 60,
            margin: "0 auto 22px",
            borderRadius: "50%",
            borderWidth: 1,
            borderStyle: "solid",
            borderColor: "var(--accent)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <span
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 26,
              color: "var(--accent)",
            }}
          >
            Θ
          </span>
        </div>
        <h1
          data-vault-name
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 42,
            lineHeight: 1.1,
            margin: "0 0 8px",
          }}
        >
          {vault.display_name}
        </h1>
        {vault.pronouns ? (
          <div
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: 13,
              color: "var(--ink-mute)",
              marginBottom: 18,
            }}
          >
            {vault.pronouns}
          </div>
        ) : null}
        {vault.bio ? (
          <p
            data-vault-bio
            style={{
              fontFamily: "var(--font-serif)",
              fontSize: 18,
              lineHeight: 1.6,
              color: "var(--ink-soft)",
              maxWidth: 560,
              margin: "0 auto 18px",
            }}
          >
            {vault.bio}
          </p>
        ) : null}
        {vault.links.length > 0 ? (
          <div
            data-vault-links
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 16,
              fontFamily: "var(--font-ui)",
              fontSize: 13,
            }}
          >
            {vault.links.map((l) => (
              <a
                key={l.href}
                href={l.href}
                style={{ color: "var(--accent)", textDecoration: "none" }}
              >
                {l.label} ↗
              </a>
            ))}
          </div>
        ) : null}
      </header>

      {/* Tabs */}
      <nav aria-label="Vault sections" style={TABS}>
        {TABS_DEF.map((t) => {
          const on = tab === t.kind;
          return (
            <button
              key={t.kind}
              type="button"
              aria-current={on ? "page" : undefined}
              data-tab={t.kind}
              onClick={() => setTab(t.kind)}
              style={on ? TAB_ACTIVE : TAB_BASE}
            >
              {t.label}
            </button>
          );
        })}
      </nav>

      <main style={MAIN}>
        {tab === "publications" ? (
          <div data-tab-content="publications">
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "flex-end",
                marginBottom: 18,
              }}
            >
              <div style={{ position: "relative" }}>
                <select
                  value={sortKey}
                  onChange={(e) =>
                    setSortKey(
                      e.target.value as "newest" | "oldest" | "popular",
                    )
                  }
                  data-publications-sort
                  aria-label="Sort publications"
                  style={{
                    padding: "8px 32px 8px 12px",
                    borderWidth: 1,
                    borderStyle: "solid",
                    borderColor: "var(--line-2)",
                    borderRadius: "var(--r-md)",
                    background: "var(--bg-2)",
                    color: "var(--ink-soft)",
                    fontFamily: "var(--font-ui)",
                    fontSize: 13,
                    appearance: "none",
                  }}
                >
                  <option value="newest">Newest</option>
                  <option value="oldest">Oldest</option>
                  {vault.popular_sort_opt_in ? (
                    <option value="popular">Popular</option>
                  ) : null}
                </select>
                <span
                  style={{
                    position: "absolute",
                    right: 11,
                    top: "50%",
                    transform: "translateY(-50%)",
                    pointerEvents: "none",
                    color: "var(--ink-mute)",
                  }}
                  aria-hidden="true"
                >
                  <ChevronDown />
                </span>
              </div>
            </div>
            <div
              className="pv-grid"
              data-publications-grid
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fill, minmax(200px, 1fr))",
                gap: 18,
              }}
            >
              {sortedPubs.map((p) => (
                <a
                  key={p.id}
                  href={p.href}
                  data-pub-id={p.id}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    borderWidth: 1,
                    borderStyle: "solid",
                    borderColor: "var(--line)",
                    borderRadius: "var(--r-lg)",
                    background: "var(--bg-2)",
                    overflow: "hidden",
                    textDecoration: "none",
                    color: "inherit",
                  }}
                >
                  <div
                    style={{
                      aspectRatio: "3/4",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 8,
                      padding: 16,
                      background:
                        "linear-gradient(180deg, var(--bg-3), var(--bg-sunk))",
                      borderBottomWidth: 1,
                      borderBottomStyle: "solid",
                      borderBottomColor: "var(--line)",
                    }}
                  >
                    <div
                      style={{
                        width: 26,
                        height: 1,
                        background: "var(--accent)",
                      }}
                    />
                    <div
                      style={{
                        fontFamily: "var(--font-display)",
                        fontSize: 18,
                        lineHeight: 1.15,
                        textAlign: "center",
                        color: "var(--ink)",
                      }}
                    >
                      {p.title}
                    </div>
                    <div
                      style={{
                        width: 26,
                        height: 1,
                        background: "var(--accent)",
                      }}
                    />
                  </div>
                  <div style={{ padding: "12px 14px" }}>
                    <div
                      style={{
                        fontFamily: "var(--font-ui)",
                        fontSize: 12.5,
                        color: p.is_paid
                          ? "var(--money)"
                          : "var(--ink-mute)",
                        display: "flex",
                        alignItems: "center",
                        gap: 7,
                      }}
                    >
                      {p.price_label}
                      {p.cited ? (
                        <span
                          aria-hidden="true"
                          style={{
                            fontFamily: "var(--font-glyph)",
                            color: "var(--accent)",
                          }}
                        >
                          ‡
                        </span>
                      ) : null}
                    </div>
                  </div>
                </a>
              ))}
            </div>
          </div>
        ) : null}

        {tab === "newsletter" ? (
          <div data-tab-content="newsletter">
            <div style={{ maxWidth: 480, margin: "0 auto" }}>
              <h2
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: 24,
                  margin: "0 0 6px",
                  textAlign: "center",
                }}
              >
                {newsletter.title}
              </h2>
              <p
                style={{
                  fontFamily: "var(--font-serif)",
                  fontSize: 15,
                  color: "var(--ink-soft)",
                  textAlign: "center",
                  lineHeight: 1.6,
                  margin: "0 0 22px",
                }}
              >
                {newsletter.description}
              </p>
              {signupSubmitted ? (
                <div
                  data-signup-acknowledged
                  style={{
                    padding: "12px 14px",
                    borderRadius: "var(--r-md)",
                    background: "var(--money-soft)",
                    color: "var(--ink)",
                    fontFamily: "var(--font-ui)",
                    fontSize: 13,
                    textAlign: "center",
                    marginBottom: 18,
                  }}
                  role="status"
                >
                  Check your email to confirm — you're not subscribed
                  until you do.
                </div>
              ) : (
                <>
                  <div
                    style={{
                      display: "flex",
                      gap: 8,
                      marginBottom: 10,
                    }}
                  >
                    <input
                      type="email"
                      value={signupEmail}
                      onChange={(e) => setSignupEmail(e.target.value)}
                      placeholder="your@email.com"
                      data-signup-email
                      aria-label="Email"
                      style={{
                        flex: 1,
                        padding: "12px 14px",
                        borderWidth: 1,
                        borderStyle: "solid",
                        borderColor: "var(--line-2)",
                        borderRadius: "var(--r-md)",
                        background: "var(--bg-2)",
                        color: "var(--ink)",
                        fontFamily: "var(--font-ui)",
                        fontSize: 14,
                      }}
                    />
                    <button
                      type="button"
                      onClick={submitSignup}
                      data-signup-submit
                      style={{
                        padding: "12px 20px",
                        borderRadius: "var(--r-md)",
                        background: "var(--accent)",
                        color: "var(--accent-ink)",
                        fontFamily: "var(--font-ui)",
                        fontWeight: 700,
                        fontSize: 14,
                        border: "none",
                        cursor: "pointer",
                      }}
                    >
                      Subscribe
                    </button>
                  </div>
                  <p
                    data-double-opt-in-disclaimer
                    style={{
                      fontFamily: "var(--font-ui)",
                      fontSize: 11.5,
                      color: "var(--ink-mute)",
                      textAlign: "center",
                      margin: "0 0 30px",
                    }}
                  >
                    After you sign up, check your email to confirm — you're
                    not subscribed until you do.
                  </p>
                </>
              )}
              <div
                style={{
                  fontFamily: "var(--font-ui)",
                  fontSize: 10.5,
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  color: "var(--ink-mute)",
                  marginBottom: 12,
                }}
              >
                Recent issues
              </div>
              <div
                data-recent-issues
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 2,
                }}
              >
                {newsletter.recent_issues.slice(0, 5).map((issue) => (
                  <div
                    key={issue.id}
                    data-issue-id={issue.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: "11px 2px",
                      borderBottomWidth: 1,
                      borderBottomStyle: "solid",
                      borderBottomColor: "var(--line)",
                    }}
                  >
                    <span
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: 11.5,
                        color: "var(--ink-mute)",
                        width: 90,
                        flex: "none",
                      }}
                    >
                      {issue.date_label}
                    </span>
                    <span
                      style={{
                        flex: 1,
                        fontFamily: "var(--font-display)",
                        fontSize: 15,
                        color: "var(--ink)",
                      }}
                    >
                      {issue.title}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : null}

        {tab === "support" ? (
          <div data-tab-content="support">
            <div
              data-tiers-grid
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(220px, 1fr))",
                gap: 16,
                maxWidth: 760,
                margin: "0 auto",
              }}
            >
              {tiers.map((t) => (
                <div
                  key={t.id}
                  data-tier-id={t.id}
                  style={{
                    borderWidth: 1,
                    borderStyle: "solid",
                    borderColor: t.is_primary
                      ? "var(--money-line)"
                      : "var(--line)",
                    borderRadius: "var(--r-lg)",
                    background: "var(--bg-2)",
                    padding: "22px 20px",
                    textAlign: "center",
                  }}
                >
                  <div
                    style={{
                      fontFamily: "var(--font-display)",
                      fontSize: 20,
                      marginBottom: 8,
                    }}
                  >
                    {t.name}
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "baseline",
                      justifyContent: "center",
                      gap: 3,
                      marginBottom: 14,
                    }}
                  >
                    <span
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: 26,
                        color: "var(--money)",
                      }}
                    >
                      {t.monthly_label}
                    </span>
                    <span
                      style={{
                        fontFamily: "var(--font-ui)",
                        fontSize: 12,
                        color: "var(--ink-mute)",
                      }}
                    >
                      /mo
                    </span>
                  </div>
                  <p
                    style={{
                      fontFamily: "var(--font-serif)",
                      fontSize: 14,
                      lineHeight: 1.5,
                      color: "var(--ink-soft)",
                      margin: "0 0 18px",
                    }}
                  >
                    {t.description}
                  </p>
                  <a
                    href={t.subscribe_href}
                    data-subscribe-href={t.id}
                    style={{
                      display: "block",
                      width: "100%",
                      padding: 11,
                      borderRadius: "var(--r-md)",
                      background: t.is_primary
                        ? "var(--accent)"
                        : "transparent",
                      color: t.is_primary
                        ? "var(--accent-ink)"
                        : "var(--ink)",
                      borderWidth: 1,
                      borderStyle: "solid",
                      borderColor: t.is_primary
                        ? "var(--money-line)"
                        : "var(--line)",
                      fontFamily: "var(--font-ui)",
                      fontWeight: 700,
                      fontSize: 13.5,
                      textDecoration: "none",
                      textAlign: "center",
                      boxSizing: "border-box",
                    }}
                  >
                    Subscribe
                  </a>
                </div>
              ))}
            </div>
            {tip_jar_href ? (
              <div
                style={{
                  textAlign: "center",
                  marginTop: 24,
                  fontFamily: "var(--font-ui)",
                  fontSize: 13,
                  color: "var(--ink-mute)",
                }}
              >
                Or{" "}
                <a
                  href={tip_jar_href}
                  data-tip-jar
                  style={{ color: "var(--accent)" }}
                >
                  leave a one-time tip
                </a>{" "}
                if a subscription doesn't fit.
              </div>
            ) : null}
          </div>
        ) : null}
      </main>

      {/* Footer */}
      <footer data-vault-footer style={FOOTER}>
        Hosted on Theourgia · AGPLv3 ·{" "}
        <span style={{ color: "var(--ink-soft)" }}>
          {vault.license_label}
        </span>
      </footer>
    </div>
  );
}
