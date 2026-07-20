/**
 * BundleDetail — admin route at ``/bundles/:id``.
 *
 * Wired to the live bundles backend (v1-020): the record comes from
 * ``GET /api/v1/bundles/installed``, matched by id.
 *
 * Honesty notes:
 *   - The Sample column has no persisted data (the install record
 *     keeps the manifest envelope, not the payload items), so it
 *     renders an em dash rather than inventing content.
 *   - Vault-reference counting has no backend yet; the references
 *     line says so and the count renders 0.
 *   - Remove has no endpoint yet — the toast says so plainly.
 */

import { useNavigate, useParams } from "react-router-dom";

import {
  type BundleDataShape,
  BundleDetailSurface,
  Toast,
  useApiCall,
  useTopbar,
} from "@theourgia/shared";

import { apiMethods } from "../data/api.js";
import { SurfaceError } from "../lib/SurfaceError.js";
import { SurfaceSkeleton } from "../lib/SurfaceSkeleton.js";

function fmtDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return `${d.getDate()} ${d.toLocaleDateString("en-GB", { month: "short" })} ${d.getFullYear()}`;
}

export function BundleDetail() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  useTopbar(() => ({ title: "Bundle" }));

  const installed = useApiCall((signal) => apiMethods.bundlesInstalled({ signal }));

  if (installed.status === "loading") {
    return <SurfaceSkeleton rowCount={4} />;
  }

  if (installed.status === "error") {
    return (
      <SurfaceError
        title="Couldn't load this bundle."
        message={installed.error?.message ?? "Unknown error."}
        onRetry={() => {
          void installed.refresh();
        }}
      />
    );
  }

  const bundle = (installed.data?.bundles ?? []).find((b) => b.id === id);

  if (!bundle) {
    return (
      <SurfaceError
        title="That bundle isn't in your vault."
        message="No install record matches this address."
        onRetry={() => navigate("/bundles")}
        retryLabel="Back to bundles"
      />
    );
  }

  const shapes: BundleDataShape[] = Object.entries(bundle.item_counts ?? {}).map(
    ([kind, count]) => ({
      kind: kind.replaceAll("-", " "),
      count: String(count),
      sample: "—",
    }),
  );

  return (
    <BundleDetailSurface
      name={bundle.name}
      author={bundle.author_name || bundle.attribution}
      license={bundle.license_spdx || "—"}
      citationSource={bundle.source_citation ?? bundle.license_spdx ?? "—"}
      installedDate={fmtDate(bundle.installed_at)}
      shapes={shapes}
      referencesLine={
        <>
          Vault references to this bundle&rsquo;s content are not tracked yet — the count below
          stays at zero until that backend ships.
        </>
      }
      referenceCount={0}
      onBreadcrumbHome={() => navigate("/bundles")}
      onRemove={() => {
        Toast.push({
          tone: "info",
          title: "Remove not wired yet",
          body: "The bundle remove endpoint has not shipped; nothing was changed.",
        });
      }}
    />
  );
}
