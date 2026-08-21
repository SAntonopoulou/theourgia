/**
 * PracticeNav — the practice-first admin sidebar (H12, successor to
 * ``VaultNav``).
 *
 * ## The sidebar mirrors the phone drawer (Sophia, 20 Aug 2026)
 *
 * *"the interface on the side menu … should mimic as much as possible the side
 * menu of the mobile so it's easy to jump between one and the other — just
 * having the additions for the other features (like the journal) that are on
 * the website and not on the mobile device."*
 *
 * The phone's drawer (``lib/features/shell/app_shell.dart``) is three tiers:
 *
 *   Today · one row at the top, all practices at once.
 *   Practices · only the ones switched on, in the enum's declaration order so
 *       the menu never rearranges under a thumb, each drawn with its glyph.
 *   Utilities · visited, not inhabited — the record, calendar, voces,
 *       elections, the compass, correspondences, charts, transliteration.
 *
 * So this nav is those three tiers, plus one web-only section (**On the web**)
 * for what the phone has no place for — the journal, and packs (the phone keeps
 * packs in Settings; the site has no Settings home for them yet). Settings is a
 * gear at the foot, never a tier — exactly as on the phone.
 *
 * The **Practices** tier is gated the phone's way: a practice appears only when
 * switched on. The on/off set arrives live as ``disabledPractices`` (fed from
 * ``usePractices`` in the shell), so flipping a toggle in Settings adds or
 * removes its row with no reload. Only practices that HAVE a web surface are
 * listed; the rest (rituals, workings, meditation, pranayama) join as each is
 * built.
 *
 * ## Nothing is deleted, only hidden
 *
 * Every route the old VaultNav reached still lives in the trees below. What is
 * not part of the phone mirror sits in a hidden ``graveyard`` section — gated
 * out of view by ``HIDDEN_UNTIL_FINISHED`` but present in the data, so its URL
 * still answers and un-hiding it is one line. The ``PLATFORM_WING`` is likewise
 * intact but empty under the parity gate, so its foot switcher is absent.
 *
 * Responsive contract (all five breakpoints) is driven off a
 * ``data-nav-mode`` attribute so tests and spec surfaces can force a
 * state; real media queries (``theourgia.shared.css`` H12 block) set the
 * default:
 *
 *   auto    · follows the media queries (drawer < 640 · 64px rail
 *             640–1024 · 224px 1024–1280 · 248px above · ultrawide caps
 *             the content column, not the nav)
 *   drawer / rail / compact / full · forced states for tests + specs.
 *
 * ``active`` is a SUPERSET of VaultNav's keys — no existing call site needs
 * rewriting.
 */

import {
  type CSSProperties,
  type ComponentType,
  type ReactNode,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  NAV_ICONS,
  type NavKey,
  type VaultIdentity,
  type VaultNavLinkProps,
} from "../VaultNav/VaultNav.js";
import { _ } from "../i18n/index.js";

// ─── Icons the old nav didn't need (engraving style, stroke 1.5) ───────────

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

/**
 * A practice's glyph, drawn to the same 18×18 footprint as the engraved SVG
 * icons so a glyph row and an icon row line up. The phone marks every practice
 * with its glyph (``lib/domain/practice.dart``); the Practices tier does the
 * same, in ``currentColor`` so the active-accent highlight still carries.
 */
function glyphIcon(glyph: string): ReactNode {
  return (
    <span
      aria-hidden="true"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: 18,
        height: 18,
        fontSize: 15,
        lineHeight: 1,
      }}
    >
      {glyph}
    </span>
  );
}

