/**
 * Editorial copy for the Publication Editor surface
 * (H07 §S3 surface 5 — the worked example).
 *
 * Voice: considered/deliberate (cluster B Publishing). Sticky
 * autosave indicator goes Saving… → Saved → invisible (no toast,
 * per H07 worked-example point b).
 */

export const PE_BREADCRUMB_HOME = "Publications";

export const PE_SETTINGS_LABEL = "Settings";

export const PE_SAVE_STATE_LABELS: Record<
  "idle" | "saving" | "saved" | "error",
  string
> = {
  idle: "",
  saving: "Saving…",
  saved: "Saved",
  error: "Save failed",
};

export const PE_CHAPTERS_EYEBROW = "Chapters";
export const PE_ADD_CHAPTER = "Add chapter";

export const PE_CHAPTER_TITLE_PLACEHOLDER = "Chapter title";
export const PE_BODY_PLACEHOLDER =
  "Begin where you arrived. Press / for working-blocks.";

export const PE_COVER_EYEBROW = "Cover";
export const PE_COVER_UPLOAD = "Upload cover";
export const PE_COVER_AUTO_HINT =
  "or a typographic cover is generated";

export const PE_SUMMARY_EYEBROW = "Summary";
export const PE_SUMMARY_PLACEHOLDER = "Three sentences, at most.";

export const PE_LANGUAGE_EYEBROW = "Language";
export const PE_LICENSE_EYEBROW = "License";
export const PE_TAGS_EYEBROW = "Tags";

export const PE_TAG_ADD = "+ add";

export const PE_FOOTER_DRAFT = "Draft";
export const PE_FOOTER_SCHEDULED = "Scheduled";
export const PE_FOOTER_LIVE = "Live";
export const PE_FOOTER_WITHDRAWN = "Withdrawn";

export const PE_LICENSE_OPTIONS = [
  { value: "all-rights-reserved", label: "All rights reserved" },
  { value: "cc-by", label: "CC-BY" },
  { value: "cc-by-sa", label: "CC-BY-SA" },
  { value: "cc-by-nc", label: "CC-BY-NC" },
  { value: "cc-by-nc-sa", label: "CC-BY-NC-SA" },
  { value: "cc-by-nd", label: "CC-BY-ND" },
  { value: "cc-by-nc-nd", label: "CC-BY-NC-ND" },
  { value: "public-domain", label: "Public domain" },
  { value: "custom", label: "Custom" },
] as const;

export const PE_LICENSE_HELP: Record<string, string> = {
  "all-rights-reserved":
    "You keep all rights; readers may not redistribute without permission.",
  "cc-by":
    "Readers may share + adapt, with attribution. Commercial use allowed.",
  "cc-by-sa":
    "Readers may share + adapt, with attribution. Derivatives keep this license.",
  "cc-by-nc":
    "Readers may share + adapt, with attribution. Non-commercial only.",
  "cc-by-nc-sa":
    "Readers may share + adapt, with attribution. Non-commercial; derivatives keep this license.",
  "cc-by-nd":
    "Readers may share verbatim, with attribution. No derivatives.",
  "cc-by-nc-nd":
    "Readers may share verbatim, with attribution. Non-commercial; no derivatives.",
  "public-domain":
    "You waive all rights. Readers may do anything with this work.",
  custom: "A custom licence — render the text on the publication's page.",
};

export const PE_LANGUAGE_OPTIONS = [
  "English",
  "Greek",
  "Latin",
  "Hebrew",
  "Arabic",
  "Sanskrit",
  "Coptic",
  "Other",
];

export type PublicationState = "draft" | "scheduled" | "live" | "withdrawn";

export function stateChip(
  state: PublicationState,
): { color: string; label: string } {
  switch (state) {
    case "live":
      return { color: "var(--money)", label: PE_FOOTER_LIVE };
    case "scheduled":
      return { color: "var(--info)", label: PE_FOOTER_SCHEDULED };
    case "withdrawn":
      return { color: "var(--ink-mute)", label: PE_FOOTER_WITHDRAWN };
    case "draft":
    default:
      return { color: "var(--ink-mute)", label: PE_FOOTER_DRAFT };
  }
}

/** Sum a word count across multiple chapters' bodies. Each chapter
 *  body is a Tiptap JSON doc; the consumer can also pass plaintext
 *  if it has it. */
export function wordCount(plaintext: string): number {
  const trimmed = plaintext.trim();
  if (trimmed === "") return 0;
  return trimmed.split(/\s+/).length;
}
