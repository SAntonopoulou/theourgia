/**
 * GroupRitualScheduler · verbatim copy from H08
 * `Theourgia Group Ritual Scheduler.dc.html`.
 *
 * THE worked example of the H08 sprint — introduces the three-pin
 * time trio, which the H08 brief treats as the deepest new
 * structure of the whole tier.
 */

export const GRS_TITLE = "Schedule group ritual";
export const GRS_SUBTITLE =
  "A shared working at a fixed time, across timezones";

/** Section headings (in .dc.html order). */
export const GRS_SECTION_BASICS = "Basics";
export const GRS_SECTION_TIME = "Time";
export const GRS_SECTION_LOCATION = "Location";
export const GRS_SECTION_PARTICIPANTS = "Participants";
export const GRS_SECTION_CORRESPONDENCES = "Required correspondences";
export const GRS_SECTION_SCRIPT = "Shared script & materials";

/** Per-section helper copy (verbatim). */
export const GRS_TIME_HELPER = "Set it in your local clock; the others follow.";
export const GRS_PARTICIPANTS_HELPER =
  "Invite hub members, or paste a DID to invite a friend not in any hub.";
export const GRS_CORRESPONDENCES_HELPER =
  "A prep checklist for each participant — not a lock-in.";

/** Field labels. */
export const GRS_LABEL_TITLE = "Title";
export const GRS_LABEL_DESCRIPTION = "Description";

/** Location radio. The closed-union mirrors the H08 supplement
 *  ``RitualLocation`` discriminated union. */
export type GroupRitualLocationKind = "physical" | "virtual" | "dispersed";

export const GRS_LOCATION_LABELS: Record<
  GroupRitualLocationKind,
  string
> = {
  physical: "Physical",
  virtual: "Virtual",
  dispersed: "Dispersed",
};

export const GRS_LOCATION_DISPERSED_HINT =
  "Each participant works from their own space";

export const GRS_LOCATION_PHYSICAL_PLACEHOLDER = "Address (free text)";
export const GRS_LOCATION_VIRTUAL_PLACEHOLDER = "Meeting URL";

/** Participants input placeholder. */
export const GRS_PARTICIPANTS_PLACEHOLDER =
  "Add hub member or a DID…";

/** Add-item button on the correspondences list. */
export const GRS_ADD_CORRESPONDENCE = "Add item";

/** Script + materials placeholders. */
export const GRS_SCRIPT_PLACEHOLDER =
  "The shared text all participants speak…";
export const GRS_LINK_SIGIL = "Link a sigil";
export const GRS_LINK_VOCE = "Link a voce";

/** Footer CTAs. */
export const GRS_SAVE_DRAFT = "Save draft";
export const GRS_SCHEDULE_INVITE = "Schedule + invite";
