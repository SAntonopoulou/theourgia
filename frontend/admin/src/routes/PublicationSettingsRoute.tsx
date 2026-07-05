/**
 * Publication Settings — admin route at ``/publications/:id/settings``.
 *
 * Live-wired: GET /api/v1/publications/{id} → surface state;
 * PATCH /api/v1/publications/{id} on every field change (debounced
 * at the field-input layer in the shared surface).
 *
 * Author picker options come from the demo-identity set for v1
 * (Persona table is Phase 03; single-user vaults are the norm
 * today).
 */

import {
  type AuthorIdentityOption,
  type PublicationSettingsRecord,
  PublicationSettingsSurface,
  Toast,
  useTopbar,
} from "@theourgia/shared";
import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";

import { apiMethods } from "../data/api.js";

interface WirePublication {
  id: string;
  title: string;
  slug: string;
  summary: string | null;
  cover_url: string | null;
  scheduled_publish_at: string | null;
  language: string;
  license: string;
  chapters: Array<{ body?: unknown }>;
}

function toRecord(w: WirePublication, authors: AuthorIdentityOption[]): PublicationSettingsRecord {
  return {
    id: w.id,
    title: w.title,
    slug: w.slug,
    slug_prefix: "/",
    authors,
    summary: w.summary ?? "",
    cover_url: w.cover_url,
    schedule: w.scheduled_publish_at
      ? { mode: "later", at: w.scheduled_publish_at }
      : { mode: "now" },
    distribution: {
      catalog: true,
      rss: true,
      activity_pub: false,
      newsletter: false,
    },
    tags: [],
    tradition_tags: [],
    total_word_count: 0,
  };
}

export function PublicationSettingsRoute() {
  const { id } = useParams<{ id: string }>();
  useTopbar(
    () => ({
      title: "Publication Settings",
      subtitle: "Identity · cover · schedule · distribution · discoverability",
    }),
    [],
  );

  // Single-user vaults have exactly one identity today; the picker
  // shows just you. Multi-persona expansion lands with Phase 03's
  // Persona table.
  const availableAuthors: AuthorIdentityOption[] = [
    { id: "self", label: "You" },
  ];

  const [publication, setPublication] = useState<PublicationSettingsRecord | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    apiMethods
      .getPublication(id)
      .then((row) => {
        if (cancelled) return;
        setPublication(toRecord(row as unknown as WirePublication, availableAuthors));
      })
      .catch((e) => {
        Toast.push({
          tone: "error",
          title: "Couldn't load publication",
          body: e instanceof Error ? e.message : String(e),
        });
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  const handleChange = useCallback(
    (patch: Partial<PublicationSettingsRecord>) => {
      if (!id) return;
      setPublication((prev) => (prev ? { ...prev, ...patch } : prev));
      // Only patch backend-supported fields — tags / tradition_tags /
      // author list aren't yet on the backend PublicationUpdate model.
      const backendPatch: Record<string, unknown> = {};
      if (patch.title !== undefined) backendPatch.title = patch.title;
      if (patch.summary !== undefined) backendPatch.summary = patch.summary;
      if (patch.cover_url !== undefined) backendPatch.cover_url = patch.cover_url;
      if (patch.schedule?.mode === "later" && patch.schedule.at) {
        backendPatch.scheduled_publish_at = patch.schedule.at;
      } else if (patch.schedule?.mode === "now") {
        backendPatch.scheduled_publish_at = null;
      }
      if (Object.keys(backendPatch).length === 0) return;
      apiMethods.updatePublication(id, backendPatch).catch((e) => {
        Toast.push({
          tone: "error",
          title: "Couldn't save change",
          body: e instanceof Error ? e.message : String(e),
        });
      });
    },
    [id],
  );

  if (!publication) {
    return (
      <div
        style={{
          padding: "40px 24px",
          fontFamily: "var(--font-ui)",
          color: "var(--ink-mute)",
        }}
      >
        Loading publication settings…
      </div>
    );
  }

  return (
    <PublicationSettingsSurface
      publication={publication}
      availableAuthors={availableAuthors}
      onChange={handleChange}
    />
  );
}
