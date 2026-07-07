/**
 * PricingDistributionSurface — H07 §S3 surface 7.
 *
 * The sober-money surface. Configures the publication's commercial
 * settings: pricing model · Stripe Connect · price · refund policy ·
 * watermarking.
 *
 * Honesty rules (H07 §S2.1 + §S2.2):
 *   • Money is sober — `--money` for "Connected & active" / paid
 *     prices / refund affirmations. NEVER --success (gamifies the
 *     sale) and NEVER --accent (over-loud on every price).
 *   • Stripe Connect is a hand-off, never an embed. Refunds open
 *     the Stripe portal — they do NOT execute inline.
 *   • Watermarking toggle defaults OFF (the DRM-free posture).
 *   • Currency picker offers the six common Stripe-supported
 *     currencies; "Other" is intentionally absent (Stripe-Connect
 *     standard accounts in most jurisdictions support these six
 *     reliably).
 *   • Refund policy "no refunds" carries the statutory-rights
 *     reminder in the same `--ink-mute` help line as the others.
 */

import {
  type CSSProperties,
  type ReactElement,
  useCallback,
  useState,
} from "react";

// ── Types ──────────────────────────────────────────────────────────

export type PricingModel = "free" | "one-time" | "pay-what-you-wish" | "subscribe";

export type RefundPolicy = "standard-14" | "none" | "custom";

export type StripeConnectState = "none" | "pending" | "active";

export interface PricingDistributionRecord {
  model: PricingModel;
  currency: string;
  /** Integer cents. */
  amount_cents: number;
  /** PWYW: minimum cents the practitioner accepts. */
  min_cents?: number | null;
  /** PWYW: suggested amount. */
  suggested_cents?: number | null;
  refund_policy: RefundPolicy;
  /** Free-text custom refund text when `refund_policy === "custom"`. */
  refund_policy_text?: string | null;
  watermark_buyer_email: boolean;
  stripe_connect: {
    state: StripeConnectState;
    account_email?: string | null;
    requirements?: readonly string[];
  };
}

export interface PricingDistributionSurfaceProps {
  publication: PricingDistributionRecord;
  onChange?: (patch: Partial<PricingDistributionRecord>) => void;
  /** Fired when the practitioner clicks "Connect Stripe" — the
   *  consumer hits POST /stripe/connect/onboarding-link and opens
   *  the returned URL in a new tab. */
  onConnectStripe?: () => void;
  /** Fired when the practitioner clicks "Disconnect". The consumer
   *  is expected to confirm + call the Stripe API. */
  onDisconnectStripe?: () => void;
  className?: string;
  style?: CSSProperties;
}

// ── Constants ─────────────────────────────────────────────────────

const CURRENCIES = ["USD", "EUR", "GBP", "CAD", "AUD", "JPY"] as const;

const CURRENCY_SYMBOL: Record<string, string> = {
  USD: "$",
  CAD: "$",
  AUD: "$",
  EUR: "€",
  GBP: "£",
  JPY: "¥",
};

const MODELS: { value: PricingModel; label: string }[] = [
  { value: "free", label: "Free" },
  { value: "one-time", label: "One-time purchase" },
  { value: "pay-what-you-wish", label: "Pay what you wish" },
  { value: "subscribe", label: "Subscribe to read" },
];

const REFUND_OPTIONS: { value: RefundPolicy; label: string }[] = [
  { value: "standard-14", label: "Standard 14-day full refund" },
  { value: "none", label: "No refunds" },
  { value: "custom", label: "Custom policy" },
];

// ── Styles ────────────────────────────────────────────────────────

