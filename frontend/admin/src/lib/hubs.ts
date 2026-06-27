/**
 * Hub lifecycle + membership — TanStack Query hooks.
 *
 * Backend contract: `backend/theourgia/api/routers/v1/hubs.py`.
 */

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryResult,
} from "@tanstack/react-query";

import { apiDelete, apiGet, apiPost } from "./api.js";

export type MembershipPolicy =
  | "private"
  | "invite_only"
  | "request_to_join"
  | "open";

export type HubRole =
  | "hub_admin"
  | "hub_officer"
  | "hub_curator"
  | "hub_member"
  | "hub_observer";

export interface Hub {
  id: string;
  slug: string;
  name: string;
  tagline: string | null;
  description: string;
  owner_id: string | null;
  membership_policy: MembershipPolicy;
  accepts_sso: boolean;
  auto_curates: boolean;
  public_banner_url: string | null;
  public_tradition_tags: string[];
  created_at: string;
  updated_at: string;
}

export interface Membership {
  user_id: string;
  hub_id: string;
  role: HubRole;
  display_name: string;
  joined_at: string;
}

const HUBS_KEY = ["hubs", "list"] as const;
const hubKey = (id: string) => ["hubs", "single", id] as const;
const membersKey = (id: string) => ["hubs", "members", id] as const;

export function useHubs(): UseQueryResult<Hub[], Error> {
  return useQuery<Hub[], Error>({
    queryKey: HUBS_KEY,
    queryFn: () => apiGet<Hub[]>("/hubs"),
  });
}

export function useHub(id: string | undefined): UseQueryResult<Hub, Error> {
  return useQuery<Hub, Error>({
    queryKey: hubKey(id ?? ""),
    enabled: !!id,
    queryFn: () => apiGet<Hub>(`/hubs/${id}`),
  });
}

export function useHubMembers(
  id: string | undefined,
): UseQueryResult<Membership[], Error> {
  return useQuery<Membership[], Error>({
    queryKey: membersKey(id ?? ""),
    enabled: !!id,
    queryFn: () => apiGet<Membership[]>(`/hubs/${id}/members`),
  });
}

export function useChangeMemberRole(hubId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      userId,
      role,
    }: {
      userId: string;
      role: HubRole;
    }) =>
      apiPost<Membership>(`/hubs/${hubId}/members/${userId}/role`, {
        role,
      }),
    onSuccess: () => {
      if (hubId) {
        qc.invalidateQueries({ queryKey: membersKey(hubId) });
      }
    },
  });
}

export function useRemoveMember(hubId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (userId: string) => {
      await apiDelete(`/hubs/${hubId}/members/${userId}`);
    },
    onSuccess: () => {
      if (hubId) {
        qc.invalidateQueries({ queryKey: membersKey(hubId) });
      }
    },
  });
}
