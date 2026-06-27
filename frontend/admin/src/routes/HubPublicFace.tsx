/**
 * HubPublicFace — admin-side preview route at ``/hub/:slug``.
 *
 * The H08 brief positions this as a **public** surface (no
 * VaultNav, no app shell). Even so, the admin app exposes the
 * preview here so practitioners can verify how their hub's
 * outward face renders before publishing. Production hosting
 * will serve the public asset under a different origin / route
 * once the Phase 12 backend lands.
 *
 * Wiring deferred to Phase 12 backend:
 *
 *   * GET /hub/{slug} → resolves the slug to a Hub + featured
 *     items + the viewer's membership state.
 *   * POST /api/v1/hubs/{id}/invitations → fires when Join /
 *     Request to join is clicked on an enabled CTA.
 */

import { useParams } from "react-router-dom";

import {
  type HubFeaturedItem,
  HubPublicFaceSurface,
} from "@theourgia/shared";

const FEATURED: HubFeaturedItem[] = [
  {
    id: "feat-ephesia",
    title: "On the Ephesia Grammata",
    author: "Soror Aurora",
    href: "/reader/aurora/ephesia-grammata",
  },
  {
    id: "feat-deipnon",
    title: "Keeping the Deipnon",
    author: "Diotima",
    href: "/reader/diotima/keeping-the-deipnon",
  },
  {
    id: "feat-lamp",
    title: "The Lamp at the Crossroads",
    author: "Soror Ευ. Α.",
    href: "/reader/sophia/lamp-at-the-crossroads",
  },
];

export function HubPublicFace() {
  const { slug } = useParams<{ slug: string }>();
  return (
    <HubPublicFaceSurface
      hubName="The Crossroads Coven"
      motto="Tending Hekate's lamp, together."
      traditions={["Hellenic"]}
      establishedAt="March 2024"
      monogram="Κ"
      about={
        "A hub for practitioners keeping the crossroads. We share workings, compare notes on the Deipnon, and tend a shared egregore. New members are welcome — read a little of our featured work below, then knock."
      }
      featured={FEATURED}
      policy="open-with-approval"
      viewer="anonymous"
      footerEpigraph="The road is long, and she keeps it longer."
      onJoin={() => {
        // TODO Phase 12 — POST /api/v1/hubs/{slug}/invitations.
        // eslint-disable-next-line no-console
        console.info("[hub-public-face] request to join", slug);
      }}
    />
  );
}
