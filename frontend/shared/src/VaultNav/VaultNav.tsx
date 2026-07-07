/**
 * VaultNav — the admin sidebar.
 *
 * Faithful re-implementation of `VaultNav.dc.html` from the design system
 * (`/home/sophia/design-handoffs/theourgia/2026-06-21-design-system/`).
 *
 * Structure top-to-bottom:
 *
 *   Brand link  · Theta-ring SVG + "Theourgia" wordmark
 *   Quick capture · primary-styled button with ⌘K shortcut
 *   Sections    · Practice / Reference / Workbench / Study / Network
 *   Footer      · identity (Σ avatar + name + role) + settings cog
 *
 * Component contract follows ``agent_data_and_components.md §Shell``:
 * ``VaultNav({ active, identity })``. Item routes/order are partly
 * feature-gated (per §8 of agent_onboarding), but the default tree shipped
 * here mirrors the .dc.html exactly.
 *
 * The link element is delegated via ``LinkComponent`` so the shared
 * package never imports a router; admin wires react-router's NavLink.
 */

import {
  type CSSProperties,
  type ComponentType,
  type MouseEvent,
  type ReactNode,
} from "react";

import { _ } from "../i18n/index.js";

// ─── Item icons (engraving style — stroke 1.5, currentColor, 18×18) ────────

