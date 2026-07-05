/**
 * Divination Misc route — pendulum · bibliomancy · horary · scrying
 * clustered under the OracleTabs "More" entry (H04 §S7.2).
 *
 * Bibliomancy is live-wired to POST /api/v1/bibliomancy/cast when the
 * panel captures a passage + reference. Pendulum / horary / scrying
 * panels don't yet collect the fields their respective backends need
 * (pendulum question + answer / horary asked-at + lat-lon / scrying
 * session start-time). Those save callbacks show a tone=info toast
 * saying so honestly — they never claim "saved".
 */

import {
  DivinationMiscSurface,
  OracleTabs,
  type OracleTabsLinkProps,
  Toast,
  useTopbar,
} from "@theourgia/shared";
import { useCallback, useMemo } from "react";
import { NavLink } from "react-router-dom";

import { apiClient } from "../data/api.js";

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

function panelNeedsMoreData(what: string): () => void {
  return () => {
    Toast.push({
      tone: "info",
      title: `${what} panel — no data collected`,
      body: "This panel is display-only; the fields the backend needs (question, timing, location, or session times) aren't captured yet. Log it manually from the Journal until the field-set lands.",
    });
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

  const handleBibliomancy = useCallback(
    async (entryUnknown: unknown) => {
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
        await apiClient.request<Record<string, unknown>>(
          "/api/v1/bibliomancy/cast",
          {
            method: "POST",
            json: {
              question: e.question ?? null,
              source_text: e.passage,
              source_label: e.reference,
              passage_kind: "paragraph",
            },
          },
        );
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
    },
    [],
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
          onSavePendulum={panelNeedsMoreData("Pendulum")}
          onSaveBibliomancy={(entry) => void handleBibliomancy(entry)}
          onSaveHorary={panelNeedsMoreData("Horary")}
          onSaveScrying={panelNeedsMoreData("Scrying")}
        />
      </>
    ),
    [handleBibliomancy],
  );
}
