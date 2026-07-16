/**
 * Divination Misc route — pendulum · bibliomancy · horary · scrying
 * clustered under the OracleTabs "More" entry (H04 §S7.2).
 *
 * Live-wired (v1-014): bibliomancy → POST /api/v1/bibliomancy/cast,
 * pendulum Ask → POST /api/v1/pendulum/readings, scrying save →
 * POST /api/v1/scrying/sessions + …/{id}/end (the vision notes ride
 * the end call), and the scrying "Past sessions" rail hydrates from
 * GET /api/v1/scrying/sessions. Horary is the one holdout: the
 * designed panel captures neither the question nor the cast location
 * that POST /api/v1/horary/cast requires, so its save shows the same
 * "Nothing to log" guard bibliomancy uses rather than fabricating a
 * cast — `apiMethods.castHorary` is ready for when the capture
 * fields land.
 */

import { useQuery } from "@tanstack/react-query";
import {
  DivinationMiscSurface,
  OracleTabs,
  type OracleTabsLinkProps,
  type PendulumOutcomeWire,
  SCRY_MEDIA_OPTIONS,
  type ScrySessionLog,
  type ScryingModeWire,
  type ScryingSessionRecord,
  Toast,
  useTopbar,
} from "@theourgia/shared";
import { useCallback, useMemo } from "react";
import { NavLink } from "react-router-dom";

import { apiClient, apiMethods } from "../data/api.js";

function NavLinkAdapter({ to, current, children, style, onClick }: OracleTabsLinkProps) {
  return (
    <NavLink to={to} aria-current={current} style={style} onClick={onClick}>
      {children}
    </NavLink>
  );
}

const ORACLE_HREF: Record<string, string> = {
  tarot: "/divination/tarot",
  iching: "/divination/iching",
  geomancy: "/divination/geomancy",
  runes: "/divination/runes",
  more: "/divination/more",
};

/** Panel answer → backend ``PendulumOutcome``. */
const PENDULUM_OUTCOME_WIRE: Record<string, PendulumOutcomeWire> = {
  Yes: "yes",
  No: "no",
  Maybe: "maybe",
  Unclear: "no_response",
};

/** Panel medium → backend ``ScryingMode``. */
const SCRY_MODE_WIRE: Record<string, ScryingModeWire> = {
  mirror: "black_mirror",
  crystal: "crystal",
  water: "water_bowl",
  fire: "fire",
};

/** Backend ``ScryingMode`` → panel medium. Modes the panel doesn't
 *  offer (smoke, ink_in_water, …) pass through raw — the rail shows
 *  the honest mode string and simply omits the icon. */
const SCRY_MEDIUM_FROM_WIRE: Record<string, string> = {
  black_mirror: "mirror",
  crystal: "crystal",
  water_bowl: "water",
  fire: "fire",
};

function scryMediumLabel(medium: string): string {
  return SCRY_MEDIA_OPTIONS.find((m) => m.key === medium)?.label ?? medium;
}

function formatDate(iso?: string): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

function mapSession(s: ScryingSessionRecord): ScrySessionLog {
  return {
    medium: SCRY_MEDIUM_FROM_WIRE[s.mode] ?? s.mode,
    date: formatDate(s.started_at),
    snippet: s.vision_notes ?? s.intention ?? "(no notes recorded)",
  };
}

