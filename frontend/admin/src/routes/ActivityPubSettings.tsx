/**
 * ActivityPubSettings — admin route at
 * ``/settings/activitypub``.
 *
 * Renders the H08 §S3 Cluster B surface 16 against fixtures.
 *
 * Wiring deferred to Phase 13 backend:
 *
 *   * GET  /api/v1/activitypub/settings — current draft (or
 *     defaults if the vault has never enabled AP).
 *   * POST /api/v1/activitypub/settings — save draft. Server
 *     records the enablement-toggle as an audit event regardless
 *     of success.
 *   * POST /api/v1/activitypub/enable — fires from the
 *     first-activation danger-confirm CTA. Distinct endpoint so
 *     the server can perform the federation handshake before
 *     persisting the flip.
 */

import {
  ActivityPubSettingsSurface,
  type ApsSettingsDraft,
  useTopbar,
} from "@theourgia/shared";

export function ActivityPubSettings() {
  useTopbar(() => ({ title: "Fediverse integration" }));

  return (
    <ActivityPubSettingsSurface
      webFingerHandle="@aspasia@hearth.sophia.example"
      onSave={(draft: ApsSettingsDraft) => {
        // TODO Phase 13 — POST /settings.
        // eslint-disable-next-line no-console
        console.info("[activitypub] save", draft);
      }}
      onDiscard={() => {
        // TODO Phase 13 — reset draft to last-saved state. The
        // route would re-mount the surface with the GET payload.
        // eslint-disable-next-line no-console
        console.info("[activitypub] discard");
      }}
    />
  );
}
