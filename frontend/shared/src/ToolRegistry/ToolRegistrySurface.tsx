/**
 * ToolRegistrySurface — composes the H05 Tool Registry end-to-end.
 *
 * Topbar → search + filter row → Tools grid OR Altars list →
 * ToolDetailDrawer overlay.
 */

import { type CSSProperties, useMemo, useState } from "react";

import { AltarsList } from "./AltarsList.js";
import {
  ALL_FILTER_LABEL,
  DEMO_ALTARS,
  DEMO_TOOLS,
  TOOL_KINDS,
  TR_TOPBAR_SUBTITLE,
  TR_TOPBAR_TITLE,
  VIEW_ALTARS_LABEL,
  VIEW_TOOLS_LABEL,
  newButtonLabel,
  searchPlaceholder,
  type AltarRecord,
  type RegistryView,
  type ToolKind,
  type ToolRecord,
} from "./copy.js";
import { ToolCard } from "./ToolCard.js";
import { ToolDetailDrawer } from "./ToolDetailDrawer.js";

const TOPBAR_STYLE: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 16,
  padding: "13px 24px",
  borderBottomWidth: 1,
  borderBottomStyle: "solid",
  borderBottomColor: "var(--line)",
  background: "var(--bg)",
};

const VIEW_GROUP_STYLE: CSSProperties = {
  display: "flex",
  gap: 2,
  padding: 3,
  borderWidth: 1,
  borderStyle: "solid",
  borderColor: "var(--line)",
  borderRadius: 8,
  background: "var(--bg-2)",
};

const VIEW_BASE: CSSProperties = {
  padding: "6px 14px",
  fontFamily: "var(--font-ui)",
  fontSize: 12.5,
  color: "var(--ink-mute)",
  background: "transparent",
  borderWidth: 1,
  borderStyle: "solid",
  borderColor: "transparent",
  borderRadius: 6,
  cursor: "pointer",
};

const VIEW_ON: CSSProperties = {
  ...VIEW_BASE,
  color: "var(--ink)",
  background: "var(--accent-soft)",
  borderColor: "var(--line-2)",
};

const FILTER_BAR_STYLE: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 12,
  flexWrap: "wrap",
  padding: "12px 24px",
  borderBottomWidth: 1,
  borderBottomStyle: "solid",
  borderBottomColor: "var(--line)",
  background: "var(--bg)",
};

const FILTER_CHIP_BASE: CSSProperties = {
  padding: "7px 13px",
  borderRadius: "var(--r-md)",
  borderWidth: 1,
  borderStyle: "solid",
  borderColor: "var(--line)",
  background: "var(--bg-2)",
  fontFamily: "var(--font-ui)",
  fontSize: 12.5,
  color: "var(--ink-mute)",
  whiteSpace: "nowrap",
  flex: "none",
  cursor: "pointer",
};

const FILTER_CHIP_ON: CSSProperties = {
  ...FILTER_CHIP_BASE,
  color: "var(--ink)",
  background: "var(--accent-soft)",
  borderColor: "var(--accent)",
};

export type ToolKindFilter = ToolKind | "all";

export interface ToolRegistrySurfaceProps {
  initialView?: RegistryView;
  initialKindFilter?: ToolKindFilter;
  tools?: readonly ToolRecord[];
  altars?: readonly AltarRecord[];
  onNew?: (view: RegistryView) => void;
  onOpenAltar?: (id: string) => void;
  className?: string;
  style?: CSSProperties;
}