const ICON_PROPS = {
  width: 18,
  height: 18,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

const NAV_ICONS = {
  today: (
    <svg {...ICON_PROPS}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2.5v2.5M12 19v2.5M2.5 12H5M19 12h2.5M5.2 5.2l1.8 1.8M17 17l1.8 1.8M18.8 5.2L17 7M7 17l-1.8 1.8" />
    </svg>
  ),
  journal: (
    <svg {...ICON_PROPS}>
      <path d="M12 6c-2-1.3-4.6-1.5-7-.9v12.4c2.4-.6 5-.4 7 .9 2-1.3 4.6-1.5 7-.9V5.1c-2.4-.6-5-.4-7 .9z" />
      <path d="M12 6v12.4" />
    </svg>
  ),
  synchronicities: (
    <svg {...ICON_PROPS}>
      <path d="M12 3v6M12 15v6M3 12h6M15 12h6M6.5 6.5l3.2 3.2M14.3 14.3l3.2 3.2M17.5 6.5l-3.2 3.2M9.7 14.3l-3.2 3.2" />
    </svg>
  ),
  dailypractice: (
    <svg {...ICON_PROPS}>
      <path d="M5 15h14M3.5 19h17M12 3v5M9 6l3-3 3 3" />
      <path d="M5 15a7 7 0 0 1 14 0" />
    </svg>
  ),
  practicelogs: (
    <svg {...ICON_PROPS}>
      <path d="M6 4h9l3 3v13H6z" />
      <path d="M9 9h6M9 12.5h6M9 16h4" />
    </svg>
  ),
  entities: (
    <svg {...ICON_PROPS}>
      <path d="M6 6.5h12M7 9.5h10M9 9.5v8M15 9.5v8M5 20.5h14" />
      <circle cx="12" cy="4" r="1.5" />
    </svg>
  ),
  library: (
    <svg {...ICON_PROPS}>
      <rect x="4" y="4.5" width="5" height="15" rx="1" />
      <rect x="10" y="4.5" width="5" height="15" rx="1" />
      <path d="M15.6 6l3.4 1 2.4 13.5-3.4-1z" />
    </svg>
  ),
  calendar: (
    <svg {...ICON_PROPS}>
      <rect x="3.5" y="5" width="17" height="15" rx="2" />
      <path d="M3.5 9.5h17M8 3v4M16 3v4" />
    </svg>
  ),
  divination: (
    <svg {...ICON_PROPS}>
      <path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12z" />
      <circle cx="12" cy="12" r="2.5" />
    </svg>
  ),
  sigils: (
    <svg {...ICON_PROPS}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 4.5l6.5 11.3H5.5z" />
    </svg>
  ),
  magicsquares: (
    <svg {...ICON_PROPS}>
      <rect x="4" y="4" width="16" height="16" rx="1.5" />
      <path d="M9.3 4v16M14.6 4v16M4 9.3h16M4 14.6h16" />
    </svg>
  ),
  talismans: (
    <svg {...ICON_PROPS}>
      <path d="M12 2.5l3 5 5.5 1-4 4 1 5.5-5.5-3-5.5 3 1-5.5-4-4 5.5-1z" />
    </svg>
  ),
  circles: (
    <svg {...ICON_PROPS}>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="4.5" />
      <circle cx="12" cy="12" r="1" />
    </svg>
  ),
  tools: (
    <svg {...ICON_PROPS}>
      <path d="M14.5 4.5l5 5-9.5 9.5-5-5z" />
      <path d="M9 10l-4.5 4.5M16.5 2.5l1.6 1.6" />
      <circle cx="6" cy="18" r="1" />
    </svg>
  ),
  voces: (
    <svg {...ICON_PROPS}>
      <path d="M4 10v4M8 7v10M12 4.5v15M16 8v8M20 10.5v3" />
    </svg>
  ),
  gematria: (
    <svg {...ICON_PROPS}>
      <rect x="5" y="3" width="14" height="18" rx="1.8" />
      <path d="M8 7h8M8.5 11h0M12 11h0M15.5 11h0M8.5 14.5h0M12 14.5h0M15.5 14.5h0M8.5 18h4" />
    </svg>
  ),
  translit: (
    <svg {...ICON_PROPS}>
      <path d="M4 7V5h7v2M7.5 5v12M5.5 17h4" />
      <path d="M13 19l3.8-9 3.8 9M14.3 16h5" />
    </svg>
  ),
  voceslib: (
    <svg {...ICON_PROPS}>
      <path d="M5 4.5h11l3 3v12H5z" />
      <path d="M9 4.5v15M12.5 9.5h3M12.5 13h3" />
    </svg>
  ),
  publications: (
    <svg {...ICON_PROPS}>
      <path d="M5 4h9l3 3v13H5z" />
      <path d="M5 7.5h9M9 4v16" />
    </svg>
  ),
  subscribers: (
    <svg {...ICON_PROPS}>
      <circle cx="9" cy="8" r="3" />
      <path d="M3.5 19a5.5 5.5 0 0 1 11 0M16 6a3 3 0 0 1 0 6M18 19a5.5 5.5 0 0 0-3-5" />
    </svg>
  ),
  media: (
    <svg {...ICON_PROPS}>
      <rect x="4" y="5" width="16" height="14" rx="1.6" />
      <path d="M4 15l4-4 3 3 4-5 5 6" />
      <circle cx="9" cy="9" r="1.3" />
    </svg>
  ),
  audio: (
    <svg {...ICON_PROPS}>
      <path d="M4 10v4M8 7v10M12 5v14M16 8v8M20 10v4" />
    </svg>
  ),
  pilgrimage: (
    <svg {...ICON_PROPS}>
      <path d="M12 21s7-6.3 7-11.5A7 7 0 0 0 5 9.5C5 14.7 12 21 12 21z" />
      <circle cx="12" cy="9.3" r="2.4" />
    </svg>
  ),
  icalfeed: (
    <svg {...ICON_PROPS}>
      <rect x="4" y="5" width="16" height="16" rx="1.6" />
      <path d="M4 9.5h16M8 3.5v3M16 3.5v3M9 14l2 2 4-4" />
    </svg>
  ),
  analytics: (
    <svg {...ICON_PROPS}>
      <path d="M4 4v16h16" />
      <path d="M8 16v-3M12 16v-7M16 16v-5M20 16v-9" />
    </svg>
  ),
  feed: (
    <svg {...ICON_PROPS}>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
    </svg>
  ),
  networks: (
    // H08: same engraving as the prior "hubs" key — renamed only.
    <svg {...ICON_PROPS}>
      <circle cx="12" cy="7" r="3" />
      <circle cx="5.5" cy="17" r="2.5" />
      <circle cx="18.5" cy="17" r="2.5" />
      <path d="M12 10v3M10 14l-3 2M14 14l3 2" />
    </svg>
  ),
  followers: (
    // H08: a head + two outward-facing followers behind. Distinct from
    // the "subscribers" icon (which is broader profile work).
    <svg {...ICON_PROPS}>
      <circle cx="9" cy="8" r="3" />
      <path d="M3.5 19a5.5 5.5 0 0 1 11 0M16.5 6.2a3 3 0 0 1 0 5.6M20 19a5.5 5.5 0 0 0-3.2-5" />
    </svg>
  ),
  privateviewers: (
    // H08: an eye with two corner sparks — a quiet "shown to a chosen
    // few" glyph, no surveillance feel.
    <svg {...ICON_PROPS}>
      <path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12z" />
      <circle cx="12" cy="12" r="2.5" />
      <path d="M19 5l-2 2M5 19l2-2" />
    </svg>
  ),
  // ── H09 Platform section ───────────────────────────────────────────
  plugins: (
    // Puzzle / socket family (rule from H09 §S0 — plugins read as a
    // *puzzle/socket* family; bundles as a single *scroll*).
    <svg {...ICON_PROPS}>
      <path d="M9 4h3a2 2 0 0 1 2 2v2h2a2 2 0 0 1 2 2v3" />
      <path d="M14 8a1.5 1.5 0 0 1 0-3" />
      <path d="M14 13v7H5v-9h3" />
      <path d="M8 11a1.5 1.5 0 0 1-3 0" />
    </svg>
  ),
  bundles: (
    // Single scroll, distinct from plugin icon. The bundle is *data*
    // — content rolled up for installation.
    <svg {...ICON_PROPS}>
      <path d="M6 4h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6" />
      <path d="M6 4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2" />
      <path d="M9 9h6M9 12h6M9 15h4" />
    </svg>
  ),
  sandbox: (
    // A small bordered tray with a content square inside — the safe
    // place to look before committing. Echoes the SandboxFrame chrome.
    <svg {...ICON_PROPS}>
      <rect x="3" y="6" width="18" height="14" rx="1.5" />
      <path d="M3 10h18" />
      <rect x="8" y="13" width="8" height="4" />
    </svg>
  ),
} as const;

export type NavKey = keyof typeof NAV_ICONS;

// ─── Section structure (mirrors VaultNav.dc.html exactly) ──────────────────

export interface VaultNavItem {
  key: NavKey;
  to: string;
  label: string;
}

export interface VaultNavSection {
  heading: string;
  items: VaultNavItem[];
}

/**
 * Default item tree. Sections + order match the .dc.html. Consumers may
 * override via the ``sections`` prop when feature-gating drives a
 * different shape (e.g. observers see fewer; agents/federation hide if
 * disabled — per agent_onboarding §8).
 */
export const DEFAULT_VAULT_NAV: VaultNavSection[] = [
  {
    heading: "Practice",
    items: [
      { key: "today", to: "/", label: "Today" },
      { key: "journal", to: "/journal", label: "Journal" },
      { key: "dailypractice", to: "/daily-practice", label: "Daily practice" },
      { key: "practicelogs", to: "/practice-logs", label: "Practice log" },
    ],
  },
  {
    heading: "Reference",
    items: [
      { key: "entities", to: "/entities", label: "Entities" },
      { key: "library", to: "/library", label: "Library" },
      { key: "calendar", to: "/calendar", label: "Calendar" },
    ],
  },
  {
    heading: "Workbench",
    items: [
      { key: "divination", to: "/divination/tarot", label: "Divination" },
      { key: "sigils", to: "/sigils", label: "Sigil Generator" },
      { key: "magicsquares", to: "/magic-squares", label: "Magic Squares" },
      { key: "talismans", to: "/talismans", label: "Talisman Designer" },
      { key: "circles", to: "/circles", label: "Magical Circle" },
      { key: "tools", to: "/tools", label: "Tool Registry" },
      { key: "voces", to: "/voces", label: "Voces Magicae" },
    ],
  },
  // ── Phase 08 (H06) — Linguistic ──────────────────────────────────────
  {
    heading: "Linguistic",
    items: [
      { key: "gematria", to: "/gematria", label: "Gematria" },
      { key: "translit", to: "/transliterations", label: "Transliteration" },
      { key: "voceslib", to: "/voces-library", label: "Voces library" },
    ],
  },
  // ── Phase 09 (H06) — Synchronicity & study ───────────────────────────
  // Synchronicities moved here from "Practice" per H06 IA decision.
  // Analytics moved here from its single-item "Study" section.
  {
    heading: "Synchronicity & study",
    items: [
      { key: "synchronicities", to: "/synchronicities", label: "Synchronicities" },
      { key: "analytics", to: "/analytics", label: "Analytics" },
    ],
  },
  // ── Phase 10 (H07) — Publishing ──────────────────────────────────────
  {
    heading: "Publishing",
    items: [
      { key: "publications", to: "/publications", label: "Publications" },
      { key: "subscribers", to: "/subscribers", label: "Subscribers" },
    ],
  },
  // ── Phase 11 (H07) — Media ───────────────────────────────────────────
  {
    heading: "Media",
    items: [
      { key: "media", to: "/media", label: "Media library" },
      { key: "audio", to: "/audio", label: "Audio library" },
      { key: "pilgrimage", to: "/pilgrimage", label: "Pilgrimage map" },
      { key: "icalfeed", to: "/icalfeed", label: "Calendar feed" },
    ],
  },
  // ── Phase 12 (H08) — Federation ──────────────────────────────────────
  // The Network section grew at H08: the existing Ritual feed entry is
  // now joined by My networks (renamed from "Hubs" — the practitioner
  // belongs to networks they don't necessarily admin), Followers (the
  // single quiet follower-count surface — rule 18), and Private viewers
  // (read-only scoped credentials — Phase 12 § 5).
  {
    heading: "Network",
    items: [
      { key: "feed", to: "/feed", label: "Ritual feed" },
      { key: "networks", to: "/networks", label: "My networks" },
      { key: "followers", to: "/followers", label: "Followers" },
      {
        key: "privateviewers",
        to: "/private-viewers",
        label: "Private viewers",
      },
    ],
  },
  // ── Phase 14 (H09) — Platform ──────────────────────────────────────
  // Plugin = code that extends the platform (requests capabilities,
  // can error). Bundle = data that populates it (no code, no
  // capability, previewable). Sandbox is the safe place to look
  // before committing.
  {
    heading: "Platform",
    items: [
      { key: "plugins", to: "/plugins", label: "Plugins" },
      { key: "bundles", to: "/bundles", label: "Bundles" },
      { key: "sandbox", to: "/sandbox", label: "Sandbox" },
    ],
  },
];

// ─── Identity footer ───────────────────────────────────────────────────────

export interface VaultIdentity {
  /** Display name, e.g. "Aspasia". */
  name: string;
  /** Role / grade line, e.g. "Adeptus Minor". Optional. */
  role?: string;
  /** Single character used inside the round avatar — defaults to first
   *  letter of ``name``. */
  avatarChar?: string;
}

// ─── Props ─────────────────────────────────────────────────────────────────

export interface VaultNavLinkProps {
  to: string;
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  onClick?: (event: MouseEvent<HTMLElement>) => void;
}

export interface VaultNavProps {
  /** Current active nav key (drives the inset-bar highlight). */
  active?: NavKey;
  /** Optional override of the section tree (defaults to ``DEFAULT_VAULT_NAV``). */
  sections?: readonly VaultNavSection[];
  /** Custom link renderer (e.g. react-router NavLink). Defaults to ``<a>``. */
  LinkComponent?: ComponentType<VaultNavLinkProps>;
  /** Fired when any link is picked (e.g. close mobile drawer). */
  onNavigate?: () => void;
  /** Fired when the Quick capture button is pressed. */
  onQuickCapture?: () => void;
  /** Fired when the settings cog in the footer is pressed. */
  onSettings?: () => void;
  /** Identity rendered in the footer. */
  identity?: VaultIdentity;
  className?: string;
  style?: CSSProperties;
}

// ─── Component ─────────────────────────────────────────────────────────────

function DefaultLink({ to, children, className, style, onClick }: VaultNavLinkProps) {
  return (
    <a href={to} className={className} style={style} onClick={onClick}>
      {children}
    </a>
  );
}

const ITEM_BASE: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 11,
  padding: "9px 11px",
  borderRadius: 8,
  color: "var(--ink-soft)",
  fontFamily: "var(--font-ui)",
  fontSize: 14,
  marginBottom: 2,
  textDecoration: "none",
};

