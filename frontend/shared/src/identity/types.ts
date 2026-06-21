/**
 * Identity types — matches ``agent_data_and_components.md §1``.
 *
 * Authorship is by **identity**, not account. Acting-as is global state
 * consumed by Editor, Blog, Profile, memberships, SSO. Each identity's
 * keypair is real (signs that identity's content / attestations); the
 * private key never leaves the instance.
 */

import type { ReactNode } from "react";

/** The seven surface kinds an identity can be the default author for. */
export type SurfaceKey =
  | "journal"
  | "blog"
  | "publication"
  | "newsletter"
  | "ritualFeed"
  | "synchronicity"
  | "divination";

export interface KeyPair {
  algo: "ed25519";
  /** Hex-encoded public key. Private key never leaves the instance. */
  publicKey: string;
  createdAt: string;
  /** Prior public key, for rotation history. */
  rotatedFrom?: string | null;
}

export interface Identity {
  id: string;
  /** Owning vault — every identity belongs to exactly one vault. */
  vaultId: string;
  name: string;
  /** Short markdown bio. */
  bio?: string;
  /** Optional sigil / symbol id for the medallion when no avatar set. */
  glyph?: string;
  /** Glyph color tone — accent or muted for severed pseudonyms. */
  glyphTone?: "accent" | "mute";
  /** Optional avatar URL; ``null`` → render generated glyph medallion. */
  avatarUrl?: string | null;
  signing: KeyPair;
  /** ``false`` for a deliberately-unlinkable pseudonym (e.g. ``null.priest``). */
  signingEnabled: boolean;
  /** Archived ≠ deleted — cannot author new work, still referenced by past entries. */
  archived: boolean;
  /** Which identity is the default author for each surface kind. */
  defaultsBySurface: Partial<Record<SurfaceKey, string | null>>;

  /** UI metadata not in the canonical model — display strings + tags. */
  displayName?: string;
  kind?: string;
  /** Short tags shown on the identity card (e.g. "Network", "Public"). */
  tags?: { label: string; tone?: "soft" | "warn" | "success" }[];
  /** Surfaces this identity authors on (for the detail rail's chip row). */
  authorsOn?: string[];
}

/** A surface-default-mapping row, as rendered in the Defaults-by-surface card. */
export interface SurfaceDefault {
  key: SurfaceKey;
  label: string;
  /** Inline SVG path for the row icon (single ``<path d="…"/>``). */
  iconPath: ReactNode;
  identityId: string;
}
