/**
 * BeingsTabs — secondary nav for the Phase-05 "Magical beings" cluster.
 *
 * Faithful re-implementation of `BeingsTabs.dc.html` from the H01-H03
 * handoff (`/home/sophia/design-handoffs/theourgia/2026-06-21-H01-H03/
 * handoff_H01-H03/BeingsTabs.dc.html`).
 *
 * Eight tabs (Entities · Offerings · Contracts · Oaths · Initiations ·
 * Servitors · Attestations · Aliases) ride under the AppShell topbar
 * on every ledger surface. Active = accent underline +
 * `aria-current="page"` + tab's domain hue.
 *
 * Scrolls horizontally on mobile (`overflow-x: auto`) without
 * pushing the page wide.
 *
 * Component contract follows `agent_data_and_components_H01-H03.md §C`:
 * `BeingsTabs({ active })`. The link element is delegated via
 * `LinkComponent` so the shared package never imports a router; admin
 * apps wire react-router's NavLink.
 */

import {
  type CSSProperties,
  type ComponentType,
  type MouseEvent,
  type ReactNode,
} from "react";

// ─── Tabs ──────────────────────────────────────────────────────────────

const ICON_PROPS = {
  width: 16,
  height: 16,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

// Engraving glyphs lifted verbatim from BeingsTabs.dc.html.
const BEINGS_ICONS = {
  entities: (
    <svg {...ICON_PROPS}>
      <circle cx="12" cy="8" r="3.2" />
      <path d="M5.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6" />
    </svg>
  ),
  offerings: (
    <svg {...ICON_PROPS}>
      <path d="M5 10.5h14l-1.4 6.4a2 2 0 0 1-2 1.6H8.4a2 2 0 0 1-2-1.6z" />
      <path d="M9 10.5V8M12 10.5V6.5M15 10.5V8" />
    </svg>
  ),
  contracts: (
    <svg {...ICON_PROPS}>
      <path d="M7 3.5h6.5L18 8v12.5H7z" />
      <path d="M13.5 3.5V8H18" />
      <path d="M10 13h5M10 16.5h5" />
    </svg>
  ),
  oaths: (
    <svg {...ICON_PROPS}>
      <path d="M9 12V6.5a1.4 1.4 0 0 1 2.8 0V11" />
      <path d="M11.8 11V5.5a1.4 1.4 0 0 1 2.8 0V12" />
      <path d="M14.6 12V8a1.4 1.4 0 0 1 2.8 0v5.5c0 3.4-2.4 6-5.6 6-2 0-3.4-.8-4.6-2.4L6 14.4a1.4 1.4 0 0 1 2-2z" />
    </svg>
  ),
  initiations: (
    <svg {...ICON_PROPS}>
      <circle cx="15" cy="9" r="3.2" />
      <path d="M12.8 11.2L6 18v0M8 16h2M10 18l1.4-1.4" />
    </svg>
  ),
  servitors: (
    <svg {...ICON_PROPS}>
      <path d="M12 4l7.5 13H4.5z" />
      <circle cx="12" cy="13" r="1.4" />
    </svg>
  ),
  attestations: (
    <svg {...ICON_PROPS}>
      <path d="M5 19l1-3 9-9 2 2-9 9z" />
      <path d="M14 8l2 2" />
      <path d="M12.5 20H19" />
    </svg>
  ),
  aliases: (
    <svg {...ICON_PROPS}>
      <circle cx="7" cy="7.5" r="2.6" />
      <circle cx="17" cy="16.5" r="2.6" />
      <path d="M9 9.5l6 5" />
    </svg>
  ),
} as const;

export type BeingsKey = keyof typeof BEINGS_ICONS;

interface TabDef {
  key: BeingsKey;
  label: string;
  /** Token name for the per-tab icon hue (see theourgia.tokens.css —bt-* family). */
  iconToken: string;
}

// Tab order + labels match the designer's BeingsTabs.dc.html exactly.
// The `iconToken` references the `--bt-*` token family added with the
// H01-H03 batch — the designer used literal hex values; this file
// resolves them through the canonical token layer per the
// `match design exactly` + `tokens not literals` discipline.
const TABS: readonly TabDef[] = [
  { key: "entities", label: "Entities", iconToken: "--bt-entities" },
  { key: "offerings", label: "Offerings", iconToken: "--bt-offerings" },
  { key: "contracts", label: "Contracts", iconToken: "--bt-contracts" },
  { key: "oaths", label: "Oaths", iconToken: "--bt-oaths" },
  { key: "initiations", label: "Initiations", iconToken: "--bt-initiations" },
  { key: "servitors", label: "Servitors", iconToken: "--bt-servitors" },
  { key: "attestations", label: "Attestations", iconToken: "--bt-attestations" },
  { key: "aliases", label: "Aliases", iconToken: "--bt-aliases" },
];

// Default routes — admin apps can override via `hrefFor`.
const DEFAULT_HREF_FOR: Record<BeingsKey, string> = {
  entities: "/beings/entities",
  offerings: "/beings/offerings",
  contracts: "/beings/contracts",
  oaths: "/beings/oaths",
  initiations: "/beings/initiations",
  servitors: "/beings/servitors",
  attestations: "/beings/attestations",
  aliases: "/beings/aliases",
};

// ─── Props ─────────────────────────────────────────────────────────────

export interface BeingsTabsLinkProps {
  to: string;
  children: ReactNode;
  current?: "page" | undefined;
  style?: CSSProperties;
  onClick?: (event: MouseEvent<HTMLElement>) => void;
}

export interface BeingsTabsProps {
  /** Which tab is active — drives the underline + aria-current. */
  active?: BeingsKey;
  /** Override the default route for any tab. */
  hrefFor?: (key: BeingsKey) => string;
  /** Custom link renderer (e.g. react-router NavLink). Defaults to `<a>`. */
  LinkComponent?: ComponentType<BeingsTabsLinkProps>;
  /** Fired whenever a tab is picked (e.g. close mobile drawer). */
  onNavigate?: (key: BeingsKey) => void;
  className?: string;
  style?: CSSProperties;
}

function DefaultLink({
  to,
  children,
  current,
  style,
  onClick,
}: BeingsTabsLinkProps) {
  // `aria-current` is omitted when undefined per the designer's spec
  // (the markup carries `aria-current="page"` only on the active tab).
  return current ? (
    <a href={to} style={style} onClick={onClick} aria-current="page">
      {children}
    </a>
  ) : (
    <a href={to} style={style} onClick={onClick}>
      {children}
    </a>
  );
}

// ─── Styles (literal from BeingsTabs.dc.html, tokens only) ──────────────

const NAV_STYLE: CSSProperties = {
  display: "flex",
  alignItems: "stretch",
  gap: 2,
  overflowX: "auto",
  borderBottom: "1px solid var(--line)",
  background: "var(--bg)",
  padding: "0 18px",
};

const TAB_BASE: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  padding: "13px 14px 11px",
  whiteSpace: "nowrap",
  fontFamily: "var(--font-ui)",
  fontSize: 13.5,
  color: "var(--ink-mute)",
  textDecoration: "none",
  borderBottom: "2px solid transparent",
  flex: "none",
};

