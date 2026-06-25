/**
 * PublicationsSurface — H07 §S3 surface 4 (per-vault index).
 *
 * Card grid with filter chips + "+ New publication" picker. The
 * vault owner's home for "everything I've published or am
 * drafting."
 *
 * Honesty rules (H07):
 *   • Withdrawn publications are NOT deleted — soft state, card
 *     opacity 0.5 + "Withdrawn" chip, never `--danger`.
 *   • Purchase count is a quiet stat — `--ink-mute` label, shown
 *     ONLY when state==='live' AND price > 0. No celebration.
 *   • Card state chip uses `--money` for "Live" (sober payment
 *     confirm), `--info` for "Scheduled", `--ink-mute` for drafts
 *     and withdrawn.
 *   • Generated typographic cover when no cover image is supplied
 *     (per the Worked Example point (d) — cover may be absent;
 *     never block on an upload).
 */

import {
  type CSSProperties,
  type ReactElement,
  useMemo,
  useState,
} from "react";

import {
  PUB_EMPTY_BODY,
  PUB_EMPTY_CTA,
  PUB_EMPTY_HEADING,
  PUB_FILTER_LABELS,
  PUB_NEW_CTA,
  PUB_NEW_KINDS,
  PUB_STATE_LABELS,
  PUB_TOPBAR_SUBTITLE,
  PUB_TOPBAR_TITLE,
  type PublicationFilter,
  type PublicationKind,
  type PublicationState,
  formatPrice,
  stateChipColor,
} from "./copy.js";

// ── Wire shapes (lean projection — backend not built; consumer
// supplies these from fixtures until Phase 10 backend ships) ───────

export interface PublicationCardRecord {
  id: string;
  title: string;
  author_label: string;
  kind: PublicationKind;
  state: PublicationState;
  pricing: {
    model: "free" | "one-time" | "pay-what-you-wish" | "subscribe";
    amount_cents?: number | null;
    currency?: string | null;
  };
  purchase_count: number;
  /** When true, surfaces a `‡` citation glyph (CC / PD / etc.). */
  cited: boolean;
  /** Optional cover image URL. When absent, the card renders a
   *  generated typographic cover from the title. */
  cover_url?: string | null;
  created_at: string;
}

const FILTER_ORDER: PublicationFilter[] = [
  "all",
  "drafts",
  "published",
  "paid",
  "free",
  "books",
];

const NEW_KIND_ORDER: PublicationKind[] = ["book", "essay", "post", "page"];

// ── Styles ─────────────────────────────────────────────────────────

const TOPBAR_STYLE: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 16,
  padding: "13px 24px",
  borderBottomWidth: 1,
  borderBottomStyle: "solid",
  borderBottomColor: "var(--line)",
  background: "var(--bg)",
};

const FILTER_ROW: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 7,
  overflowX: "auto",
  padding: "12px 24px",
  borderBottomWidth: 1,
  borderBottomStyle: "solid",
  borderBottomColor: "var(--line)",
  background: "var(--bg)",
};

const MAIN_STYLE: CSSProperties = {
  overflowY: "auto",
  minHeight: 0,
  padding: 24,
};

const GRID_STYLE: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
  gap: 18,
  maxWidth: 1120,
};

const CARD_BASE: CSSProperties = {
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
  cursor: "pointer",
  border: "none",
  textAlign: "left",
  padding: 0,
};

// ── Icons ──────────────────────────────────────────────────────────

function PlusIcon(): ReactElement {
  return (
    <svg
      width={15}
      height={15}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function ChevronDown(): ReactElement {
  return (
    <svg
      width={12}
      height={12}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

function kindIcon(kind: PublicationKind): ReactElement {
  const s = {
    width: 15,
    height: 15,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.5,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };
  switch (kind) {
    case "book":
      return (
        <svg {...s}>
          <path d="M5 4h11l3 3v13H5z" />
          <path d="M9 4v16" />
        </svg>
      );
    case "essay":
      return (
        <svg {...s}>
          <path d="M6 3h12v18H6z" />
          <path d="M9 8h6M9 12h6M9 16h3" />
        </svg>
      );
    case "post":
      return (
        <svg {...s}>
          <rect x={4} y={5} width={16} height={14} rx={2} />
          <path d="M8 10h8M8 14h5" />
        </svg>
      );
    case "page":
    default:
      return (
        <svg {...s}>
          <rect x={5} y={3} width={14} height={18} rx={1.5} />
          <path d="M9 7h6M9 11h6M9 15h4" />
        </svg>
      );
  }
}

function EmptyGlyph(): ReactElement {
  return (
    <svg
      width={30}
      height={30}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.3}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M5 4h9l3 3v13H5z" />
      <path d="M5 7.5h9M9 4v16" />
    </svg>
  );
}

// ── Generated typographic cover ────────────────────────────────────

function TypographicCover({
  title,
  accent,
}: {
  title: string;
  accent: string;
}): ReactElement {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: "100%",
        gap: 8,
      }}
    >
      <div style={{ width: 30, height: 1, background: accent }} />
      <div
        style={{
          fontFamily: "var(--font-display)",
          fontSize: 19,
          lineHeight: 1.15,
          textAlign: "center",
          color: "var(--ink)",
          padding: "0 8px",
        }}
      >
        {title}
      </div>
      <div style={{ width: 30, height: 1, background: accent }} />
    </div>
  );
}

