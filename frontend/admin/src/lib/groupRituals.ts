/**
 * Group ritual lifecycle — TanStack Query hooks.
 *
 * Backend contract: `backend/theourgia/api/routers/v1/group_rituals.py`.
 *
 * Lifecycle: DRAFT → INVITED → IN_PROGRESS → COMPLETED · with side
 * branches for CANCELLED. The surface routes (Scheduler / Coordination
 * / PostMortem) each consume a different stage.
 */

import { type UseQueryResult, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiGet, apiPost } from "./api.js";

export type RitualLocation = "dispersed" | "convergent" | "hybrid";
export type RitualStatus = "draft" | "invited" | "in_progress" | "completed" | "cancelled";

export interface GroupRitual {
  id: string;
  /** Null on a mirror row — the ritual is organized on another
   *  instance (`origin_did` names the remote organizer). */
  organizer_id: string | null;
  hub_id: string | null;
  title: string;
  description: string | null;
  scheduled_for_utc: string;
  location: RitualLocation;
  location_detail: string | null;
  shared_script: string | null;
  correspondences_payload: Record<string, unknown>;
  egregore_entity_id: string | null;
  egregore_name: string | null;
  origin_did: string | null;
  status: RitualStatus;
  created_at: string;
  updated_at: string;
}

/** Exactly one of author_id (local) / author_did (remote vault DID)
 *  is set — the merged collective log carries both kinds. */
export interface Fragment {
  id: string;
  author_id: string | null;
  author_did: string | null;
  body: string;
  posted_at_utc: string;
}

export interface Reflection {
  id: string;
  author_id: string | null;
  author_did: string | null;
  body: string;
  created_at: string;
}

const LIST_KEY = ["group-rituals", "list"] as const;
const detailKey = (id: string) => ["group-rituals", "detail", id] as const;
const fragmentsKey = (id: string) => ["group-rituals", "fragments", id] as const;
const reflectionsKey = (id: string) => ["group-rituals", "reflections", id] as const;

export function useGroupRituals(): UseQueryResult<GroupRitual[], Error> {
  return useQuery<GroupRitual[], Error>({
    queryKey: LIST_KEY,
    queryFn: () => apiGet<GroupRitual[]>("/group-rituals"),
  });
}

export function useGroupRitual(id: string | undefined): UseQueryResult<GroupRitual, Error> {
  return useQuery<GroupRitual, Error>({
    queryKey: detailKey(id ?? ""),
    enabled: !!id,
    queryFn: () => apiGet<GroupRitual>(`/group-rituals/${id}`),
  });
}

export function useFragments(id: string | undefined): UseQueryResult<Fragment[], Error> {
  return useQuery<Fragment[], Error>({
    queryKey: fragmentsKey(id ?? ""),
    enabled: !!id,
    queryFn: () => apiGet<Fragment[]>(`/group-rituals/${id}/fragments`),
  });
}

export function useReflections(id: string | undefined): UseQueryResult<Reflection[], Error> {
  return useQuery<Reflection[], Error>({
    queryKey: reflectionsKey(id ?? ""),
    enabled: !!id,
    queryFn: () => apiGet<Reflection[]>(`/group-rituals/${id}/reflections`),
  });
}

export interface CreateRitualPayload {
  title: string;
  description?: string | null;
  scheduled_for_utc: string;
  hub_id?: string | null;
  location?: RitualLocation;
  location_detail?: string | null;
  shared_script?: string | null;
  correspondences_payload?: Record<string, unknown>;
}

export function useCreateRitual() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateRitualPayload) => apiPost<GroupRitual>("/group-rituals", payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: LIST_KEY });
    },
  });
}

export interface InvitePayload {
  /** Local practitioners, by user id. */
  userIds?: string[];
  /** Remote practitioners, by vault DID
   *  (`did:theourgia:{host}:vault:{slug}`). Each queues a signed
   *  `ritual.schedule` to the peer instance. */
  remoteDids?: string[];
}

export function useInviteToRitual(id: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ userIds = [], remoteDids = [] }: InvitePayload) =>
      apiPost<GroupRitual>(`/group-rituals/${id}/invite`, {
        user_ids: userIds,
        remote_dids: remoteDids,
      }),
    onSuccess: () => {
      if (id) qc.invalidateQueries({ queryKey: detailKey(id) });
    },
  });
}

export function useAddFragment(id: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: string) => apiPost<Fragment>(`/group-rituals/${id}/fragments`, { body }),
    onSuccess: () => {
      if (id) qc.invalidateQueries({ queryKey: fragmentsKey(id) });
    },
  });
}

export function useAddReflection(id: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    // Backend route is singular (write-once per author).
    mutationFn: (body: string) => apiPost<Reflection>(`/group-rituals/${id}/reflection`, { body }),
    onSuccess: () => {
      if (id) qc.invalidateQueries({ queryKey: reflectionsKey(id) });
    },
  });
}

export function useCompleteRitual(id: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => apiPost(`/group-rituals/${id}/complete`),
    onSuccess: () => {
      if (id) qc.invalidateQueries({ queryKey: detailKey(id) });
      qc.invalidateQueries({ queryKey: LIST_KEY });
    },
  });
}

export interface DeclareEgregorePayload {
  name: string;
  summary?: string | null;
}

/**
 * Declare the ritual a servitor/egregore creation event (v1-031).
 * Registers the EGREGORE entity in every local participating vault,
 * links it on the ritual, and broadcasts the registration to remote
 * participants. 409 once declared. Organizer-only; during or after
 * the working.
 */
export function useDeclareEgregore(id: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: DeclareEgregorePayload) =>
      apiPost<GroupRitual>(`/group-rituals/${id}/declare-egregore`, payload),
    onSuccess: () => {
      if (id) qc.invalidateQueries({ queryKey: detailKey(id) });
      qc.invalidateQueries({ queryKey: LIST_KEY });
    },
  });
}
