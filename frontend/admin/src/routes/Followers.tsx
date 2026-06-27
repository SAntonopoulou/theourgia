/**
 * Followers — admin route at ``/followers``.
 *
 * Renders the H08 §S3 Cluster B surface 17 against fixtures.
 *
 * Wiring deferred to Phase 13 backend:
 *
 *   * GET  /api/v1/activitypub/followers — list.
 *   * GET  /api/v1/activitypub/follow-requests — pending.
 *   * POST /api/v1/activitypub/follow-requests/{id}/approve
 *   * POST /api/v1/activitypub/follow-requests/{id}/decline
 *
 * NO endpoint for "all followers, sorted by engagement." There
 * are no engagement metrics in Theourgia (rule 18).
 */

import {
  type FollowerRow,
  FollowersPaneSurface,
  type PendingFollowRow,
  useTopbar,
} from "@theourgia/shared";

const FOLLOWERS: FollowerRow[] = [
  {
    id: "f-vesper",
    name: "Lucia Vesper",
    handle: "@lvesper@thelema.example",
    tradition: "Thelemic",
    since: "4 days",
    initial: "L",
    tone: 0,
  },
  {
    id: "f-hedge",
    name: "Hedge & Hollow",
    handle: "@hedge@folkcraft.social",
    tradition: "Folk",
    since: "1 week",
    initial: "H",
    tone: 1,
  },
  {
    id: "f-tullius",
    name: "Marcus Tullius",
    handle: "@mtullius@hermetica.org",
    tradition: "Hermetic",
    since: "2 weeks",
    initial: "M",
    tone: 2,
  },
  {
    id: "f-demeter",
    name: "Δήμητρα Κ.",
    handle: "@demeter@hellenismos.gr",
    tradition: "Hellenic",
    since: "3 weeks",
    initial: "Δ",
    tone: 3,
  },
  {
    id: "f-nightjar",
    name: "nightjar",
    handle: "@nightjar@mastodon.social",
    tradition: "Independent",
    since: "1 month",
    initial: "N",
    tone: 0,
  },
  {
    id: "f-owl",
    name: "The Owl Library",
    handle: "@owllib@books.bookwyrm.social",
    tradition: "Scholarly",
    since: "2 months",
    initial: "T",
    tone: 1,
  },
];

const PENDING: PendingFollowRow[] = [
  {
    id: "p-orphic",
    name: "orphic.flame",
    handle: "@orphic@pleroma.example",
    initial: "O",
    tone: 2,
  },
  {
    id: "p-sortilege",
    name: "Sortilege Press",
    handle: "@sortilege@writing.exchange",
    initial: "S",
    tone: 3,
  },
  {
    id: "p-wanderer",
    name: "a wanderer",
    handle: "@wanderer@mas.to",
    initial: "A",
    tone: 0,
  },
];

export function Followers() {
  useTopbar(() => ({ title: "Followers" }));

  return (
    <FollowersPaneSurface
      followers={FOLLOWERS}
      pending={PENDING}
      onApprove={(id) => {
        // TODO Phase 13 — POST /follow-requests/{id}/approve
        // eslint-disable-next-line no-console
        console.info("[followers] approve", id);
      }}
      onDecline={(id) => {
        // TODO Phase 13 — POST /follow-requests/{id}/decline
        // eslint-disable-next-line no-console
        console.info("[followers] decline", id);
      }}
      onFollowerAction={(id) => {
        // TODO Phase 13 — kebab menu (block / view profile / ...).
        // eslint-disable-next-line no-console
        console.info("[followers] action", id);
      }}
    />
  );
}
