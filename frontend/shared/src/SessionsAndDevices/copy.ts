/**
 * SessionsAndDevices — H10 Cluster B6 surface copy.
 *
 * Rule 48 — per-device, NEVER per-token. The chrome speaks of "Your
 * phone · Berlin · yesterday" — never of token IDs.
 */

export const HEADERS = {
  thisDevice: "This device",
  otherSessions: "Other active sessions",
} as const;

export const CHIPS = {
  thisSession: "this session",
  activeNow: "Active now",
} as const;

export const BUTTONS = {
  signOut: "Sign out",
  signOutEverywhereElse: "Sign out everywhere else",
} as const;

export type DeviceKind = "laptop" | "phone" | "tablet" | "desktop";

export function lastSeenLabel(geo: string, lastSeen: string): string {
  return `${geo} · last seen ${lastSeen}`;
}
