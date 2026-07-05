/**
 * Publications — admin route wrapping the shared
 * PublicationsSurface. Live-wired against GET /api/v1/publications;
 * "+ New publication" POSTs an empty publication and navigates to
 * the editor.
 */

import {
  type PublicationCardRecord,
  type PublicationKind,
  PublicationsSurface,
  Toast,
  useTopbar,
} from "@theourgia/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";

import { apiMethods } from "../data/api.js";

interface WirePublication {
  id: string;
  owner_id: string;
  kind: string;
  state: string;
  title: string;
  summary?: string | null;
  cover_url?: string | null;
  pricing_model: string;
  one_time_amount_cents?: number | null;
  currency: string;
  cited: boolean;
  created_at: string;
}

function toPricing(p: WirePublication): PublicationCardRecord["pricing"] {
  if (p.pricing_model === "subscribe") return { model: "subscribe" };
  if (p.pricing_model === "one-time" && typeof p.one_time_amount_cents === "number") {
    return {
      model: "one-time",
      amount_cents: p.one_time_amount_cents,
      currency: p.currency,
    };
  }
  return { model: "free" };
}

function toCard(p: WirePublication): PublicationCardRecord {
  return {
    id: p.id,
    title: p.title,
    author_label: "You",
    kind: (p.kind as PublicationKind) ?? "essay",
    state: p.state as PublicationCardRecord["state"],
    pricing: toPricing(p),
    purchase_count: 0,
    cited: p.cited,
    cover_url: p.cover_url ?? null,
    created_at: p.created_at,
  };
}

export function PublicationsRoute() {
  useTopbar(
    () => ({
      title: "Publications",
      subtitle: "Books · essays · newsletters from this vault",
    }),
    [],
  );

  const navigate = useNavigate();
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["publications"],
    queryFn: async () =>
      (await apiMethods.listPublications()) as unknown as WirePublication[],
    staleTime: 30_000,
  });

  const createMutation = useMutation({
    mutationFn: async (kind: PublicationKind) =>
      (await apiMethods.createPublication({
        kind: String(kind),
        title: `New ${kind}`,
      })) as unknown as WirePublication,
    onSuccess: (created) => {
      qc.invalidateQueries({ queryKey: ["publications"] });
      navigate(`/publications/${created.id}/edit`);
    },
    onError: (err) => {
      Toast.push({
        tone: "error",
        title: "Could not create",
        body: err instanceof Error ? err.message : String(err),
      });
    },
  });

  const publications = useMemo<PublicationCardRecord[]>(
    () => (query.data ?? []).map(toCard),
    [query.data],
  );

  const handleNew = useCallback(
    (kind: PublicationKind) => {
      createMutation.mutate(kind);
    },
    [createMutation],
  );

  const handleSelect = useCallback(
    (id: string) => {
      navigate(`/publications/${id}/edit`);
    },
    [navigate],
  );

  return (
    <PublicationsSurface
      publications={publications.length > 0 ? publications : []}
      onNew={handleNew}
      onSelect={handleSelect}
    />
  );
}
