/**
 * WebFingerVerify — admin route at ``/verify``.
 *
 * Renders the H08 §S3 Cluster B surface 19 against a fixture
 * resolver that pretends success.
 *
 * Wiring deferred to Phase 13 backend:
 *
 *   * GET /api/v1/activitypub/webfinger?resource={handle}
 *     — returns { actor_url, key_fingerprint, signing_key_pem }
 *     on success · 404 with a structured error on failure. The
 *     route surfaces only what the user needs: the actor URL +
 *     the fingerprint, NEVER the full key PEM.
 */

import {
  type WfvResult,
  WebFingerVerifySurface,
  useTopbar,
} from "@theourgia/shared";

export function WebFingerVerify() {
  useTopbar(() => ({ title: "Verify identity" }));

  return (
    <WebFingerVerifySurface
      initialHandle="@aspasia@hearth.sophia.example"
      onRunCheck={async (handle): Promise<WfvResult> => {
        // TODO Phase 13 — fetch /api/v1/.../webfinger?resource=…
        // For the fixture we simulate a 700ms round-trip so the
        // loading state has visible behaviour.
        await new Promise((r) => setTimeout(r, 700));
        if (handle.endsWith("@hearth.sophia.example")) {
          return {
            outcome: "pass",
            actorUrl:
              "https://hearth.sophia.example/users/aspasia",
            keyFingerprint:
              "SHA256:7a3f 9c21 04bb e8d5 · 2f6a 90c3 11de 4b7f",
          };
        }
        const instance =
          handle.split("@").slice(-1)[0] ?? "instance.tld";
        return { outcome: "fail", instance };
      }}
    />
  );
}
