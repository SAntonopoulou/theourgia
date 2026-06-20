/**
 * Admin's singleton API client.
 *
 * Reads the configured base URL from ``VITE_THEOURGIA_API_BASE``. When
 * unset (the default in dev), the client runs in mock mode and resolves
 * fixtures locally — no backend connection required.
 */

import { ApiClient, api, defaultFixtures } from "@theourgia/shared";

const baseUrl: string = import.meta.env.VITE_THEOURGIA_API_BASE ?? "";
const mock = baseUrl.length === 0;

export const apiClient = new ApiClient({
  baseUrl,
  mock,
  fixtureFor: mock ? defaultFixtures : undefined,
});

export const apiMethods = api(apiClient);

export const API_MODE: "mock" | "live" = mock ? "mock" : "live";
export const API_BASE_URL = baseUrl;
