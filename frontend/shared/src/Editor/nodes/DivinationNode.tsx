/**
 * Tiptap node — divination.
 *
 * Inline reference to a divination reading. The result is **stored as
 * static attrs on the node** so the entry is a self-contained
 * historical record — design decision per B99 (parametric over
 * reference). Currently supports tarot and i-ching; geomancy / runes /
 * pendulum follow in B99b alongside their pickers.
 *
 * Persisted attrs:
 *   - kind:     "tarot" | "iching"
 *   - seed:     number (deterministic source for the engine)
 *   - question: string (optional, displayed verbatim)
 *   - spread:   SpreadKind (tarot only)
 *   - cards:    DrawnCard[] (tarot only — cached snapshot)
 *   - lines:    LineValue[] (iching only — six cast lines)
 */

import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer, NodeViewWrapper, type NodeViewProps } from "@tiptap/react";

import {
  type DrawnCard,
  type LineValue,
  type SpreadKind,
  drawSpread,
  hexagramName,
  hexagramNumber,
  isYang,
} from "../../divination/index.js";

const LINE = "var(--line)";

export type DivinationKind = "tarot" | "iching";

function pickTarotSnapshot(spread: SpreadKind, seed: number): DrawnCard[] {
  return drawSpread(spread, seed);
}

function deterministicLineValue(rng: () => number): LineValue {
  const v = rng();
  if (v < 0.0625) return 6; // old yin
  if (v < 0.5) return 7; // young yang
  if (v < 0.9375) return 8; // young yin
  return 9; // old yang
}

function pickIchingSnapshot(seed: number): LineValue[] {
  // Mulberry32 for determinism. Each cast is independent.
  let s = seed >>> 0;
  const rng = () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return [
    deterministicLineValue(rng),
    deterministicLineValue(rng),
    deterministicLineValue(rng),
    deterministicLineValue(rng),
    deterministicLineValue(rng),
    deterministicLineValue(rng),
  ];
}

function DivinationView({ node }: NodeViewProps) {
  const attrs = node.attrs as {
    kind?: DivinationKind;
    seed?: number;
    question?: string;
    spread?: SpreadKind;
    cards?: DrawnCard[];
    lines?: LineValue[];
  };
  const kind = (attrs.kind ?? "tarot") as DivinationKind;
  const seed = typeof attrs.seed === "number" ? attrs.seed : 0;

  return (
    <NodeViewWrapper
      data-block="divination"
      data-divination-kind={kind}
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
          <path d="M3 12c3-5 15-5 18 0-3 5-15 5-18 0z M12 12a2.5 2.5 0 100-5 2.5 2.5 0 000 5z" />
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
          {kind === "tarot" ? "Tarot reading" : "I Ching cast"}
        </span>
        <span
          style={{
            marginLeft: "auto",
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            color: "var(--ink-mute)",
          }}
          aria-label={`Seed ${seed}`}
        >
          seed · {seed}
        </span>
      </div>
      {attrs.question && (
        <div
          style={{
            padding: "10px 16px",
            fontFamily: "var(--font-serif)",
            fontStyle: "italic",
            fontSize: 14,
            color: "var(--ink-soft)",
            borderBottom: `1px solid ${LINE}`,
          }}
        >
          {attrs.question}
        </div>
      )}
      {kind === "tarot" ? (
        <TarotBody cards={attrs.cards ?? []} />
      ) : (
        <IchingBody lines={attrs.lines ?? []} />
      )}
    </NodeViewWrapper>
  );
}

