/**
 * Fallback location for the Today surface's celestial calculations.
 *
 * Identity comes from ``useAuth().session`` (b108-2ef). Location comes
 * from ``useMyLocation()`` (GET /api/v1/users/me/settings/location).
 * When location loads fails (not signed in, no location saved), this
 * Greenwich constant keeps the astrolabe rendering rather than
 * crashing. The MOCK_IDENTITY export was removed in b108-2ex — the
 * shell now sources identity from the real session.
 */

/** Greenwich Observatory by default — overridden once user location loads. */
export const MOCK_LOCATION = { lat: 51.4769, lng: 0 };
