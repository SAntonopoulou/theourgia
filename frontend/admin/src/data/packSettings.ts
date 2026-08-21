/**
 * Pack options on the web, backed by the synced record store.
 *
 * The options a pack declares are read from the installed `.mbf` client-side
 * (`packModuleOptions`), and the value the practitioner chooses is written to the
 * record store as a `module-setting` entry (`moduleSettings`), so a choice made
 * here crosses to the phone once its sync half ships — the same record-backed
 * shape the adoration sets use. Reading the choices pages `/record/entries`;
 * every write is one `PUT /record/entries`.
 */

import { useQuery } from "@tanstack/react-query";
import {
  MODULE_SETTING_KIND,
  type ModuleSettingEntry,
  type PackModuleOptions,
  buildModuleSettingEntry,
  clearModuleSettingEntry,
  fetchPackFeed,
  installedPackDocuments,
  moduleSettingsFromEntries,
  packModuleOptions,
} from "@theourgia/shared";

import { apiGet, apiPut } from "../lib/api.js";
import { apiMethods } from "./api.js";

/** The option-bearing installed packs, read from their `.mbf` files. */
export async function fetchPackModuleOptions(): Promise<PackModuleOptions[]> {
  const [feed, installed] = await Promise.all([fetchPackFeed(), apiMethods.bundlesInstalled()]);
  const slugs = installed.bundles.map((b) => b.slug);
  const docs = await installedPackDocuments(feed, slugs);
  return packModuleOptions(docs);
}

export function usePackModuleOptions() {
  return useQuery<PackModuleOptions[], Error>({
    queryKey: ["pack-module-options"],
    queryFn: fetchPackModuleOptions,
  });
}

export const MODULE_SETTINGS_KEY = ["module-settings", "record"] as const;

type PullPage = {
  entries: ModuleSettingEntry[];
  next_since: number;
  more: boolean;
};

/** Every chosen module-option value in the record, keyed module→option→value. */
export async function fetchModuleSettings(): Promise<Map<string, string>> {
  const all: ModuleSettingEntry[] = [];
  let since = 0;
  for (;;) {
    const page = await apiGet<PullPage>(`/record/entries?since=${since}&limit=500`);
    for (const e of page.entries ?? []) {
      if (e.kind === MODULE_SETTING_KIND) all.push(e);
    }
    since = page.next_since;
    if (!page.more) break;
  }
  return moduleSettingsFromEntries(all);
}

export function useModuleSettings() {
  return useQuery<Map<string, string>, Error>({
    queryKey: MODULE_SETTINGS_KEY,
    queryFn: fetchModuleSettings,
  });
}

/** Choose (or clear, when value is null) a pack option, on the synced record. */
export async function setModuleChoice(input: {
  moduleId: string;
  optionKey: string;
  value: string | null;
}): Promise<void> {
  const now = new Date().toISOString();
  const entry =
    input.value === null
      ? clearModuleSettingEntry({ moduleId: input.moduleId, optionKey: input.optionKey, now })
      : buildModuleSettingEntry({
          moduleId: input.moduleId,
          optionKey: input.optionKey,
          value: input.value,
          now,
        });
  await apiPut("/record/entries", { entries: [entry] });
}
