/**
 * LinguisticTabs — secondary nav for the Phase-08 "Linguistic" cluster.
 *
 * Four tabs (Calculator · Cross-Journal Search · Transliteration ·
 * Voces Library) ride under the AppShell topbar on every Linguistic
 * surface. Active = accent underline + ``aria-current="page"`` + the
 * tab's chart hue.
 *
 * Faithful port of ``LinguisticTabs.dc.html`` from the H06 handoff
 * (`/home/sophia/design-handoffs/theourgia/2026-06-25-H06/handoff_H06/
 * LinguisticTabs.dc.html`). Analogue of `OracleTabs` for the
 * Linguistic cluster; the icon-hue token namespace is the new
 * `--chart-*` family (H06 §S1).
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

const LINGUISTIC_ICONS = {
  calc: (
    <svg {...ICON_PROPS}>
      <rect x="5" y="3" width="14" height="18" rx="1.5" />
      <path d="M8 7h8M8 11h2M12 11h2M16 11h0M8 15h2M12 15h2M16 15h0M8 18h6" />
    </svg>
  ),
  search: (
    <svg {...ICON_PROPS}>
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-3.5-3.5M8 11h6M11 8v6" />
    </svg>
  ),
  translit: (
    <svg {...ICON_PROPS}>
      <path d="M4 7V5h7v2M7.5 5v12M5 17h5" />
      <path d="M13 19l4-9 4 9M14.2 16h5.6" />
    </svg>
  ),
  voces: (
    <svg {...ICON_PROPS}>
      <path d="M4 10v4M8 7v10M12 4.5v15M16 8v8M20 10.5v3" />
    </svg>
  ),
} as const;

export type LinguisticKey = keyof typeof LINGUISTIC_ICONS;

interface TabDef {
  key: LinguisticKey;
  label: string;
  iconToken: string;
}

// Tab order + labels verbatim from LinguisticTabs.dc.html.
const TABS: readonly TabDef[] = [
  { key: "calc", label: "Calculator", iconToken: "--chart-1" },
  { key: "search", label: "Cross-Journal Search", iconToken: "--chart-2" },
  { key: "translit", label: "Transliteration", iconToken: "--chart-3" },
  { key: "voces", label: "Voces Library", iconToken: "--chart-4" },
];

const DEFAULT_HREF_FOR: Record<LinguisticKey, string> = {
  calc: "/gematria",
  search: "/gematria/search",
  translit: "/transliteration",
  voces: "/voces-library",
};

export interface LinguisticTabsLinkProps {
  to: string;
  children: ReactNode;
  current?: "page" | undefined;
  style?: CSSProperties;
  onClick?: (event: MouseEvent<HTMLElement>) => void;
}

export interface LinguisticTabsProps {
  active?: LinguisticKey;
  hrefFor?: (key: LinguisticKey) => string;
  LinkComponent?: ComponentType<LinguisticTabsLinkProps>;
  onNavigate?: (key: LinguisticKey) => void;
  className?: string;
  style?: CSSProperties;
}

function DefaultLink({
  to,
  children,
  current,
  style,
  onClick,
}: LinguisticTabsLinkProps) {
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

// Styles literal from LinguisticTabs.dc.html — tokens only.

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

export function LinguisticTabs({
  active,
  hrefFor,
  LinkComponent = DefaultLink,
  onNavigate,
  className,
  style,
}: LinguisticTabsProps) {
  return (
    <nav
      aria-label="Linguistic tools"
      className={`scroll${className ? ` ${className}` : ""}`}
      style={{ ...NAV_STYLE, ...style }}
      data-component="linguistic-tabs"
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
              {LINGUISTIC_ICONS[tab.key]}
            </span>
            {tab.label}
          </LinkComponent>
        );
      })}
    </nav>
  );
}

export {
  LINGUISTIC_ICONS,
  DEFAULT_HREF_FOR as LINGUISTIC_DEFAULT_HREF_FOR,
  TABS as LINGUISTIC_TABS,
};
