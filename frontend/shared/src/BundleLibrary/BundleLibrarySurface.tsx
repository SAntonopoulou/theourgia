/**
 * BundleLibrarySurface — H09 Cluster B surface 10.
 *
 * Honesty rules wired:
 *
 *   * Each card carries a `‡ {citation}` chip in --remote chrome
 *     — every bundle MUST cite its source (rule 7).
 *   * Bundles request NO capabilities and have NO active state —
 *     the verbatim count tail spells this out.
 *   * Remove menu item uses --warn ink, NEVER --danger.
 *   * No popularity, no featured (rule 38).
 */

import { type CSSProperties, useState } from "react";

import { BundleScrollIcon } from "./BundleScrollIcon.js";
import {
  BL_BROWSE_REGISTRY_CTA,
  BL_CITATION_GLYPH,
  BL_COUNT_TAIL,
  BL_EMPTY_BODY,
  BL_EMPTY_TITLE,
  BL_MENU_LABELS,
  BL_SUBHEAD,
  BL_TITLE,
} from "./copy.js";

// ─── Data shapes ──────────────────────────────────────────────────

export interface BundleRow {
  id: string;
  name: string;
  version: string;
  author: string;
  /** Citation source — e.g. "Liber 777" or "Picatrix III.7". */
  citation: string;
  description: string;
  /** Brief data summary — e.g. "36 correspondences across 4 categories". */
  dataSummary: string;
}

export type BundleAction = "preview" | "update" | "remove";

export interface BundleLibrarySurfaceProps {
  bundles: readonly BundleRow[];
  onBrowseRegistry?: () => void;
  onBundleClick?: (bundleId: string) => void;
  onBundleAction?: (bundleId: string, action: BundleAction) => void;
  className?: string;
  style?: CSSProperties;
}

// ─── Component ─────────────────────────────────────────────────────

