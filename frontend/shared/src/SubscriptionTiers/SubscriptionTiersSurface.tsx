/**
 * SubscriptionTiersSurface — H07 §S3 surface 9.
 *
 * Recurring monthly support for a practitioner's ongoing
 * publications. Honesty rules (H07 §S2.1 + §S3 #9):
 *   • Anti-gamification copy in tier-naming guidance ("avoid
 *     Bronze/Silver/Gold").
 *   • Soft warning (`--ink-mute`, NOT `--warn`/`--danger`) above
 *     three tiers per the conversion data.
 *   • Disabled tiers fade to opacity 0.55 — existing subscribers
 *     continue receiving content; new signups are blocked.
 *   • Pause toggle applies globally — existing subscribers keep
 *     access, new signups turned off. NEVER --danger.
 *   • Prices render in --money (sage-green, sober). No celebration.
 */

import {
  type CSSProperties,
  type ReactElement,
  useCallback,
} from "react";

// ── Types ──────────────────────────────────────────────────────────

export interface SubscriptionTier {
  id: string;
  name: string;
  /** Integer cents. */
  monthly_cents: number;
  annual_cents: number;
  description: string;
  /** Display labels for what's included (publication titles, etc). */
  included_labels: string[];
  enabled: boolean;
  display_order: number;
}

export interface SubscriptionTiersSurfaceProps {
  /** Caller's currency for display formatting. Defaults to USD. */
  currency?: string;
  tiers: readonly SubscriptionTier[];
  paused_new_subscriptions: boolean;
  onTierChange?: (id: string, patch: Partial<SubscriptionTier>) => void;
  onAddTier?: () => void;
  onTogglePaused?: () => void;
  className?: string;
  style?: CSSProperties;
}

// ── Currency formatter ───────────────────────────────────────────

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
  return `${symbol}${value % 1 === 0 ? value.toFixed(0) : value.toFixed(2)}`;
}

// ── Styles ────────────────────────────────────────────────────────

