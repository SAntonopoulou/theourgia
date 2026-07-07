/**
 * SubscribersSurface — H07 §S3 surface 10.
 *
 * Honesty rules (H07 §S2.1 + §S3 #10):
 *   • Quiet stats (4 cards) — no celebration even when high.
 *   • Failed-payment subscribers are `--warn`, NEVER `--danger`.
 *     The surface reports state; Stripe drives dunning.
 *   • Footer `‡` chip: "Subscriber data is in your Stripe account —
 *     Theourgia does not retain payment data beyond webhook events."
 *   • Per-row kebab menu hands off to the Stripe portal for refund
 *     + customer management — NEVER inline (rule §S2.2).
 *   • Active subscribers use --money for the pill (sober payment
 *     confirm).
 */

import {
  type CSSProperties,
  type ReactElement,
  useMemo,
  useState,
} from "react";

// ── Types ──────────────────────────────────────────────────────────

export type SubscriberStatus =
  | "active"
  | "paused"
  | "cancelled"
  | "failed";

export interface SubscriberRow {
  id: string;
  /** Email OR magickal name if linked to a Theourgia vault. */
  identity_label: string;
  tier_label: string;
  active_since: string;
  status: SubscriberStatus;
  stripe_customer_url?: string | null;
  /** When true, the subscriber is flagged as a test in Stripe + is
   *  EXCLUDED from MRR / lifetime / churn quiet stats. */
  is_test: boolean;
}

export interface SubscribersStats {
  active_count: number;
  /** Integer cents. */
  monthly_recurring_revenue_cents: number;
  lifetime_revenue_cents: number;
  /** Rolling 30-day, percentage as a number (e.g. 2.1). */
  churn_30d_percent: number;
}

export type SubscriberFilter =
  | "all"
  | "active"
  | "paused"
  | "cancelled"
  | "failed";

export interface SubscribersSurfaceProps {
  stats: SubscribersStats;
  subscribers: readonly SubscriberRow[];
  /** Caller's currency for the MRR + lifetime stats. Defaults USD. */
  currency?: string;
  onRowAction?: (
    id: string,
    action: "view-stripe" | "refund" | "toggle-test",
  ) => void;
  className?: string;
  style?: CSSProperties;
}

// ── Helpers ───────────────────────────────────────────────────────