export function BundleLibrarySurface({
  bundles,
  onBrowseRegistry,
  onBundleClick,
  onBundleAction,
  className,
  style,
}: BundleLibrarySurfaceProps) {
  const [openKebab, setOpenKebab] = useState<string | null>(null);
  const isEmpty = bundles.length === 0;

  return (
    <section
      data-surface="bundle-library"
      className={className}
      style={{
        display: "flex",
        flexDirection: "column",
        minHeight: 0,
        height: "100%",
        ...style,
      }}
    >
      <header
        style={{
          display: "flex",
          alignItems: "center",
          gap: 14,
          padding: "13px 24px",
          borderBottom: "1px solid var(--line)",
          background: "var(--bg)",
        }}
      >
        <div style={{ minWidth: 0 }}>
          <h1
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 21,
              lineHeight: 1.1,
              margin: 0,
            }}
          >
            {BL_TITLE}
          </h1>
          <div
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: 12.5,
              color: "var(--ink-mute)",
              marginTop: 1,
            }}
          >
            {BL_SUBHEAD}
          </div>
        </div>
        <button
          type="button"
          onClick={onBrowseRegistry}
          data-action="browse-registry"
          style={{
            marginLeft: "auto",
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "9px 15px",
            borderRadius: "var(--r-md)",
            background: "var(--accent)",
            color: "var(--accent-ink)",
            fontFamily: "var(--font-ui)",
            fontWeight: 700,
            fontSize: 13,
            border: "none",
            cursor: "pointer",
          }}
        >
          {BL_BROWSE_REGISTRY_CTA}
        </button>
      </header>

      <main
        className="scroll"
        style={{
          overflowY: "auto",
          minHeight: 0,
          padding: "22px 24px 48px",
        }}
      >
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <div
            data-field="count-label"
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: 11.5,
              color: "var(--ink-mute)",
              marginBottom: 14,
            }}
          >
            {bundles.length} {bundles.length === 1 ? "bundle" : "bundles"}
            {BL_COUNT_TAIL}
          </div>

          {isEmpty ? (
            <div
              data-field="empty-state"
              style={{
                padding: "44px 30px",
                borderWidth: 1,
                borderStyle: "dashed",
                borderColor: "var(--line-2)",
                borderRadius: "var(--r-lg)",
                textAlign: "center",
              }}
            >
              <div
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: 20,
                  color: "var(--ink)",
                  marginBottom: 6,
                }}
              >
                {BL_EMPTY_TITLE}
              </div>
              <div
                style={{
                  fontFamily: "var(--font-ui)",
                  fontSize: 13.5,
                  color: "var(--ink-mute)",
                }}
              >
                {BL_EMPTY_BODY}
              </div>
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fill, minmax(390px, 1fr))",
                gap: 13,
              }}
              data-field="bundle-grid"
            >
              {bundles.map((b) => (
                <BundleCard
                  key={b.id}
                  bundle={b}
                  open={openKebab === b.id}
                  onToggleKebab={() =>
                    setOpenKebab((c) => (c === b.id ? null : b.id))
                  }
                  onClick={() => onBundleClick?.(b.id)}
                  onAction={(action) => {
                    setOpenKebab(null);
                    onBundleAction?.(b.id, action);
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </main>
    </section>
  );
}

function BundleCard({
  bundle,
  open,
  onToggleKebab,
  onClick,
  onAction,
}: {
  bundle: BundleRow;
  open: boolean;
  onToggleKebab: () => void;
  onClick: () => void;
  onAction: (action: BundleAction) => void;
}) {
  return (
    <div
      data-bundle-id={bundle.id}
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 13,
        padding: "16px 17px",
        borderWidth: 1,
        borderStyle: "solid",
        borderColor: "var(--line)",
        borderRadius: "var(--r-lg)",
        background: "var(--bg-2)",
      }}
    >
      <button
        type="button"
        onClick={onClick}
        data-action="open-bundle"
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: 13,
          flex: 1,
          minWidth: 0,
          background: "transparent",
          border: "none",
          padding: 0,
          textAlign: "left",
          cursor: "pointer",
        }}
      >
        <span
          aria-hidden="true"
          style={{
            width: 42,
            height: 42,
            borderRadius: "var(--r-md)",
            flex: "none",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--accent)",
            background: "var(--accent-soft)",
            borderWidth: 1,
            borderStyle: "solid",
            borderColor: "var(--line-2)",
          }}
        >
          <BundleScrollIcon />
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              gap: 9,
              flexWrap: "wrap",
            }}
          >
            <span
              data-field="bundle-name"
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 17,
                color: "var(--ink)",
              }}
            >
              {bundle.name}
            </span>
            <span
              data-field="bundle-version"
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 11.5,
                color: "var(--ink-mute)",
              }}
            >
              {bundle.version}
            </span>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              flexWrap: "wrap",
              margin: "5px 0 7px",
            }}
          >
            <span
              data-field="bundle-author"
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                color: "var(--ink-mute)",
              }}
            >
              {bundle.author}
            </span>
            <span
              data-field="bundle-citation"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                padding: "1px 9px",
                borderRadius: 20,
                background: "var(--remote-soft)",
                borderWidth: 1,
                borderStyle: "solid",
                borderColor: "var(--remote)",
                fontFamily: "var(--font-ui)",
                fontSize: 10.5,
                color: "var(--remote)",
              }}
            >
              <span
                aria-hidden="true"
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: 12,
                  lineHeight: 1,
                }}
              >
                {BL_CITATION_GLYPH}
              </span>
              {bundle.citation}
            </span>
          </div>
          <div
            data-field="bundle-desc"
            style={{
              fontFamily: "var(--font-serif)",
              fontSize: 13,
              lineHeight: 1.5,
              color: "var(--ink-soft)",
              marginBottom: 9,
            }}
          >
            {bundle.description}
          </div>
          <div
            data-field="bundle-data-summary"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 7,
              padding: "4px 11px",
              borderRadius: "var(--r-md)",
              background: "var(--bg-3)",
              fontFamily: "var(--font-ui)",
              fontSize: 12,
              color: "var(--ink-soft)",
            }}
          >
            <svg
              width={14}
              height={14}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M4 6h16M4 12h16M4 18h10" />
            </svg>
            {bundle.dataSummary}
          </div>
        </div>
      </button>
      <div style={{ position: "relative", flex: "none" }}>
        <button
          type="button"
          aria-label="Bundle actions"
          aria-expanded={open}
          onClick={onToggleKebab}
          data-action="kebab"
          style={{
            width: 32,
            height: 32,
            borderRadius: "var(--r-sm)",
            color: "var(--ink-mute)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "transparent",
            border: "none",
            cursor: "pointer",
          }}
        >
          <svg
            width={16}
            height={16}
            viewBox="0 0 24 24"
            fill="currentColor"
            aria-hidden="true"
          >
            <circle cx="12" cy="5" r="1.6" />
            <circle cx="12" cy="12" r="1.6" />
            <circle cx="12" cy="19" r="1.6" />
          </svg>
        </button>
        {open ? (
          <div
            role="menu"
            data-field="kebab-menu"
            style={{
              position: "absolute",
              top: 36,
              right: 0,
              zIndex: 20,
              minWidth: 150,
              padding: 6,
              background: "var(--bg-2)",
              borderWidth: 1,
              borderStyle: "solid",
              borderColor: "var(--line-2)",
              borderRadius: "var(--r-md)",
              boxShadow: "0 18px 44px rgba(0,0,0,.5)",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <MenuItem
              label={BL_MENU_LABELS.preview}
              onClick={() => onAction("preview")}
            />
            <MenuItem
              label={BL_MENU_LABELS.update}
              onClick={() => onAction("update")}
            />
            <MenuItem
              label={BL_MENU_LABELS.remove}
              onClick={() => onAction("remove")}
              warn
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}

function MenuItem({
  label,
  onClick,
  warn = false,
}: {
  label: string;
  onClick: () => void;
  warn?: boolean;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      data-menu-item={label}
      data-warn={warn}
      style={{
        display: "block",
        width: "100%",
        textAlign: "left",
        padding: "8px 11px",
        borderRadius: "var(--r-sm)",
        fontFamily: "var(--font-ui)",
        fontSize: 13,
        color: warn ? "var(--warn)" : "var(--ink-soft)",
        background: "transparent",
        border: "none",
        cursor: "pointer",
      }}
    >
      {label}
    </button>
  );
}
