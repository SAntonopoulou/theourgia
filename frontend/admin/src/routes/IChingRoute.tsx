/**
 * I Ching route — composes the shared IChingSurface with OracleTabs.
 *
 * Live-wired: castIching casts against the backend and Save writes the
 * consultation to the record. (An earlier draft of this header said Save
 * was a stand-in Toast — the audit found the comment stale, not the code.)
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

import { apiMethods } from "../data/api.js";
import { writeConsultation } from "../data/keepObservance.js";

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
  astragaloi: "/divination/astragaloi",
  more: "/divination/more",
};

export function IChingRoute() {
  useTopbar(
    () => ({
      title: "I Ching",
      subtitle: "易經 · the Book of Changes — cast six lines, read what moves",
    }),
    [],
  );

  const handleSave = async (title: string) => {
    try {
      await apiMethods.castIching({
        question: title,
        method: "three_coins",
      });
      Toast.push({
        tone: "success",
        title: "Consultation saved",
        body: `“${title}” persisted. Note: the server casts a fresh reading; the surface's current display uses its own client-side cast. Full seed round-trip lands with a surface prop extension.`,
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
          active="iching"
          LinkComponent={NavLinkAdapter}
          hrefFor={(key) => ORACLE_HREF[key] ?? "/"}
        />
        <IChingSurface
          onSave={handleSave}
          onKeepReading={(r) =>
            void writeConsultation({
              systemId: "iching",
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
