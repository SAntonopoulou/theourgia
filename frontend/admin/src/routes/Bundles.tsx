/**
 * Bundles admin — Magickal Bundle Format (MBF) browser.
 *
 * Port of ``Theourgia Bundles.dc.html`` per the per-component ritual.
 * From `agent_onboarding.md §` Theourgia Bundles:
 *   · Card grid + type filters + tier badges (Official / Community /
 *     Unverified) + closed-tradition notice.
 *   · **Tier / signature is a real verification state** — derive from
 *     verification (§10.5), not authored on the card.
 *   · Closed-tradition flag from the manifest changes available
 *     actions: public-share is hidden, "Respect-source" notice is
 *     shown.
 *   · Pairs with the standalone install wizard (`/bundles/install`).
 *
 * Per `feedback_follow_design_thread_deep.md`: the trust tier (gold
 * verified / steady community / warning unverified / closed-warm
 * danger) is the most load-bearing signal here — the visual language
 * teaches the user to read manifest provenance at a glance. Custom
 * tier color tokens live on a `.bundles-root` scope until they move
 * into the shared layer.
 */

import { useTopbar } from "@theourgia/shared";
import { type CSSProperties, useMemo, useState } from "react";

const LINE = "var(--line)";
const LINE_2 = "var(--line-2)";

type Tier = "official" | "community" | "unverified" | "closed";
type BundleType = "pantheon" | "tradition" | "ritual" | "deck" | "sigil";
type FilterKey = "all" | BundleType;

interface Bundle {
  id: string;
  name: string;
  maintainer: string;
  description: string;
  tier: Tier;
  types: BundleType[];
  tags: string[];
  installCount: string;
  contents: string;
  /** Inline SVG path string for the card's medallion icon. */
  iconPath: string;
}

const BUNDLES: Bundle[] = [
  {
    id: "hellenic",
    name: "Hellenic Theurgy",
    maintainer: "theourgia.core",
    description: "Gods, daimones, and the rites of the Chaldean and Iamblichan current.",
    tier: "official",
    types: ["pantheon"],
    tags: ["Pantheon", "Greek"],
    installCount: "2.4k",
    contents: "48 entities · 12 rituals",
    iconPath: "M5 7h14M6 10h12M8 10v8M16 10v8M4 21h16M6 7l2-3h8l2 3",
  },
  {
    id: "thoth",
    name: "The Thoth Tarot",
    maintainer: "ordo.templi",
    description: "The full deck with attributions, plus eight classic spreads for the divination workbench.",
    tier: "official",
    types: ["deck"],
    tags: ["Deck", "Thelema"],
    installCount: "1.8k",
    contents: "78 cards · 8 spreads",
    iconPath: "M7 4h11v16H7z M5 6h11v16H5z",
  },
  {
    id: "goetia",
    name: "Goetia — 72 Spirits",
    maintainer: "solomon.scholar",
    description: "The spirits of the Lemegeton with offices, ranks, and seals — sourced and annotated.",
    tier: "community",
    types: ["pantheon"],
    tags: ["Pantheon", "Solomonic"],
    installCount: "940",
    contents: "72 entities · 72 seals",
    iconPath: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z M12 4.5l6.5 11.3H5.5z",
  },
  {
    id: "chaos",
    name: "Chaos Magick Starter",
    maintainer: "zos.kia",
    description: "Sigil methods, paradigm-shifting templates, and a gnosis log — belief as a tool.",
    tier: "community",
    types: ["tradition", "sigil"],
    tags: ["Tradition", "Chaos"],
    installCount: "1.2k",
    contents: "6 methods · 14 templates",
    iconPath: "M12 2v20M2 12h20M5 5l14 14M19 5L5 19",
  },
  {
    id: "norse",
    name: "Norse Galdr",
    maintainer: "vitki.anon",
    description: "Runic galdr and stave-work. Signature could not be verified — review before installing.",
    tier: "unverified",
    types: ["tradition"],
    tags: ["Tradition", "Heathen"],
    installCount: "88",
    contents: "24 runes · 9 workings",
    iconPath: "M8 3v18M8 3l9 5-9 5",
  },
  {
    id: "vodou",
    name: "Vodou — the Lwa",
    maintainer: "sosyete.ginen",
    description: "A closed initiatory tradition. Honor the source: this bundle is reference-only and may not be re-shared or sold.",
    tier: "closed",
    types: ["pantheon"],
    tags: ["Reference"],
    installCount: "—",
    contents: "reference only",
    iconPath: "M5 11h14v9H5z M8 11V7a4 4 0 0 1 8 0v4",
  },
];

