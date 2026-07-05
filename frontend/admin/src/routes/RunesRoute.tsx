/**
 * Runes route — composes the shared RunesSurface with OracleTabs.
 *
 * Backend wiring (POST /api/v1/runes/draw) lands when the runes
 * persistence endpoint ships. Save fires a Toast acknowledging the
 * future write.
 */

import {
  OracleTabs,
  type OracleTabsLinkProps,
  RunesSurface,
  Toast,
  useTopbar,
} from "@theourgia/shared";
import { useMemo } from "react";
import { NavLink } from "react-router-dom";

import { apiMethods } from "../data/api.js";

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

export function RunesRoute() {
  useTopbar(
    () => ({
      title: "Runes",
      subtitle: "Elder Futhark · draw from the bag and read the staves",
    }),
    [],
  );

  const handleSave = async (title: string) => {
    try {
      await apiMethods.castRunes({
        question: title,
        rune_set: "elder_futhark",
        spread: "three_rune",
      });
      Toast.push({
        tone: "success",
        title: "Draw saved",
        body: `“${title}” persisted. Note: server draws a fresh set; full seed round-trip lands when the surface exposes its drawn state.`,
      });
    } catch (err) {
      Toast.push({
        tone: "error",
        title: "Could not save",
        body: err instanceof Error ? err.message : "An unexpected error occurred.",
      });
    }
  };

  return useMemo(
    () => (
      <>
        <OracleTabs
          active="runes"
          LinkComponent={NavLinkAdapter}
          hrefFor={(key) => ORACLE_HREF[key] ?? "/"}
        />
        <RunesSurface onSave={handleSave} />
      </>
    ),
    [],
  );
}
