/**
 * OracleTabs — secondary nav for the Phase-06 "Divination" cluster.
 *
 * Five tabs (Tarot · I Ching · Geomancy · Runes · More) ride under the
 * AppShell topbar on every divination surface. Active = accent
 * underline + `aria-current="page"` + tab's domain hue.
 *
 * Faithful re-implementation of `OracleTabs.dc.html` from the H04
 * handoff (`/home/sophia/design-handoffs/theourgia/2026-06-22-H04/
 * handoff_H04/OracleTabs.dc.html`). Analogue of `BeingsTabs` for the
 * divination cluster.
 *
 * Scrolls horizontally on mobile (`overflow-x: auto`) without pushing
 * the page wide.
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

// Engraving glyphs lifted verbatim from OracleTabs.dc.html.
const ORACLE_ICONS = {
  tarot: (
    <svg {...ICON_PROPS}>
      <rect
        x="6"
        y="3.5"
        width="9"
        height="14"
        rx="1.4"
        transform="rotate(-9 10.5 10.5)"
      />
      <rect
        x="9"
        y="6.5"
        width="9"
        height="14"
        rx="1.4"
        transform="rotate(6 13.5 13.5)"
      />
      <path d="M13.5 10.5l1.3 2.4 2.6.4-1.9 1.8.5 2.6-2.3-1.2" />
    </svg>
  ),
  iching: (
    <svg {...ICON_PROPS}>
      <path d="M4 6.5h16M4 11h6M14 11h6M4 15.5h16" />
    </svg>
  ),
  geomancy: (
    <svg {...ICON_PROPS}>
      <circle cx="8" cy="7" r="1.3" />
      <circle cx="16" cy="7" r="1.3" />
      <circle cx="8" cy="12" r="1.3" />
      <circle cx="16" cy="12" r="1.3" />
      <circle cx="12" cy="17" r="1.3" />
    </svg>
  ),
  runes: (
    <svg {...ICON_PROPS}>
      <path d="M7 4v16M7 4l7 6M7 11l6-5M17 4v16" />
    </svg>
  ),
  more: (
    <svg {...ICON_PROPS}>
      <path d="M12 4v9M12 13l4 5M12 13l-4 5" />
      <circle cx="12" cy="3" r="1.2" />
      <path d="M6 20h12" />
    </svg>
  ),
} as const;

export type OracleKey = keyof typeof ORACLE_ICONS;

interface TabDef {
  key: OracleKey;
  label: string;
  /** Token name for the per-tab icon hue (see theourgia.tokens.css `--ot-*` family). */
  iconToken: string;
}

// Tab order + labels match the designer's OracleTabs.dc.html exactly.
const TABS: readonly TabDef[] = [
  { key: "tarot", label: "Tarot", iconToken: "--ot-tarot" },
  { key: "iching", label: "I Ching", iconToken: "--ot-iching" },
  { key: "geomancy", label: "Geomancy", iconToken: "--ot-geomancy" },
  { key: "runes", label: "Runes", iconToken: "--ot-runes" },
  { key: "more", label: "More", iconToken: "--ot-more" },
];

// Default routes — admin apps can override via `hrefFor`.
const DEFAULT_HREF_FOR: Record<OracleKey, string> = {
  tarot: "/divination/tarot",
  iching: "/divination/iching",
  geomancy: "/divination/geomancy",
  runes: "/divination/runes",
  more: "/divination/more",
};

// ─── Props ─────────────────────────────────────────────────────────────

export interface OracleTabsLinkProps {
  to: string;
  children: ReactNode;
  current?: "page" | undefined;
  style?: CSSProperties;
  onClick?: (event: MouseEvent<HTMLElement>) => void;
}

export interface OracleTabsProps {
  /** Which tab is active — drives the underline + aria-current. */
  active?: OracleKey;
  /** Override the default route for any tab. */
  hrefFor?: (key: OracleKey) => string;
  /** Custom link renderer (e.g. react-router NavLink). Defaults to `<a>`. */
  LinkComponent?: ComponentType<OracleTabsLinkProps>;
  /** Fired whenever a tab is picked (e.g. close mobile drawer). */
  onNavigate?: (key: OracleKey) => void;
  className?: string;
  style?: CSSProperties;
}

function DefaultLink({
  to,
  children,
  current,
  style,
  onClick,
}: OracleTabsLinkProps) {
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

// ─── Styles (literal from OracleTabs.dc.html, tokens only) ──────────────

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
  padding: "13px 16px 11px",
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

export function OracleTabs({
  active,
  hrefFor,
  LinkComponent = DefaultLink,
  onNavigate,
  className,
  style,
}: OracleTabsProps) {
  return (
    <nav
      aria-label="Divination methods"
      className={`scroll${className ? ` ${className}` : ""}`}
      style={{ ...NAV_STYLE, ...style }}
      data-component="oracle-tabs"
    >
      {TABS.map((tab) => {
        const isActive = tab.key === active;
        const to = hrefFor ? hrefFor(tab.key) : DEFAULT_HREF_FOR[tab.key];
        const iconStyle: CSSProperties = {
          display: "flex",
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
              {ORACLE_ICONS[tab.key]}
            </span>
            {tab.label}
          </LinkComponent>
        );
      })}
    </nav>
  );
}

export {
  ORACLE_ICONS,
  DEFAULT_HREF_FOR as ORACLE_DEFAULT_HREF_FOR,
  TABS as ORACLE_TABS,
};
