/**
 * Editor — slash menu popover.
 *
 * Lifted from the static Editor.dc.html port. Filters
 * `SLASH_COMMANDS` by query; arrow-keys + Enter pick a row, click
 * also picks. Insertion happens on the parent's `onSelect` callback.
 */

import { type CSSProperties, useEffect, useMemo, useRef } from "react";

import { filterSlashCommands, SLASH_COMMANDS, type SlashCommand } from "./slashCommands.js";

const LINE = "var(--line)";
const LINE_2 = "var(--line-2)";

export interface SlashMenuProps {
  open: boolean;
  query: string;
  activeIndex: number;
  onActiveIndexChange: (index: number) => void;
  onSelect: (command: SlashCommand) => void;
  /** Absolute position (px) within the editor surface. */
  position?: { top: number; left: number };
}

export function useFilteredSlashCommands(query: string): SlashCommand[] {
  return useMemo(() => filterSlashCommands(query), [query]);
}

export function SlashMenu({
  open,
  query,
  activeIndex,
  onActiveIndexChange,
  onSelect,
  position,
}: SlashMenuProps) {
  const items = useFilteredSlashCommands(query);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    if (activeIndex >= items.length) onActiveIndexChange(0);
  }, [open, items.length, activeIndex, onActiveIndexChange]);

  if (!open) return null;

  const containerStyle: CSSProperties = {
    position: "absolute",
    top: position?.top ?? 28,
    left: position?.left ?? 0,
    width: 340,
    background: "var(--bg-2)",
    border: `1px solid ${LINE_2}`,
    borderRadius: "var(--r-lg)",
    boxShadow: "0 18px 40px rgba(0,0,0,.5)",
    overflow: "hidden",
    zIndex: 30,
  };

  return (
    <div ref={rootRef} role="listbox" aria-label="Insert magickal block" style={containerStyle}>
      <div
        style={{
          padding: "8px 14px",
          borderBottom: `1px solid ${LINE}`,
          fontFamily: "var(--font-ui)",
          fontSize: 10.5,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: "var(--ink-mute)",
        }}
      >
        Insert magickal block
      </div>
      <div style={{ padding: 6 }}>
        {items.length === 0 && (
          <div
            style={{
              padding: "12px 10px",
              fontFamily: "var(--font-ui)",
              fontSize: 12.5,
              color: "var(--ink-mute)",
              fontStyle: "italic",
            }}
          >
            No block matches "{query}".
          </div>
        )}
        {items.map((item, i) => {
          const active = i === activeIndex;
          return (
            <button
              key={item.key}
              type="button"
              role="option"
              aria-selected={active ? "true" : "false"}
              onMouseEnter={() => onActiveIndexChange(i)}
              onMouseDown={(e) => {
                e.preventDefault();
                onSelect(item);
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "9px 10px",
                borderRadius: "var(--r-md)",
                background: active ? "var(--accent-soft)" : "transparent",
                width: "100%",
                border: "none",
                cursor: "pointer",
                color: "inherit",
                fontFamily: "inherit",
                textAlign: "left",
              }}
            >
              <span
                aria-hidden="true"
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 7,
                  background: "var(--bg-3)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: item.iconColor,
                  flex: "none",
                }}
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d={item.iconPath} />
                </svg>
              </span>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: "var(--font-serif)", fontSize: 15, color: "var(--ink)" }}>
                  {item.title}
                </div>
                <div
                  style={{
                    fontFamily: "var(--font-ui)",
                    fontSize: 11.5,
                    color: "var(--ink-mute)",
                  }}
                >
                  {item.description}
                </div>
              </div>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--ink-mute)" }}>
                {item.command}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export { SLASH_COMMANDS };