// ── Filtering ──────────────────────────────────────────────────────

function filterMatches(
  pub: PublicationCardRecord,
  filter: PublicationFilter,
): boolean {
  const isPaid =
    pub.pricing.model === "one-time" ||
    pub.pricing.model === "subscribe" ||
    pub.pricing.model === "pay-what-you-wish";
  switch (filter) {
    case "all":
      return true;
    case "drafts":
      return pub.state === "draft";
    case "published":
      return pub.state === "live";
    case "paid":
      return isPaid;
    case "free":
      return !isPaid;
    case "books":
      return pub.kind === "book";
    default:
      return true;
  }
}

// ── Props + component ─────────────────────────────────────────────

export interface PublicationsSurfaceProps {
  publications: readonly PublicationCardRecord[];
  /** Fired when the practitioner picks a kind from the
   *  "+ New publication" menu. */
  onNew?: (kind: PublicationKind) => void;
  /** Fired when the practitioner clicks a card. */
  onSelect?: (id: string) => void;
  className?: string;
  style?: CSSProperties;
}

export function PublicationsSurface({
  publications,
  onNew,
  onSelect,
  className,
  style,
}: PublicationsSurfaceProps) {
  const [filter, setFilter] = useState<PublicationFilter>("all");
  const [newOpen, setNewOpen] = useState(false);

  const filtered = useMemo(
    () => publications.filter((p) => filterMatches(p, filter)),
    [publications, filter],
  );

  const isEmpty = publications.length === 0;

  return (
    <div
      data-component="publications-surface"
      className={className}
      style={{
        display: "grid",
        gridTemplateRows: "auto auto 1fr",
        minWidth: 0,
        minHeight: 0,
        height: "100%",
        ...style,
      }}
    >
      <header style={TOPBAR_STYLE}>
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 21,
              lineHeight: 1.1,
            }}
          >
            {PUB_TOPBAR_TITLE}
          </div>
          <div
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: 12.5,
              color: "var(--ink-mute)",
              marginTop: 2,
            }}
          >
            {PUB_TOPBAR_SUBTITLE}
          </div>
        </div>

        <div
          style={{
            marginLeft: "auto",
            position: "relative",
          }}
        >
          <button
            type="button"
            aria-haspopup="menu"
            aria-expanded={newOpen}
            data-action="open-new"
            onClick={() => setNewOpen((v) => !v)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 7,
              padding: "9px 15px",
              borderRadius: "var(--r-md)",
              background: "var(--accent)",
              color: "var(--accent-ink)",
              fontFamily: "var(--font-ui)",
              fontWeight: 700,
              fontSize: 13,
              border: "none",
              cursor: "pointer",
            }}
          >
            <PlusIcon />
            {PUB_NEW_CTA}
            <ChevronDown />
          </button>
          {newOpen ? (
            <div
              role="menu"
              data-new-menu
              style={{
                position: "absolute",
                top: 44,
                right: 0,
                zIndex: 20,
                minWidth: 170,
                borderWidth: 1,
                borderStyle: "solid",
                borderColor: "var(--line-2)",
                borderRadius: "var(--r-md)",
                background: "var(--bg-2)",
                boxShadow: "0 14px 34px rgba(0,0,0,.45)",
                padding: 6,
              }}
            >
              {NEW_KIND_ORDER.map((k) => (
                <button
                  key={k}
                  type="button"
                  role="menuitem"
                  data-kind={k}
                  onClick={() => {
                    setNewOpen(false);
                    onNew?.(k);
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 9,
                    width: "100%",
                    padding: "9px 11px",
                    borderRadius: "var(--r-sm)",
                    fontFamily: "var(--font-ui)",
                    fontSize: 13.5,
                    color: "var(--ink)",
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  <span
                    aria-hidden="true"
                    style={{ display: "flex", color: "var(--accent)" }}
                  >
                    {kindIcon(k)}
                  </span>
                  {PUB_NEW_KINDS[k]}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </header>

      <div
        className="scroll"
        role="group"
        aria-label="Filter"
        style={FILTER_ROW}
      >
        {FILTER_ORDER.map((f) => {
          const on = filter === f;
          return (
            <button
              key={f}
              type="button"
              aria-pressed={on}
              data-filter={f}
              onClick={() => setFilter(f)}
              style={{
                padding: "7px 13px",
                borderRadius: 20,
                borderWidth: 1,
                borderStyle: "solid",
                borderColor: on ? "var(--accent)" : "var(--line)",
                background: on ? "var(--accent-soft)" : "var(--bg-2)",
                fontFamily: "var(--font-ui)",
                fontSize: 12.5,
                color: on ? "var(--ink)" : "var(--ink-mute)",
                whiteSpace: "nowrap",
                flex: "none",
                cursor: "pointer",
              }}
            >
              {PUB_FILTER_LABELS[f]}
            </button>
          );
        })}
      </div>

      <main className="scroll" style={MAIN_STYLE}>
        {isEmpty ? (
          <div
            data-pubs-empty
            style={{
              maxWidth: 460,
              margin: "9vh auto 0",
              textAlign: "center",
            }}
          >
            <div
              style={{
                width: 66,
                height: 66,
                margin: "0 auto 20px",
                borderRadius: "50%",
                borderWidth: 1,
                borderStyle: "solid",
                borderColor: "var(--line-2)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--ink-mute)",
              }}
            >
              <EmptyGlyph />
            </div>
            <h2
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 24,
                margin: "0 0 12px",
              }}
            >
              {PUB_EMPTY_HEADING}
            </h2>
            <p
              style={{
                fontFamily: "var(--font-serif)",
                fontSize: 15.5,
                lineHeight: 1.6,
                color: "var(--ink-soft)",
                margin: "0 0 24px",
              }}
            >
              {PUB_EMPTY_BODY}
            </p>
            <button
              type="button"
              data-action="empty-start"
              onClick={() => onNew?.("essay")}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "11px 22px",
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
              {PUB_EMPTY_CTA}
            </button>
          </div>
        ) : (
          <div data-pubs-grid style={GRID_STYLE}>
            {filtered.map((p) => {
              const chip = stateChipColor(p.state);
              const price = formatPrice(p.pricing);
              const showCount =
                p.state === "live" && price.isPaid && p.purchase_count > 0;
              const opacity = p.state === "withdrawn" ? 0.5 : 1;
              return (
                <button
                  key={p.id}
                  type="button"
                  data-pub-id={p.id}
                  data-pub-state={p.state}
                  onClick={() => onSelect?.(p.id)}
                  style={{
                    ...CARD_BASE,
                    opacity,
                    background: "var(--bg-2)",
                  }}
                >
                  <div
                    style={{
                      aspectRatio: "3/4",
                      position: "relative",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      padding: 18,
                      background:
                        "linear-gradient(180deg, var(--bg-3), var(--bg-sunk))",
                      borderBottomWidth: 1,
                      borderBottomStyle: "solid",
                      borderBottomColor: "var(--line)",
                    }}
                  >
                    {p.cover_url ? (
                      <img
                        src={p.cover_url}
                        alt=""
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                          position: "absolute",
                          inset: 0,
                        }}
                      />
                    ) : (
                      <TypographicCover
                        title={p.title}
                        accent="var(--accent)"
                      />
                    )}
                    <span
                      style={{
                        position: "absolute",
                        top: 10,
                        left: 10,
                        display: "inline-flex",
                        alignItems: "center",
                        padding: "3px 9px",
                        borderRadius: 20,
                        background: "rgba(0,0,0,.35)",
                        fontFamily: "var(--font-ui)",
                        fontSize: 10,
                        letterSpacing: "0.05em",
                        color: "#fff",
                      }}
                    >
                      {PUB_NEW_KINDS[p.kind]}
                    </span>
                    {p.cited ? (
                      <span
                        title="Citation present (CC / PD / etc.)"
                        aria-label="Cited"
                        style={{
                          position: "absolute",
                          top: 10,
                          right: 10,
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          width: 18,
                          height: 18,
                          borderRadius: 4,
                          background: "var(--accent-soft)",
                          color: "var(--accent)",
                          fontFamily: "var(--font-glyph)",
                          fontSize: 11,
                        }}
                      >
                        ‡
                      </span>
                    ) : null}
                  </div>
                  <div style={{ padding: "13px 14px 15px" }}>
                    <div
                      style={{
                        fontFamily: "var(--font-display)",
                        fontSize: 16,
                        lineHeight: 1.2,
                        color: "var(--ink)",
                        marginBottom: 3,
                      }}
                    >
                      {p.title}
                    </div>
                    <div
                      style={{
                        fontFamily: "var(--font-ui)",
                        fontSize: 11.5,
                        color: "var(--ink-mute)",
                        marginBottom: 10,
                      }}
                    >
                      {p.author_label}
                    </div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        flexWrap: "wrap",
                      }}
                    >
                      <span
                        data-state-chip={p.state}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 5,
                          padding: "2px 9px",
                          borderWidth: 1,
                          borderStyle: "solid",
                          borderColor: chip.border,
                          borderRadius: 20,
                          fontFamily: "var(--font-ui)",
                          fontSize: 10.5,
                          color: chip.color,
                        }}
                      >
                        {PUB_STATE_LABELS[p.state]}
                      </span>
                      <span
                        data-price
                        style={{
                          fontFamily: "var(--font-ui)",
                          fontSize: 12,
                          color: price.isPaid
                            ? "var(--money)"
                            : "var(--ink-soft)",
                        }}
                      >
                        {price.label}
                      </span>
                      {showCount ? (
                        <span
                          data-purchase-count
                          style={{
                            marginLeft: "auto",
                            fontFamily: "var(--font-mono)",
                            fontSize: 11,
                            color: "var(--ink-mute)",
                          }}
                        >
                          {p.purchase_count} purchased
                        </span>
                      ) : null}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
