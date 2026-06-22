/**
 * Geomancy route — composes the shared GeomancySurface with OracleTabs.
 *
 * Backend wiring (POST /api/v1/geomancy/cast) lands when the
 * geomancy persistence endpoint ships. Save fires a Toast
 * acknowledging the future write.
 */

import {
  GeomancySurface,
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

export function GeomancyRoute() {
  useTopbar(
    () => ({
      title: "Geomancy",
      subtitle: "Mark the points, raise the shield, read the Judge",
    }),
    [],
  );

  const handleSave = (title: string) => {
    Toast.push({
      tone: "success",
      title: "Chart saved",
      body: `“${title}” added to your journal. (Backend wiring lands with the readings API.)`,
    });
  };

  return useMemo(
    () => (
      <>
        <OracleTabs
          active="geomancy"
          LinkComponent={NavLinkAdapter}
          hrefFor={(key) => ORACLE_HREF[key] ?? "/"}
        />
        <GeomancySurface onSave={handleSave} />
      </>
    ),
    [],
  );
}