const EXTRA_ICONS = {
  // Astrology — a chart wheel: the zodiac ring, the angles, the core.
  astrology: (
    <svg {...ICON_PROPS}>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="3.5" />
      <path d="M12 3v3M12 18v3M3 12h3M18 12h3" />
    </svg>
  ),
  // A pack — a small box with a corner flap.
  packs: (
    <svg {...ICON_PROPS}>
      <path d="M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3z" />
      <path d="M4 7.5l8 4.5 8-4.5M12 12v9" />
    </svg>
  ),
  // Correspondences — a table of answers, one column set apart.
  correspondences: (
    <svg {...ICON_PROPS}>
      <path d="M4 6h16M4 12h16M4 18h16" />
      <path d="M10 4v16" />
    </svg>
  ),
  // Directional frames — a compass rose, the four quarters.
  frames: (
    <svg {...ICON_PROPS}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 3v3M12 18v3M3 12h3M18 12h3" />
      <path d="M12 8l2.5 5.5L9.5 13.5 12 8z" />
    </svg>
  ),
  // Techniques — a clock, for the timing the year is read by.
  techniques: (
    <svg {...ICON_PROPS}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  ),
  // Planetary hours — a sundial: the gnomon and its cast hour lines.
  planetaryhours: (
    <svg {...ICON_PROPS}>
      <path d="M12 21a9 9 0 0 1 0-18" />
      <path d="M12 3v18M12 12l6-4M12 12l5 3" />
    </svg>
  ),
  // Spiritual map — a figure of nodes: a crown node over two branches worked.
  spiritualmap: (
    <svg {...ICON_PROPS}>
      <circle cx="12" cy="5" r="2" />
      <circle cx="6" cy="18" r="2" />
      <circle cx="18" cy="18" r="2" />
      <path d="M11 6.6 7 16.2M13 6.6l4 9.6" />
    </svg>
  ),
  // Festivals — a calendar leaf, one day marked.
  festivals: (
    <svg {...ICON_PROPS}>
      <rect x="4" y="5" width="16" height="16" rx="2" />
      <path d="M4 9h16M8 3v4M16 3v4" />
      <circle cx="12" cy="15" r="1.5" fill="currentColor" stroke="none" />
    </svg>
  ),
  // Elections — an hourglass, for choosing the hour.
  elections: (
    <svg {...ICON_PROPS}>
      <path d="M6 3h12M6 21h12" />
      <path d="M7 3c0 4 5 6 5 6s5-2 5-6M7 21c0-4 5-6 5-6s5 2 5 6" />
    </svg>
  ),
  // Word values — a numeral sign, for letters counted as number.
  wordvalues: (
    <svg {...ICON_PROPS}>
      <path d="M9 4L7 20M17 4l-2 16M4 9h16M3 15h16" />
    </svg>
  ),
  // Decks — two cards, one laid over the other.
  decks: (
    <svg {...ICON_PROPS}>
      <rect x="8" y="4" width="10" height="14" rx="1.5" />
      <path d="M6 7v11a1.5 1.5 0 0 0 1.5 1.5H15" />
    </svg>
  ),
  // The record — an open ledger, its spine centre.
  record: (
    <svg {...ICON_PROPS}>
      <path d="M12 6c-1.8-1.2-4.2-1.4-6.5-.8v12.4c2.3-.6 4.7-.4 6.5.8 1.8-1.2 4.2-1.4 6.5-.8V5.2c-2.3-.6-4.7-.4-6.5.8z" />
      <path d="M12 6v12.4" />
    </svg>
  ),
  // Knucklebone — a die face showing only 1/3/4/6-style pip clusters
  // (rule 68: there is no two and no five).
  astragaloi: (
    <svg {...ICON_PROPS}>
      <path d="M6.5 5.5h11a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-11a2 2 0 0 1-2-2v-9a2 2 0 0 1 2-2z" />
      <circle cx="9" cy="9" r="0.9" fill="currentColor" stroke="none" />
      <circle cx="15" cy="15" r="0.9" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  ),
  // The tetraktys — ten points in four rows.
  ladder: (
    <svg {...ICON_PROPS} strokeWidth={1.4}>
      <circle cx="12" cy="4.6" r="1.5" />
      <circle cx="8.6" cy="10" r="1.5" />
      <circle cx="15.4" cy="10" r="1.5" />
      <circle cx="5.2" cy="15.4" r="1.5" />
      <circle cx="12" cy="15.4" r="1.5" />
      <circle cx="18.8" cy="15.4" r="1.5" />
      <circle cx="6.5" cy="20.5" r="1.2" />
      <circle cx="12" cy="20.5" r="1.2" />
      <circle cx="17.5" cy="20.5" r="1.2" />
    </svg>
  ),
  // The scales — two gates, one beam.
  awaitingjudgment: (
    <svg {...ICON_PROPS}>
      <path d="M12 4v16M6 8h12M8.5 8l-3 5h6zM15.5 8l-3 5h6z" />
    </svg>
  ),
  // The automaton — platform agents.
  agents: (
    <svg {...ICON_PROPS}>
      <rect x="5" y="8" width="14" height="11" rx="2.5" />
      <path d="M12 3v3M9 13h0M15 13h0M9.5 16.5h5" />
      <path d="M3.5 12v3M20.5 12v3" />
    </svg>
  ),
  // The two adorations wear the phone's own glyphs — the moon and the sun —
  // rather than a drawn icon, so the Practices tier reads the same on both
  // surfaces. See ``GLYPH_ICON`` for how the rest of the tier is drawn.
  lunaradorations: glyphIcon("☽"),
  solaradorations: glyphIcon("☉"),
  rituals: glyphIcon("☩"),
  workings: glyphIcon("☿"),
  meditation: glyphIcon("🜔"),
  pranayama: glyphIcon("🜁"),
} as const;

const WING_GRID_ICON = (
  <svg {...ICON_PROPS}>
    <rect x="4" y="4" width="6.5" height="6.5" rx="1.3" />
    <rect x="13.5" y="4" width="6.5" height="6.5" rx="1.3" />
    <rect x="4" y="13.5" width="6.5" height="6.5" rx="1.3" />
    <rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.3" />
  </svg>
);