const FORM_WRAP: CSSProperties = {
  maxWidth: 720,
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

const SECTION: CSSProperties = {
  paddingBottom: 26,
  borderBottomWidth: 1,
  borderBottomStyle: "solid",
  borderBottomColor: "var(--line)",
  marginBottom: 26,
};

const SECTION_LAST: CSSProperties = {
  paddingBottom: 0,
  marginBottom: 0,
};

const H2: CSSProperties = {
  fontFamily: "var(--font-display)",
  fontSize: 18,
  margin: "0 0 16px",
};

const LABEL: CSSProperties = {
  display: "block",
  fontFamily: "var(--font-ui)",
  fontSize: 11,
  letterSpacing: "0.06em",
  textTransform: "uppercase",
  color: "var(--ink-mute)",
  marginBottom: 7,
};

const RADIO_BASE = (on: boolean): CSSProperties => ({
  width: 18,
  height: 18,
  borderRadius: "50%",
  borderWidth: 1,
  borderStyle: "solid",
  borderColor: on ? "var(--accent)" : "var(--line-2)",
  background: on ? "var(--accent)" : "transparent",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flex: "none",
});

// ── Icons ─────────────────────────────────────────────────────────

function CheckIcon(): ReactElement {
  return (
    <svg
      width={20}
      height={20}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M5 12.5l4.5 4.5L19 6.5" />
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
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

// ── Stripe Connect card (the three states) ─────────────────────────

function StripeConnectCard({
  state,
  accountEmail,
  requirements,
  onConnect,
  onDisconnect,
}: {
  state: StripeConnectState;
  accountEmail: string | null | undefined;
  requirements: readonly string[] | undefined;
  onConnect?: () => void;
  onDisconnect?: () => void;
}): ReactElement {
  if (state === "active") {
    return (
      <>
        <div
          data-stripe-state="active"
          style={{
            borderWidth: 1,
            borderStyle: "solid",
            borderColor: "var(--money-line)",
            borderRadius: "var(--r-lg)",
            background: "var(--money-soft)",
            padding: "18px 20px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 11,
              marginBottom: 10,
            }}
          >
            <span style={{ display: "flex", color: "var(--money)" }}>
              <CheckIcon />
            </span>
            <span
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 17,
                color: "var(--ink)",
              }}
            >
              Connected &amp; active
            </span>
          </div>
          {accountEmail ? (
            <div
              data-stripe-account
              style={{
                fontFamily: "var(--font-ui)",
                fontSize: 13,
                color: "var(--ink-soft)",
                marginBottom: 6,
              }}
            >
              {accountEmail}
            </div>
          ) : null}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <button
              type="button"
              onClick={onDisconnect}
              data-action="disconnect-stripe"
              style={{
                fontFamily: "var(--font-ui)",
                fontSize: 12.5,
                color: "var(--ink-mute)",
                background: "transparent",
                border: "none",
                cursor: "pointer",
                padding: 0,
              }}
            >
              Disconnect
            </button>
          </div>
        </div>
        <div
          style={{
            fontFamily: "var(--font-ui)",
            fontSize: 11.5,
            color: "var(--ink-mute)",
            marginTop: 10,
            lineHeight: 1.45,
          }}
        >
          Sales go directly to your Stripe account. Theourgia takes no
          cut.
        </div>
      </>
    );
  }
  if (state === "pending") {
    return (
      <div
        data-stripe-state="pending"
        style={{
          borderWidth: 1,
          borderStyle: "solid",
          borderColor: "var(--line-2)",
          borderRadius: "var(--r-lg)",
          background: "var(--info-soft)",
          padding: "18px 20px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 11,
            marginBottom: 10,
          }}
        >
          <span
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 17,
              color: "var(--info)",
            }}
          >
            Awaiting Stripe verification
          </span>
        </div>
        {requirements && requirements.length > 0 ? (
          <ul
            data-stripe-requirements
            style={{
              margin: "0 0 10px",
              padding: "0 0 0 18px",
              fontFamily: "var(--font-ui)",
              fontSize: 12.5,
              color: "var(--ink-soft)",
            }}
          >
            {requirements.map((r) => (
              <li key={r} style={{ marginBottom: 4 }}>
                {r}
              </li>
            ))}
          </ul>
        ) : null}
        <div
          style={{
            fontFamily: "var(--font-ui)",
            fontSize: 11.5,
            color: "var(--ink-mute)",
            marginTop: 4,
          }}
        >
          Once Stripe finishes verifying, this card turns active. You
          can keep editing the publication while you wait.
        </div>
      </div>
    );
  }
  return (
    <>
      <div
        data-stripe-state="none"
        style={{
          borderWidth: 1,
          borderStyle: "solid",
          borderColor: "var(--line-2)",
          borderRadius: "var(--r-lg)",
          background: "var(--bg-2)",
          padding: "18px 20px",
        }}
      >
        <div
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 17,
            color: "var(--ink)",
            marginBottom: 10,
          }}
        >
          Connect Stripe to take payments
        </div>
        <p
          style={{
            fontFamily: "var(--font-ui)",
            fontSize: 13,
            color: "var(--ink-soft)",
            margin: "0 0 14px",
            lineHeight: 1.5,
          }}
        >
          Sales go directly to your Stripe account. Theourgia takes no
          cut.
        </p>
        <button
          type="button"
          onClick={onConnect}
          data-action="connect-stripe"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "10px 18px",
            borderRadius: "var(--r-md)",
            background: "var(--money)",
            color: "var(--accent-ink)",
            fontFamily: "var(--font-ui)",
            fontWeight: 700,
            fontSize: 13,
            border: "none",
            cursor: "pointer",
          }}
        >
          Connect Stripe
        </button>
      </div>
    </>
  );
}

