/**
 * Runes route — composes the shared RunesSurface with OracleTabs.
 *
 * Live-wired: castRunes draws against the backend and Save writes the
 * consultation to the record. (An earlier draft of this header said Save
 * was a stand-in Toast — the audit found the comment stale, not the code.)
 */

import {
  OracleTabs,
  type OracleTabsLinkProps,
  RunesSurface,
  Toast,
  useTopbar,
} from "@theourgia/shared";
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

  const handleKeep = async (reading: { title: string; cast: string; interpretation: string }) => {
    try {
      await writeConsultation({
        systemId: "runes",
        question: reading.title,
        cast: reading.cast,
        reading: reading.interpretation,
      });
      Toast.push({
        tone: "success",
        title: "Kept to the record",
        body: "This reading is in your record and syncs to the phone.",
      });
    } catch (err) {
      Toast.push({
        tone: "error",
        title: "Could not keep",
        body: err instanceof Error ? err.message : "An unexpected error occurred.",
      });
    }
  };

  return (
    <>
      <OracleTabs
        active="runes"
        LinkComponent={NavLinkAdapter}
        hrefFor={(key) => ORACLE_HREF[key] ?? "/"}
      />
      <RunesSurface onSave={handleSave} onKeepReading={(r) => void handleKeep(r)} />
    </>
  );
}