const MAIN_WRAP: CSSProperties = {
  maxWidth: 760,
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

const TIER_CARD: CSSProperties = {
  borderWidth: 1,
  borderStyle: "solid",
  borderColor: "var(--line)",
  borderRadius: "var(--r-lg)",
  background: "var(--bg-2)",
  padding: "18px 20px",
};

// ── Icons ─────────────────────────────────────────────────────────

function DragHandle(): ReactElement {
  return (
    <svg
      width={14}
      height={14}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M8 7h.01M8 12h.01M8 17h.01M15 7h.01M15 12h.01M15 17h.01" />
    </svg>
  );
}

function PlusIcon(): ReactElement {
  return (
    <svg
      width={15}
      height={15}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

// ── Surface ───────────────────────────────────────────────────────

export function SubscriptionTiersSurface({
  currency = "USD",
  tiers,
  paused_new_subscriptions,
  onTierChange,
  onAddTier,
  onTogglePaused,
  className,
  style,
}: SubscriptionTiersSurfaceProps) {
  const sorted = [...tiers].sort((a, b) => a.display_order - b.display_order);
  const tooMany = sorted.length > 3;

  const patchTier = useCallback(
    (id: string, patch: Partial<SubscriptionTier>) =>
      onTierChange?.(id, patch),
    [onTierChange],
  );

  return (
    <div
      data-component="subscription-tiers-surface"
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
      <main className="scroll" style={{ overflowY: "auto" }}>
        <div style={MAIN_WRAP}>
          <h1 style={H1}>Subscription tiers</h1>
          <p style={SUB}>
            Recurring support for the practice — name them in your own
            voice; render the value clearly; let the work speak.
          </p>

          {/* Tier list header + soft warning */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              marginBottom: 14,
            }}
          >
            <h2
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 18,
                margin: 0,
              }}
            >
              Your tiers
            </h2>
            {tooMany ? (
              <span
                data-tier-count-warning
                style={{
                  fontFamily: "var(--font-ui)",
                  fontSize: 11.5,
                  color: "var(--ink-mute)",
                }}
              >
                Practitioners with 1–3 tiers convert higher than those
                with more
              </span>
            ) : null}
          </div>

          <div
            data-tier-list
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 14,
              marginBottom: 16,
            }}
          >
            {sorted.map((tier) => (
              <div
                key={tier.id}
                data-tier-id={tier.id}
                style={{
                  ...TIER_CARD,
                  opacity: tier.enabled ? 1 : 0.55,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 14,
                  }}
                >
                  <span
                    style={{
                      display: "flex",
                      color: "var(--ink-mute)",
                      cursor: "grab",
                      marginTop: 6,
                    }}
                    aria-hidden="true"
                  >
                    <DragHandle />
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        flexWrap: "wrap",
                        marginBottom: 8,
                      }}
                    >
                      <input
                        type="text"
                        value={tier.name}
                        onChange={(e) =>
                          patchTier(tier.id, { name: e.target.value })
                        }
                        data-tier-name={tier.id}
                        aria-label="Tier name"
                        style={{
                          flex: 1,
                          minWidth: 120,
                          border: "none",
                          background: "transparent",
                          color: "var(--ink)",
                          fontFamily: "var(--font-display)",
                          fontSize: 19,
                          outline: "none",
                          borderBottomWidth: 1,
                          borderBottomStyle: "solid",
                          borderBottomColor: "transparent",
                        }}
                      />
                      <div
                        style={{
                          display: "flex",
                          alignItems: "baseline",
                          gap: 3,
                        }}
                      >
                        <span
                          data-tier-monthly={tier.id}
                          style={{
                            fontFamily: "var(--font-mono)",
                            fontSize: 18,
                            color: "var(--money)",
                          }}
                        >
                          {formatCents(tier.monthly_cents, currency)}
                        </span>
                        <span
                          style={{
                            fontFamily: "var(--font-ui)",
                            fontSize: 11.5,
                            color: "var(--ink-mute)",
                          }}
                        >
                          /mo ·{" "}
                          <span data-tier-annual={tier.id}>
                            {formatCents(tier.annual_cents, currency)}
                          </span>
                          /yr
                        </span>
                      </div>
                    </div>
                    <textarea
                      rows={2}
                      value={tier.description}
                      onChange={(e) =>
                        patchTier(tier.id, { description: e.target.value })
                      }
                      data-tier-description={tier.id}
                      aria-label="Tier description"
                      style={{
                        width: "100%",
                        padding: "9px 11px",
                        borderWidth: 1,
                        borderStyle: "solid",
                        borderColor: "var(--line-2)",
                        borderRadius: "var(--r-md)",
                        background: "var(--bg)",
                        color: "var(--ink-soft)",
                        fontFamily: "var(--font-serif)",
                        fontSize: 14,
                        lineHeight: 1.5,
                        resize: "vertical",
                        marginBottom: 10,
                      }}
                    />
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        flexWrap: "wrap",
                      }}
                    >
                      <span
                        style={{
                          fontFamily: "var(--font-ui)",
                          fontSize: 11,
                          color: "var(--ink-mute)",
                        }}
                      >
                        Includes:
                      </span>
                      {tier.included_labels.map((label) => (
                        <span
                          key={label}
                          style={{
                            padding: "3px 9px",
                            borderWidth: 1,
                            borderStyle: "solid",
                            borderColor: "var(--line-2)",
                            borderRadius: 20,
                            fontFamily: "var(--font-ui)",
                            fontSize: 11.5,
                            color: "var(--ink-soft)",
                          }}
                        >
                          {label}
                        </span>
                      ))}
                      <label
                        style={{
                          marginLeft: "auto",
                          display: "flex",
                          alignItems: "center",
                          gap: 7,
                          fontFamily: "var(--font-ui)",
                          fontSize: 11.5,
                          color: "var(--ink-mute)",
                        }}
                      >
                        <button
                          type="button"
                          role="switch"
                          aria-checked={tier.enabled}
                          aria-label={`Enable tier ${tier.name}`}
                          data-tier-enabled={tier.id}
                          onClick={() =>
                            patchTier(tier.id, { enabled: !tier.enabled })
                          }
                          style={{
                            width: 30,
                            height: 17,
                            borderRadius: 9,
                            background: tier.enabled
                              ? "var(--money-soft)"
                              : "var(--bg-3)",
                            borderWidth: 1,
                            borderStyle: "solid",
                            borderColor: tier.enabled
                              ? "var(--money-line)"
                              : "var(--line-2)",
                            position: "relative",
                            border: undefined,
                            padding: 0,
                            cursor: "pointer",
                          }}
                        >
                          <span
                            aria-hidden="true"
                            style={{
                              position: "absolute",
                              top: 1,
                              left: tier.enabled ? 14 : 1,
                              width: 13,
                              height: 13,
                              borderRadius: "50%",
                              background: tier.enabled
                                ? "var(--money)"
                                : "var(--ink-mute)",
                            }}
                          />
                        </button>
                        {tier.enabled ? "Enabled" : "Disabled"}
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={onAddTier}
            data-action="add-tier"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              width: "100%",
              padding: 12,
              borderWidth: 1,
              borderStyle: "dashed",
              borderColor: "var(--line-2)",
              borderRadius: "var(--r-md)",
              background: "transparent",
              fontFamily: "var(--font-ui)",
              fontSize: 13.5,
              color: "var(--ink-soft)",
              justifyContent: "center",
              marginBottom: 28,
              cursor: "pointer",
            }}
          >
            <PlusIcon />
            Add a tier
          </button>

          <div
            data-anti-gamification
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: 11.5,
              color: "var(--ink-mute)",
              marginBottom: 28,
              lineHeight: 1.5,
            }}
          >
            Name your tiers in your own voice — practitioner-coined, like
            "Witnesses" or "Stewards." Avoid Bronze/Silver/Gold
            gamification language.
          </div>

          {/* Pause new subscriptions */}
          <label
            data-pause-row
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 11,
              padding: "14px 16px",
              borderWidth: 1,
              borderStyle: "solid",
              borderColor: paused_new_subscriptions
                ? "var(--accent)"
                : "var(--line)",
              borderRadius: "var(--r-md)",
              background: paused_new_subscriptions
                ? "var(--accent-soft)"
                : "var(--bg-2)",
              cursor: "pointer",
            }}
          >
            <button
              type="button"
              role="switch"
              aria-checked={paused_new_subscriptions}
              aria-label="Pause new subscriptions"
              data-pause-toggle
              onClick={onTogglePaused}
              style={{
                width: 36,
                height: 20,
                borderRadius: 11,
                background: paused_new_subscriptions
                  ? "var(--accent-soft)"
                  : "var(--bg-3)",
                borderWidth: 1,
                borderStyle: "solid",
                borderColor: paused_new_subscriptions
                  ? "var(--accent)"
                  : "var(--line-2)",
                position: "relative",
                flex: "none",
                marginTop: 1,
                padding: 0,
                cursor: "pointer",
              }}
            >
              <span
                aria-hidden="true"
                style={{
                  position: "absolute",
                  top: 1,
                  left: paused_new_subscriptions ? 17 : 1,
                  width: 16,
                  height: 16,
                  borderRadius: "50%",
                  background: paused_new_subscriptions
                    ? "var(--accent)"
                    : "var(--ink-mute)",
                }}
              />
            </button>
            <span>
              <span
                style={{
                  fontFamily: "var(--font-ui)",
                  fontSize: 13.5,
                  color: "var(--ink)",
                }}
              >
                Pause new subscriptions
              </span>
              <br />
              <span
                style={{
                  fontFamily: "var(--font-ui)",
                  fontSize: 11.5,
                  color: "var(--ink-mute)",
                  lineHeight: 1.4,
                }}
              >
                Existing subscribers continue to access their content.
                New signups are turned off.
              </span>
            </span>
          </label>
        </div>
      </main>
    </div>
  );
}