const WING_BACK_ICON = (
  <svg {...ICON_PROPS} strokeWidth={1.6}>
    <path d="M15 6l-6 6 6 6" />
  </svg>
);

const MORE_ICON = (
  <svg {...ICON_PROPS}>
    <circle cx="6" cy="12" r="1.3" />
    <circle cx="12" cy="12" r="1.3" />
    <circle cx="18" cy="12" r="1.3" />
  </svg>
);

// ─── Keys · superset contract ──────────────────────────────────────────────

/** ``active`` accepts every old VaultNav key plus the H12 additions. */
export type PracticeNavKey =
  | NavKey
  | "astragaloi"
  | "ladder"
  | "awaitingjudgment"
  | "agents"
  | "record"
  | "packs"
  | "correspondences"
  | "frames"
  | "techniques"
  | "festivals"
  | "elections"
  | "wordvalues"
  | "decks"
  | "astrology"
  // The two adoration practices got their own web surfaces (lunar rite,
  // Liber Resh); the rest of the eight reuse existing keys (``divination``,
  // ``gematria``) or arrive with their surface.
  | "lunaradorations"
  | "solaradorations"
  | "rituals"
  | "workings"
  | "meditation"
  | "pranayama"
  | "planetaryhours"
  | "spiritualmap";

const ICONS: Record<PracticeNavKey, ReactNode> = {
  ...NAV_ICONS,
  ...EXTRA_ICONS,
};

export type Wing = "practice" | "platform";

export type PracticeNavMode = "auto" | "drawer" | "rail" | "compact" | "full";

// ─── Wing trees (route targets carried over 1:1 from VaultNav) ─────────────

export interface PracticeNavItem {
  key: PracticeNavKey;
  to: string;
  label: string;
  /** When set, this row is a built-in practice and is shown only while that
   *  practice is switched on (its key is NOT in ``disabledPractices``). The
   *  string is the phone's practice-enum key — ``lunarAdorations`` etc. */
  practice?: string;
  /** Override the row's icon with a glyph (the Practices tier, to match the
   *  phone). Falls back to ``ICONS[key]`` when unset. */
  glyph?: string;
}

export interface PracticeNavSection {
  /** The eyebrow heading. Empty string renders no heading — used for the
   *  Today tier, which the phone shows as a single unlabelled row. */
  heading: string;
  items: PracticeNavItem[];
  /** Items behind an in-section disclosure (Workbench's "More tools",
   *  Reference's "More"). */
  moreItems?: PracticeNavItem[];
  /** The disclosure's labels when closed / open. Default "More tools" /
   *  "Fewer tools" — Reference overrides to a plain "More" / "Fewer". */
  moreLabel?: string;
  fewerLabel?: string;
  /** Shown (muted) when the section renders with zero visible items instead of
   *  vanishing — the Practices tier keeps its heading and says nothing is on,
   *  the way the phone drawer does. Sections without this are dropped when
   *  empty. */
  emptyNote?: string;
}

/**
 * The practice wing, as the phone drawer: Today · Practices · Utilities ·
 * (web-only) On the web — then a hidden graveyard that keeps every remaining
 * VaultNav route addressable without showing it (see ``HIDDEN_UNTIL_FINISHED``
 * and the "nothing deleted" test).
 */
