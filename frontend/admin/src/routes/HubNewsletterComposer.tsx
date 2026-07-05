/**
 * HubNewsletterComposer — admin route at
 * ``/hubs/:hubId/newsletter`` (H08 §S3 Cluster A surface 7).
 *
 * Distinct from the existing ``NewsletterEditor`` route, which powers
 * the Phase-10 per-vault subscriber newsletter. The hub-network
 * composer here is the Phase-12 federation variant: a curator (hub
 * officer) assembles an issue from approved member submissions and
 * sends it to the hub's role-tiered subscribers.
 *
 * Hub name is fetched from `/api/v1/hubs/{id}`; sources / body /
 * recipient count / send are Phase-12 backend and stay honestly
 * empty (recipientCount=0) until:
 *
 *   * GET /api/v1/hubs/{id}/curation?status=approved — sources.
 *   * GET/PATCH /api/v1/hubs/{id}/newsletter/draft — title + body.
 *   * POST /api/v1/hubs/{id}/newsletter/send — fired only after
 *     the confirm-modal primary CTA.
 *   * GET /api/v1/hubs/{id}/subscribers?status=active — count.
 */

import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

import {
  type NewsletterBodyPart,
  NewsletterComposerSurface,
  type NewsletterSource,
  Toast,
  useTopbar,
} from "@theourgia/shared";

import { apiClient } from "../data/api.js";

interface WireHub {
  id: string;
  name: string;
}

const SOURCES: NewsletterSource[] = [];
const INITIAL_BODY: NewsletterBodyPart[] = [];

export function HubNewsletterComposer() {
  const { hubId } = useParams<{ hubId: string }>();
  const [title, setTitle] = useState("");
  const [bodyParts] = useState<NewsletterBodyPart[]>(INITIAL_BODY);
  const [hubName, setHubName] = useState<string>("Hub");
  useTopbar(() => ({ title: "Newsletter" }));

  useEffect(() => {
    if (!hubId) return;
    let cancelled = false;
    apiClient
      .request<WireHub>(`/api/v1/hubs/${encodeURIComponent(hubId)}`)
      .then((row) => {
        if (!cancelled) setHubName(row.name || "Hub");
      })
      .catch(() => {
        // Best-effort — keep the fallback label.
      });
    return () => {
      cancelled = true;
    };
  }, [hubId]);

  const notYetWired = (label: string) => () => {
    Toast.push({
      tone: "info",
      title: `${label} — hub-network newsletter is Phase 12`,
      body: "Curation sources and send are queued behind the hub-newsletter backend.",
    });
  };

  return (
    <NewsletterComposerSurface
      hubName={hubName}
      recipientCount={0}
      title={title}
      onTitleChange={setTitle}
      sources={SOURCES}
      bodyParts={bodyParts}
      onInsertSource={notYetWired("Insert curation")}
      onPreview={notYetWired("Preview")}
      onSend={notYetWired("Send")}
    />
  );
}
