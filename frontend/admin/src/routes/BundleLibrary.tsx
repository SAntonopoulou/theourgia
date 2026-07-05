/**
 * BundleLibrary — admin route at ``/bundles``.
 */

import { useNavigate } from "react-router-dom";

import {
  type BundleRow,
  BundleLibrarySurface,
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
      onBundleAction={(id, action) => {
        // eslint-disable-next-line no-console
        console.info("[bundles] action", id, action);
      }}
    />
  );
}