export function ToolRegistrySurface({
  initialView = "tools",
  initialKindFilter = "all",
  tools = DEMO_TOOLS,
  altars = DEMO_ALTARS,
  onNew,
  onOpenAltar,
  className,
  style,
}: ToolRegistrySurfaceProps) {
  const [view, setView] = useState<RegistryView>(initialView);
  const [kindFilter, setKindFilter] = useState<ToolKindFilter>(
    initialKindFilter,
  );
  const [openToolId, setOpenToolId] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const filteredTools = useMemo(() => {
    const q = query.trim().toLowerCase();
    return tools.filter((t) => {
      if (kindFilter !== "all" && t.kind !== kindFilter) return false;
      if (!q) return true;
      return (
        t.name.toLowerCase().includes(q) ||
        t.desc.toLowerCase().includes(q)
      );
    });
  }, [tools, kindFilter, query]);

  const openTool = useMemo(
    () => tools.find((t) => t.id === openToolId) ?? null,
    [tools, openToolId],
  );

  return (
    <div
      data-component="tool-registry-surface"
      data-view={view}
      data-kind-filter={kindFilter}
      className={className}
      style={{
        display: "grid",
        gridTemplateRows: "auto auto 1fr",
        minWidth: 0,
        minHeight: 0,
        height: "100%",
        ...style,
      }}
    >
      <header style={TOPBAR_STYLE}>
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 21,
              lineHeight: 1.1,
            }}
          >
            {TR_TOPBAR_TITLE}
          </div>
          <div
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: 12.5,
              color: "var(--ink-mute)",
              marginTop: 2,
            }}
          >
            {TR_TOPBAR_SUBTITLE}
          </div>
        </div>
        <div
          style={{
            marginLeft: "auto",
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <div role="group" aria-label="View" style={VIEW_GROUP_STYLE}>
            <button
              type="button"
              data-view-button="tools"
              aria-pressed={view === "tools"}
              onClick={() => setView("tools")}
              style={view === "tools" ? VIEW_ON : VIEW_BASE}
            >
              {VIEW_TOOLS_LABEL}
            </button>
            <button
              type="button"
              data-view-button="altars"
              aria-pressed={view === "altars"}
              onClick={() => setView("altars")}
              style={view === "altars" ? VIEW_ON : VIEW_BASE}
            >
              {VIEW_ALTARS_LABEL}
            </button>
          </div>
        </div>
      </header>

      <div style={FILTER_BAR_STYLE}>
        <div
          style={{
            position: "relative",
            flex: "0 1 260px",
          }}
        >
          <span
            style={{
              position: "absolute",
              left: 12,
              top: "50%",
              transform: "translateY(-50%)",
              color: "var(--ink-mute)",
            }}
          >
            <svg
              width={15}
              height={15}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.6}
              strokeLinecap="round"
              aria-hidden="true"
            >
              <circle cx={11} cy={11} r={7} />
              <path d="M20 20l-3.5-3.5" />
            </svg>
          </span>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={searchPlaceholder(view)}
            data-search-input
            style={{
              width: "100%",
              padding: "9px 12px 9px 34px",
              borderWidth: 1,
              borderStyle: "solid",
              borderColor: "var(--line-2)",
              borderRadius: "var(--r-md)",
              background: "var(--bg-2)",
              color: "var(--ink)",
              fontFamily: "var(--font-ui)",
              fontSize: 13.5,
            }}
          />
        </div>
        {view === "tools" ? (
          <div
            className="scroll"
            role="group"
            aria-label="Kind"
            style={{
              display: "flex",
              gap: 6,
              overflowX: "auto",
              flex: 1,
              minWidth: 0,
            }}
          >
            <button
              type="button"
              data-kind-filter="all"
              aria-pressed={kindFilter === "all"}
              onClick={() => setKindFilter("all")}
              style={kindFilter === "all" ? FILTER_CHIP_ON : FILTER_CHIP_BASE}
            >
              {ALL_FILTER_LABEL}
            </button>
            {TOOL_KINDS.map((k) => {
              const on = kindFilter === k.key;
              return (
                <button
                  key={k.key}
                  type="button"
                  data-kind-filter={k.key}
                  aria-pressed={on}
                  onClick={() => setKindFilter(k.key)}
                  style={on ? FILTER_CHIP_ON : FILTER_CHIP_BASE}
                >
                  {k.label}
                </button>
              );
            })}
          </div>
        ) : null}
        <button
          type="button"
          data-action="new"
          onClick={() => onNew?.(view)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 7,
            padding: "9px 15px",
            borderRadius: "var(--r-md)",
            background: "var(--accent)",
            color: "var(--accent-ink)",
            fontFamily: "var(--font-ui)",
            fontWeight: 700,
            fontSize: 13,
            flex: "none",
            border: "none",
            cursor: "pointer",
          }}
        >
          <svg
            width={15}
            height={15}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.7}
            strokeLinecap="round"
            aria-hidden="true"
          >
            <path d="M12 5v14M5 12h14" />
          </svg>
          {newButtonLabel(view)}
        </button>
      </div>

      <main
        className="scroll"
        style={{
          overflowY: "auto",
          minHeight: 0,
          padding: 24,
        }}
      >
        {view === "tools" ? (
          <div
            data-tools-grid
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
              gap: 16,
              maxWidth: 1100,
            }}
          >
            {filteredTools.map((tool) => (
              <ToolCard
                key={tool.id}
                tool={tool}
                onOpen={(id) => setOpenToolId(id)}
              />
            ))}
            {filteredTools.length === 0 ? (
              <p
                style={{
                  fontFamily: "var(--font-ui)",
                  fontSize: 13,
                  color: "var(--ink-mute)",
                }}
              >
                No tools match this filter.
              </p>
            ) : null}
          </div>
        ) : (
          <AltarsList altars={altars} onOpen={onOpenAltar} />
        )}
      </main>

      <ToolDetailDrawer
        open={openTool !== null}
        tool={openTool}
        onClose={() => setOpenToolId(null)}
      />
    </div>
  );
}
