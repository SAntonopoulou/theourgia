/**
 * Mock seed data for non-API parts of the Today surface.
 *
 * Identity, location, and stats are not yet flowing through the API
 * client — those come from auth/session + user settings + an analytics
 * endpoint that are all future batches. Entries are NO LONGER here —
 * those flow through ``apiMethods.listEntries()`` (see
 * ``frontend/shared/src/api/fixtures.ts`` for the in-memory seed).
 */

import type { AvatarIdentity } from "@theourgia/shared";

export const MOCK_IDENTITY: AvatarIdentity = {
  name: "Soror Ευ. Α.",
  glyph: "moon",
  tone: "accent",
};

/** Greenwich Observatory by default — overridden once user settings ship. */
export const MOCK_LOCATION = { lat: 51.4769, lng: 0 };

export const MOCK_STATS = {
  entriesThisWeek: { value: 12, delta: 33.3 },
  synchronicities: { value: 4, delta: -12.5 },
  ritesPerformed: { value: 2, delta: 100 },
};
