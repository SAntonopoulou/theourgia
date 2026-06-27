/**
 * HubNewsletterComposer — admin route at
 * ``/hubs/:hubId/newsletter`` (H08 §S3 Cluster A surface 7).
 *
 * Distinct from the existing ``NewsletterComposer.tsx`` route, which
 * powers the Phase-10 per-vault subscriber newsletter at
 * ``/newsletter/compose``. The hub-network composer here is the
 * Phase-12 federation variant: a curator (hub officer) assembles
 * an issue from approved member submissions and sends it to the
 * hub's role-tiered subscribers.
 *
 * Wiring deferred to Phase 12 backend:
 *
 *   * GET /api/v1/hubs/{id}/curation?status=approved — sources.
 *   * GET/PATCH /api/v1/hubs/{id}/newsletter/draft — title + body.
 *   * POST /api/v1/hubs/{id}/newsletter/send — fired only after
 *     the confirm-modal primary CTA.
 *   * GET /api/v1/hubs/{id}/subscribers?status=active — count.
 */

import { useState } from "react";
import { useParams } from "react-router-dom";

import {
  type NewsletterBodyPart,
  NewsletterComposerSurface,
  type NewsletterSource,
  useTopbar,
} from "@theourgia/shared";

const SOURCES: NewsletterSource[] = [
  {
    id: "src-deipnon",
    kind: "entry",
    title: "Dark-moon Deipnon at the shared stone",
    byHandle: "diotima",
  },
  {
    id: "src-draw",
    kind: "divination",
    title: "A three-card draw on the spring rite",
    byHandle: "soror-aurora",
  },
  {
    id: "src-ephesia",
    kind: "publication",
    title: "On the Ephesia Grammata",
    byHandle: "soror-aurora",
  },
  {
    id: "src-egregore",
    kind: "entry",
    title: "Notes toward a shared egregore",
    byHandle: "frater-h",
  },
];

const INITIAL_BODY: NewsletterBodyPart[] = [
  {
    kind: "paragraph",
    text:
      "Friends of the crossroads — a fuller month than most. Three workings shared, a new member welcomed, and the spring equinox rite now on the calendar. A few pieces worth your time below.",
  },
  {
    kind: "embed",
    embedKind: "entry",
    did: "did:theourgia:terra.example:diotima",
    title: "Dark-moon Deipnon at the shared stone",
    excerpt:
      "The lamp held all night; I have never felt the crossroads so open.",
  },
  { kind: "paragraph", text: "Keep the lamp. — the officers" },
];

export function HubNewsletterComposer() {
  const { hubId } = useParams<{ hubId: string }>();
  const [title, setTitle] = useState("The crossroads, this month");
  const [bodyParts] = useState<NewsletterBodyPart[]>(INITIAL_BODY);
  useTopbar(() => ({ title: "Newsletter" }));

  return (
    <NewsletterComposerSurface
      hubName="Crossroads Coven"
      recipientCount={34}
      title={title}
      onTitleChange={setTitle}
      sources={SOURCES}
      bodyParts={bodyParts}
      onInsertSource={(sourceId) => {
        // TODO Phase 12 — insert curation embed at the caret.
        // eslint-disable-next-line no-console
        console.info("[hub-newsletter] insert source", sourceId);
      }}
      onPreview={() => {
        // eslint-disable-next-line no-console
        console.info("[hub-newsletter] preview");
      }}
      onSend={() => {
        // TODO Phase 12 — POST send.
        // eslint-disable-next-line no-console
        console.info("[hub-newsletter] send confirmed", hubId, title);
      }}
    />
  );
}