const FILTER_CHIPS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "pantheon", label: "Pantheons" },
  { key: "tradition", label: "Traditions" },
  { key: "ritual", label: "Rituals" },
  { key: "deck", label: "Decks" },
  { key: "sigil", label: "Sigil libraries" },
];

function tierColor(t: Tier): string {
  return `var(--tier-${t})`;
}

function tierLabel(t: Tier): string {
  if (t === "official") return "Official";
  if (t === "community") return "Community";
  if (t === "unverified") return "Unverified";
  return "Closed";
}

function FilterChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  const base: CSSProperties = {
    padding: "7px 13px",
    fontFamily: "var(--font-ui)",
    fontSize: 12.5,
    color: active ? "var(--ink)" : "var(--ink-soft)",
    background: active ? "var(--accent-soft)" : "transparent",
    border: `1px solid ${active ? LINE_2 : LINE}`,
    borderRadius: 999,
    cursor: "pointer",
    transition: "all 0.15s ease",
  };
  return (
    <button type="button" aria-pressed={active ? "true" : "false"} onClick={onClick} style={base}>
      {label}
    </button>
  );
}

function TierLegend({ tier, label }: { tier: Tier; label: string }) {
  return (
    <span style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--ink-soft)" }}>
      <span style={{ width: 8, height: 8, borderRadius: "50%", background: tierColor(tier) }} aria-hidden="true" />
      {label}
    </span>
  );
}

