/**
 * AgentMemoryReader — H10 Cluster C9 surface copy.
 *
 * Rule 59 — memory is human-editable; the on-disk path is exposed
 * verbatim. Lists raw markdown files; nothing is hidden.
 */

export const SECTION_LABELS = {
  memoryFiles: "Memory files",
} as const;

export const BUTTONS = {
  add: "+ Add",
  edit: "Edit",
  archive: "Archive",
  cancel: "Cancel",
  save: "Save",
} as const;

export const EDIT_HINT =
  "The agent reads this on its next wake. Treat it as your record of what the agent should know.";
