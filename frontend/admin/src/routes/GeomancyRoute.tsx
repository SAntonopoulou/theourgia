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
  astragaloi: "/divination/astragaloi",
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

  const handleSave = async (title: string) => {
    try {
      await apiMethods.castGeomancy({
        question: title,
        method: "rng",
      });
      Toast.push({
        tone: "success",
        title: "Chart saved",
        body: `“${title}” persisted. Note: server casts a fresh figure set; full seed round-trip lands when the surface exposes its drawn state.`,
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
          active="geomancy"
          LinkComponent={NavLinkAdapter}
          hrefFor={(key) => ORACLE_HREF[key] ?? "/"}
        />
        <GeomancySurface
          onSave={handleSave}
          onKeepReading={(r) =>
            void writeConsultation({
              systemId: "geomancy",
              question: r.title,
              cast: r.cast,
              reading: r.interpretation,
            }).then(
              () => Toast.push({ tone: "success", title: "Kept to the record" }),
              (e: unknown) =>
                Toast.push({
                  tone: "error",
                  title: "Could not keep",
                  body: e instanceof Error ? e.message : "An unexpected error occurred.",
                }),
            )
          }
        />
      </>
    ),
    [],
  );
}