export function DivinationMiscRoute() {
  useTopbar(
    () => ({
      title: "More divinations",
      subtitle: "Pendulum · bibliomancy · horary · scrying",
    }),
    [],
  );

  const sessionsQuery = useQuery({
    queryKey: ["scrying-sessions"],
    queryFn: async () => apiMethods.listScryingSessions(),
    staleTime: 30_000,
  });
  const refetchSessions = sessionsQuery.refetch;

  const scryPastSessions = useMemo<ScrySessionLog[]>(
    () => (sessionsQuery.data ?? []).map(mapSession),
    [sessionsQuery.data],
  );

  const handlePendulum = useCallback(async (entryUnknown: unknown) => {
    const e = entryUnknown as {
      question?: string;
      answer?: string;
      askedAt?: string;
    };
    const outcome = e?.answer ? PENDULUM_OUTCOME_WIRE[e.answer] : undefined;
    if (!e || !e.question || !outcome) {
      Toast.push({
        tone: "warning",
        title: "Nothing to log",
        body: "Ask a question above to see the pendulum's answer.",
      });
      return;
    }
    try {
      await apiMethods.createPendulumReading({
        question: e.question,
        outcome,
        ...(e.askedAt ? { asked_at: e.askedAt } : {}),
      });
      Toast.push({
        tone: "success",
        title: "Pendulum reading logged",
        body: `“${e.question}” saved to your readings.`,
      });
    } catch (err) {
      Toast.push({
        tone: "error",
        title: "Couldn't save reading",
        body: err instanceof Error ? err.message : String(err),
      });
    }
  }, []);

  const handleBibliomancy = useCallback(async (entryUnknown: unknown) => {
    const e = entryUnknown as {
      question?: string;
      passage?: string;
      reference?: string;
    };
    if (!e || !e.passage || !e.reference) {
      Toast.push({
        tone: "warning",
        title: "Nothing to log",
        body: "Open a passage first, then save.",
      });
      return;
    }
    try {
      await apiClient.request<Record<string, unknown>>("/api/v1/bibliomancy/cast", {
        method: "POST",
        json: {
          question: e.question ?? null,
          source_text: e.passage,
          source_label: e.reference,
          passage_kind: "paragraph",
        },
      });
      Toast.push({
        tone: "success",
        title: "Bibliomancy passage logged",
        body: `“${e.reference}” saved to your readings.`,
      });
    } catch (err) {
      Toast.push({
        tone: "error",
        title: "Couldn't save passage",
        body: err instanceof Error ? err.message : String(err),
      });
    }
  }, []);

  const handleHorary = useCallback(() => {
    // The designed horary panel has no question / location capture,
    // and POST /api/v1/horary/cast requires both — never fabricate a
    // cast. Same guard shape as bibliomancy's missing-passage case.
    Toast.push({
      tone: "warning",
      title: "Nothing to log",
      body: "Cast a chart first, then save.",
    });
  }, []);

  const handleScrying = useCallback(
    async (entryUnknown: unknown) => {
      const e = entryUnknown as {
        medium?: string;
        vision?: string;
        trance?: { startedAt: string; endedAt: string } | null;
      };
      const medium = e?.medium;
      const mode = medium ? SCRY_MODE_WIRE[medium] : undefined;
      if (!e || !medium || !mode || !e.vision) {
        Toast.push({
          tone: "warning",
          title: "Nothing to log",
          body: "Set down what comes first, then save.",
        });
        return;
      }
      try {
        const started = await apiMethods.startScryingSession({
          mode,
          ...(e.trance ? { started_at: e.trance.startedAt } : {}),
        });
        await apiMethods.endScryingSession(started.id, {
          vision_notes: e.vision,
          ...(e.trance ? { ended_at: e.trance.endedAt } : {}),
        });
        Toast.push({
          tone: "success",
          title: "Scrying session logged",
          body: `“${scryMediumLabel(medium)}” saved to your sessions.`,
        });
        void refetchSessions();
      } catch (err) {
        Toast.push({
          tone: "error",
          title: "Couldn't save session",
          body: err instanceof Error ? err.message : String(err),
        });
      }
    },
    [refetchSessions],
  );

  return useMemo(
    () => (
      <>
        <OracleTabs
          active="more"
          LinkComponent={NavLinkAdapter}
          hrefFor={(key) => ORACLE_HREF[key] ?? "/"}
        />
        <DivinationMiscSurface
          onSavePendulum={(entry) => void handlePendulum(entry)}
          onSaveBibliomancy={(entry) => void handleBibliomancy(entry)}
          onSaveHorary={handleHorary}
          onSaveScrying={(entry) => void handleScrying(entry)}
          scryPastSessions={scryPastSessions}
        />
      </>
    ),
    [handlePendulum, handleBibliomancy, handleHorary, handleScrying, scryPastSessions],
  );
}
