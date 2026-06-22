/**
 * Search stories — covering hit highlighting, the result card across
 * visibility tones, and the sealed-excluded honesty card.
 */
import type { Meta, StoryObj } from "@storybook/react";

import { HighlightedText } from "./HighlightedText.js";
import { SealedExcludedCallout } from "./SealedExcludedCallout.js";
import {
  type SearchHit,
  SearchHitCard,
} from "./SearchHitCard.js";

const meta = {
  title: "Search",
} satisfies Meta;

export default meta;
type Story = StoryObj;

const Frame = ({
  children,
  width = 620,
}: {
  children: React.ReactNode;
  width?: number;
}) => (
  <div style={{ padding: 22, background: "var(--bg)", maxWidth: width }}>
    {children}
  </div>
);

// ─── HighlightedText ───────────────────────────────────────────────

export const Highlight_Single: Story = {
  name: "HighlightedText · single hit",
  render: () => (
    <Frame width={420}>
      <span
        style={{
          fontFamily: "var(--font-serif)",
          fontSize: 16,
          color: "var(--ink)",
        }}
      >
        <HighlightedText
          text="Saturn governs limit and duration"
          query="Saturn"
        />
      </span>
    </Frame>
  ),
};

export const Highlight_Multi: Story = {
  name: "HighlightedText · case-insensitive, repeated",
  render: () => (
    <Frame width={520}>
      <span
        style={{
          fontFamily: "var(--font-serif)",
          fontSize: 15,
          color: "var(--ink-soft)",
          lineHeight: 1.6,
        }}
      >
        <HighlightedText
          text="On the hour of Saturn the saturn-square binding rite was undertaken; the SATURN hour favoured it well."
          query="saturn"
        />
      </span>
    </Frame>
  ),
};

// ─── SearchHitCard ─────────────────────────────────────────────────

const SATURN_HIT: SearchHit = {
  id: "h1",
  title: "Notes on Saturn and binding rites",
  excerpt:
    "Saturn governs limit and duration; this hour suited the rite well — the binding held through the night.",
  kindLabel: "Note",
  when: "Mon 16 Jun · waxing crescent",
  visibility: "personal",
};

const HEKATE_HIT: SearchHit = {
  id: "h2",
  title: "Deipnon at the crossroads",
  excerpt:
    "Wine, honey-cake, an egg set down at the three-way crossing and not looked back upon.",
  kindLabel: "Ritual log",
  when: "Sun 14 Jun · dark moon",
  visibility: "hub",
};

const DREAM_HIT: SearchHit = {
  id: "h3",
  title: "Dream of the seven gates",
  excerpt:
    "Through each gate a god in turn; the seventh refused me — said the hour was wrong.",
  kindLabel: "Dream",
  when: "Wed 11 Jun",
  visibility: "viewer",
};

export const Hit_Saturn_Highlighted: Story = {
  name: "SearchHitCard · query=Saturn",
  render: () => (
    <Frame>
      <SearchHitCard
        hit={SATURN_HIT}
        query="Saturn"
        glyph={<span style={{ fontFamily: "var(--font-glyph)" }}>♄</span>}
        onSelect={() => {}}
      />
    </Frame>
  ),
};

export const Hit_Hekate_Hub: Story = {
  name: "SearchHitCard · ritual log · hub visibility",
  render: () => (
    <Frame>
      <SearchHitCard
        hit={HEKATE_HIT}
        query="crossroads"
        glyph={<span style={{ fontFamily: "var(--font-glyph)" }}>☾</span>}
        onSelect={() => {}}
      />
    </Frame>
  ),
};

export const Hit_Dream_Viewer: Story = {
  name: "SearchHitCard · dream · viewer visibility",
  render: () => (
    <Frame>
      <SearchHitCard
        hit={DREAM_HIT}
        query="gate"
        glyph={<span style={{ fontFamily: "var(--font-glyph)" }}>☽</span>}
        onSelect={() => {}}
      />
    </Frame>
  ),
};

// ─── SealedExcludedCallout ────────────────────────────────────────

export const Sealed_Compact_TwoExcluded: Story = {
  name: "SealedExcludedCallout · compact, 2 excluded",
  render: () => (
    <Frame>
      <SealedExcludedCallout
        sealedCount={2}
        unlockAction={
          <button
            type="button"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "7px 13px",
              borderWidth: 1,
              borderStyle: "solid",
              borderColor: "var(--line-2)",
              borderRadius: "var(--r-md, 8px)",
              fontFamily: "var(--font-ui)",
              fontSize: 12,
              color: "var(--ink-soft)",
              background: "transparent",
              cursor: "pointer",
            }}
          >
            Unlock vault to include them
          </button>
        }
      />
    </Frame>
  ),
};

export const Sealed_Compact_None: Story = {
  name: "SealedExcludedCallout · compact, none excluded",
  render: () => (
    <Frame>
      <SealedExcludedCallout sealedCount={0} />
    </Frame>
  ),
};

export const Sealed_Inline: Story = {
  name: "SealedExcludedCallout · inline (empty-state variant)",
  render: () => (
    <Frame width={460}>
      <SealedExcludedCallout sealedCount={2} layout="inline" />
    </Frame>
  ),
};