export const PRACTICE_WING_SECTIONS: PracticeNavSection[] = [
  // ── Today ────────────────────────────────────────────────────────────
  // One unlabelled row, above the practices, all of them at once — the phone's
  // top tier exactly.
  {
    heading: "",
    items: [{ key: "today", to: "/", label: "Today" }],
  },
  // ── Practices ────────────────────────────────────────────────────────
  // The phone's eight, in declaration order, each gated by whether it is
  // switched on (``practice`` key + ``disabledPractices``) and drawn with its
  // glyph. Only the four with a web surface are here; rituals, workings,
  // meditation and pranayama join as their surfaces are built. ``emptyNote``
  // keeps the tier visible, saying nothing is on, rather than vanishing.
  {
    heading: "Practices",
    emptyNote: "No practices switched on — turn them on in Settings.",
    items: [
      {
        key: "lunaradorations",
        to: "/adorations/lunar",
        label: "Lunar adorations",
        practice: "lunarAdorations",
        glyph: "☽",
      },
      {
        // Solar adorations (Liber Resh) — sunrise, noon, sunset, midnight.
        // The set-selection surface, like lunar; the /daily-practice/resh
        // config lives on beside it.
        key: "solaradorations",
        to: "/adorations/solar",
        label: "Solar adorations",
        practice: "solarAdorations",
        glyph: "☉",
      },
      {
        key: "rituals",
        to: "/rituals",
        label: "Rituals",
        practice: "rituals",
        glyph: "☩",
      },
      {
        key: "workings",
        to: "/workings",
        label: "Workings",
        practice: "workings",
        glyph: "☿",
      },
      {
        key: "meditation",
        to: "/meditation",
        label: "Meditation",
        practice: "meditation",
        glyph: "🜔",
      },
      {
        key: "pranayama",
        to: "/pranayama",
        label: "Pranayama",
        practice: "pranayama",
        glyph: "🜁",
      },
      {
        key: "divination",
        to: "/divination/tarot",
        label: "Divination",
        practice: "divination",
        glyph: "☍",
      },
      {
        // The phone names this "Letters and numbers", not numerology — the
        // key stays ``gematria`` (its route and VaultNav contract), the label
        // and glyph match the phone.
        key: "gematria",
        to: "/gematria",
        label: "Letters and numbers",
        practice: "numbers",
        glyph: "Ϡ",
      },
    ],
  },
  // ── Utilities ────────────────────────────────────────────────────────
  // Visited, not inhabited — the phone's utility list, in its order. The record
  // is the phone's, synced here; by Sophia's ruling never the journal.
  {
    heading: "Utilities",
    items: [
      { key: "record", to: "/record", label: "The record" },
      { key: "calendar", to: "/calendar", label: "Calendar" },
      { key: "voces", to: "/voces", label: "Voces magicae" },
      { key: "elections", to: "/elections", label: "Elections" },
      { key: "frames", to: "/frames", label: "Ritual compass" },
      { key: "correspondences", to: "/correspondences", label: "Correspondences" },
      { key: "astrology", to: "/astrology", label: "Charts" },
      { key: "translit", to: "/transliterations", label: "Transliteration" },
      { key: "planetaryhours", to: "/hours", label: "Planetary hours" },
      { key: "spiritualmap", to: "/map", label: "Spiritual map" },
    ],
  },
  // ── On the web ───────────────────────────────────────────────────────
  // What the phone has no place for. The journal is Sophia's named example.
  // (Packs used to sit here; they now live in the Settings gear, as on the
  // phone — a pack is what the app is furnished with, not a practice worked
  // with. The route stays in the Graveyard so /packs still answers.)
  {
    heading: "On the web",
    items: [{ key: "journal", to: "/journal", label: "Journal" }],
  },
  // ── Graveyard (never shown) ──────────────────────────────────────────
  // Every remaining VaultNav route, kept addressable. All keys here are in
  // HIDDEN_UNTIL_FINISHED, so ``shown()`` drops this whole section from view —
  // but the routes still answer and the "nothing deleted" test still passes.
  // Un-hiding any of these is one line: remove its key from that set.
  {
    heading: "Graveyard",
    items: [
      // Packs are reached from the Settings gear now (phone parity); the route
      // stays here so its URL still answers.
      { key: "packs", to: "/packs", label: "Packs" },
      { key: "dailypractice", to: "/daily-practice", label: "Daily rite" },
      { key: "practicelogs", to: "/practice-logs", label: "Practice log" },
      { key: "entities", to: "/entities", label: "Magical beings" },
      { key: "library", to: "/library", label: "Library" },
      { key: "sigils", to: "/sigils", label: "Sigils" },
      { key: "magicsquares", to: "/magic-squares", label: "Magic squares" },
      { key: "talismans", to: "/talismans", label: "Talismans" },
      { key: "circles", to: "/circles", label: "Magical circle" },
      { key: "tools", to: "/tools", label: "Tool registry" },
      { key: "voceslib", to: "/voces-library", label: "Voces library" },
      { key: "astragaloi", to: "/divination/astragaloi", label: "Astragaloi" },
      { key: "wordvalues", to: "/word-values", label: "Word values" },
      { key: "techniques", to: "/techniques", label: "Techniques" },
      { key: "festivals", to: "/festivals", label: "Festivals" },
      { key: "decks", to: "/decks", label: "Decks" },
      { key: "synchronicities", to: "/synchronicities", label: "Synchronicities" },
      { key: "ladder", to: "/order/ladder", label: "Tetraktys ladder" },
      { key: "awaitingjudgment", to: "/verdicts", label: "Awaiting judgment" },
      { key: "analytics", to: "/analytics", label: "Analytics" },
    ],
  },
];

