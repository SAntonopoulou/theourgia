/**
 * PrivateViewers — admin route at ``/private-viewers``.
 *
 * Renders the H08 §S3 Cluster A surface 11 against fixtures.
 *
 * Wiring deferred to Phase 12 backend:
 *
 *   * GET  /api/v1/private-viewers — list (active + revoked).
 *   * POST /api/v1/private-viewers — issue credential. The
 *     response includes the plaintext one-time credential which
 *     the consumer must immediately surface to the user (this
 *     route doesn't model that follow-on flow yet — that's the
 *     Issued-Credential reveal modal queued for the integration
 *     pass).
 *   * POST /api/v1/private-viewers/{id}/revoke — revoke. Server
 *     keeps the row + writes a ``revoked_at`` ts. Never deletes.
 */

import { useState } from "react";

import {
  type NewPrivateViewerDraft,
  type PrivateViewerRow,
  PrivateViewersSurface,
  useTopbar,
} from "@theourgia/shared";

const INITIAL_VIEWERS: PrivateViewerRow[] = [
  {
    id: "v-aspasia",
    label: "Student — Aspasia",
    handle: "aspasia@example.com",
    lastUsed: "2 days ago",
    scopeKind: "tag",
    initial: "A",
  },
  {
    id: "v-frater",
    label: "Working partner — V.",
    handle: "@frater-v@terra.example",
    lastUsed: "a week ago",
    scopeKind: "kind",
    initial: "V",
  },
  {
    id: "v-anna",
    label: "Mentor",
    handle: "anna@example.com",
    lastUsed: "yesterday",
    scopeKind: "specific",
    initial: "M",
  },
  {
    id: "v-old",
    label: "Former student",
    handle: "old@example.com",
    lastUsed: "3 months ago",
    scopeKind: "full",
    initial: "F",
    revoked: true,
    revokedAt: "12 Apr",
  },
];

export function PrivateViewers() {
  const [viewers] = useState<PrivateViewerRow[]>(INITIAL_VIEWERS);

  useTopbar(() => ({ title: "Private viewers" }));

  return (
    <PrivateViewersSurface
      viewers={viewers}
      onViewerAction={(viewerId) => {
        // TODO Phase 12 — open kebab menu (Revoke / View audit /
        // Edit scope). The menu fans out into per-action wires;
        // for now we log so the design intent is on the record.
        // eslint-disable-next-line no-console
        console.info("[private-viewers] kebab action", viewerId);
      }}
      onIssueCredential={(draft: NewPrivateViewerDraft) => {
        // TODO Phase 12 — POST /api/v1/private-viewers + show
        // the one-time credential reveal modal. The plaintext
        // SHOULD NOT be persisted client-side beyond the
        // reveal-and-copy interaction.
        // eslint-disable-next-line no-console
        console.info("[private-viewers] issue credential", draft);
      }}
    />
  );
}
