/**
 * Divination Misc route — pendulum · bibliomancy · horary · scrying
 * clustered under the OracleTabs "More" entry (H04 §S7.2).
 */

import {
  DivinationMiscSurface,
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

export function DivinationMiscRoute() {
  useTopbar(
    () => ({
      title: "More divinations",
      subtitle: "Pendulum · bibliomancy · horary · scrying",
    }),
    [],
  );

  const toast = (title: string) => {
    Toast.push({
      tone: "success",
      title,
      body: "Backend wiring lands with the readings API.",
    });
  };

  return useMemo(
    () => (
      <>
        <OracleTabs
          active="more"
          LinkComponent={NavLinkAdapter}
          hrefFor={(key) => ORACLE_HREF[key] ?? "/"}
        />
        <DivinationMiscSurface
          onSavePendulum={() => toast("Pendulum reading saved")}
          onSaveBibliomancy={() => toast("Bibliomancy passage logged")}
          onSaveHorary={() => toast("Horary chart saved")}
          onSaveScrying={() => toast("Scrying session saved")}
        />
      </>
    ),
    [],
  );
}
