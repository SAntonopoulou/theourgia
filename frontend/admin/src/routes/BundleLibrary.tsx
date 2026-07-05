/**
 * BundleLibrary — admin route at ``/bundles``.
 */

import { useNavigate } from "react-router-dom";

import {
  type BundleRow,
  BundleLibrarySurface,
  Toast,
  useTopbar,
} from "@theourgia/shared";

// Bundle library backend not yet built. Empty until it ships.
const BUNDLES: BundleRow[] = [];

export function BundleLibrary() {
  const navigate = useNavigate();
  useTopbar(() => ({ title: "Bundles" }));

  return (
    <BundleLibrarySurface
      bundles={BUNDLES}
      onBrowseRegistry={() => navigate("/registry")}
      onBundleClick={(id) => navigate(`/bundles/${id}`)}
      onBundleAction={() => {
        Toast.push({
          tone: "info",
          title: "Bundle action not wired",
          body: "The bundle install/remove backend is queued behind the registry work.",
        });
      }}
    />
  );
}
