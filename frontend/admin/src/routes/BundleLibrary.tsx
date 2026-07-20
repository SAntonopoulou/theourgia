/**
 * BundleLibrary — admin route at ``/bundles``.
 *
 * Wired to the live bundles backend (v1-011 endpoints, v1-020
 * wiring): install records come from ``GET /api/v1/bundles/installed``
 * via ``apiMethods.bundlesInstalled``.
 *
 * Designed affordances (H09 `Theourgia Bundle Library.dc.html`):
 * installed-bundle cards with the `‡` citation chip, the "Browse
 * registry" CTA, and a per-card kebab (Preview / Update / Remove).
 * Preview opens the detail surface. Update and Remove have no backend
 * endpoint yet — the toast says so plainly rather than pretending.
 */

import { useNavigate } from "react-router-dom";

import {
  BundleLibrarySurface,
  type BundleRow,
  type InstalledBundleRead,
  Toast,
  useApiCall,
  useTopbar,
} from "@theourgia/shared";

import { apiMethods } from "../data/api.js";
import { SurfaceError } from "../lib/SurfaceError.js";
import { SurfaceSkeleton } from "../lib/SurfaceSkeleton.js";

/** "13 entities" / "6 recipes · 3 entry templates" — from the
 *  install record's per-kind counts, never invented. */
export function bundleDataSummary(b: InstalledBundleRead): string {
  const parts = Object.entries(b.item_counts ?? {}).map(
    ([kind, count]) => `${count} ${kind.replaceAll("-", " ")}`,
  );
  if (parts.length === 0) return `${b.imported_item_count} items imported`;
  return parts.join(" · ");
}

function toRow(b: InstalledBundleRead): BundleRow {
  return {
    id: b.id,
    name: b.name,
    version: `v${b.version}`,
    author: b.author_name || b.attribution,
    citation: b.source_citation ?? b.license_spdx,
    description: b.description,
    dataSummary: bundleDataSummary(b),
  };
}

export function BundleLibrary() {
  const navigate = useNavigate();
  useTopbar(() => ({ title: "Bundles" }));

  const installed = useApiCall((signal) => apiMethods.bundlesInstalled({ signal }));

  if (installed.status === "loading") {
    return <SurfaceSkeleton rowCount={4} />;
  }

  if (installed.status === "error") {
    return (
      <SurfaceError
        title="Couldn't load your installed bundles."
        message={installed.error?.message ?? "Unknown error."}
        onRetry={() => {
          void installed.refresh();
        }}
      />
    );
  }

  const rows = (installed.data?.bundles ?? []).map(toRow);

  return (
    <BundleLibrarySurface
      bundles={rows}
      onBrowseRegistry={() => navigate("/registry")}
      onBundleClick={(id) => navigate(`/bundles/${id}`)}
      onBundleAction={(id, action) => {
        if (action === "preview") {
          navigate(`/bundles/${id}`);
          return;
        }
        Toast.push({
          tone: "info",
          title: action === "update" ? "Update not wired yet" : "Remove not wired yet",
          body: "The bundle update and remove endpoints have not shipped; nothing was changed.",
        });
      }}
    />
  );
}
