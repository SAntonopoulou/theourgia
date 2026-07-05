/**
 * BundleDetail — admin route at ``/bundles/:id``.
 *
 * Bundle backend not yet built (/api/v1/bundles returns 404). This
 * surface renders an honest empty state — name/author/license all
 * unknown until the bundle-detail endpoint ships. `useParams` is
 * kept so the route reads correctly.
 */

import { useNavigate, useParams } from "react-router-dom";

import {
  type BundleDataShape,
  BundleDetailSurface,
  useTopbar,
} from "@theourgia/shared";

const SHAPES: BundleDataShape[] = [];

export function BundleDetail() {
  const navigate = useNavigate();
  useParams<{ id: string }>();
  useTopbar(() => ({ title: "Bundle" }));

  return (
    <BundleDetailSurface
      name="(unknown bundle)"
      author="—"
      license="—"
      citationSource="—"
      installedDate="—"
      shapes={SHAPES}
      referencesLine={
        <>Bundle install/manage backend not yet built. Contents unknown.</>
      }
      referenceCount={0}
      onBreadcrumbHome={() => navigate("/bundles")}
      onRemove={() => {
        // Remove backend not yet built.
      }}
    />
  );
}
