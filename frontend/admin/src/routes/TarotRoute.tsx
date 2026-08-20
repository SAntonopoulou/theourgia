/**
 * Tarot route — composes the shared TarotSurface with admin's
 * topbar + OracleTabs subnav.
 *
 * Live-wired: GET /api/v1/tarot/readings populates the History view
 * with the practitioner's persisted past readings. The client-side
 * draw remains in-surface (the seeded engine draws deterministically
 * for the live composer); on save, the reading is cast + persisted
 * via POST /api/v1/tarot/cast so future loads see it in history.
 */

import {
  type DrawnCard,
  OracleTabs,
  type OracleTabsLinkProps,
  type SpreadKind,
  type TarotPastReading,
  TarotSurface,
  Toast,
  useTopbar,
} from "@theourgia/shared";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { NavLink } from "react-router-dom";

import { apiMethods } from "../data/api.js";
import { writeConsultation } from "../data/keepObservance.js";

function NavLinkAdapter({
  to,
  current,
  children,
  style,
  onClick,
}: OracleTabsLinkProps) {
  return (
    <NavLink
      to={to}
      aria-current={current}
      style={style}
      onClick={onClick}
    >
      {children}
    </NavLink>
  );
}

const ORACLE_HREF: Record<string, string> = {
  tarot: "/divination/tarot",
  iching: "/divination/iching",
  geomancy: "/divination/geomancy",
  runes: "/divination/runes",
  astragaloi: "/divination/astragaloi",
  more: "/divination/more",
};

const SPREAD_KIND_MAP: Record<string, SpreadKind> = {
  single: "single",
  "past_present_future": "three",
  three: "three",
  celtic_cross: "celtic",
  celtic: "celtic",
  relationship: "relationship",
};

interface WireTarotReading {
  id: string;
  title?: string;
  drawn_at?: string;
  created_at?: string;
  spread_kind?: string;
  spread_id?: string;
  cards?: Array<{ card_name?: string; name?: string }>;
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

function mapReading(r: WireTarotReading): TarotPastReading {
  const spread = SPREAD_KIND_MAP[r.spread_kind ?? "single"] ?? "three";
  const cardsLine = (r.cards ?? [])
    .map((c) => c.card_name ?? c.name ?? "?")
    .join(" · ");
  return {
    id: r.id,
    date: formatDate(r.drawn_at ?? r.created_at),
    title: r.title ?? "Untitled reading",
    cardsLine: cardsLine || "(no cards recorded)",
    spreadKind: spread,
  };
}

export function TarotRoute() {
  useTopbar(
    () => ({
      title: "Tarot",
      subtitle: "Lay the spread, read the cards, keep the reading",
    }),
    [],
  );

  const readingsQuery = useQuery({
    queryKey: ["tarot-readings"],
    queryFn: async () =>
      (await apiMethods.listTarotReadings()) as unknown as WireTarotReading[],
    staleTime: 30_000,
  });

  const pastReadings = useMemo<TarotPastReading[]>(
    () => (readingsQuery.data ?? []).map(mapReading),
    [readingsQuery.data],
  );

  const handleSave = (title: string) => {
    // The server /tarot/cast persistence needs a server deck + the seed; the
    // robust, decoupled path is "Keep to record" below, which writes the shown
    // reading as a consultation that syncs to the phone.
    Toast.push({
      tone: "info",
      title: "Use “Keep to record”",
      body: `“${title}” — keeping the reading to the record syncs it to the phone and its history.`,
    });
  };

  const handleKeep = async (reading: {
    title: string;
    spread: SpreadKind;
    drawn: DrawnCard[];
    interpretation: string;
  }) => {
    try {
      await writeConsultation({
        systemId: "tarot",
        question: reading.title,
        cast: JSON.stringify({ spread: reading.spread, cards: reading.drawn }),
        reading: reading.interpretation,
        source: "drawn",
      });
      Toast.push({
        tone: "success",
        title: "Kept to the record",
        body: "This reading is in your record and syncs to the phone.",
      });
    } catch (e) {
      Toast.push({
        tone: "warning",
        title: "That didn't keep",
        body: e instanceof Error ? e.message : "Check your connection and try again.",
      });
    }
  };

  // Wire the OracleTabs nav at the top of the surface body.
  return (
    <>
      <OracleTabs
        active="tarot"
        LinkComponent={NavLinkAdapter}
        hrefFor={(key) => ORACLE_HREF[key] ?? "/"}
      />
      <TarotSurface
        pastReadings={pastReadings}
        onSave={handleSave}
        onKeepReading={(r) => void handleKeep(r)}
      />
    </>
  );
}
