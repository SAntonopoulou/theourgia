/**
 * BeingsSubnav — admin wiring for the shared BeingsTabs secondary nav.
 *
 * Per `BeingsTabs.dc.html` the eight-tab bar rides under the topbar on
 * every relational-ledger surface (Entities · Offerings · Contracts ·
 * Oaths · Initiations · Servitors · Attestations · Aliases), with the
 * VaultNav "Entities" entry staying active for the whole cluster.
 *
 * Admin mounts the ledger routes at top level (`/entities`,
 * `/offerings`, …) rather than the design's default `/beings/*`
 * prefix, so the hrefs are overridden here. Attestations points at
 * the existing lineage-attestations surface (`/lineage`); Aliases
 * points at `/aliases` (surface not yet composed — placeholder route).
 *
 * Same composition pattern as OracleTabs in TarotRoute: rendered at
 * the top of each route body with a react-router NavLink adapter.
 */

import { type BeingsKey, BeingsTabs, type BeingsTabsLinkProps } from "@theourgia/shared";
import { NavLink } from "react-router-dom";

const BEINGS_HREF: Record<BeingsKey, string> = {
  entities: "/entities",
  offerings: "/offerings",
  contracts: "/contracts",
  oaths: "/oaths",
  initiations: "/initiations",
  servitors: "/servitors",
  attestations: "/lineage",
  aliases: "/aliases",
};

function NavLinkAdapter({ to, current, children, style, onClick }: BeingsTabsLinkProps) {
  return (
    <NavLink to={to} aria-current={current} style={style} onClick={onClick}>
      {children}
    </NavLink>
  );
}

export function BeingsSubnav({ active }: { active: BeingsKey }) {
  return (
    <BeingsTabs
      active={active}
      LinkComponent={NavLinkAdapter}
      hrefFor={(key) => BEINGS_HREF[key]}
      style={{ marginBottom: 22 }}
    />
  );
}