function BundleCard({ bundle, onInstall }: { bundle: Bundle; onInstall: () => void }) {
  const color = tierColor(bundle.tier);
  const isClosed = bundle.tier === "closed";
  const isUnverified = bundle.tier === "unverified";

  return (
    <article
      style={{
        background: "var(--bg-2)",
        border: `1px solid ${isClosed ? color : LINE}`,
        borderRadius: "var(--r-lg)",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        transition: "border-color 0.15s ease",
      }}
      onMouseEnter={(e) => {
        if (!isClosed) (e.currentTarget as HTMLElement).style.borderColor = LINE_2;
      }}
      onMouseLeave={(e) => {
        if (!isClosed) (e.currentTarget as HTMLElement).style.borderColor = LINE;
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: 14, padding: "18px 18px 14px" }}>
        <span
          style={{
            width: 48,
            height: 48,
            borderRadius: 11,
            background: isClosed ? "color-mix(in srgb, var(--tier-closed) 12%, transparent)" : "var(--accent-soft)",
            border: `1px solid ${isClosed ? color : LINE_2}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: isClosed ? color : "var(--accent)",
            flex: "none",
          }}
          aria-hidden="true"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
            <path d={bundle.iconPath} />
          </svg>
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 18, lineHeight: 1.2 }}>{bundle.name}</div>
          <div style={{ fontFamily: "var(--font-ui)", fontSize: 12, color: "var(--ink-mute)", marginTop: 2 }}>
            {bundle.maintainer}
          </div>
        </div>
        <span
          style={{
            display: "flex",
            alignItems: "center",
            gap: 5,
            fontFamily: "var(--font-ui)",
            fontSize: 10.5,
            color,
            border: `1px solid ${color}`,
            borderRadius: 999,
            padding: "3px 8px",
            flex: "none",
          }}
        >
          {bundle.tier === "official" ? (
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2l7 3v6c0 5-3 8-7 11-4-3-7-6-7-11V5z" />
              <path d="M9 12l2 2 4-4" />
            </svg>
          ) : isUnverified ? (
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M12 8v5M12 16h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
            </svg>
          ) : null}
          {tierLabel(bundle.tier)}
        </span>
      </div>
      <p
        style={{
          fontFamily: "var(--font-serif)",
          fontSize: 14,
          lineHeight: 1.5,
          color: "var(--ink-soft)",
          margin: 0,
          padding: "0 18px 12px",
        }}
      >
        {bundle.description}
      </p>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", padding: "0 18px 14px" }}>
        {bundle.tags.map((t) => (
          <span
            key={t}
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: 11,
              color: "var(--ink-mute)",
              padding: "2px 8px",
              border: `1px solid ${LINE}`,
              borderRadius: 999,
            }}
          >
            {t}
          </span>
        ))}
        {isClosed ? (
          <span
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: 11,
              color,
              padding: "2px 8px",
              border: `1px solid ${color}`,
              borderRadius: 999,
            }}
          >
            Respect-source
          </span>
        ) : null}
      </div>
      <div
        style={{
          marginTop: "auto",
          borderTop: `1px solid ${LINE}`,
          padding: "12px 18px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 11.5, color: "var(--ink-mute)" }}>{bundle.contents}</span>
        {isClosed ? (
          <span style={{ fontFamily: "var(--font-ui)", fontSize: 12, color }}>share disabled</span>
        ) : (
          <button
            type="button"
            onClick={onInstall}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontFamily: "var(--font-ui)",
              fontSize: 12,
              color: isUnverified ? color : "var(--ink-soft)",
              background: "transparent",
              border: "none",
              cursor: "pointer",
              padding: 0,
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.color = isUnverified ? color : "var(--ink)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.color = isUnverified ? color : "var(--ink-soft)";
            }}
          >
            {isUnverified ? (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            ) : (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="2" strokeLinecap="round">
                <path d="M20 6 9 17l-5-5" />
              </svg>
            )}
            {bundle.installCount}
          </button>
        )}
      </div>
    </article>
  );
}

export function Bundles() {
  const [type, setType] = useState<FilterKey>("all");
  const [query, setQuery] = useState("");

  useTopbar(
    () => ({
      title: "Magickal Bundles",
      subtitle: "Share whole systems — pantheons, decks, rituals, sigil libraries",
      after: (
        <button
          type="button"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "9px 16px",
            borderRadius: "var(--r-md)",
            background: "var(--accent)",
            color: "var(--accent-ink)",
            fontFamily: "var(--font-ui)",
            fontWeight: 700,
            fontSize: 13.5,
            border: "none",
            cursor: "pointer",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.opacity = "0.9";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.opacity = "1";
          }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 16V4M8 8l4-4 4 4M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
          </svg>
          Share a bundle
        </button>
      ),
    }),
    [],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return BUNDLES.filter((b) => {
      if (type !== "all" && !b.types.includes(type)) return false;
      if (!q) return true;
      return (
        b.name.toLowerCase().includes(q) ||
        b.maintainer.toLowerCase().includes(q) ||
        b.tags.some((t) => t.toLowerCase().includes(q))
      );
    });
  }, [type, query]);

  return (
    <main
      className="bundles-root scroll"
      style={{
        overflowY: "auto",
        minHeight: 0,
        padding: "24px 28px",
        // tier color tokens scoped to this surface (will move into
        // shared tokens.tokens.css once the bundles model lands)
        ["--tier-official" as string]: "var(--success)",
        ["--tier-community" as string]: "var(--info)",
        ["--tier-unverified" as string]: "var(--warning)",
        ["--tier-closed" as string]: "var(--danger)",
      }}
    >
      <div style={{ maxWidth: 1180, margin: "0 auto" }}>

        {/* filter row */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "8px 12px",
              border: `1px solid ${LINE}`,
              borderRadius: "var(--r-md)",
              background: "var(--bg-2)",
              flex: "1 1 220px",
              minWidth: 0,
              color: "var(--ink-mute)",
            }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
              <circle cx="11" cy="11" r="7" />
              <path d="M21 21l-4.3-4.3" />
            </svg>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search bundles, maintainers, traditions…"
              aria-label="Search bundles"
              style={{
                flex: 1,
                fontFamily: "var(--font-ui)",
                fontSize: 13,
                color: "var(--ink)",
                background: "transparent",
                border: "none",
                outline: "none",
                minWidth: 0,
              }}
            />
          </label>
          {FILTER_CHIPS.map((c) => (
            <FilterChip key={c.key} label={c.label} active={type === c.key} onClick={() => setType(c.key)} />
          ))}
        </div>

        {/* tier legend */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            flexWrap: "wrap",
            marginBottom: 24,
            fontFamily: "var(--font-ui)",
            fontSize: 12.5,
            color: "var(--ink-mute)",
          }}
        >
          <span>Tier:</span>
          <TierLegend tier="official" label="Official" />
          <TierLegend tier="community" label="Community" />
          <TierLegend tier="unverified" label="Unverified" />
          <TierLegend tier="closed" label="Closed · respect source" />
        </div>

        {/* grid */}
        {filtered.length === 0 ? (
          <div
            style={{
              padding: "60px 0",
              textAlign: "center",
              fontFamily: "var(--font-ui)",
              fontSize: 13,
              color: "var(--ink-mute)",
              fontStyle: "italic",
            }}
          >
            No bundles match that search yet — try a broader tag.
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(286px, 1fr))", gap: 18 }}>
            {filtered.map((b) => (
              <BundleCard key={b.id} bundle={b} onInstall={() => { window.location.href = `/bundles/install?bundle=${b.id}`; }} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
