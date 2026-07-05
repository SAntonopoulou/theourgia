/**
 * WebFingerVerify — admin route at ``/verify``.
 *
 * Live-wired: parses "@name@instance.tld" or "name@instance.tld",
 * requests the standard WebFinger endpoint on the target instance
 * (`https://{instance}/.well-known/webfinger?resource=acct:{name}@{instance}`),
 * and reports pass/fail. Cross-origin: browsers make the request
 * directly; instances that don't set CORS on WebFinger will error
 * out and we surface the failure honestly instead of pretending
 * success.
 *
 * The key fingerprint is not part of the standard WebFinger response
 * — it lives on the actor JSON that WebFinger's `self` link points
 * to. This surface follows the link chain for cross-instance
 * verification: WebFinger → actor JSON-LD → publicKey.id +
 * publicKeyPem hash.
 */

import {
  type WfvResult,
  WebFingerVerifySurface,
  useTopbar,
} from "@theourgia/shared";

interface WebFingerLink {
  rel: string;
  type?: string;
  href?: string;
}

interface WebFingerResponse {
  subject: string;
  aliases?: string[];
  links?: WebFingerLink[];
}

function parseHandle(input: string): { name: string; instance: string } | null {
  const trimmed = input.trim().replace(/^@/, "");
  const parts = trimmed.split("@");
  if (parts.length !== 2 || !parts[0] || !parts[1]) return null;
  return { name: parts[0], instance: parts[1] };
}

async function sha256Fingerprint(pem: string): Promise<string> {
  const enc = new TextEncoder().encode(pem);
  const hash = await crypto.subtle.digest("SHA-256", enc);
  const bytes = Array.from(new Uint8Array(hash));
  const hex = bytes.map((b) => b.toString(16).padStart(2, "0")).join("");
  const chunks = hex.match(/.{1,4}/g) ?? [];
  return `SHA256:${chunks.slice(0, 4).join(" ")} · ${chunks.slice(4, 8).join(" ")}`;
}

export function WebFingerVerify() {
  useTopbar(() => ({
    title: "Verify identity",
    subtitle: "Live WebFinger + actor JSON-LD probe",
  }));

  return (
    <WebFingerVerifySurface
      initialHandle="@soror-eu-a@theourgia.com"
      onRunCheck={async (raw): Promise<WfvResult> => {
        const parsed = parseHandle(raw);
        if (!parsed) {
          return { outcome: "fail", instance: raw };
        }
        const { name, instance } = parsed;
        const acct = `acct:${name}@${instance}`;
        const wfUrl = `https://${instance}/.well-known/webfinger?resource=${encodeURIComponent(acct)}`;
        try {
          const wfRes = await fetch(wfUrl, {
            headers: { Accept: "application/jrd+json" },
          });
          if (!wfRes.ok) {
            return { outcome: "fail", instance };
          }
          const wf = (await wfRes.json()) as WebFingerResponse;
          const selfLink = wf.links?.find(
            (l) => l.rel === "self" && l.type?.includes("activity"),
          );
          const actorUrl = selfLink?.href;
          if (!actorUrl) {
            return { outcome: "fail", instance };
          }

          // Follow the actor link to grab the publicKey PEM and compute
          // a display fingerprint. If the fetch fails, we still report
          // the actor URL as a partial success.
          let keyFingerprint =
            "actor found · key fingerprint unavailable (CORS or missing publicKey)";
          try {
            const actorRes = await fetch(actorUrl, {
              headers: { Accept: "application/activity+json" },
            });
            if (actorRes.ok) {
              const actor = (await actorRes.json()) as {
                publicKey?: { publicKeyPem?: string };
              };
              const pem = actor.publicKey?.publicKeyPem;
              if (pem) keyFingerprint = await sha256Fingerprint(pem);
            }
          } catch {
            // CORS or network — fall through to the partial result
          }

          return { outcome: "pass", actorUrl, keyFingerprint };
        } catch {
          return { outcome: "fail", instance };
        }
      }}
    />
  );
}
