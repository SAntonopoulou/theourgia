/**
 * AnalyticsTabs — secondary nav for the Phase-09 "Analytics" cluster.
 *
 * Three tabs (Dashboard · Query Builder · Saved Studies) ride under
 * the AppShell topbar on every Analytics surface. Active = accent
 * underline + ``aria-current="page"`` + the tab's chart hue.
 *
 * Faithful port of ``AnalyticsTabs.dc.html`` from the H06 handoff.
 * The chart hue tokens live in the ``--chart-*`` family per H06 §S1.
 */

import {
  type CSSProperties,
  type ComponentType,
  type MouseEvent,
  type ReactNode,
} from "react";

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

const ANALYTICS_ICONS = {
  dashboard: (
    <svg {...ICON_PROPS}>
      <rect x="3" y="3" width="8" height="9" rx="1" />
      <rect x="13" y="3" width="8" height="5" rx="1" />
      <rect x="13" y="10" width="8" height="11" rx="1" />
      <rect x="3" y="14" width="8" height="7" rx="1" />
    </svg>
  ),
  query: (
    <svg {...ICON_PROPS}>
      <path d="M4 6h16M4 6v3l6 4v6l4-2v-4l6-4V6" />
    </svg>
  ),
  studies: (
    <svg {...ICON_PROPS}>
      <path d="M5 4h11l3 3v13H5z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  ),
} as const;

export type AnalyticsKey = keyof typeof ANALYTICS_ICONS;

interface TabDef {
  key: AnalyticsKey;
  label: string;
  iconToken: string;
}

const TABS: readonly TabDef[] = [
  { key: "dashboard", label: "Dashboard", iconToken: "--chart-1" },
  { key: "query", label: "Query Builder", iconToken: "--chart-2" },
  { key: "studies", label: "Saved Studies", iconToken: "--chart-3" },
];

const DEFAULT_HREF_FOR: Record<AnalyticsKey, string> = {
  dashboard: "/analytics",
  query: "/analytics/query",
  studies: "/analytics/studies",
};

export interface AnalyticsTabsLinkProps {
  to: string;
  children: ReactNode;
  current?: "page" | undefined;
  style?: CSSProperties;
  onClick?: (event: MouseEvent<HTMLElement>) => void;
}

export interface AnalyticsTabsProps {
  active?: AnalyticsKey;
  hrefFor?: (key: AnalyticsKey) => string;
  LinkComponent?: ComponentType<AnalyticsTabsLinkProps>;
  onNavigate?: (key: AnalyticsKey) => void;
  className?: string;
  style?: CSSProperties;
}

function DefaultLink({
  to,
  children,
  current,
  style,
  onClick,
}: AnalyticsTabsLinkProps) {
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

export function AnalyticsTabs({
  active,
  hrefFor,
  LinkComponent = DefaultLink,
  onNavigate,
  className,
  style,
}: AnalyticsTabsProps) {
  return (
    <nav
      aria-label="Analytics"
      className={`scroll${className ? ` ${className}` : ""}`}
      style={{ ...NAV_STYLE, ...style }}
      data-component="analytics-tabs"
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
              {ANALYTICS_ICONS[tab.key]}
            </span>
            {tab.label}
          </LinkComponent>
        );
      })}
    </nav>
  );
}

export {
  ANALYTICS_ICONS,
  DEFAULT_HREF_FOR as ANALYTICS_DEFAULT_HREF_FOR,
  TABS as ANALYTICS_TABS,
};
