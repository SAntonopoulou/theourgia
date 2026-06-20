/**
 * Entry-list data hooks.
 *
 * Wraps the API client's ``listEntries`` + ``createEntry`` methods in
 * ``useApiCall`` so surfaces get loading / error / refresh out of the
 * box. The contract is the same in mock and live mode; surface code
 * doesn't know which one is wired.
 */

import { type EntryRecord, useApiCall } from "@theourgia/shared";

import { apiMethods } from "./api.js";

export function useRecentEntries() {
  return useApiCall<EntryRecord[]>((signal) => apiMethods.listEntries({ signal }));
}

export function createEntry(input: Parameters<typeof apiMethods.createEntry>[0]) {
  return apiMethods.createEntry(input);
}
