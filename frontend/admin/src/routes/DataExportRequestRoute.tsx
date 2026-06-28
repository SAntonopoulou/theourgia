/**
 * DataExportRequest — H10 B2 admin route.
 *
 * Calls `/api/v1/me/data-export`, which for v1 returns the archive
 * JSON inline (rule 45's "async + emailed" lands when the background
 * worker pipeline is wired). On success the surface flips to its
 * "Request received" state; the JSON archive is dispatched as a
 * downloadable blob so the practitioner has the artefact in hand.
 *
 * Mounted at /settings/data-export.
 */

import {
  DataExportRequestSurface,
  type DataExportRequestSurfaceProps,
  useTopbar,
} from "@theourgia/shared";
import { useMutation, useQuery } from "@tanstack/react-query";

import { apiMethods } from "../data/api.js";

type Format = Parameters<NonNullable<DataExportRequestSurfaceProps["onSubmit"]>>[0];

function downloadArchive(archive: Record<string, unknown>) {
  // v1 always returns JSON. The MBF (Markdown-bundled-folder) format
  // arrives when the background-worker export pipeline lands.
  const json = JSON.stringify(archive, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `theourgia-export-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function DataExportRequestRoute() {
  useTopbar(() => ({
    title: "Export your data",
    subtitle: "Take everything with you, in your own format",
  }));

  const meQuery = useQuery({
    queryKey: ["me"],
    queryFn: async () => apiMethods.getMe(),
    staleTime: 60_000,
  });

  const mutation = useMutation({
    mutationFn: async (_format: Format) => {
      const response = await apiMethods.requestDataExport();
      downloadArchive(response.archive);
      return response;
    },
  });

  return (
    <DataExportRequestSurface
      email={meQuery.data?.email ?? "your email"}
      requested={mutation.isSuccess}
      busy={mutation.isPending}
      onSubmit={(format) => mutation.mutate(format)}
    />
  );
}
