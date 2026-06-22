/**
 * Editorial constants + metadata for Attestation kinds.
 *
 * Seven kinds drawn verbatim from `Theourgia Attestations.dc.html`
 * (KINDS() at line 318, kindColor/kindGlyph at lines 320–324). The
 * tokens layer holds the colour values — this file binds each kind to
 * its `--at-*` token plus a glyph path lifted exactly from the design.
 */

export type AttestationKind =
  | "initiation"
  | "grade-granted"
  | "membership"
  | "teacher-student"
  | "ordination"
  | "authorship"
  | "other";

export interface AttestationKindMeta {
  label: string;
  color: string;
  /** SVG path "d" — lifted verbatim from kindGlyph() in the .dc.html. */
  glyph: string;
}

export const ATTESTATION_KIND_ORDER: readonly AttestationKind[] = [
  "initiation",
  "grade-granted",
  "membership",
  "teacher-student",
  "ordination",
  "authorship",
  "other",
];

export const ATTESTATION_KIND_META: Record<
  AttestationKind,
  AttestationKindMeta
> = {
  initiation: {
    label: "Initiation",
    color: "var(--at-initiation)",
    glyph:
      "M15 9a3 3 0 1 0-3 3M12 12L6 18M8 16h2M10 18l1.5-1.5",
  },
  "grade-granted": {
    label: "Grade granted",
    color: "var(--at-grade-granted)",
    glyph:
      "M12 3l2.5 5 5.5.8-4 4 1 5.4L12 21l-5-2.8 1-5.4-4-4 5.5-.8z",
  },
  membership: {
    label: "Membership",
    color: "var(--at-membership)",
    glyph:
      "M9 8a3 3 0 1 0 6 0 3 3 0 0 0-6 0M5 20c0-3.3 2.6-5.5 7-5.5s7 2.2 7 5.5",
  },
  "teacher-student": {
    label: "Teacher–student",
    color: "var(--at-teacher-student)",
    glyph:
      "M4 9l8-4 8 4-8 4zM8 11.5V16c0 1.4 1.8 2.5 4 2.5s4-1.1 4-2.5v-4.5M20 9v5",
  },
  ordination: {
    label: "Ordination",
    color: "var(--at-ordination)",
    glyph: "M12 3v18M7 8h10M9 21h6",
  },
  authorship: {
    label: "Authorship",
    color: "var(--at-authorship)",
    glyph: "M5 19l1-3 9-9 2 2-9 9zM14 8l2 2",
  },
  other: {
    label: "Other",
    color: "var(--at-other)",
    glyph: "M12 3a9 9 0 1 0 .01 0M12 8v4M12 16h.01",
  },
};
