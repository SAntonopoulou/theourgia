/**
 * Mock seed data for the not-yet-API-backed parts of the Today surface.
 *
 * Identity comes from auth/session (future batch). Location comes from
 * user settings (future batch). Both fall back to these constants
 * until those endpoints exist. Entries + stats flow through
 * ``@theourgia/shared`` API methods.
 */

import type { AvatarIdentity } from "@theourgia/shared";

export const MOCK_IDENTITY: AvatarIdentity = {
  name: "Soror Ευ. Α.",
  glyph: "moon",
  tone: "accent",
};

/** Greenwich Observatory by default — overridden once user settings ship. */
export const MOCK_LOCATION = { lat: 51.4769, lng: 0 };
