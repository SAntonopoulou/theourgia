/**
 * Shared TanStack Query client.
 *
 * Conventions for the admin SPA:
 *
 *   · staleTime is 30s by default — most surfaces tolerate slightly
 *     stale data while the magician moves between routes.
 *   · retry is OFF — we surface failures inline rather than burning
 *     network on retries. Mutations are user-initiated and the user
 *     can re-tap.
 *   · refetchOnWindowFocus is OFF — admins are running this in their
 *     own tab; aggressive refetch is noise.
 *
 * If a specific surface needs different behaviour, override per-query.
 */

import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: false,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: false,
    },
  },
});
