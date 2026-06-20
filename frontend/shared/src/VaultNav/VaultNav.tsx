/**
 * VaultNav — authenticated sidebar navigation.
 *
 * Renders a vertical list of route links with active-state highlighting.
 * The actual link rendering is delegated to a ``LinkComponent`` prop so
 * the shared package doesn't depend on a router — admin wires
 * react-router's NavLink; other consumers could use plain <a>.
 *
 *   <VaultNav
 *     items={NAV}
 *     LinkComponent={({ to, children, className, ...rest }) =>
 *       <NavLink to={to} className={className} {...rest}>{children}</NavLink>
 *     }
 *     isActive={(to) => location.pathname === to}
 *   />
 */

import type { CSSProperties, ComponentType, MouseEvent, ReactNode } from "react";

import { Badge } from "../Badge/index.js";
import { Glyph, type GlyphName } from "../Glyph/index.js";

export interface VaultNavItem {
  to: string;
  label: string;
  glyph: GlyphName;
  badge?: string | number;
  /** Mark as a dev-only / pre-launch route in the visual treatment. */
  dev?: boolean;
}

export interface VaultNavLinkProps {
  to: string;
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  onClick?: (event: MouseEvent<HTMLElement>) => void;
}

export interface VaultNavProps {
  items: readonly VaultNavItem[];
  /** Custom link renderer (e.g. react-router's NavLink). Defaults to a plain <a>. */
  LinkComponent?: ComponentType<VaultNavLinkProps>;
  /** Returns true when the supplied ``to`` matches the active route. */
  isActive?: (to: string) => boolean;
  /** Called when the user picks an item (e.g. for closing the mobile drawer). */
  onNavigate?: () => void;
  /** Container className passthrough. */
  className?: string;
  style?: CSSProperties;
  /** Optional heading rendered above the list. */
  heading?: ReactNode;
}

function DefaultLink({ to, children, className, style, onClick }: VaultNavLinkProps) {
  return (
    <a href={to} className={className} style={style} onClick={onClick}>
      {children}
    </a>
  );
}

export function VaultNav({
  items,
  LinkComponent = DefaultLink,
  isActive,
  onNavigate,
  className,
  style,
  heading,
}: VaultNavProps) {
  function itemStyle(active: boolean, dev: boolean): CSSProperties {
    return {
      display: "flex",
      alignItems: "center",
      gap: "var(--space-3, 12px)",
      padding: "var(--space-2, 8px) var(--space-3, 12px)",
      borderRadius: "var(--r-md, 6px)",
      color: active ? "var(--accent)" : dev ? "var(--ink-mute)" : "var(--ink-soft)",
      backgroundColor: active ? "var(--accent-soft, var(--bg-3, var(--bg-2)))" : "transparent",
      fontFamily: "var(--font-ui, system-ui, sans-serif)",
      fontSize: "var(--type-body-sm, 14px)",
      fontWeight: active ? 600 : 500,
      textDecoration: "none",
      letterSpacing: "0.01em",
      transition: "background-color 150ms ease, color 150ms ease",
      cursor: "pointer",
    };
  }

  return (
    <nav
      aria-label="Vault navigation"
      className={className}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-2, 8px)",
        padding: "var(--space-4, 16px)",
        ...style,
      }}
    >
      {heading ? (
        <div
          style={{
            fontFamily: "var(--font-mono, monospace)",
            fontSize: "var(--type-caption, 11px)",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: "var(--ink-mute)",
            padding: "var(--space-2, 8px) var(--space-3, 12px)",
          }}
        >
          {heading}
        </div>
      ) : null}
      <ul
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 2,
          margin: 0,
          padding: 0,
          listStyle: "none",
        }}
      >
        {items.map((item) => {
          const active = isActive?.(item.to) ?? false;
          return (
            <li key={item.to}>
              <LinkComponent
                to={item.to}
                onClick={() => onNavigate?.()}
                style={itemStyle(active, item.dev ?? false)}
              >
                <Glyph name={item.glyph} size={16} />
                <span style={{ flex: 1 }}>{item.label}</span>
                {item.badge !== undefined ? <Badge tone="info">{item.badge}</Badge> : null}
                {item.dev ? (
                  <span
                    aria-hidden="true"
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 9,
                      letterSpacing: "0.08em",
                      color: "var(--ink-mute)",
                      textTransform: "uppercase",
                    }}
                  >
                    dev
                  </span>
                ) : null}
              </LinkComponent>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
