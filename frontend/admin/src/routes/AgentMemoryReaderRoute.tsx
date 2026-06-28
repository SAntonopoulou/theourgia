/**
 * AgentMemoryReader — H10 C9 admin route (live data).
 *
 * Reads + edits the markdown files in the install's memory dir
 * (`/srv/theourgia/agents/<vault>/<install>/...`). Daemon endpoints:
 *   GET    /installs/{id}/memory              — list
 *   GET    /installs/{id}/memory/{name}       — read body
 *   PUT    /installs/{id}/memory/{name}       — write/overwrite
 *
 * Mounted at /agents/:installId/memory.
 */

import {
  AgentMemoryReaderSurface,
  type MemoryFileMeta,
  useTopbar,
} from "@theourgia/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";

import { apiMethods } from "../data/api.js";

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function formatModified(unixSeconds: number): string {
  const then = unixSeconds * 1000;
  const delta = Math.max(0, Date.now() - then);
  const minutes = Math.floor(delta / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} day${days === 1 ? "" : "s"} ago`;
  return new Date(then).toLocaleDateString();
}

export function AgentMemoryReaderRoute() {
  const { installId } = useParams<{ installId: string }>();
  const queryClient = useQueryClient();
  const [activeFile, setActiveFile] = useState<string>("");

  useTopbar(() => ({
    title: "Memory",
    subtitle: installId ?? "—",
  }));

  const listQuery = useQuery({
    queryKey: ["install-memory-list", installId],
    queryFn: async () => {
      if (!installId) throw new Error("missing installId");
      return apiMethods.listInstallMemory(installId);
    },
    enabled: Boolean(installId),
    staleTime: 15_000,
  });

  const files = useMemo<MemoryFileMeta[]>(() => {
    const rows = listQuery.data?.files ?? [];
    return rows.map<MemoryFileMeta>((f) => ({
      name: f.name,
      meta: `${formatBytes(f.size_bytes)} · ${formatModified(f.modified_at)}`,
    }));
  }, [listQuery.data]);

  // Auto-pick the first file when the list loads + nothing's active.
  if (!activeFile && files.length > 0) {
    setActiveFile(files[0]!.name);
  }

  const contentQuery = useQuery({
    queryKey: ["install-memory-content", installId, activeFile],
    queryFn: async () => {
      if (!installId || !activeFile) throw new Error("missing");
      return apiMethods.readInstallMemory(installId, activeFile);
    },
    enabled: Boolean(installId) && Boolean(activeFile),
  });

  const saveMutation = useMutation({
    mutationFn: async ({ name, body }: { name: string; body: string }) => {
      if (!installId) throw new Error("missing installId");
      return apiMethods.writeInstallMemory(installId, name, body);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["install-memory-list", installId],
      });
      queryClient.invalidateQueries({
        queryKey: ["install-memory-content", installId, activeFile],
      });
    },
  });

  return (
    <AgentMemoryReaderSurface
      files={files}
      activeFile={activeFile}
      content={contentQuery.data?.body ?? ""}
      onSelectFile={setActiveFile}
      onAdd={() => {
        const name = window.prompt("New file name (e.g. notes.md)") ?? "";
        if (!name) return;
        saveMutation.mutate({ name, body: "" });
        setActiveFile(name);
      }}
      onArchive={(name) => {
        // No archive endpoint yet — for v1 we surface a hint to the
        // operator that this is queued. Hard-delete via DELETE is wired
        // in the daemon but archive (move-to-trash semantics) isn't.
        console.info("AgentMemory · archive requested · endpoint queued", {
          name,
        });
      }}
      onSave={(name, body) => saveMutation.mutate({ name, body })}
    />
  );
}