const TAB_ACTIVE: CSSProperties = {
  ...TAB_BASE,
  color: "var(--ink)",
  borderBottomColor: "var(--accent)",
};

// ─── Component ─────────────────────────────────────────────────────────

export function BeingsTabs({
  active,
  hrefFor,
  LinkComponent = DefaultLink,
  onNavigate,
  className,
  style,
}: BeingsTabsProps) {
  return (
    <nav
      aria-label="Relational ledger"
      className={`scroll${className ? ` ${className}` : ""}`}
      style={{ ...NAV_STYLE, ...style }}
    >
      {TABS.map((tab) => {
        const isActive = tab.key === active;
        const to = hrefFor ? hrefFor(tab.key) : DEFAULT_HREF_FOR[tab.key];
        const iconStyle: CSSProperties = {
          display: "flex",
          // Active tab gets the per-tab icon hue; inactive uses
          // currentColor so the icon inherits the ink-mute tint.
          color: isActive ? `var(${tab.iconToken})` : "currentColor",
        };
        return (
          <LinkComponent
            key={tab.key}
            to={to}
            current={isActive ? "page" : undefined}
            style={isActive ? TAB_ACTIVE : TAB_BASE}
            onClick={() => onNavigate?.(tab.key)}
          >
            <span style={iconStyle} aria-hidden="true">
              {BEINGS_ICONS[tab.key]}
            </span>
            {tab.label}
          </LinkComponent>
        );
      })}
    </nav>
  );
}

export { BEINGS_ICONS, DEFAULT_HREF_FOR, TABS as BEINGS_TABS };