function TarotBody({ cards }: { cards: DrawnCard[] }) {
  if (cards.length === 0) {
    return (
      <div
        style={{
          padding: "14px 16px",
          fontFamily: "var(--font-ui)",
          fontSize: 12,
          color: "var(--ink-mute)",
          fontStyle: "italic",
        }}
      >
        No cards yet — drawer arrives with the picker in B99b.
      </div>
    );
  }
  return (
    <div
      style={{
        padding: "14px 16px",
        display: "flex",
        flexWrap: "wrap",
        gap: 12,
      }}
    >
      {cards.map((c, i) => (
        <div
          key={`${i}-${c.card.name}`}
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 4,
            padding: "8px 10px",
            border: `1px solid ${LINE}`,
            borderRadius: "var(--r-md)",
            background: "var(--bg)",
            minWidth: 140,
          }}
        >
          <span
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: 10,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "var(--ink-mute)",
            }}
          >
            {c.positionLabel}
          </span>
          <span style={{ fontFamily: "var(--font-serif)", fontSize: 15, color: "var(--ink)" }}>
            {c.card.name}
            {c.reversed && " — reversed"}
          </span>
        </div>
      ))}
    </div>
  );
}

function IchingBody({ lines }: { lines: LineValue[] }) {
  if (lines.length === 0) {
    return (
      <div
        style={{
          padding: "14px 16px",
          fontFamily: "var(--font-ui)",
          fontSize: 12,
          color: "var(--ink-mute)",
          fontStyle: "italic",
        }}
      >
        No lines yet — drawer arrives with the picker in B99b.
      </div>
    );
  }
  const number = hexagramNumber(lines);
  const name = hexagramName(number);
  return (
    <div
      style={{
        padding: "14px 16px",
        display: "flex",
        gap: 18,
        alignItems: "center",
      }}
    >
      <svg width="60" height="78" viewBox="0 0 60 78" aria-label={`Hexagram ${number}`} role="img">
        {[...lines].reverse().map((value, i) => {
          const y = 8 + i * 12;
          const yang = isYang(value);
          return yang ? (
            <rect key={i} x="6" y={y} width="48" height="6" fill="var(--ink)" />
          ) : (
            <g key={i} fill="var(--ink)">
              <rect x="6" y={y} width="20" height="6" />
              <rect x="34" y={y} width="20" height="6" />
            </g>
          );
        })}
      </svg>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 22,
            fontWeight: 700,
            color: "var(--ink)",
          }}
        >
          {number}. {name.english}
        </span>
        <span
          style={{
            fontFamily: "var(--font-cjk, var(--font-serif))",
            fontSize: 18,
            color: "var(--ink-soft)",
          }}
        >
          {name.chinese} · {name.pinyin}
        </span>
      </div>
    </div>
  );
}

export const DivinationNode = Node.create({
  name: "divination",
  group: "block",
  atom: true,
  selectable: true,
  draggable: true,

  addAttributes() {
    return {
      kind: { default: "tarot" },
      seed: { default: 0 },
      question: { default: "" },
      spread: { default: "three" },
      cards: {
        default: [],
        parseHTML: (el: HTMLElement) => {
          const raw = el.getAttribute("data-cards");
          if (!raw) return [];
          try {
            return JSON.parse(raw);
          } catch {
            return [];
          }
        },
        renderHTML: (attrs: { cards: DrawnCard[] }) => ({
          "data-cards": JSON.stringify(attrs.cards ?? []),
        }),
      },
      lines: {
        default: [],
        parseHTML: (el: HTMLElement) => {
          const raw = el.getAttribute("data-lines");
          if (!raw) return [];
          try {
            const parsed = JSON.parse(raw);
            return Array.isArray(parsed) ? parsed : [];
          } catch {
            return [];
          }
        },
        renderHTML: (attrs: { lines: LineValue[] }) => ({
          "data-lines": JSON.stringify(attrs.lines ?? []),
        }),
      },
    };
  },

  parseHTML() {
    return [{ tag: "div[data-block='divination']" }];
  },

  renderHTML({ HTMLAttributes }: { HTMLAttributes: Record<string, unknown> }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-block": "divination" })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(DivinationView);
  },
});

export { pickTarotSnapshot, pickIchingSnapshot };
