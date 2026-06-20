/**
 * User location hook.
 *
 * GET /api/v1/users/me/settings/location returns the signed-in user's
 * lat/lng (defaulting to Greenwich when no row exists). Requires auth —
 * returns null status when unauthenticated.
 */

import { type UserLocation, useApiCall } from "@theourgia/shared";

import { apiMethods } from "./api.js";

export function useMyLocation(opts: { enabled: boolean }) {
  return useApiCall<UserLocation>((signal) => apiMethods.getMyLocation({ signal }), {
    skip: !opts.enabled,
  });
}

export function putMyLocation(location: UserLocation): Promise<UserLocation> {
  return apiMethods.putMyLocation(location);
}
