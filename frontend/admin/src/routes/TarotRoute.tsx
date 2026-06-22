/**
 * Tarot route — composes the shared TarotSurface with admin's
 * topbar + OracleTabs subnav.
 *
 * Backend wiring (POST /api/v1/tarot/draw + GET /api/v1/tarot/readings)
 * lands when the backend reading-persistence endpoint ships. For now
 * the shared surface is presentation-only with the seeded engine;
 * Save fires a Toast acknowledging the future write.
 */

import {
  OracleTabs,
  type OracleTabsLinkProps,
  TarotSurface,
  Toast,
  useTopbar,
} from "@theourgia/shared";
import { useMemo, useState } from "react";
import { NavLink } from "react-router-dom";

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
  more: "/divination/more",
};

export function TarotRoute() {
  const [pastReadings] = useState(() => buildSeedReadings());

  useTopbar(
    () => ({
      title: "Tarot",
      subtitle: "Lay the spread, read the cards, keep the reading",
    }),
    [],
  );

  const handleSave = (title: string) => {
    Toast.push({
      tone: "success",
      title: "Reading saved",
      body: `“${title}” added to your journal. (Backend wiring lands with the readings API.)`,
    });
  };

  // Wire the OracleTabs nav at the top of the surface body.
  return useMemo(
    () => (
      <>
        <OracleTabs
          active="tarot"
          LinkComponent={NavLinkAdapter}
          hrefFor={(key) => ORACLE_HREF[key] ?? "/"}
        />
        <TarotSurface
          pastReadings={pastReadings}
          onSave={handleSave}
        />
      </>
    ),
    [pastReadings],
  );
}

function buildSeedReadings() {
  return [
    {
      id: "r1",
      date: "19 Jun 2026",
      title: "On whether to keep the oath sealed",
      cardsLine: "The Hermit · The Moon · The Star",
      spreadKind: "three" as const,
    },
    {
      id: "r2",
      date: "12 Jun 2026",
      title: "The Beltane working, in review",
      cardsLine: "Wheel of Fortune (rev) · The Tower · The Sun · …",
      spreadKind: "celtic" as const,
    },
    {
      id: "r3",
      date: "29 May 2026",
      title: "A single card for the dark moon",
      cardsLine: "The High Priestess",
      spreadKind: "single" as const,
    },
    {
      id: "r4",
      date: "04 May 2026",
      title: "The teaching relationship",
      cardsLine: "The Emperor · Queen of Cups · Temperance · …",
      spreadKind: "relationship" as const,
    },
  ];
}