// ── Surface ───────────────────────────────────────────────────────

export function PricingDistributionSurface({
  publication,
  onChange,
  onConnectStripe,
  onDisconnectStripe,
  className,
  style,
}: PricingDistributionSurfaceProps) {
  const patch = useCallback(
    (p: Partial<PricingDistributionRecord>) => onChange?.(p),
    [onChange],
  );

  const [amountInput, setAmountInput] = useState(
    (publication.amount_cents / 100).toFixed(2),
  );

  const handleAmountChange = useCallback(
    (raw: string) => {
      setAmountInput(raw);
      const parsed = Number.parseFloat(raw);
      if (Number.isFinite(parsed) && parsed >= 0) {
        patch({ amount_cents: Math.round(parsed * 100) });
      }
    },
    [patch],
  );

  const showPriceFields =
    publication.model === "one-time" ||
    publication.model === "pay-what-you-wish";

  const showCustomRefundText = publication.refund_policy === "custom";

  const symbol = CURRENCY_SYMBOL[publication.currency] ?? "";

  return (
    <div
      data-component="pricing-distribution-surface"
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
        <div style={FORM_WRAP}>
          <h1 style={H1}>Pricing &amp; distribution</h1>
          <p style={SUB}>
            What it costs, where the money goes, how it's protected.
          </p>

          {/* Pricing model */}
          <section data-section="model" style={SECTION}>
            <h2 style={H2}>Pricing model</h2>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 10,
              }}
            >
              {MODELS.map((m) => {
                const on = publication.model === m.value;
                return (
                  <button
                    key={m.value}
                    type="button"
                    aria-pressed={on}
                    data-pricing-model={m.value}
                    onClick={() => patch({ model: m.value })}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 11,
                      padding: "13px 15px",
                      borderRadius: "var(--r-md)",
                      borderWidth: 1,
                      borderStyle: "solid",
                      borderColor: on ? "var(--accent)" : "var(--line)",
                      background: on
                        ? "var(--accent-soft)"
                        : "var(--bg-2)",
                      textAlign: "left",
                      cursor: "pointer",
                    }}
                  >
                    <span style={RADIO_BASE(on)} aria-hidden="true">
                      {on ? (
                        <span
                          style={{
                            width: 8,
                            height: 8,
                            borderRadius: "50%",
                            background: "var(--accent-ink)",
                          }}
                        />
                      ) : null}
                    </span>
                    <span
                      style={{
                        fontFamily: "var(--font-serif)",
                        fontSize: 15,
                        color: "var(--ink)",
                      }}
                    >
                      {m.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Stripe Connect — only shown if the publication is paid */}
          {publication.model !== "free" ? (
            <section data-section="stripe" style={SECTION}>
              <h2 style={H2}>Stripe connection</h2>
              <StripeConnectCard
                state={publication.stripe_connect.state}
                accountEmail={publication.stripe_connect.account_email}
                requirements={publication.stripe_connect.requirements}
                onConnect={onConnectStripe}
                onDisconnect={onDisconnectStripe}
              />
            </section>
          ) : null}

          {/* Price fields — one-time and PWYW */}
          {showPriceFields ? (
            <section data-section="price" style={SECTION}>
              <h2 style={H2}>Price</h2>
              <div
                style={{
                  display: "flex",
                  gap: 10,
                  alignItems: "flex-end",
                }}
              >
                <div style={{ flex: "0 0 120px" }}>
                  <label htmlFor="pd-currency" style={LABEL}>
                    Currency
                  </label>
                  <div style={{ position: "relative" }}>
                    <select
                      id="pd-currency"
                      value={publication.currency}
                      onChange={(e) =>
                        patch({ currency: e.target.value })
                      }
                      data-pd-currency
                      aria-label="Currency"
                      style={{
                        width: "100%",
                        padding: "11px 12px",
                        borderWidth: 1,
                        borderStyle: "solid",
                        borderColor: "var(--line-2)",
                        borderRadius: "var(--r-md)",
                        background: "var(--bg-2)",
                        color: "var(--ink)",
                        fontFamily: "var(--font-ui)",
                        fontSize: 14,
                        appearance: "none",
                      }}
                    >
                      {CURRENCIES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                    <span
                      style={{
                        position: "absolute",
                        right: 10,
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
                <div style={{ flex: 1 }}>
                  <label htmlFor="pd-amount" style={LABEL}>
                    Amount
                  </label>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      borderWidth: 1,
                      borderStyle: "solid",
                      borderColor: "var(--line-2)",
                      borderRadius: "var(--r-md)",
                      background: "var(--bg-2)",
                      overflow: "hidden",
                    }}
                  >
                    <span
                      style={{
                        padding: "0 0 0 14px",
                        fontFamily: "var(--font-mono)",
                        fontSize: 18,
                        color: "var(--money)",
                      }}
                    >
                      {symbol}
                    </span>
                    <input
                      id="pd-amount"
                      type="text"
                      inputMode="decimal"
                      value={amountInput}
                      onChange={(e) => handleAmountChange(e.target.value)}
                      data-pd-amount
                      style={{
                        flex: 1,
                        padding: "11px 14px",
                        border: "none",
                        background: "transparent",
                        color: "var(--ink)",
                        fontFamily: "var(--font-mono)",
                        fontSize: 18,
                        outline: "none",
                      }}
                    />
                  </div>
                </div>
              </div>
              {publication.model === "pay-what-you-wish" ? (
                <div
                  style={{
                    marginTop: 10,
                    fontFamily: "var(--font-ui)",
                    fontSize: 11.5,
                    color: "var(--ink-mute)",
                    lineHeight: 1.5,
                  }}
                >
                  The amount above is the suggested price. Buyers can
                  pay more, or less — there is no minimum on this side
                  of Stripe Connect; configure a minimum on the Stripe
                  product if you need one.
                </div>
              ) : null}
            </section>
          ) : null}

          {/* Refund policy */}
          {publication.model !== "free" ? (
            <section data-section="refund" style={SECTION}>
              <h2 style={H2}>Refund policy</h2>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                }}
              >
                {REFUND_OPTIONS.map((r) => {
                  const on = publication.refund_policy === r.value;
                  return (
                    <label
                      key={r.value}
                      data-refund-option={r.value}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 11,
                        cursor: "pointer",
                      }}
                    >
                      <span
                        data-refund={r.value}
                        onClick={() => patch({ refund_policy: r.value })}
                        style={RADIO_BASE(on)}
                      >
                        {on ? (
                          <span
                            aria-hidden="true"
                            style={{
                              width: 8,
                              height: 8,
                              borderRadius: "50%",
                              background: "var(--accent-ink)",
                            }}
                          />
                        ) : null}
                      </span>
                      <input
                        type="radio"
                        name="pd-refund"
                        value={r.value}
                        checked={on}
                        onChange={() =>
                          patch({ refund_policy: r.value })
                        }
                        style={{ display: "none" }}
                      />
                      <span
                        style={{
                          fontFamily: "var(--font-serif)",
                          fontSize: 15,
                          color: "var(--ink)",
                        }}
                      >
                        {r.label}
                      </span>
                    </label>
                  );
                })}
              </div>
              {showCustomRefundText ? (
                <textarea
                  rows={3}
                  value={publication.refund_policy_text ?? ""}
                  onChange={(e) =>
                    patch({ refund_policy_text: e.target.value })
                  }
                  data-pd-refund-text
                  aria-label="Custom refund policy"
                  placeholder="Your custom refund terms, in the publication's footer."
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderWidth: 1,
                    borderStyle: "solid",
                    borderColor: "var(--line-2)",
                    borderRadius: "var(--r-md)",
                    background: "var(--bg-2)",
                    color: "var(--ink)",
                    fontFamily: "var(--font-serif)",
                    fontSize: 14,
                    lineHeight: 1.5,
                    resize: "vertical",
                    marginTop: 11,
                  }}
                />
              ) : null}
              <div
                style={{
                  fontFamily: "var(--font-ui)",
                  fontSize: 11.5,
                  color: "var(--ink-mute)",
                  marginTop: 11,
                  lineHeight: 1.5,
                }}
              >
                Refunds are issued via Stripe directly; Theourgia does
                not retain payment data. Some jurisdictions require
                statutory refund rights regardless of the seller's
                policy — check your local consumer protection law.
              </div>
            </section>
          ) : null}

          {/* Watermarking */}
          <section data-section="watermark" style={SECTION_LAST}>
            <h2 style={H2}>Watermarking</h2>
            <label
              data-pd-watermark-row
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 11,
                padding: "14px 16px",
                borderWidth: 1,
                borderStyle: "solid",
                borderColor: publication.watermark_buyer_email
                  ? "var(--accent)"
                  : "var(--line)",
                borderRadius: "var(--r-md)",
                background: publication.watermark_buyer_email
                  ? "var(--accent-soft)"
                  : "var(--bg-2)",
                cursor: "pointer",
              }}
            >
              <button
                type="button"
                role="switch"
                aria-checked={publication.watermark_buyer_email}
                aria-label="Watermark buyer email"
                data-pd-watermark
                onClick={() =>
                  patch({
                    watermark_buyer_email:
                      !publication.watermark_buyer_email,
                  })
                }
                style={{
                  width: 36,
                  height: 20,
                  borderRadius: 11,
                  background: publication.watermark_buyer_email
                    ? "var(--accent-soft)"
                    : "var(--bg-3)",
                  borderWidth: 1,
                  borderStyle: "solid",
                  borderColor: publication.watermark_buyer_email
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
                    left: publication.watermark_buyer_email ? 17 : 1,
                    width: 16,
                    height: 16,
                    borderRadius: "50%",
                    background: publication.watermark_buyer_email
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
                  Add buyer's email to the publication footer
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
                  A polite reminder, not DRM. DRM-free always — this is
                  a courtesy attribution, not a lock.
                </span>
              </span>
            </label>
          </section>
        </div>
      </div>
    </div>
  );
}
