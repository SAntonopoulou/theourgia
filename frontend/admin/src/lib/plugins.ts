/**
 * Plugin lifecycle API — TanStack Query hooks.
 *
 * The H09 InstalledPlugins surface and the H09 sandbox surfaces consume
 * these hooks. The worked example for the rest of the admin API-wiring
 * sweep lives in `routes/InstalledPlugins.tsx`.
 *
 * Wire contract per `backend/theourgia/api/routers/v1/plugins.py`.
 */

import { type UseQueryResult, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiDelete, apiGet, apiPost } from "./api.js";

export interface CapabilityGrant {
  capability: string;
  granted_at: string;
}

export interface PluginInstall {
  id: string;
  name: string;
  version: string;
  author: string;
  license: string;
  description: string;
  homepage: string | null;
  source: string;
  state: "installed" | "active" | "inactive" | "error" | "uninstalling";
  last_error: string | null;
  activated_at: string | null;
  installed_at: string;
  capabilities: CapabilityGrant[];
  /** Raw manifest as declared by the plugin bundle. May include a
   *  ``config_schema`` object describing user-configurable fields. */
  manifest: Record<string, unknown>;
}

interface InstalledListResponse {
  plugins: PluginInstall[];
}

const PLUGINS_QUERY_KEY = ["plugins", "installed"] as const;

export function useInstalledPlugins(): UseQueryResult<PluginInstall[], Error> {
  return useQuery<PluginInstall[], Error>({
    queryKey: PLUGINS_QUERY_KEY,
    queryFn: async () => {
      const data = await apiGet<InstalledListResponse>("/plugins/installed");
      return data.plugins;
    },
  });
}

/**
 * Install a plugin straight from the registry (v1-032).
 *
 * The backend fetches the release archive, verifies sha256 + the
 * author's Ed25519 signature against the registry-pinned key, unpacks
 * it defensively, and records the install — unsigned or tampered
 * releases are refused with a 400 whose detail names the reason.
 * `version` omitted → the newest accepted release.
 */
export function useInstallFromRegistry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      slug,
      version,
      approvedCapabilities,
    }: {
      slug: string;
      version?: string;
      approvedCapabilities?: string[];
    }) =>
      apiPost<PluginInstall>("/plugins/install-from-registry", {
        slug,
        ...(version ? { version } : {}),
        ...(approvedCapabilities ? { approved_capabilities: approvedCapabilities } : {}),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: PLUGINS_QUERY_KEY });
    },
  });
}

export type PluginAction = "activate" | "deactivate" | "uninstall";

export function usePluginAction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      action,
    }: {
      id: string;
      action: PluginAction;
    }) => {
      if (action === "uninstall") {
        await apiDelete(`/plugins/${id}`);
        return null;
      }
      return apiPost<PluginInstall>(`/plugins/${id}/${action}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: PLUGINS_QUERY_KEY });
    },
  });
}

interface ConfigureResponse {
  updated_keys: string[];
}

export function useConfigurePlugin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      settings,
    }: {
      id: string;
      settings: Record<string, unknown>;
    }) =>
      apiPost<ConfigureResponse>(`/plugins/${id}/configure`, {
        settings,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: PLUGINS_QUERY_KEY });
    },
  });
}