const ITEM_ACTIVE: CSSProperties = {
  ...ITEM_BASE,
  color: "var(--ink)",
  background: "var(--accent-soft)",
  boxShadow: "inset 2px 0 0 var(--accent)",
};

const SECTION_HEADING_BASE: CSSProperties = {
  fontFamily: "var(--font-ui)",
  fontSize: 10.5,
  letterSpacing: "0.16em",
  textTransform: "uppercase",
  color: "var(--ink-mute)",
};

export function VaultNav({
  active,
  sections = DEFAULT_VAULT_NAV,
  LinkComponent = DefaultLink,
  onNavigate,
  onQuickCapture,
  onSettings,
  // Magickal-name rule: shared package never uses the user's legal name
  // (or a demo persona's) as a default. Consumer apps inject the actual
  // logged-in identity via the ``identity`` prop; when absent, render
  // neutral chrome ("Practitioner · This vault") rather than leaking a
  // fake persona into every deploy.
  identity = { name: "Practitioner", role: "This vault" },
  className,
  style,
}: VaultNavProps) {
  const avatarChar =
    identity.avatarChar ?? identity.name.slice(0, 1).toUpperCase();

  return (
    <aside
      aria-label="Vault navigation"
      className={`scroll om-aside${className ? ` ${className}` : ""}`}
      style={{
        height: "100%",
        background: "var(--bg-sunk)",
        borderRight: "1px solid var(--line)",
        overflowY: "auto",
        overflowX: "hidden",
        display: "flex",
        flexDirection: "column",
        padding: "18px 14px 16px",
        fontFamily: "var(--font-serif)",
        ...style,
      }}
    >
      {/* Brand */}
      <LinkComponent
        to="/"
        onClick={() => onNavigate?.()}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 11,
          padding: "6px 8px 18px",
          textDecoration: "none",
          color: "var(--ink)",
        }}
      >
        <svg width="30" height="30" viewBox="0 0 40 40" fill="none" aria-hidden="true">
          <circle cx="20" cy="20" r="17.5" stroke="var(--accent)" strokeWidth="1.4" />
          <circle
            cx="20"
            cy="20"
            r="12"
            stroke="var(--accent)"
            strokeWidth="1"
            opacity="0.55"
          />
          <line
            x1="9.5"
            y1="20"
            x2="30.5"
            y2="20"
            stroke="var(--accent)"
            strokeWidth="1.4"
          />
        </svg>
        <span
          style={{
            fontFamily: "var(--font-display, var(--font-serif))",
            fontSize: 21,
            letterSpacing: "0.04em",
          }}
        >
          Theourgia
        </span>
      </LinkComponent>

      {/* Quick capture */}
      <button
        type="button"
        onClick={() => onQuickCapture?.()}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          width: "100%",
          padding: "10px 12px",
          marginBottom: 18,
          border: "1px solid var(--line-2)",
          borderRadius: "var(--r-md, 8px)",
          background: "var(--accent-soft)",
          color: "var(--ink)",
          fontFamily: "var(--font-ui)",
          fontSize: 13.5,
          fontWeight: 700,
          textAlign: "left",
          cursor: "pointer",
        }}
      >
        <svg
          width="17"
          height="17"
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--accent)"
          strokeWidth="1.6"
          strokeLinecap="round"
          aria-hidden="true"
        >
          <path d="M12 5v14M5 12h14" />
        </svg>
        Quick capture
        <span
          style={{
            marginLeft: "auto",
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            color: "var(--ink-mute)",
          }}
          aria-hidden="true"
        >
          ⌘K
        </span>
      </button>

      {/* Sections. Section headings + item labels are gettext source
          strings — registered in `frontend/shared/src/i18n/catalogs/`.
          Consumers passing custom labels that aren't in any catalog
          still render verbatim (gettext fallback). */}
      {sections.map((section, sectionIndex) => (
        <div key={section.heading}>
          <div
            style={{
              ...SECTION_HEADING_BASE,
              padding: sectionIndex === 0 ? "0 10px 8px" : "16px 10px 8px",
            }}
          >
            {_(section.heading)}
          </div>
          {section.items.map((item) => {
            const isActive = item.key === active;
            return (
              <LinkComponent
                key={item.key}
                to={item.to}
                onClick={() => onNavigate?.()}
                style={isActive ? ITEM_ACTIVE : ITEM_BASE}
              >
                {NAV_ICONS[item.key]}
                <span>{_(item.label)}</span>
              </LinkComponent>
            );
          })}
        </div>
      ))}

      {/* Identity footer */}
      <div
        style={{
          marginTop: "auto",
          paddingTop: 16,
          borderTop: "1px solid var(--line)",
          display: "flex",
          alignItems: "center",
          gap: 11,
        }}
      >
        <span
          aria-hidden="true"
          style={{
            width: 32,
            height: 32,
            borderRadius: "50%",
            background: "var(--accent-soft)",
            border: "1px solid var(--line-2)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "var(--font-display, var(--font-serif))",
            color: "var(--accent)",
            fontSize: 15,
          }}
        >
          {avatarChar}
        </span>
        <div style={{ lineHeight: 1.2 }}>
          <div
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: 13,
              color: "var(--ink)",
            }}
          >
            {identity.name}
          </div>
          {identity.role ? (
            <div
              style={{
                fontFamily: "var(--font-ui)",
                fontSize: 11,
                color: "var(--ink-mute)",
              }}
            >
              {identity.role}
            </div>
          ) : null}
        </div>
        <button
          type="button"
          aria-label="Settings"
          onClick={() => onSettings?.()}
          style={{
            marginLeft: "auto",
            background: "transparent",
            border: "none",
            color: "var(--ink-mute)",
            cursor: "pointer",
            padding: 0,
            display: "inline-flex",
            alignItems: "center",
          }}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="3" />
            <path d="M12 2.5v2.5M12 19v2.5M21.5 12H19M5 12H2.5M18.4 5.6l-1.8 1.8M7.4 16.6l-1.8 1.8M18.4 18.4l-1.8-1.8M7.4 7.4L5.6 5.6" />
          </svg>
        </button>
      </div>
    </aside>
  );
}
