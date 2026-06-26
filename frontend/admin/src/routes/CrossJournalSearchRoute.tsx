/**
 * Cross-Journal Search — admin route wrapping the shared
 * CrossJournalSearchSurface (H06 §S7.2 · worked example).
 *
 * Wires to the B111 backend:
 *   GET  /api/v1/ciphers                 (cipher picker)
 *   POST /api/v1/gematria/search          (live search)
 *   POST /api/v1/gematria/search/csv      (CSV download)
 *   POST /api/v1/studies                  (Save this search)
 */

import {
  CrossJournalSearchSurface,
  type MatchMode,
  type SearchCipher,
  type SearchResponse,
  Toast,
  useTopbar,
} from "@theourgia/shared";
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { apiClient } from "../data/api.js";

interface SearchPayload {
  value: number;
  cipher_ids: string[];
  match_mode: MatchMode;
  delta: number;
  include_personal_ciphers: boolean;
}

export function CrossJournalSearchRoute() {
  const navigate = useNavigate();

  useTopbar(
    () => ({
      title: "Cross-Journal Gematria Search",
      subtitle:
        "Find every phrase in your journal that sums to a value.",
    }),
    [],
  );

  const [ciphers, setCiphers] = useState<SearchCipher[]>([]);
  const [response, setResponse] = useState<SearchResponse | null>(null);
  const [loading, setLoading] = useState(false);

  // Load ciphers once on mount.
  useEffect(() => {
    let cancelled = false;
    apiClient
      .request<
        { id: string; name: string; language: string; personal: boolean }[]
      >("/api/v1/ciphers?include_personal=true", { method: "GET" })
      .then((rows) => {
        if (cancelled) return;
        setCiphers(
          rows.map((r) => ({
            id: r.id,
            name: r.name,
            language: r.language,
            personal: r.personal,
          })),
        );
      })
      .catch(() => {
        if (cancelled) return;
        Toast.push({
          tone: "info",
          title: "Couldn't load ciphers",
          body: "The cipher picker will be empty until the backend responds.",
        });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSearch = useCallback((payload: SearchPayload) => {
    setLoading(true);
    apiClient
      .request<SearchResponse>("/api/v1/gematria/search", {
        method: "POST",
        json: payload,
      })
      .then((r) => setResponse(r))
      .catch((err) => {
        Toast.push({
          tone: "info",
          title: "Search failed",
          body: String((err as Error).message ?? err),
        });
        setResponse(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSave = useCallback((payload: SearchPayload) => {
    apiClient
      .request<{ id: string }>("/api/v1/studies", {
        method: "POST",
        json: {
          name: `Search for ${payload.value}`,
          kind: "gematria_search",
          query: payload,
        },
      })
      .then((s) => {
        Toast.push({
          tone: "info",
          title: "Study saved",
          body: "Open it from Studies to re-run later.",
        });
        navigate(`/studies/${s.id}`);
      })
      .catch((err) => {
        Toast.push({
          tone: "info",
          title: "Save failed",
          body: String((err as Error).message ?? err),
        });
      });
  }, [navigate]);

  const handleCsv = useCallback((payload: SearchPayload) => {
    // The CSV endpoint streams text/csv with Content-Disposition.
    // Build the URL + use fetch directly so the browser can offer
    // a download.
    const url = `/api/v1/gematria/search/csv`;
    fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload),
    })
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const blob = await r.blob();
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = `gematria-${payload.value}.csv`;
        a.click();
        URL.revokeObjectURL(a.href);
      })
      .catch((err) => {
        Toast.push({
          tone: "info",
          title: "CSV download failed",
          body: String((err as Error).message ?? err),
        });
      });
  }, []);

  const handleOpenEntry = useCallback((entry_id: string) => {
    navigate(`/journal/${entry_id}`);
  }, [navigate]);

  const handleUnlockSealed = useCallback(() => {
    Toast.push({
      tone: "info",
      title: "Unlock to view",
      body: "Sealed entries appear once the vault is unlocked.",
    });
  }, []);

  return (
    <CrossJournalSearchSurface
      ciphers={ciphers}
      response={response}
      loading={loading}
      onSearch={handleSearch}
      onSaveSearch={handleSave}
      onExportCsv={handleCsv}
      onOpenEntry={handleOpenEntry}
      onUnlockSealed={handleUnlockSealed}
    />
  );
}