/** The platform wing — Publishing (6) / Network (4) / Platform (4). */
export const PLATFORM_WING_SECTIONS: PracticeNavSection[] = [
  {
    heading: "Publishing",
    items: [
      { key: "publications", to: "/publications", label: "Publications" },
      { key: "subscribers", to: "/subscribers", label: "Subscribers" },
      { key: "media", to: "/media", label: "Media library" },
      { key: "audio", to: "/audio", label: "Audio library" },
      { key: "pilgrimage", to: "/pilgrimage", label: "Pilgrimage map" },
      { key: "icalfeed", to: "/icalfeed", label: "Calendar feed" },
    ],
  },
  {
    heading: "Network",
    items: [
      { key: "feed", to: "/feed", label: "Ritual feed" },
      { key: "networks", to: "/networks", label: "My networks" },
      { key: "followers", to: "/followers", label: "Followers" },
      { key: "privateviewers", to: "/private-viewers", label: "Private viewers" },
    ],
  },
  {
    heading: "Platform",
    items: [
      { key: "plugins", to: "/plugins", label: "Plugins" },
      { key: "bundles", to: "/bundles", label: "Bundles" },
      { key: "sandbox", to: "/sandbox", label: "Sandbox" },
      { key: "agents", to: "/agents-home", label: "Agents" },
    ],
  },
];

// ─── What the site SHOWS, and why it is less than what it has ─────────────
//
// Sophia, 15 August 2026: *"hide all the features except those specific ones
// that I mentioned above from the theourgia site until they are totally
// finished … the mobile application being the source of truth."*
//
// The rule is **parity with the phone**. `practiseapp` offers eight practices
// (lunar and solar adorations, rituals, workings, meditation, pranayama,
// divination, letters and numbers) and six utilities (the record, calendar,
// elections, spiritual map, charts, planetary hours). Anything here without a
// counterpart there is hidden until it is finished on both.
//
// ⚠ **This hides the MENU, not the route.** Every page below still exists and
// still answers to anyone who types its URL — the nav is a way in, not a lock.
// If any of these needs to be genuinely unreachable that is a router change
// and a different conversation.
//
// ⚠ **Unhiding is deleting one line.** That is the whole reason this is a flat
// set rather than a rewrite of the trees: nothing was removed, so nothing has
// to be reconstructed, and the day a feature is finished costs one line.
//
// ⚠ Four of the phone's utilities have NO page here at all — elections, the
// spiritual map, charts and planetary hours. Parity cuts both ways and those
// are the gaps in the other direction; they are not hidden, they are missing.
export const HIDDEN_UNTIL_FINISHED: ReadonlySet<PracticeNavKey> = new Set<PracticeNavKey>([
  // The graveyard — everything the phone drawer has no tier for. Each is still
  // in the trees (its URL answers) but drawn nowhere.
  //
  // Web-only surfaces the phone never had; not part of the mirror.
  "dailypractice",
  "practicelogs",
  "entities",
  "library",
  // Workbench — the phone has divination and letters-and-numbers, not these.
  "sigils",
  "talismans",
  "circles",
  "tools",
  "magicsquares",
  "voceslib",
  // A divination sub-kind (astragaloi) — reached inside Divination on the
  // phone, not a menu row of its own.
  "astragaloi",
  // Packs live in the Settings gear now, as on the phone — not the sidebar.
  "packs",
  // Pack-reference surfaces — the phone folds these into the packs a practice
  // consumes, not the drawer.
  "wordvalues",
  "techniques",
  "festivals",
  "decks",
  // Study — none of it exists on the phone.
  "synchronicities",
  "ladder",
  "awaitingjudgment",
  "analytics",
  // The whole platform wing. Publishing, network and plugins are the site
  // running itself rather than anybody practising, and the phone has no
  // notion of any of it.
  "publications",
  "subscribers",
  "media",
  "audio",
  "pilgrimage",
  "icalfeed",
  "feed",
  "networks",
  "followers",
  "privateviewers",
  "plugins",
  "bundles",
  "sandbox",
  "agents",
]);

/** Drop the hidden keys, then drop any section left with nothing in it. */
function shown(sections: PracticeNavSection[]): PracticeNavSection[] {
  return sections
    .map((section) => ({
      ...section,
      items: section.items.filter((i) => !HIDDEN_UNTIL_FINISHED.has(i.key)),
      moreItems: section.moreItems?.filter((i) => !HIDDEN_UNTIL_FINISHED.has(i.key)),
    }))
    .filter((s) => s.items.length > 0 || (s.moreItems?.length ?? 0) > 0);
}

/** What the practice wing actually renders. */
export const VISIBLE_PRACTICE_SECTIONS = shown(PRACTICE_WING_SECTIONS);

/** What the platform wing actually renders — currently nothing at all. */
export const VISIBLE_PLATFORM_SECTIONS = shown(PLATFORM_WING_SECTIONS);

/**
 * Whether there is a second wing to cross to.
 *
 * ⚠ Under strict parity the platform wing empties completely, and a button
 * that crosses to an empty page is worse than no button — it looks like the
 * page failed to load. So the switch disappears with its contents.
 */
export const HAS_PLATFORM_WING = VISIBLE_PLATFORM_SECTIONS.length > 0;

