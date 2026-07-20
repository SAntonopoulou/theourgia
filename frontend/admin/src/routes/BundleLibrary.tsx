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
 * Preview opens the detail surface. Remove (v1-033) confirms through
 * the house ConfirmDialog and calls ``DELETE /bundles/installed/{id}``
 * — the record goes, imported content stays (MBF tombstone-not-
 * erasure). Update still has no backend endpoint — the toast says so
 * plainly rather than pretending.
 */

import { useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  BundleLibrarySurface,
  type BundleRow,
  ConfirmDialog,
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
  // v1-033 — the Remove flow's confirm target.
  const [removeTarget, setRemoveTarget] = useState<BundleRow | null>(null);

  async function confirmRemove(): Promise<void> {
    const target = removeTarget;
    setRemoveTarget(null);
    if (target === null) return;
    try {
      const response = await apiMethods.bundleUninstall(target.id);
      Toast.push({
        tone: "success",
        title: "Bundle removed",
        // The backend's own retention statement — never invented.
        body: response.detail,
      });
      await installed.refresh();
    } catch (cause) {
      Toast.push({
        tone: "error",
        title: "Couldn't remove the bundle",
        body: cause instanceof Error ? cause.message : "Unknown error",
      });
    }
  }

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
    <>
      <BundleLibrarySurface
        bundles={rows}
        onBrowseRegistry={() => navigate("/registry")}
        onBundleClick={(id) => navigate(`/bundles/${id}`)}
        onBundleAction={(id, action) => {
          if (action === "preview") {
            navigate(`/bundles/${id}`);
            return;
          }
          if (action === "remove") {
            setRemoveTarget(rows.find((r) => r.id === id) ?? null);
            return;
          }
          Toast.push({
            tone: "info",
            title: "Update not wired yet",
            body: "The bundle update endpoint has not shipped; nothing was changed.",
          });
        }}
      />
      {/* Remove is warn-toned, never --danger: nothing destructive
          happens to vault content (tombstone, not erasure). */}
      <ConfirmDialog
        open={removeTarget !== null}
        tone="neutral"
        title={`Remove ${removeTarget?.name ?? "this bundle"}?`}
        body="Removes the install record. Content imported from this bundle stays in your vault — bundle removal is a tombstone, not an erasure."
        confirmLabel="Remove bundle"
        onConfirm={() => void confirmRemove()}
        onCancel={() => setRemoveTarget(null)}
      />
    </>
  );
}
