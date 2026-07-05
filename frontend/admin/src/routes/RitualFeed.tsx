/**
 * Ritual feed — network-of-rites surface.
 *
 * Live-wired to Phase 12 backend `/api/v1/group-rituals`:
 *   · GET  /group-rituals            → upcoming + past rows.
 *   · POST /group-rituals/{id}/respond {"response":"accepted"|"declined"}
 *     when the practitioner clicks Going / Can't.
 *
 * The elaborate illustrative composition (featured card · comments ·
 * upcoming list · past collective log · iCal rail · hub members) that
 * previously lived here was fabricated content. Sophia's rule is:
 * empty state or honest "backend not yet built" — never fabricate.
 * The federation-side feed (rituals proposed on other instances,
 * attending list, comments) lands with Phase 13's ActivityPub inbox.
 */

import { Toast, useTopbar } from "@theourgia/shared";
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { apiClient } from "../data/api.js";

interface WireRitual {
  id: string;
  organizer_id: string;
  hub_id: string | null;
  title: string;
  description: string | null;
  scheduled_for_utc: string;
  location: string;
  location_detail: string | null;
  status: string;
}

function formatWhen(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function ProposeRitualButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "9px 16px",
        borderRadius: "var(--r-md, 8px)",
        background: "var(--accent)",
        color: "var(--accent-ink, white)",
        fontFamily: "var(--font-ui)",
        fontWeight: 700,
        fontSize: 13.5,
        border: "none",
        cursor: "pointer",
      }}
    >
      <svg
        width="15"
        height="15"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        aria-hidden="true"
      >
        <title>Propose</title>
        <path d="M12 5v14M5 12h14" />
      </svg>
      Propose ritual
    </button>
  );
}

function RitualRow({
  ritual,
  onRespond,
}: {
  ritual: WireRitual;
  onRespond: (r: WireRitual, response: "accepted" | "declined") => void;
}) {
  return (
    <article
      style={{
        display: "flex",
        gap: 16,
        padding: "16px 18px",
        border: "1px solid var(--line)",
        borderRadius: "var(--r-lg, 14px)",
        background: "var(--bg-2)",
        alignItems: "center",
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontFamily: "var(--font-display, var(--font-serif))",
            fontSize: 18,
            color: "var(--ink)",
            marginBottom: 4,
          }}
        >
          {ritual.title}
        </div>
        <div
          style={{
            fontFamily: "var(--font-ui)",
            fontSize: 12,
            color: "var(--ink-mute)",
            display: "flex",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <span>{formatWhen(ritual.scheduled_for_utc)}</span>
          <span>{ritual.location}</span>
          {ritual.location_detail ? <span>· {ritual.location_detail}</span> : null}
          <span>· {ritual.status}</span>
        </div>
      </div>
      <div style={{ display: "flex", gap: 6 }}>
        <button
          type="button"
          onClick={() => onRespond(ritual, "accepted")}
          style={{
            padding: "6px 12px",
            border: "1px solid var(--line-2)",
            borderRadius: "var(--r-md, 8px)",
            background: "transparent",
            color: "var(--ink)",
            fontFamily: "var(--font-ui)",
            fontSize: 12.5,
            cursor: "pointer",
          }}
        >
          Going
        </button>
        <button
          type="button"
          onClick={() => onRespond(ritual, "declined")}
          style={{
            padding: "6px 12px",
            border: "1px solid var(--line)",
            borderRadius: "var(--r-md, 8px)",
            background: "transparent",
            color: "var(--ink-soft)",
            fontFamily: "var(--font-ui)",
            fontSize: 12.5,
            cursor: "pointer",
          }}
        >
          Can't
        </button>
      </div>
    </article>
  );
}

export function RitualFeed() {
  const navigate = useNavigate();
  useTopbar(
    () => ({
      title: "Ritual feed",
      subtitle: "Group rituals — organized by you, or you're invited to",
      after: <ProposeRitualButton onClick={() => navigate("/group-rituals/new")} />,
    }),
    [navigate],
  );

  const [rituals, setRituals] = useState<WireRitual[] | null>(null);

  const load = useCallback(async () => {
    try {
      const rows = await apiClient.request<WireRitual[]>("/api/v1/group-rituals");
      setRituals(rows);
    } catch (e) {
      Toast.push({
        tone: "error",
        title: "Couldn't load rituals",
        body: e instanceof Error ? e.message : String(e),
      });
      setRituals([]);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleRespond = useCallback(
    async (r: WireRitual, response: "accepted" | "declined") => {
      try {
        await apiClient.request<Record<string, unknown>>(
          `/api/v1/group-rituals/${encodeURIComponent(r.id)}/respond`,
          { method: "POST", json: { response } },
        );
        Toast.push({
          tone: "success",
          title: response === "accepted" ? "RSVP: going" : "RSVP: can't attend",
          body: `“${r.title}”`,
        });
      } catch (e) {
        Toast.push({
          tone: "error",
          title: "Couldn't RSVP",
          body: e instanceof Error ? e.message : String(e),
        });
      }
    },
    [],
  );

  const now = Date.now();
  const upcoming = (rituals ?? []).filter(
    (r) => new Date(r.scheduled_for_utc).getTime() >= now,
  );
  const past = (rituals ?? []).filter(
    (r) => new Date(r.scheduled_for_utc).getTime() < now,
  );

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "22px 26px 80px" }}>
      <section style={{ marginBottom: 32 }}>
        <div
          style={{
            fontFamily: "var(--font-ui)",
            fontSize: 11,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: "var(--ink-mute)",
            marginBottom: 12,
          }}
        >
          Upcoming
        </div>
        {rituals === null ? (
          <div style={{ fontFamily: "var(--font-ui)", color: "var(--ink-mute)" }}>
            Loading rituals…
          </div>
        ) : upcoming.length === 0 ? (
          <div
            style={{
              border: "1px dashed var(--line)",
              borderRadius: "var(--r-lg, 14px)",
              padding: "24px 20px",
              fontFamily: "var(--font-serif)",
              color: "var(--ink-mute)",
              lineHeight: 1.5,
              textAlign: "center",
            }}
          >
            No upcoming group rituals. Propose one to invite others, or accept
            an invitation when it arrives.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {upcoming.map((r) => (
              <RitualRow key={r.id} ritual={r} onRespond={handleRespond} />
            ))}
          </div>
        )}
      </section>

      <section>
        <div
          style={{
            fontFamily: "var(--font-ui)",
            fontSize: 11,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: "var(--ink-mute)",
            marginBottom: 12,
          }}
        >
          Past
        </div>
        {rituals === null ? null : past.length === 0 ? (
          <div
            style={{
              fontFamily: "var(--font-serif)",
              color: "var(--ink-mute)",
              fontSize: 13.5,
            }}
          >
            No completed group rituals to show yet.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {past.slice(0, 20).map((r) => (
              <RitualRow key={r.id} ritual={r} onRespond={handleRespond} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
