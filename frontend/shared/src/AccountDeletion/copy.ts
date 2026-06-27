/**
 * AccountDeletion — H10 Cluster B3 surface copy.
 *
 * Rule 46 (30-day grace) + rule 27 (federated-persistence verbatim) +
 * rule 2 (--warn-soft NOT --danger).
 */

export const FACTS: readonly string[] = [
  "All your vault data is scheduled for deletion in 30 days.",
  "During the grace period, you can reactivate from any login screen.",
  "At day 30, your data is irreversibly deleted — except audit-log entries we are legally required to retain.",
  "Content you’ve federated to other instances may persist on those instances — we cannot delete it for you.",
  "Content you’ve published publicly may have been archived by readers — we cannot delete it for them.",
];

export const MEMORIAL_INTERACTION =
  "You have an executor designated for memorial mode. Deletion cancels the memorial mode designation. If you instead want your vault preserved per your inheritance plan, do not delete — let the inactivity trigger fire.";

export const RETENTION_LINE =
  "We retain a minimal set of audit-log entries we are legally required to keep — authentication and security events — for 90 days after deletion, then they too are erased. Nothing else survives.";

export const HEADERS = {
  whatThisDoes: "What this does",
  confirm: "Confirm",
} as const;

export const FIELD_LABELS = {
  magickalName: "Type your magickal name",
  startedDate: "Type the date you started this account",
} as const;

export const BUTTONS = {
  keep: "Keep my vault",
  schedule: "Schedule deletion",
} as const;

/** When the confirmed scheduled date is known, format it for the
 *  reactivation banner. */
export function scheduledForLine(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const formatted = d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  return `Your account is scheduled for deletion on ${formatted}. To keep your vault, tap Reactivate.`;
}
