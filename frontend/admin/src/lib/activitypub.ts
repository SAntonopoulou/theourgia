/**
 * ActivityPub settings + followers — TanStack Query hooks.
 *
 * Backend contract: `backend/theourgia/api/routers/v1/activitypub.py`.
 */

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryResult,
} from "@tanstack/react-query";

import { apiGet, apiPost } from "./api.js";

export type FollowerApproval = "manual" | "auto";

export interface ApSettings {
  enabled: boolean;
  display_name_override: string | null;
  bio_override: string | null;
  follower_approval: FollowerApproval;
  broadcast_creates: boolean;
  broadcast_updates: boolean;
  broadcast_deletes: boolean;
  object_type_mapping: Record<string, string>;
  created_at: string;
  updated_at: string;
}

export interface ApSettingsUpdate {
  enabled?: boolean | null;
  display_name_override?: string | null;
  bio_override?: string | null;
  follower_approval?: FollowerApproval | null;
  broadcast_creates?: boolean | null;
  broadcast_updates?: boolean | null;
  broadcast_deletes?: boolean | null;
  object_type_mapping?: Record<string, string> | null;
}

const SETTINGS_KEY = ["activitypub", "settings"] as const;
const FOLLOWERS_KEY = ["activitypub", "followers"] as const;

export function useApSettings(): UseQueryResult<ApSettings, Error> {
  return useQuery<ApSettings, Error>({
    queryKey: SETTINGS_KEY,
    queryFn: () => apiGet<ApSettings>("/activitypub/settings"),
  });
}

export function useUpdateApSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: ApSettingsUpdate) => {
      // The backend uses PATCH; apiPost does POST. We expose a small
      // PATCH wrapper inline to keep the lib surface small.
      const res = await fetch("/api/v1/activitypub/settings", {
        method: "PATCH",
        credentials: "include",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `PATCH failed (HTTP ${res.status})`);
      }
      return (await res.json()) as ApSettings;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: SETTINGS_KEY });
    },
  });
}

export interface ApFollower {
  id: string;
  follower_did: string;
  display_name: string | null;
  inbox_url: string;
  followed_at: string;
}

export function useApFollowers(): UseQueryResult<ApFollower[], Error> {
  return useQuery<ApFollower[], Error>({
    queryKey: FOLLOWERS_KEY,
    queryFn: () => apiGet<ApFollower[]>("/activitypub/followers"),
  });
}

// Keep the unused-import lint happy when the import is conditional
void apiPost;
