/**
 * Newsletter Editor — admin route at ``/newsletters/:id/edit`` and
 * ``/newsletter-editor`` (auto-creates a draft on first landing).
 *
 * Live-wired against Phase 10 newsletter-issues backend (B129):
 *   · POST /api/v1/newsletter-issues            → create draft.
 *   · GET  /api/v1/newsletter-issues/{id}       → surface state.
 *   · PATCH .../{id}                           → subject / preview /
 *                                                 body / reply-to /
 *                                                 targeted_tier_ids.
 *   · POST .../{id}/preview                    → test send.
 *   · POST .../{id}/send-now                   → DRAFT → SENDING.
 *
 * Surface field mapping (surface → wire):
 *   · subject             → subject
 *   · preview_text        → preview_text
 *   · body (Tiptap doc)   → body
 *   · reply_to            → reply_to
 *   · recipient_kind      → targeted_tier_ids ([] if "all"/"test")
 *   · headline / send_mode: UI-only, not persisted (no backend column).
 *
 * Subscriber count is a client-derived count from GET /subscribers
 * filtered by status=active until a dedicated count endpoint lands.
 */

import {
  type NewsletterRecipientKind,
  type NewsletterRecipientOption,
  type NewsletterRecord,
  type NewsletterSendMode,
  NewsletterEditorSurface,
  Toast,
  useTopbar,
} from "@theourgia/shared";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { apiClient } from "../data/api.js";

interface WireNewsletterIssue {
  id: string;
  subject: string;
  preview_text: string | null;
  body: Record<string, unknown> | null;
  reply_to: string | null;
  targeted_tier_ids: string[];
  status: string;
}

interface WireSubscriber {
  status: string;
}

function toRecord(w: WireNewsletterIssue): NewsletterRecord {
  const kind: NewsletterRecipientKind =
    (w.targeted_tier_ids?.length ?? 0) > 0 ? "tier" : "all";
  return {
    id: w.id,
    headline: w.subject ?? "",
    subject: w.subject ?? "",
    preview_text: w.preview_text ?? "",
    body:
      (w.body as NewsletterRecord["body"]) ??
      { type: "doc", content: [{ type: "paragraph" }] },
    recipient_kind: kind,
    recipient_tier_id: w.targeted_tier_ids?.[0] ?? null,
    send_mode: "draft",
    reply_to: w.reply_to ?? "",
  };
}

