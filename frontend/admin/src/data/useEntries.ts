/**
 * Entry-list data hooks.
 *
 * Wraps the API client's ``listEntries`` + ``createEntry`` methods in
 * ``useApiCall`` so surfaces get loading / error / refresh out of the
 * box. The contract is the same in mock and live mode; surface code
 * doesn't know which one is wired.
 */

import {
  type BookRecord,
  type EntityRecord,
  type EntryDetailRecord,
  type EntryRecord,
  type UpdateEntryBodyInput,
  useApiCall,
} from "@theourgia/shared";

import { apiMethods } from "./api.js";

export function useRecentEntries() {
  return useApiCall<EntryRecord[]>((signal) => apiMethods.listEntries({ signal }));
}

export function useEntities() {
  return useApiCall<EntityRecord[]>((signal) => apiMethods.listEntities({ signal }));
}

export function useBooks() {
  return useApiCall<BookRecord[]>((signal) => apiMethods.listBooks({ signal }));
}

export function createEntry(input: Parameters<typeof apiMethods.createEntry>[0]) {
  return apiMethods.createEntry(input);
}

/**
 * Fetch an entry's full detail (including the Tiptap-JSON body) for
 * the live Editor surface. `skip: true` defers the call — useful for
 * the demo route where there is no real entry to load.
 */
export function useEntryDetail(id: string | null) {
  return useApiCall<EntryDetailRecord>(
    (signal) => apiMethods.getEntryDetail(id ?? "", { signal }),
    { skip: id === null },
  );
}

export function updateEntryBody(id: string, input: UpdateEntryBodyInput) {
  return apiMethods.updateEntryBody(id, input);
}

export function publishEntry(id: string) {
  return apiMethods.publishEntry(id);
}
