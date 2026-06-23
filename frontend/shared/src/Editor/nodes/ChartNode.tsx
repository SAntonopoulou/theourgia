/**
 * Tiptap node — chart.
 *
 * Embeds an astrological chart in the body of an entry. The chart is
 * **stored parametrically** per B99 design: the node holds the
 * placements / houses / aspects snapshot. The live API integration
 * (picker that fetches `/api/v1/astro/chart` for a given datetime +
 * location) arrives in B99b.
 *
 * For B99a the picker is absent. If the node has a snapshot it
 * renders via the existing shared `<Chart>` component; otherwise it
 * renders a friendly placeholder explaining how to populate it.
 */

import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer, NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import { useState } from "react";

import {
  Chart,
  type ChartAspect,
  type ChartHouses,
  type ChartPlacement,
} from "../../Chart/index.js";
import { ChartPicker } from "../ChartPicker.js";

const LINE = "var(--line)";

export interface ChartSnapshot {
  placements: ChartPlacement[];
  houses: ChartHouses | null;
  aspects: ChartAspect[];
}

function ChartView({ node, updateAttributes, editor }: NodeViewProps) {
  const title: string = node.attrs.title ?? "";
  const description: string = node.attrs.description ?? "";
  const snapshot: ChartSnapshot | null = node.attrs.snapshot ?? null;
  const editable = editor.isEditable;
  const [pickerOpen, setPickerOpen] = useState(false);

  return (
    <NodeViewWrapper
      data-block="chart"
      style={{
        border: `1px solid ${LINE}`,
        borderRadius: "var(--r-lg)",
        background: "var(--bg-2)",
        overflow: "hidden",
        margin: "0 0 22px",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "10px 16px",
          borderBottom: `1px solid ${LINE}`,
          background: "var(--bg-3)",
        }}
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--c-divination)"
          strokeWidth="1.6"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="9" />
          <path d="M12 3v18M3 12h18M6 6l12 12M18 6L6 18" strokeLinecap="round" />
        </svg>
        <span
          style={{
            fontFamily: "var(--font-ui)",
            fontSize: 10.5,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: "var(--ink-mute)",
          }}
        >
          Chart
        </span>
      </div>
      <div style={{ padding: 16, display: "flex", gap: 16, alignItems: "flex-start" }}>
        {snapshot && snapshot.houses ? (
          <Chart
            placements={snapshot.placements}
            houses={snapshot.houses}
            aspects={snapshot.aspects}
            title={title || "Embedded chart"}
            description={description}
            size={240}
          />
        ) : (
          <button
            type="button"
            onClick={editable ? () => setPickerOpen(true) : undefined}
            disabled={!editable}
            style={{
              width: 240,
              height: 240,
              border: `1px dashed ${LINE}`,
              borderRadius: "var(--r-md)",
              display: "flex",
              flexDirection: "column",
              gap: 4,
              alignItems: "center",
              justifyContent: "center",
              color: editable ? "var(--accent)" : "var(--ink-mute)",
              fontFamily: "var(--font-ui)",
              fontSize: 12.5,
              textAlign: "center",
              padding: 12,
              flex: "none",
              background: "transparent",
              cursor: editable ? "pointer" : "not-allowed",
            }}
          >
            <span style={{ fontStyle: "italic" }}>
              {editable ? "Compose chart…" : "No chart snapshot"}
            </span>
            {editable && (
              <span style={{ fontSize: 11, color: "var(--ink-mute)" }}>
                Picks parameters and computes the chart.
              </span>
            )}
          </button>
        )}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
          {editable ? (
            <>
              <input
                type="text"
                value={title}
                onChange={(e) => updateAttributes({ title: e.target.value })}
                placeholder="Chart title (e.g. Natal — Aspasia, 1980-03-14)"
                aria-label="Chart title"
                style={{
                  background: "none",
                  border: "none",
                  outline: "none",
                  fontFamily: "var(--font-display)",
                  fontWeight: 700,
                  fontSize: 18,
                  color: "var(--ink)",
                  padding: 0,
                  width: "100%",
                }}
              />
              <textarea
                value={description}
                onChange={(e) => updateAttributes({ description: e.target.value })}
                placeholder="One- or two-line description (chart kind, system, salient context)"
                aria-label="Chart description"
                style={{
                  background: "none",
                  border: "none",
                  outline: "none",
                  fontFamily: "var(--font-serif)",
                  fontSize: 14,
                  color: "var(--ink-soft)",
                  padding: 0,
                  width: "100%",
                  resize: "vertical",
                  minHeight: 56,
                }}
              />
            </>
          ) : (
            <>
              {title && (
                <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 18, color: "var(--ink)" }}>
                  {title}
                </span>
              )}
              {description && (
                <span style={{ fontFamily: "var(--font-serif)", fontSize: 14, color: "var(--ink-soft)" }}>
                  {description}
                </span>
              )}
            </>
          )}
        </div>
      </div>
      {editable && (
        <ChartPicker
          open={pickerOpen}
          onClose={() => setPickerOpen(false)}
          onPick={(nextSnapshot) => updateAttributes({ snapshot: nextSnapshot })}
        />
      )}
    </NodeViewWrapper>
  );
}

export const ChartNode = Node.create({
  name: "chart",
  group: "block",
  atom: true,
  selectable: true,
  draggable: true,

  addAttributes() {
    return {
      title: { default: "" },
      description: { default: "" },
      snapshot: {
        default: null,
        parseHTML: (el: HTMLElement) => {
          const raw = el.getAttribute("data-snapshot");
          if (!raw) return null;
          try {
            return JSON.parse(raw);
          } catch {
            return null;
          }
        },
        renderHTML: (attrs: { snapshot: ChartSnapshot | null }) => {
          if (!attrs.snapshot) return {};
          return { "data-snapshot": JSON.stringify(attrs.snapshot) };
        },
      },
    };
  },

  parseHTML() {
    return [{ tag: "div[data-block='chart']" }];
  },

  renderHTML({ HTMLAttributes }: { HTMLAttributes: Record<string, unknown> }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-block": "chart" })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(ChartView);
  },
});