/** Which wing a nav key belongs to (``practice`` when unknown). */
export function wingForKey(key: string | undefined): Wing {
  if (!key) return "practice";
  for (const section of PLATFORM_WING_SECTIONS) {
    if (section.items.some((i) => i.key === key)) return "platform";
  }
  return "practice";
}

const WING_STORAGE_KEY = "theourgia.nav.wing";

function readStoredWing(): Wing | null {
  try {
    const value = window.sessionStorage.getItem(WING_STORAGE_KEY);
    return value === "practice" || value === "platform" ? value : null;
  } catch {
    return null;
  }
}

function storeWing(wing: Wing): void {
  try {
    window.sessionStorage.setItem(WING_STORAGE_KEY, wing);
  } catch {
    /* storage unavailable — the wing simply doesn't persist */
  }
}

// ─── Props ─────────────────────────────────────────────────────────────────

export interface PracticeNavProps {
  /** Current active nav key — superset of VaultNav's contract. */
  active?: PracticeNavKey;
  /** Controlled wing. When omitted the nav owns the state: it follows
   *  ``active``'s wing and persists the choice per session. */
  wing?: Wing;
  /** Fired when the foot switcher crosses over. */
  onWingChange?: (wing: Wing) => void;
  /** ``auto`` follows the media queries; the explicit modes exist for
   *  tests and for framing the nav inside a spec surface. */
  navMode?: PracticeNavMode;
  /** Quiet Awaiting-judgment queue count. Omit (or 0) until the
   *  endpoint exists — the chip renders nothing. */
  awaitingJudgmentCount?: number;
  /** The switched-OFF practices, by phone-enum key. The Practices tier hides
   *  any row whose ``practice`` is in this set — live, so a Settings toggle
   *  adds or removes its row with no reload. Undefined (loading, signed out)
   *  shows all built practices, matching the phone's default-on. */
  disabledPractices?: ReadonlySet<string>;
  /** Custom link renderer (e.g. react-router NavLink). Defaults to ``<a>``. */
  LinkComponent?: ComponentType<VaultNavLinkProps>;
  /** Fired when any link is picked (e.g. close the phone drawer). */
  onNavigate?: () => void;
  onQuickCapture?: () => void;
  onSettings?: () => void;
  identity?: VaultIdentity;
  className?: string;
  style?: CSSProperties;
}

// ─── Styles (mirror PracticeNav.dc.html) ───────────────────────────────────

const ITEM_BASE: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 11,
  padding: "8px 10px",
  borderRadius: 8,
  color: "var(--ink-soft)",
  fontFamily: "var(--font-ui)",
  fontSize: 14,
  marginBottom: 1,
  textDecoration: "none",
};

const ITEM_ACTIVE: CSSProperties = {
  ...ITEM_BASE,
  color: "var(--ink)",
  background: "var(--accent-soft)",
  boxShadow: "inset 2px 0 0 var(--accent)",
};

const SUB_ITEM_BASE: CSSProperties = {
  display: "flex",
  alignItems: "center",
  padding: "6px 10px 6px 40px",
  borderRadius: 8,
  color: "var(--ink-mute)",
  fontFamily: "var(--font-ui)",
  fontSize: 13,
  marginBottom: 1,
  textDecoration: "none",
};

const SUB_ITEM_ACTIVE: CSSProperties = {
  ...SUB_ITEM_BASE,
  color: "var(--ink)",
  background: "var(--accent-soft)",
  boxShadow: "inset 2px 0 0 var(--accent)",
};

const HEADING_STYLE: CSSProperties = {
  fontFamily: "var(--font-ui)",
  fontSize: 10,
  letterSpacing: "0.16em",
  textTransform: "uppercase",
  color: "var(--ink-mute)",
  padding: "13px 10px 6px",
};

const ICO_STYLE: CSSProperties = { display: "flex", flex: "none" };

// ─── Component ─────────────────────────────────────────────────────────────

function DefaultLink({ to, children, className, style, onClick }: VaultNavLinkProps) {
  return (
    <a href={to} className={className} style={style} onClick={onClick}>
      {children}
    </a>
  );
}

