/**
 * Sandbox lifecycle API — TanStack Query hooks.
 *
 * Backend contract: `backend/theourgia/api/routers/v1/sandbox.py`.
 */

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryResult,
} from "@tanstack/react-query";

import { apiDelete, apiGet, apiPost } from "./api.js";

export type SandboxKind = "bundle" | "plugin";

export interface Sandbox {
  id: string;
  kind: SandboxKind;
  label: string;
  source: string;
  notes: string;
  created_at: string;
  expires_at: string;
}

interface SandboxListResponse {
  sandboxes: Sandbox[];
}

const SANDBOX_QUERY_KEY = ["sandbox", "list"] as const;

export function useSandboxes(): UseQueryResult<Sandbox[], Error> {
  return useQuery<Sandbox[], Error>({
    queryKey: SANDBOX_QUERY_KEY,
    queryFn: async () => {
      const data = await apiGet<SandboxListResponse>("/sandbox");
      return data.sandboxes;
    },
  });
}

export interface ImportPayload {
  kind: SandboxKind;
  label: string;
  source: string;
  notes?: string;
}

export function useImportSandbox() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: ImportPayload) =>
      apiPost<Sandbox>("/sandbox/import", payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: SANDBOX_QUERY_KEY });
    },
  });
}

export function usePromoteSandbox() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) =>
      apiPost<Sandbox>(`/sandbox/${id}/promote`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: SANDBOX_QUERY_KEY });
    },
  });
}

export function useDiscardSandbox() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await apiDelete(`/sandbox/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: SANDBOX_QUERY_KEY });
    },
  });
}
