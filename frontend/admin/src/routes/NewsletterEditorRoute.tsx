/**
 * Newsletter Editor — admin route (H07 §S3 surface 11).
 *
 * Phase 10 backend is unbuilt by design; the route holds local
 * state for now. Send-now (after confirm) Toasts pending the
 * POST /api/v1/newsletters/{id}/send wiring.
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
import { useCallback, useMemo, useState } from "react";

function makeFixture(): NewsletterRecord {
  return {
    id: "demo-newsletter",
    headline: "What the dark moon asked this month",
    subject: "What the dark moon asked",
    preview_text: "The offering left where no one sees it.",
    body: { type: "doc", content: [{ type: "paragraph" }] },
    recipient_kind: "all",
    send_mode: "draft",
    reply_to: "soror.alpha@protonmail.com",
  };
}

const RECIPIENTS: NewsletterRecipientOption[] = [
  { kind: "all", label: "All subscribers", count_label: "38" },
  { kind: "tier", label: "A specific tier", count_label: "—" },
  { kind: "test", label: "A test list", count_label: "3" },
];

export function NewsletterEditorRoute() {
  useTopbar(
    () => ({
      title: "Newsletter Editor",
      subtitle: "Compose, schedule, send — sober reach to your subscribers",
    }),
    [],
  );

  const [newsletter, setNewsletter] = useState<NewsletterRecord>(makeFixture);

  const recipient_count = useMemo(() => {
    const opt = RECIPIENTS.find((r) => r.kind === newsletter.recipient_kind);
    const n = Number.parseInt(opt?.count_label ?? "0", 10);
    return Number.isFinite(n) ? n : 0;
  }, [newsletter.recipient_kind]);

  const update = useCallback(<K extends keyof NewsletterRecord>(
    key: K,
    value: NewsletterRecord[K],
  ) => setNewsletter((prev) => ({ ...prev, [key]: value })), []);

  return (
    <NewsletterEditorSurface
      newsletter={newsletter}
      recipients={RECIPIENTS}
      recipient_count={recipient_count}
      onHeadlineChange={(v) => update("headline", v)}
      onSubjectChange={(v) => update("subject", v)}
      onPreviewTextChange={(v) => update("preview_text", v)}
      onBodyChange={(v) => update("body", v)}
      onRecipientChange={(v: NewsletterRecipientKind) =>
        update("recipient_kind", v)
      }
      onSendModeChange={(v: NewsletterSendMode) => update("send_mode", v)}
      onReplyToChange={(v) => update("reply_to", v)}
      onTestSend={() => {
        Toast.push({
          tone: "info",
          title: "Test send queued",
          body: `One copy will arrive at ${newsletter.reply_to} once Phase 10 backend ships.`,
        });
      }}
      onConfirmSend={() => {
        Toast.push({
          tone: "success",
          title: "Newsletter queued for send",
          body: `Will reach ${recipient_count} subscribers once Phase 10 backend ships.`,
        });
      }}
    />
  );
}
