/**
 * AgentByoKeySettings — H10 Cluster C5 surface copy.
 *
 * Rule 57 — BYO keys, never service-side. The preamble is verbatim
 * locked. Secret-field rendering NEVER displays the existing value;
 * the user can only Reset + paste a new one.
 */

export const RULE_57_PREAMBLE =
  "Theourgia holds no API keys on your behalf. Bring your own, and you control where the cost lives.";

export const HEADERS = {
  anthropicKey: "Anthropic API key",
  subscription: "Or connect a Claude subscription",
  perAgentOverride: "Per-agent override",
} as const;

export const HINTS = {
  anthropicKey:
    "Stored encrypted. The existing value is never displayed. To rotate, paste a new key — the old one is replaced and stops being used immediately.",
  subscription:
    "Equivalent to an API key, but billed and rate-limited through your subscription tier.",
  perAgentOverride:
    "By default every agent uses the key above. Override it here if you want one agent on a different account.",
} as const;

export const BUTTONS = {
  reset: "Reset",
  connectSubscription: "Connect your Claude subscription",
  override: "Override",
} as const;

/** What we show in place of the key value. NEVER the real value. */
export const SECRET_MASK = "••••••••••••••••";

export type PerAgentKeyKind = "shared" | "own";

export const PER_AGENT_KEY_LABEL: Record<PerAgentKeyKind, string> = {
  shared: "shared key",
  own: "own key",
};
