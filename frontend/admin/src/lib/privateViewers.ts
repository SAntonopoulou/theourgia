/**
 * Private-viewer grant lifecycle — TanStack Query hooks.
 *
 * Backend contract: `backend/theourgia/api/routers/v1/private_viewer_grants.py`.
 *
 * The issue mutation returns a `plaintext_credential` ONCE — the
 * consumer surface is responsible for surfacing it to the user
 * immediately and never persisting it client-side.
 */

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryResult,
} from "@tanstack/react-query";

import { apiGet, apiPost } from "./api.js";

export type ScopeKind = "tag" | "kind" | "specific" | "full";
export type DeliveryKind = "signed_link" | "email" | "out_of_band";

export interface PrivateViewerGrant {
  id: string;
  label: string;
  email_or_handle: string;
  scope_kind: ScopeKind;
  scope_payload: Record<string, unknown>;
  delivery: DeliveryKind;
  last_used_at: string | null;
  revoked_at: string | null;
  created_at: string;
}

interface GrantIssued {
  grant: PrivateViewerGrant;
  plaintext_credential: string;
}

interface GrantCreate {
  label: string;
  email_or_handle: string;
  scope_kind?: ScopeKind;
  scope_payload?: Record<string, unknown>;
  delivery?: DeliveryKind;
}

const GRANTS_KEY = ["private-viewers", "list"] as const;

export function usePrivateViewerGrants(): UseQueryResult<
  PrivateViewerGrant[],
  Error
> {
  return useQuery<PrivateViewerGrant[], Error>({
    queryKey: GRANTS_KEY,
    queryFn: () => apiGet<PrivateViewerGrant[]>("/private-viewers"),
  });
}

export function useIssueGrant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: GrantCreate) =>
      apiPost<GrantIssued>("/private-viewers", payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: GRANTS_KEY });
    },
  });
}

export function useRevokeGrant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiPost<PrivateViewerGrant>(`/private-viewers/${id}/revoke`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: GRANTS_KEY });
    },
  });
}
