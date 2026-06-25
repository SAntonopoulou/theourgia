/**
 * Publications — admin route wrapping the shared
 * PublicationsSurface (H07 §S3 surface 4).
 *
 * Phase 10 backend is unbuilt by design (per H07 onboarding) — the
 * surface receives a fixture-mode list for now. "+ New publication"
 * + card-click both Toast until the Publication Editor surface
 * + Phase 10 backend ship.
 */

import {
  type PublicationCardRecord,
  type PublicationKind,
  PublicationsSurface,
  Toast,
  useTopbar,
} from "@theourgia/shared";
import { useCallback } from "react";

// Fixture data for mock mode. Replaced by `listPublications()`
// once the Phase 10 backend lands (planned in B116+; the H07
// `.dc.html` surfaces inform the schema first).
const FIXTURE_PUBLICATIONS: PublicationCardRecord[] = [
  {
    id: "demo-walking-crossroads",
    title: "Walking the Crossroads",
    author_label: "Soror Ευ. Α.",
    kind: "book",
    state: "live",
    pricing: { model: "one-time", amount_cents: 1800, currency: "USD" },
    purchase_count: 47,
    cited: true,
    cover_url: null,
    created_at: "2026-05-12T00:00:00Z",
  },
  {
    id: "demo-sealed-oath",
    title: "On the Sealed Oath",
    author_label: "Soror Ευ. Α.",
    kind: "essay",
    state: "live",
    pricing: { model: "free" },
    purchase_count: 0,
    cited: false,
    cover_url: null,
    created_at: "2026-05-18T00:00:00Z",
  },
  {
    id: "demo-notes-theurgy",
    title: "Notes Toward a Theurgy",
    author_label: "Soror Ευ. Α.",
    kind: "essay",
    state: "draft",
    pricing: { model: "free" },
    purchase_count: 0,
    cited: false,
    cover_url: null,
    created_at: "2026-06-01T00:00:00Z",
  },
  {
    id: "demo-dark-moon",
    title: "The Dark Moon Letters",
    author_label: "Soror Ευ. Α.",
    kind: "post",
    state: "scheduled",
    pricing: { model: "subscribe" },
    purchase_count: 0,
    cited: false,
    cover_url: null,
    created_at: "2026-06-15T00:00:00Z",
  },
  {
    id: "demo-voces-grammar",
    title: "A Grammar of Voces",
    author_label: "Soror Ευ. Α.",
    kind: "book",
    state: "live",
    pricing: { model: "one-time", amount_cents: 2400, currency: "USD" },
    purchase_count: 12,
    cited: true,
    cover_url: null,
    created_at: "2026-06-02T00:00:00Z",
  },
  {
    id: "demo-hours-keeping",
    title: "Hours & Their Keeping",
    author_label: "Soror Ευ. Α.",
    kind: "page",
    state: "withdrawn",
    pricing: { model: "free" },
    purchase_count: 0,
    cited: false,
    cover_url: null,
    created_at: "2026-04-20T00:00:00Z",
  },
];

export function PublicationsRoute() {
  useTopbar(
    () => ({
      title: "Publications",
      subtitle: "Books · essays · newsletters from this vault",
    }),
    [],
  );

  const handleNew = useCallback((kind: PublicationKind) => {
    Toast.push({
      tone: "info",
      title: `New ${kind}`,
      body: "Publication Editor surface ships next in the H07 Cluster B sprint. Phase 10 backend lands alongside.",
    });
  }, []);

  const handleSelect = useCallback((id: string) => {
    Toast.push({
      tone: "info",
      title: "Open publication",
      body: `Editor route for publication ${id} ships with surface 5 (Publication Editor) in the next H07 batch.`,
    });
  }, []);

  return (
    <PublicationsSurface
      publications={FIXTURE_PUBLICATIONS}
      onNew={handleNew}
      onSelect={handleSelect}
    />
  );
}
