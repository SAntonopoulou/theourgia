/**
 * Admin's singleton API client.
 *
 * Mock mode is opt-in via ``VITE_THEOURGIA_API_MOCK=1`` — the previous
 * heuristic (empty baseUrl → mock) silently made prod builds resolve
 * every request from local fixtures, so the SPA never talked to the
 * real backend even when deployed alongside it. The current default
 * is a same-origin live client (baseUrl=""), matching the reverse
 * proxy at /api/* → backend.
 *
 * Override baseUrl with VITE_THEOURGIA_API_BASE if the backend lives
 * on a different origin than the SPA (rare — a self-hoster with a
 * split-domain setup).
 */

import { ApiClient, api, defaultFixtures } from "@theourgia/shared";

const baseUrl: string = import.meta.env.VITE_THEOURGIA_API_BASE ?? "";
const mock = import.meta.env.VITE_THEOURGIA_API_MOCK === "1";

export const apiClient = new ApiClient({
  baseUrl,
  mock,
  fixtureFor: mock ? defaultFixtures : undefined,
});

export const apiMethods = api(apiClient);

export const API_MODE: "mock" | "live" = mock ? "mock" : "live";
export const API_BASE_URL = baseUrl;
