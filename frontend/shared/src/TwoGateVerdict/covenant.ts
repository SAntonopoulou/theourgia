/**
 * Two-gate covenant — pure helpers (H12 Sprint F2, rule 69).
 *
 * Mirrors the backend's covenant discipline
 * (``theourgia.api.routers.v1.verdicts``):
 *
 *   • intent is declared exactly once — no update path exists;
 *   • the verdict stays editable while a gate is open;
 *   • finalizing requires both gates non-open; after that the verdict
 *     is immutable.
 *
 * Plus the install-by-proof module lifecycle
 * (``theourgia.models.practices.LEGAL_STATUS_TRANSITIONS``):
 * candidate → testing → installed | rejected; installed is terminal;
 * rejected may return to candidate (a verdict, not a ban).
 */

import type { GateResultWire, ModuleStatusWire } from "../api/types.js";

/** Can this pair of gate results be finalized? Both must be judged. */
export function canFinalize(gate1: GateResultWire, gate2: GateResultWire): boolean {
  return gate1 !== "open" && gate2 !== "open";
}

/** Queue membership: at least one gate still open. */
export function isAwaiting(gate1: GateResultWire, gate2: GateResultWire): boolean {
  return gate1 === "open" || gate2 === "open";
}

/**
 * Display form of the sha256 intent fingerprint: the first sixteen hex
 * chars in spaced groups of four — enough to spot-check by eye, short
 * enough for a rail. The full digest stays in the record.
 */
export function shortFingerprint(fingerprint: string): string {
  const head = fingerprint.slice(0, 16);
  const groups = head.match(/.{1,4}/g) ?? [];
  return `SHA256:${groups.join(" ")}`;
}

/** Legal install-by-proof transitions, mirrored from the backend. */
export const LEGAL_MODULE_TRANSITIONS: Readonly<
  Record<ModuleStatusWire, readonly ModuleStatusWire[]>
> = {
  candidate: ["testing"],
  testing: ["installed", "rejected"],
  installed: [], // terminal
  rejected: ["candidate"], // re-trial
};

/** The transitions legally available from ``state`` — render ONLY these. */
export function legalModuleTransitions(state: ModuleStatusWire): readonly ModuleStatusWire[] {
  return LEGAL_MODULE_TRANSITIONS[state];
}

/** Action label per target state, in install-by-proof language. */
export const MODULE_TRANSITION_LABELS: Readonly<Record<ModuleStatusWire, string>> = {
  testing: "Begin a trial",
  installed: "Install",
  rejected: "Reject",
  candidate: "Return to candidate",
};
