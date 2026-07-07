/**
 * Editorial copy for the Gematria Calculator surface.
 *
 * Voice: scholarly. The practitioner is a serious student of language;
 * the surface should feel like a paleography reference, not a
 * fortune-telling device. No mysticism in the chrome.
 */

export const GC_TOPBAR_TITLE = "Gematria Calculator";
export const GC_TOPBAR_SUBTITLE =
  "The numeric value of a word, across the ciphers you choose";

export const GC_TEXT_INPUT_LABEL = "Text to compute";
export const GC_TEXT_INPUT_PLACEHOLDER = "Type or paste a word or phrase…";
/** Empty by default — the placeholder text prompts the practitioner.
 *  Previously seeded with "ἀγαθοδαίμων" (Greek "good spirit") which
 *  pre-filled the field on every open. */
export const GC_DEFAULT_INPUT = "";

export const GC_FILTER_PLACEHOLDER = "Filter ciphers…";
export const GC_CUSTOM_CTA = "Define custom cipher";
export const GC_PERSONAL_BADGE = "personal";
export const GC_PERSONAL_BADGE_TITLE =
  "Personal — not for shared studies";

export const GC_INPUT_HELP_TAIL =
  "letters not in a cipher are skipped and shown in the breakdown";

export const GC_RESONANCE_HEADING = "Cross-cipher resonance";
export const GC_RESONANCE_DETAIL_PREFIX = "shared by ";
export const GC_RESONANCE_DETAIL_TAIL = " — resonance across ";
export const GC_RESONANCE_DETAIL_END = " ciphers.";

export const GC_SAVE_STUDY_LABEL = "Save as study";
export const GC_COPY_TABLE_LABEL = "Copy value table";
export const GC_QUIET_NOTE =
  "Computations aren't saved as their own rows — embed in an entry, or copy.";

export const GC_EMPTY_HEADING_GLYPHS = "פ ϙ ☉";
export const GC_EMPTY_BODY =
  "Type a word above. Each selected cipher computes its value, and any resonance across ciphers surfaces below.";

// Custom cipher modal copy.
export const GC_CUSTOM_TITLE = "Define a custom cipher";
export const GC_CUSTOM_NAME_LABEL = "Name";
/** Empty by default. Previously seeded "My English cipher" into the
 *  Name input — read like the user had already named the cipher. */
export const GC_CUSTOM_NAME_DEFAULT = "";
export const GC_CUSTOM_NAME_PLACEHOLDER = "e.g. My English cipher";
/** Fallback used only when the practitioner clicks Save with an empty
 *  Name — the record gets stored under this neutral label. */
export const GC_CUSTOM_NAME_FALLBACK = "Untitled custom cipher";
export const GC_CUSTOM_LANGUAGE_LABEL = "Language";
export const GC_CUSTOM_CITATION_LABEL_PREFIX = "Source citation";
export const GC_CUSTOM_CITATION_LABEL_TAIL = "· optional";
export const GC_CUSTOM_CITATION_PLACEHOLDER =
  "Leave blank → cipher is marked “Personal — not for shared studies”";
export const GC_CUSTOM_MAPPING_LABEL_PREFIX = "Mapping";
export const GC_CUSTOM_MAPPING_LABEL_TAIL = "· every letter of the alphabet";
export const GC_CUSTOM_INCOMPLETE_NOTICE_PREFIX = " letters still hold zero";
export const GC_CUSTOM_INCOMPLETE_NOTICE_TAIL =
  " — the cipher is incomplete until every letter has a value.";
export const GC_CUSTOM_CANCEL = "Cancel";
export const GC_CUSTOM_SAVE = "Save cipher";

// Insert-into-draft modal.
export const GC_INSERT_TITLE = "Insert into a working entry";
export const GC_INSERT_BODY =
  "In a journal entry this calculation renders as a gematria block — the same shape the editor's /gematria command produces.";
export const GC_INSERT_CANCEL = "Cancel";
export const GC_INSERT_COMMIT = "Insert into current draft";
export const GC_INSERT_PRIMARY_TAIL_PREFIX = " · also ";

// Language-section eyebrows.
export const GC_LANG_LABELS: Record<string, string> = {
  greek: "Greek",
  hebrew: "Hebrew",
  english: "English",
  coptic: "Coptic",
  arabic: "Arabic",
  sanskrit: "Sanskrit",
  custom: "Personal",
};
