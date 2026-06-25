/**
 * Publication Settings — admin route (H07 §S3 surface 6).
 *
 * Holds the publication's metadata config: title, slug, authors,
 * cover, summary, schedule, distribution, tags, tradition tags.
 * Phase 10 backend is unbuilt by design (H07 onboarding); the
 * route holds state locally for now and persists on patch via a
 * route-side debouncer when backend lands.
 */

import {
  type AuthorIdentityOption,
  type PublicationSettingsRecord,
  PublicationSettingsSurface,
  useTopbar,
} from "@theourgia/shared";
import { useCallback, useState } from "react";

function makeFixture(): PublicationSettingsRecord {
  return {
    id: "demo-settings",
    title: "Walking the Crossroads",
    slug: "crossroads",
    slug_prefix: "/walking-the-",
    authors: [{ id: "id-soror-ev", label: "Soror Ευ. Α." }],
    summary:
      "A practitioner's record of three years keeping Hekate's lamp at the crossroads.",
    cover_url: null,
    schedule: { mode: "now" },
    distribution: {
      catalog: true,
      rss: true,
      activity_pub: false,
      newsletter: false,
    },
    tags: ["Hekate", "crossroads", "devotion"],
    tradition_tags: ["hellenic"],
    total_word_count: 8400,
  };
}

const AVAILABLE_AUTHORS: AuthorIdentityOption[] = [
  { id: "id-soror-ev", label: "Soror Ευ. Α." },
  { id: "id-frater-k", label: "Frater K." },
  { id: "id-soror-n", label: "Soror N." },
];

export function PublicationSettingsRoute() {
  useTopbar(
    () => ({
      title: "Publication Settings",
      subtitle: "Identity · cover · schedule · distribution · discoverability",
    }),
    [],
  );

  const [publication, setPublication] = useState<PublicationSettingsRecord>(
    () => makeFixture(),
  );

  const handleChange = useCallback(
    (patch: Partial<PublicationSettingsRecord>) => {
      setPublication((prev) => ({ ...prev, ...patch }));
      // Phase 10 backend wires here: debounce + PATCH /publications/{id}.
    },
    [],
  );

  return (
    <PublicationSettingsSurface
      publication={publication}
      availableAuthors={AVAILABLE_AUTHORS}
      onChange={handleChange}
    />
  );
}
