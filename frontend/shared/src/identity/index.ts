/**
 * Shared identity module — Identity types, acting-as context, demo data.
 *
 * Acting-as is the global "authoring as" state consumed by Editor, Blog,
 * Profile, memberships, SSO (per ``agent_onboarding.md`` § Identities).
 */

export { ActingAsProvider, useActingAs, useSetActingAs } from "./ActingAsContext.js";
export type { ActingAsProviderProps } from "./ActingAsContext.js";
export { ActingAsSwitcher } from "./ActingAsSwitcher.js";
export type { ActingAsSwitcherProps } from "./ActingAsSwitcher.js";
export { ACTING_AS_DEFAULT_ID, DEMO_IDENTITIES, DEMO_SURFACE_DEFAULTS } from "./mocks.js";
export type { Identity, KeyPair, SurfaceDefault, SurfaceKey } from "./types.js";
