/**
 * BundleDetail — admin route at ``/bundles/:id``.
 */

import { useNavigate, useParams } from "react-router-dom";

import {
  type BundleDataShape,
  BundleDetailSurface,
  useTopbar,
} from "@theourgia/shared";

const SHAPES: BundleDataShape[] = [
  {
    kind: "Correspondences",
    count: "36",
    sample:
      "Saturn-decan of Capricorn ↔ lead · Mars-decan of Aries ↔ iron · Sun-decan of Leo ↔ gold",
  },
  {
    kind: "Decan images",
    count: "36",
    sample:
      "“A man with a great body and red eyes, holding a sickle” (1st of Aries)",
  },
  {
    kind: "Face attributions",
    count: "36",
    sample:
      "1st face of Cancer ↔ Venus · 2nd face of Cancer ↔ Mercury · 3rd ↔ Moon",
  },
];

export function BundleDetail() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  useTopbar(() => ({ title: "Bundle" }));

  return (
    <BundleDetailSurface
      name="Decanic Faces"
      author="did:theourgia:hermetica.org:decan-press"
      license="CC-BY-SA-4.0"
      citationSource="Picatrix III.7 (Warburg ed.)"
      installedDate="14 March 2026"
      shapes={SHAPES}
      referencesLine={
        <>
          9 entries and 4 magical beings reference content from this bundle.
        </>
      }
      referenceCount={13}
      onBreadcrumbHome={() => navigate("/bundles")}
      onRemove={() => {
        // eslint-disable-next-line no-console
        console.info("[bundle-detail] remove", id);
      }}
    />
  );
}