function formatCents(cents: number, currency: string): string {
  const symbol =
    currency === "USD" || currency === "CAD" || currency === "AUD"
      ? "$"
      : currency === "EUR"
        ? "€"
        : currency === "GBP"
          ? "£"
          : currency === "JPY"
            ? "¥"
            : "";
  if (currency === "JPY") return `${symbol}${Math.round(cents / 100)}`;
  const value = cents / 100;
  return `${symbol}${value.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
}

function statusChip(status: SubscriberStatus): {
  label: string;
  color: string;
  background: string;
  border: string;
} {
  switch (status) {
    case "active":
      return {
        label: "Active",
        color: "var(--money)",
        background: "var(--money-soft)",
        border: "var(--money-line)",
      };
    case "failed":
      return {
        label: "Failed payment",
        color: "var(--warn)",
        background: "var(--warn-soft)",
        border: "var(--warn-border)",
      };
    case "paused":
    case "cancelled":
    default:
      return {
        label: status === "paused" ? "Paused" : "Cancelled",
        color: "var(--ink-mute)",
        background: "transparent",
        border: "var(--line)",
      };
  }
}

const FILTER_LABELS: Record<SubscriberFilter, string> = {
  all: "All",
  active: "Active",
  paused: "Paused",
  cancelled: "Cancelled",
  failed: "Failed payment",
};

const FILTERS: SubscriberFilter[] = [
  "all",
  "active",
  "paused",
  "cancelled",
  "failed",
];

// ── Icons ─────────────────────────────────────────────────────────

function KebabIcon(): ReactElement {
  return (
    <svg
      width={16}
      height={16}
      viewBox="0 0 24 24"
      fill="currentColor"
      stroke="none"
      aria-hidden="true"
    >
      <circle cx={12} cy={5} r={1.6} />
      <circle cx={12} cy={12} r={1.6} />
      <circle cx={12} cy={19} r={1.6} />
    </svg>
  );
}

// ── Styles ────────────────────────────────────────────────────────

const MAIN_WRAP: CSSProperties = {
  maxWidth: 1000,
  margin: "0 auto",
  padding: "40px 26px 80px",
};

const H1: CSSProperties = {
  fontFamily: "var(--font-display)",
  fontSize: 28,
  margin: "0 0 4px",
};

const SUB: CSSProperties = {
  fontFamily: "var(--font-ui)",
  fontSize: 13,
  color: "var(--ink-mute)",
  margin: "0 0 30px",
};

const STATS_GRID: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(4, 1fr)",
  gap: 14,
  marginBottom: 26,
};

const STAT_CARD: CSSProperties = {
  borderWidth: 1,
  borderStyle: "solid",
  borderColor: "var(--line)",
  borderRadius: "var(--r-lg)",
  background: "var(--bg-2)",
  padding: 18,
};

// ── Surface ───────────────────────────────────────────────────────

export function SubscribersSurface({
  stats,
  subscribers,
  currency = "USD",
  onRowAction,
  className,
  style,
}: SubscribersSurfaceProps) {
  const [filter, setFilter] = useState<SubscriberFilter>("all");
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  const visible = useMemo(() => {
    if (filter === "all") return subscribers;
    return subscribers.filter((s) => s.status === filter);
  }, [subscribers, filter]);

  return (
    <div
      data-component="subscribers-surface"
      className={className}
      style={{
        display: "grid",
        gridTemplateRows: "1fr",
        minWidth: 0,
        minHeight: 0,
        height: "100%",
        overflowY: "auto",
        ...style,
      }}
    >
      <div className="scroll" style={{ overflowY: "auto" }}>
        <div style={MAIN_WRAP}>
          <h1 style={H1}>Subscribers</h1>
          <p style={SUB}>
            Who supports the practice — sober, observational. Refunds
            and customer management happen in your Stripe portal.
          </p>

          {/* Quiet stats */}
          <div data-stats className="sb-stats" style={STATS_GRID}>
            {(
              [
                {
                  key: "active_count",
                  label: "Active subscribers",
                  value: stats.active_count.toLocaleString(),
                },
                {
                  key: "mrr",
                  label: "Monthly recurring revenue",
                  value: formatCents(
                    stats.monthly_recurring_revenue_cents,
                    currency,
                  ),
                },
                {
                  key: "lifetime",
                  label: "Lifetime revenue",
                  value: formatCents(
                    stats.lifetime_revenue_cents,
                    currency,
                  ),
                },
                {
                  key: "churn",
                  label: "Churn · rolling 30 days",
                  value: `${stats.churn_30d_percent.toFixed(1)}%`,
                },
              ] as const
            ).map((s) => (
              <div key={s.key} data-stat={s.key} style={STAT_CARD}>
                <div
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: 28,
                    lineHeight: 1,
                    color: "var(--ink)",
                  }}
                >
                  {s.value}
                </div>
                <div
                  style={{
                    fontFamily: "var(--font-ui)",
                    fontSize: 11.5,
                    color: "var(--ink-mute)",
                    marginTop: 6,
                  }}
                >
                  {s.label}
                </div>
              </div>
            ))}
          </div>

          {/* Filter chips */}
          <div
            className="scroll"
            role="group"
            aria-label="Subscribers filter"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 7,
              overflowX: "auto",
              marginBottom: 14,
            }}
          >
            {FILTERS.map((f) => {
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
                  {FILTER_LABELS[f]}
                </button>
              );
            })}
          </div>

          {/* Table */}
          <div
            data-subscribers-table
            style={{
              borderWidth: 1,
              borderStyle: "solid",
              borderColor: "var(--line)",
              borderRadius: "var(--r-lg)",
              overflow: "hidden",
            }}
          >
            <div
              role="row"
              style={{
                display: "grid",
                gridTemplateColumns: "2fr 1fr 1fr 1fr 40px",
                background: "var(--bg-3)",
                fontFamily: "var(--font-ui)",
                fontSize: 10.5,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                color: "var(--ink-mute)",
              }}
            >
              <span style={{ padding: "11px 16px" }}>Subscriber</span>
              <span style={{ padding: "11px 12px" }}>Tier</span>
              <span style={{ padding: "11px 12px" }}>Active since</span>
              <span style={{ padding: "11px 12px" }}>Status</span>
              <span />
            </div>
            {visible.map((row) => {
              const chip = statusChip(row.status);
              return (
                <div
                  key={row.id}
                  role="row"
                  data-subscriber-id={row.id}
                  data-subscriber-status={row.status}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "2fr 1fr 1fr 1fr 40px",
                    borderTopWidth: 1,
                    borderTopStyle: "solid",
                    borderTopColor: "var(--line)",
                    alignItems: "center",
                  }}
                >
                  <span
                    style={{
                      padding: "13px 16px",
                      fontFamily: "var(--font-serif)",
                      fontSize: 14.5,
                      color: "var(--ink)",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {row.identity_label}
                  </span>
                  <span
                    style={{
                      padding: "13px 12px",
                      fontFamily: "var(--font-ui)",
                      fontSize: 13,
                      color: "var(--ink-soft)",
                    }}
                  >
                    {row.tier_label}
                  </span>
                  <span
                    style={{
                      padding: "13px 12px",
                      fontFamily: "var(--font-mono)",
                      fontSize: 12,
                      color: "var(--ink-mute)",
                    }}
                  >
                    {row.active_since}
                  </span>
                  <span style={{ padding: "13px 12px" }}>
                    <span
                      data-status-chip={row.status}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        padding: "3px 10px",
                        borderWidth: 1,
                        borderStyle: "solid",
                        borderColor: chip.border,
                        borderRadius: 20,
                        background: chip.background,
                        fontFamily: "var(--font-ui)",
                        fontSize: 11,
                        color: chip.color,
                      }}
                    >
                      {chip.label}
                    </span>
                  </span>
                  <span
                    style={{ padding: "0 8px", position: "relative" }}
                  >
                    <button
                      type="button"
                      aria-label="Subscriber actions"
                      data-row-kebab={row.id}
                      onClick={() =>
                        setOpenMenu((m) => (m === row.id ? null : row.id))
                      }
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: "var(--r-sm)",
                        color: "var(--ink-mute)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        background: "transparent",
                        border: "none",
                        cursor: "pointer",
                      }}
                    >
                      <KebabIcon />
                    </button>
                    {openMenu === row.id ? (
                      <div
                        role="menu"
                        data-row-menu
                        style={{
                          position: "absolute",
                          top: 30,
                          right: 8,
                          zIndex: 10,
                          minWidth: 220,
                          borderWidth: 1,
                          borderStyle: "solid",
                          borderColor: "var(--line-2)",
                          borderRadius: "var(--r-md)",
                          background: "var(--bg-2)",
                          boxShadow: "0 14px 34px rgba(0,0,0,.45)",
                          padding: 6,
                        }}
                      >
                        {(
                          [
                            {
                              action: "view-stripe",
                              label: "View Stripe customer",
                            },
                            {
                              action: "refund",
                              label: "Manually refund (Stripe portal)",
                            },
                            {
                              action: "toggle-test",
                              label: row.is_test
                                ? "Unmark as test subscriber"
                                : "Mark as test subscriber",
                            },
                          ] as const
                        ).map((opt) => (
                          <button
                            key={opt.action}
                            type="button"
                            role="menuitem"
                            data-row-action={opt.action}
                            onClick={() => {
                              setOpenMenu(null);
                              onRowAction?.(row.id, opt.action);
                            }}
                            style={{
                              display: "block",
                              width: "100%",
                              padding: "8px 11px",
                              borderRadius: "var(--r-sm)",
                              fontFamily: "var(--font-ui)",
                              fontSize: 13,
                              color: "var(--ink)",
                              background: "transparent",
                              border: "none",
                              cursor: "pointer",
                              textAlign: "left",
                            }}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </span>
                </div>
              );
            })}
          </div>

          <div
            data-subscribers-footer-note
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginTop: 14,
              fontFamily: "var(--font-ui)",
              fontSize: 11.5,
              color: "var(--ink-mute)",
            }}
          >
            <span
              aria-hidden="true"
              style={{
                fontFamily: "var(--font-glyph)",
                color: "var(--accent)",
                flex: "none",
              }}
            >
              ‡
            </span>
            Subscriber data is in your Stripe account — Theourgia does
            not retain payment data beyond webhook events.
          </div>
        </div>
      </div>
    </div>
  );
}