export function PracticeNav({
  active,
  wing: wingProp,
  onWingChange,
  navMode = "auto",
  awaitingJudgmentCount,
  disabledPractices,
  LinkComponent = DefaultLink,
  onNavigate,
  onQuickCapture,
  onSettings,
  // Magickal-name rule: never default to a fabricated persona.
  identity = { name: "Practitioner", role: "This vault" },
  className,
  style,
}: PracticeNavProps) {
  const [wingState, setWingState] = useState<Wing>(
    () => wingProp ?? (active ? wingForKey(active) : (readStoredWing() ?? "practice")),
  );
  // Deep navigation (search, bookmarks) can land on the other wing —
  // follow the active key so the highlight is never invisible.
  const activeWing = active ? wingForKey(active) : undefined;
  useEffect(() => {
    if (wingProp === undefined && activeWing) setWingState(activeWing);
  }, [wingProp, activeWing]);

  const wing = wingProp ?? wingState;
  const isPractice = wing === "practice";
  // Gate the Practices tier by what's switched on — the phone's rule, applied
  // live. Undefined/empty means show all built practices (default-on).
  const sections = useMemo(() => {
    const base = isPractice ? VISIBLE_PRACTICE_SECTIONS : VISIBLE_PLATFORM_SECTIONS;
    if (!isPractice || !disabledPractices || disabledPractices.size === 0) return base;
    return base.map((section) => ({
      ...section,
      items: section.items.filter((i) => !i.practice || !disabledPractices.has(i.practice)),
    }));
  }, [isPractice, disabledPractices]);

  // Each section's disclosure opens on its own — kept by heading, since more
  // than one section now has a "More" (Reference and Workbench). A disclosure
  // starts open when the active key hides behind it, so the inset highlight is
  // visible on first paint.
  const [openMore, setOpenMore] = useState<ReadonlySet<string>>(
    () =>
      new Set(
        VISIBLE_PRACTICE_SECTIONS.filter((s) => s.moreItems?.some((i) => i.key === active)).map(
          (s) => s.heading,
        ),
      ),
  );
  const toggleMore = (heading: string) =>
    setOpenMore((open) => {
      const next = new Set(open);
      if (next.has(heading)) next.delete(heading);
      else next.add(heading);
      return next;
    });

  function crossOver(): void {
    const next: Wing = isPractice ? "platform" : "practice";
    if (wingProp === undefined) setWingState(next);
    storeWing(next);
    onWingChange?.(next);
  }

  const switchTitle = isPractice ? "Platform" : "Back to practice";
  const switchSub = isPractice ? "Publishing · Network · Plugins" : "Today · Journal · Workbench";

  const avatarChar = identity.avatarChar ?? identity.name.slice(0, 1).toUpperCase();

  const judgmentCount = awaitingJudgmentCount ?? 0;

  return (
    <aside
      aria-label="Practice navigation"
      className={`scroll om-aside pn-aside${className ? ` ${className}` : ""}`}
      data-nav-mode={navMode}
      data-wing={wing}
      style={{
        height: "100%",
        background: "var(--bg-sunk)",
        borderRight: "1px solid var(--line)",
        overflowY: "auto",
        overflowX: "hidden",
        display: "flex",
        flexDirection: "column",
        padding: "16px 12px 14px",
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
          padding: "5px 7px 15px",
          textDecoration: "none",
          color: "var(--ink)",
        }}
      >
        <svg
          width="28"
          height="28"
          viewBox="0 0 40 40"
          fill="none"
          aria-hidden="true"
          style={{ flex: "none" }}
        >
          <circle cx="20" cy="20" r="17.5" stroke="var(--accent)" strokeWidth="1.4" />
          <circle cx="20" cy="20" r="12" stroke="var(--accent)" strokeWidth="1" opacity="0.55" />
          <line x1="9.5" y1="20" x2="30.5" y2="20" stroke="var(--accent)" strokeWidth="1.4" />
        </svg>
        <span
          className="pn-label"
          style={{
            fontFamily: "var(--font-display, var(--font-serif))",
            fontSize: 20,
            letterSpacing: "0.04em",
          }}
        >
          Theourgia
        </span>
      </LinkComponent>

      {/* Quick capture */}
      <button
        type="button"
        className="pn-capture"
        onClick={() => onQuickCapture?.()}
        title={_("Quick capture")}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          width: "100%",
          padding: "9px 11px",
          marginBottom: 15,
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
          style={{ flex: "none" }}
        >
          <path d="M12 5v14M5 12h14" />
        </svg>
        <span className="pn-label">{_("Quick capture")}</span>
        <span
          className="pn-label"
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

      {/* Sections of the current wing */}
      {sections.map((section) => (
        <div key={section.heading || "today"}>
          {section.heading ? (
            <div className="pn-head" style={HEADING_STYLE}>
              {_(section.heading)}
            </div>
          ) : null}
          {section.items.length === 0 && section.emptyNote ? (
            <div
              className="pn-label"
              style={{
                ...ITEM_BASE,
                color: "var(--ink-mute)",
                fontStyle: "italic",
                fontSize: 12.5,
              }}
            >
              {_(section.emptyNote)}
            </div>
          ) : null}
          {section.items.map((item) => {
            const isActive = item.key === active;
            const isJudgment = item.key === "awaitingjudgment";
            return (
              <LinkComponent
                key={item.key}
                to={item.to}
                onClick={() => onNavigate?.()}
                style={isActive ? ITEM_ACTIVE : ITEM_BASE}
              >
                <span style={ICO_STYLE} title={_(item.label)}>
                  {item.glyph ? glyphIcon(item.glyph) : ICONS[item.key]}
                </span>
                <span
                  className="pn-label"
                  style={isJudgment ? { flex: 1, minWidth: 0 } : undefined}
                >
                  {_(item.label)}
                </span>
                {isJudgment && judgmentCount > 0 ? (
                  <span
                    className="pn-label"
                    data-judgment-count
                    aria-label={_("{n} awaiting judgment", { n: judgmentCount })}
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 11,
                      color: "var(--ink-mute)",
                    }}
                  >
                    {judgmentCount}
                  </span>
                ) : null}
              </LinkComponent>
            );
          })}
          {section.moreItems ? (
            <>
              <button
                type="button"
                className="pn-more"
                aria-expanded={openMore.has(section.heading)}
                onClick={() => toggleMore(section.heading)}
                title={
                  openMore.has(section.heading)
                    ? _(section.fewerLabel ?? "Fewer tools")
                    : _(section.moreLabel ?? "More tools")
                }
                style={{
                  ...ITEM_BASE,
                  color: "var(--ink-mute)",
                  width: "100%",
                  textAlign: "left",
                  cursor: "pointer",
                }}
              >
                <span style={ICO_STYLE}>{MORE_ICON}</span>
                <span className="pn-label" style={{ flex: 1, minWidth: 0, textAlign: "left" }}>
                  {openMore.has(section.heading)
                    ? _(section.fewerLabel ?? "Fewer tools")
                    : _(section.moreLabel ?? "More tools")}
                </span>
              </button>
              {openMore.has(section.heading)
                ? section.moreItems.map((item) => {
                    const isActive = item.key === active;
                    return (
                      <LinkComponent
                        key={item.key}
                        to={item.to}
                        onClick={() => onNavigate?.()}
                        style={isActive ? SUB_ITEM_ACTIVE : SUB_ITEM_BASE}
                      >
                        <span className="pn-label" title={_(item.label)}>
                          {_(item.label)}
                        </span>
                      </LinkComponent>
                    );
                  })
                : null}
            </>
          ) : null}
        </div>
      ))}

      {/* Wing switcher — the answer to the design question: a single
          button at the sidebar foot, naming its destination.

          ⚠ Absent while the platform wing is empty. Under the parity gate
          every one of its links is hidden, and a button that crosses to a
          blank page reads as a page that failed to load rather than as a
          wing with nothing in it. It returns by itself the moment anything
          in that wing leaves HIDDEN_UNTIL_FINISHED. */}
      {HAS_PLATFORM_WING ? (
        <button
          type="button"
          className="pn-switch"
          data-wing-switch
          onClick={crossOver}
          aria-label={_(switchTitle)}
          title={_(switchTitle)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 11,
            width: "100%",
            marginTop: "auto",
            padding: "10px 11px",
            marginBottom: 12,
            border: "1px solid var(--line)",
            borderRadius: "var(--r-md, 8px)",
            background: "var(--bg-2)",
            color: "var(--ink-soft)",
            textAlign: "left",
            cursor: "pointer",
          }}
        >
          <span style={ICO_STYLE}>{isPractice ? WING_GRID_ICON : WING_BACK_ICON}</span>
          <span
            className="pn-label"
            style={{ flex: 1, minWidth: 0, textAlign: "left", lineHeight: 1.25 }}
          >
            <span
              style={{
                display: "block",
                fontFamily: "var(--font-ui)",
                fontSize: 13,
                color: "var(--ink)",
              }}
            >
              {_(switchTitle)}
            </span>
            <span
              style={{
                display: "block",
                fontFamily: "var(--font-ui)",
                fontSize: 10.5,
                color: "var(--ink-mute)",
              }}
            >
              {_(switchSub)}
            </span>
          </span>
        </button>
      ) : null}

      {/* Identity foot */}
      <div
        className="pn-foot"
        style={{
          paddingTop: 12,
          borderTop: "1px solid var(--line)",
          display: "flex",
          alignItems: "center",
          gap: 11,
        }}
      >
        <span
          aria-hidden="true"
          style={{
            width: 30,
            height: 30,
            borderRadius: "50%",
            background: "var(--accent-soft)",
            border: "1px solid var(--line-2)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "var(--font-display, var(--font-serif))",
            color: "var(--accent)",
            fontSize: 14,
            flex: "none",
          }}
        >
          {avatarChar}
        </span>
        <div className="pn-label" style={{ lineHeight: 1.2, minWidth: 0 }}>
          <div style={{ fontFamily: "var(--font-ui)", fontSize: 13, color: "var(--ink)" }}>
            {identity.name}
          </div>
          {identity.role ? (
            <div style={{ fontFamily: "var(--font-ui)", fontSize: 11, color: "var(--ink-mute)" }}>
              {identity.role}
            </div>
          ) : null}
        </div>
        <button
          type="button"
          aria-label={_("Settings")}
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
