/**
 * Editorial copy for the Publications index surface (H07 §S3 #4).
 *
 * Voice: considered/deliberate (cluster B Publishing). Money is
 * sober — no celebration on purchase counts or earnings. The "withdrawn"
 * card is `--ink-mute` not `--danger`; soft state, never a delete.
 */

export const PUB_TOPBAR_TITLE = "Publications";
export const PUB_TOPBAR_SUBTITLE =
  "Books · essays · newsletters from this vault";

export const PUB_NEW_CTA = "New publication";

export const PUB_FILTER_LABELS: Record<string, string> = {
  all: "All",
  drafts: "Drafts",
  published: "Published",
  paid: "Paid",
  free: "Free",
  books: "Books",
};

export const PUB_NEW_KINDS: Record<string, string> = {
  book: "Book",
  essay: "Essay",
  post: "Post",
  page: "Page",
};

export const PUB_STATE_LABELS: Record<string, string> = {
  draft: "Draft",
  scheduled: "Scheduled",
  live: "Live",
  withdrawn: "Withdrawn",
};

export const PUB_EMPTY_HEADING = "No publications yet";
export const PUB_EMPTY_BODY =
  "Start with an essay — it composes from any working you've already written.";
export const PUB_EMPTY_CTA = "Start a new essay";

export const PUB_FREE_LABEL = "Free";
export const PUB_SUBSCRIBE_LABEL = "Subscribers";

export type PublicationFilter =
  | "all"
  | "drafts"
  | "published"
  | "paid"
  | "free"
  | "books";

export type PublicationKind = "book" | "essay" | "post" | "page";

export type PublicationState = "draft" | "scheduled" | "live" | "withdrawn";

/** Map a (state, paid) tuple to its chip token. The H07 rule:
 *  withdrawn is `--ink-mute`, live is `--money`, scheduled is
 *  `--info`. NEVER `--danger`. */
export function stateChipColor(
  state: PublicationState,
): { color: string; border: string } {
  switch (state) {
    case "live":
      return { color: "var(--money)", border: "var(--money-soft)" };
    case "scheduled":
      return { color: "var(--info)", border: "var(--info-soft)" };
    case "withdrawn":
    case "draft":
    default:
      return { color: "var(--ink-mute)", border: "var(--line)" };
  }
}

/** Format a price-in-cents (or `null` for free; "subscribe" for
 *  paywalled). Sober — no big numbers, no currency-symbol
 *  aggression. */
export function formatPrice(
  pricing: { model: string; amount_cents?: number | null; currency?: string | null } | null,
): { label: string; isPaid: boolean } {
  if (!pricing || pricing.model === "free") {
    return { label: PUB_FREE_LABEL, isPaid: false };
  }
  if (pricing.model === "subscribe") {
    return { label: PUB_SUBSCRIBE_LABEL, isPaid: true };
  }
  if (pricing.amount_cents != null) {
    const currency = (pricing.currency ?? "USD").toUpperCase();
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
    const amount = (pricing.amount_cents / 100).toFixed(2);
    return { label: `${symbol}${amount}`, isPaid: true };
  }
  return { label: PUB_FREE_LABEL, isPaid: false };
}
