/**
 * DataExportRequest — H10 Cluster B2 surface copy.
 *
 * Rule 45: async + emailed; NO spinner, NO polling. The surface
 * dispatches a single submit + renders a confirmation banner.
 */

export type ExportFormatKey = "json" | "mbf" | "both";

export interface IncludedItem {
  /** Body text rendered as a single line. */
  text: string;
  /** Sealed-content items render the check icon in `--seal`; the
   *  rest render in `--peer-ok`. */
  seal?: boolean;
}

export const INCLUDED_ITEMS: readonly IncludedItem[] = [
  { text: "All entries (markdown + structured JSON)" },
  { text: "All entities — your Beings ledger" },
  { text: "All divination sessions and their results" },
  { text: "All library items and correspondences" },
  { text: "All publications, drafts and published versions" },
  {
    text: "All media file metadata and URLs (the files stay in storage — a link list)",
  },
  {
    text: "Sealed content as ciphertext only — you need your key to decrypt it",
    seal: true,
  },
  { text: "All audit events you are the actor of" },
];

export const NOT_INCLUDED_ITEMS: readonly string[] = [
  "Other people’s content, even in shared hubs",
  "Sealed content in plaintext — you hold the key; we don’t",
  "Federated content originated by other vaults",
];

export interface FormatOption {
  key: ExportFormatKey;
  label: string;
}

export const FORMAT_OPTIONS: readonly FormatOption[] = [
  { key: "json", label: "JSON archive (zip)" },
  { key: "mbf", label: "Markdown Bundle Format (zip)" },
  { key: "both", label: "Both — two separate downloads" },
];

export const SECTION_HEADERS = {
  whatsIncluded: "What's included",
  whatsNotIncluded: "What's not included",
  format: "Format",
  delivery: "Delivery",
} as const;

export const PREAMBLE =
  "A complete copy of everything in your vault, generated in the background and sent to your email. Nothing here changes or removes your data.";

export const CAUTION_LINE =
  "Once submitted, the export cannot be cancelled — the job will run.";

export const SUBMIT_LABEL = "Request export";
export const SUBMITTED_LABEL = "Request received";

export const REQUEST_RECEIVED_TITLE = "Request received.";

export function deliveryLine(email: string): string {
  return `An email with download links will arrive at ${email} within 24 hours. The links expire 7 days after they arrive.`;
}

export function requestedBannerLine(email: string): string {
  return `An email with download links will arrive at ${email} within 24 hours. The links expire 7 days after they arrive. You can close this page.`;
}
