/**
 * Mock seed data for the Today surface.
 *
 * Replaced with real API calls when the API client batch lands.
 */

import type { AvatarIdentity, GlyphName } from "@theourgia/shared";

export interface RecentEntry {
  id: string;
  title: string;
  type: "observation" | "ritual" | "divination" | "synchronicity";
  glyph: GlyphName;
  at: Date; // intentional Date — admin always renders in local tz
  excerpt: string;
}

export const MOCK_IDENTITY: AvatarIdentity = {
  name: "Soror Ευ. Α.",
  glyph: "moon",
  tone: "accent",
};

/** Greenwich Observatory by default — overridden once user settings ship. */
export const MOCK_LOCATION = { lat: 51.4769, lng: 0 };

const NOW = new Date();

export const MOCK_ENTRIES: RecentEntry[] = [
  {
    id: "1",
    title: "Candle held its flame",
    type: "observation",
    glyph: "candle",
    at: new Date(NOW.getTime() - 1000 * 60 * 32),
    excerpt:
      "The taper at the eastern station burned through the entire opening invocation without flickering. Last week it guttered twice in the same passage.",
  },
  {
    id: "2",
    title: "Mercury station — note retrograde station",
    type: "synchronicity",
    glyph: "star",
    at: new Date(NOW.getTime() - 1000 * 60 * 60 * 5),
    excerpt:
      "Three correspondents wrote independently about lost packages. The retrograde stationary period began this morning at 04:17 local.",
  },
  {
    id: "3",
    title: "Geomancy: Acquisitio in House X",
    type: "divination",
    glyph: "divination",
    at: new Date(NOW.getTime() - 1000 * 60 * 60 * 26),
    excerpt:
      "Querent: the Phase 02 work. Reading: Acquisitio → Populus. Read as: receive the work, then disperse it. Echoes yesterday's reflection.",
  },
];

export const MOCK_STATS = {
  entriesThisWeek: { value: 12, delta: 33.3 },
  synchronicities: { value: 4, delta: -12.5 },
  ritesPerformed: { value: 2, delta: 100 },
};
