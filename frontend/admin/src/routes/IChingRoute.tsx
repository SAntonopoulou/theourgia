/**
 * I Ching route — composes the shared IChingSurface with OracleTabs.
 *
 * Backend wiring (POST /api/v1/iching/cast + GET /api/v1/iching/
 * hexagrams/{n}) lands when the I Ching reading-persistence + texts
 * endpoints ship. Save fires a Toast acknowledging the future write.
 */

import {
  IChingSurface,
  OracleTabs,
  type OracleTabsLinkProps,
  Toast,
  useTopbar,
} from "@theourgia/shared";
import { useMemo } from "react";
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

export function IChingRoute() {
  useTopbar(
    () => ({
      title: "I Ching",
      subtitle:
        "易經 · the Book of Changes — cast six lines, read what moves",
    }),
    [],
  );

  const handleSave = (title: string) => {
    Toast.push({
      tone: "success",
      title: "Consultation saved",
      body: `“${title}” added to your journal. (Backend wiring lands with the readings API.)`,
    });
  };

  return useMemo(
    () => (
      <>
        <OracleTabs
          active="iching"
          LinkComponent={NavLinkAdapter}
          hrefFor={(key) => ORACLE_HREF[key] ?? "/"}
        />
        <IChingSurface onSave={handleSave} />
      </>
    ),
    [],
  );
}