export function NewsletterEditorRoute() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  useTopbar(
    () => ({
      title: "Newsletter Editor",
      subtitle:
        "Compose, schedule, send — sober reach to your subscribers",
    }),
    [],
  );

  const [newsletter, setNewsletter] = useState<NewsletterRecord | null>(null);
  const [subscriberCount, setSubscriberCount] = useState(0);

  // Auto-create a draft when landing on /newsletter-editor with no id.
  useEffect(() => {
    if (id) return;
    let cancelled = false;
    apiClient
      .request<WireNewsletterIssue>("/api/v1/newsletter-issues", {
        method: "POST",
        json: {
          subject: "Untitled newsletter",
          preview_text: null,
          body: { type: "doc", content: [{ type: "paragraph" }] },
        },
      })
      .then((row) => {
        if (cancelled) return;
        navigate(`/newsletters/${row.id}/edit`, { replace: true });
      })
      .catch((e) => {
        Toast.push({
          tone: "error",
          title: "Couldn't start a new newsletter",
          body: e instanceof Error ? e.message : String(e),
        });
      });
    return () => {
      cancelled = true;
    };
  }, [id, navigate]);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    apiClient
      .request<WireNewsletterIssue>(
        `/api/v1/newsletter-issues/${encodeURIComponent(id)}`,
      )
      .then((row) => {
        if (!cancelled) setNewsletter(toRecord(row));
      })
      .catch((e) => {
        Toast.push({
          tone: "error",
          title: "Couldn't load newsletter",
          body: e instanceof Error ? e.message : String(e),
        });
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    apiClient
      .request<WireSubscriber[]>("/api/v1/subscribers")
      .then((rows) => {
        setSubscriberCount(
          rows.filter((r) => r.status === "active").length,
        );
      })
      .catch(() => {
        // Best-effort — leave count at 0.
      });
  }, []);

  const recipients: NewsletterRecipientOption[] = useMemo(
    () => [
      {
        kind: "all",
        label: "All subscribers",
        count_label: String(subscriberCount),
      },
      { kind: "tier", label: "A specific tier", count_label: "—" },
      { kind: "test", label: "A test list", count_label: "—" },
    ],
    [subscriberCount],
  );

  const recipient_count = useMemo(() => {
    if (newsletter?.recipient_kind === "all") return subscriberCount;
    return 0;
  }, [newsletter?.recipient_kind, subscriberCount]);

  const patchWire = useCallback(
    async (fields: Record<string, unknown>) => {
      if (!id) return;
      try {
        await apiClient.request<WireNewsletterIssue>(
          `/api/v1/newsletter-issues/${encodeURIComponent(id)}`,
          { method: "PATCH", json: fields },
        );
      } catch (e) {
        Toast.push({
          tone: "error",
          title: "Couldn't save",
          body: e instanceof Error ? e.message : String(e),
        });
      }
    },
    [id],
  );

  const setLocal = useCallback(
    <K extends keyof NewsletterRecord>(
      key: K,
      value: NewsletterRecord[K],
    ) => {
      setNewsletter((prev) => (prev ? { ...prev, [key]: value } : prev));
    },
    [],
  );

  const onSubjectChange = useCallback(
    (v: string) => {
      setLocal("subject", v);
      void patchWire({ subject: v || "Untitled newsletter" });
    },
    [setLocal, patchWire],
  );
  const onPreviewTextChange = useCallback(
    (v: string) => {
      setLocal("preview_text", v);
      void patchWire({ preview_text: v || null });
    },
    [setLocal, patchWire],
  );
  const onBodyChange = useCallback(
    (v: unknown) => {
      setLocal("body", v);
      void patchWire({ body: v ?? {} });
    },
    [setLocal, patchWire],
  );
  const onReplyToChange = useCallback(
    (v: string) => {
      setLocal("reply_to", v);
      void patchWire({ reply_to: v || null });
    },
    [setLocal, patchWire],
  );
  const onRecipientChange = useCallback(
    (kind: NewsletterRecipientKind) => {
      setLocal("recipient_kind", kind);
      // "all" and "test" both send targeted_tier_ids=[] on the wire.
      void patchWire({ targeted_tier_ids: [] });
    },
    [setLocal, patchWire],
  );

  const handleTestSend = useCallback(async () => {
    if (!id) return;
    const email = newsletter?.reply_to?.trim();
    if (!email) {
      Toast.push({
        tone: "warning",
        title: "Add a reply-to address first",
        body: "The test send is delivered to your reply-to.",
      });
      return;
    }
    try {
      await apiClient.request<Record<string, unknown>>(
        `/api/v1/newsletter-issues/${encodeURIComponent(id)}/preview`,
        { method: "POST", json: { preview_email: email } },
      );
      Toast.push({
        tone: "success",
        title: "Test send",
        body: `One copy delivered to ${email}.`,
      });
    } catch (e) {
      Toast.push({
        tone: "error",
        title: "Test send failed",
        body: e instanceof Error ? e.message : String(e),
      });
    }
  }, [id, newsletter?.reply_to]);

  const handleConfirmSend = useCallback(async () => {
    if (!id) return;
    try {
      await apiClient.request<{ recipient_count: number }>(
        `/api/v1/newsletter-issues/${encodeURIComponent(id)}/send-now`,
        { method: "POST", json: {} },
      );
      Toast.push({
        tone: "success",
        title: "Newsletter sending",
        body: `Reaching ${recipient_count} subscriber${recipient_count === 1 ? "" : "s"}.`,
      });
    } catch (e) {
      Toast.push({
        tone: "error",
        title: "Send failed",
        body: e instanceof Error ? e.message : String(e),
      });
    }
  }, [id, recipient_count]);

  if (!newsletter) {
    return (
      <div
        style={{
          padding: "40px 24px",
          fontFamily: "var(--font-ui)",
          color: "var(--ink-mute)",
        }}
      >
        Loading newsletter…
      </div>
    );
  }

  return (
    <NewsletterEditorSurface
      newsletter={newsletter}
      recipients={recipients}
      recipient_count={recipient_count}
      onHeadlineChange={(v) => setLocal("headline", v)}
      onSubjectChange={onSubjectChange}
      onPreviewTextChange={onPreviewTextChange}
      onBodyChange={onBodyChange}
      onRecipientChange={onRecipientChange}
      onSendModeChange={(v: NewsletterSendMode) => setLocal("send_mode", v)}
      onReplyToChange={onReplyToChange}
      onTestSend={() => void handleTestSend()}
      onConfirmSend={() => void handleConfirmSend()}
    />
  );
}
