/**
 * Calendar stories — covering the four new primitives. The MonthGrid
 * story builds the design's June 2026 fixture (Vestalia + Litha +
 * Solstice astro).
 */
import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";

import { CitationKindBadge } from "./CitationKindBadge.js";
import { FestivalDetail } from "./FestivalDetail.js";
import { FestivalTraditionChip } from "./FestivalTraditionChip.js";
import {
  CITATION_KIND_ORDER,
  FESTIVAL_TRADITION_ORDER,
  type Festival,
  type FestivalTradition,
} from "./festivals.js";
import {
  MonthGrid,
  type MonthWeek,
} from "./MonthGrid.js";

const meta = {
  title: "Calendar",
} satisfies Meta;

export default meta;
type Story = StoryObj;

const Frame = ({
  children,
  width = 760,
}: {
  children: React.ReactNode;
  width?: number;
}) => (
  <div style={{ padding: 22, background: "var(--bg)", maxWidth: width }}>
    {children}
  </div>
);

const vestalia: Festival = {
  id: "vestalia",
  name: "Vestalia",
  tradition: "roman",
  glyph: "⚶",
  label: "7–15 June",
  start: 7,
  end: 15,
  description:
    "The festival of Vesta, when the penus Vestae — the inner store of the goddess's temple — was opened to the matrons of Rome.",
  practice:
    "Mola salsa offered and the hearth honoured through the week; on the Ides the temple was ritually swept and the sweepings carried to the Tiber.",
  sources: [
    {
      kind: "primary",
      title: "Fasti VI.249–348",
      author: "Ovid",
      year: "8 CE",
      loc: "VI.249",
      note: "The fullest surviving account of the rites.",
    },
    {
      kind: "primary",
      title: "Fasti Praenestini",
      author: "inscr.",
      year: "c. 6–9 CE",
      loc: "15 Jun",
      note: "Q.St.D.F. — the day the temple was cleansed.",
    },
    {
      kind: "scholarly",
      title: "Religions of Rome, I",
      author: "Beard, North & Price",
      year: "1998",
      loc: "pp. 51–52",
    },
  ],
};

const litha: Festival = {
  id: "litha",
  name: "Litha · Midsummer",
  tradition: "woty",
  glyph: "☀",
  label: "summer solstice",
  day: 21,
  description:
    "The Wheel's midsummer station — the longest day, the sun at the height of its strength before the turn toward winter.",
  practice:
    "Bonfires kept through the short night; herbs gathered at their peak; the sun's zenith marked and its decline acknowledged.",
  sources: [
    {
      kind: "primary",
      title: "De temporum ratione §15",
      author: "Bede",
      year: "725 CE",
      loc: "§15",
      note: 'The lone early mention of "Liða" — and only as a month-name.',
    },
    {
      kind: "scholarly",
      title: "The Stations of the Sun",
      author: "Ronald Hutton",
      year: "1996",
      loc: "ch. 31",
      note: "How much of the midsummer fire is medieval, not ancient.",
    },
    {
      kind: "community",
      title: "A Witches' Bible",
      author: "J. & S. Farrar",
      year: "1984",
      loc: "Litha",
      note: "The modern sabbat rite as practised today.",
    },
  ],
};

const deipnon: Festival = {
  id: "deipnon",
  name: "Deipnon",
  tradition: "hekatean",
  glyph: "☾",
  label: "dark of the moon",
  day: 14,
  description:
    "Hekate's Supper, laid at a three-way crossing on the last night of the lunar month, when the moon has gone dark.",
  practice:
    "A meal — eggs, garlic, sprat, a cake — set down at the crossroads and not looked back upon; the house purged for the month's turning.",
  sources: [
    {
      kind: "primary",
      title: "Against Conon §39",
      author: "Demosthenes",
      year: "c. 341 BCE",
      loc: "§39",
    },
    {
      kind: "community",
      title: "Devotional practice notes",
      author: "Hekatean priestesshood",
      year: "2024",
    },
  ],
};

// ─── FestivalTraditionChip ─────────────────────────────────────────

const TraditionRow = () => {
  const [active, setActive] = useState<Record<FestivalTradition, boolean>>({
    woty: true,
    greek: true,
    roman: true,
    hekatean: true,
    thelemic: true,
    hindu: false,
    egyptian: false,
  });
  return (
    <Frame>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          flexWrap: "wrap",
        }}
      >
        {FESTIVAL_TRADITION_ORDER.map((t) => (
          <FestivalTraditionChip
            key={t}
            tradition={t}
            active={active[t]}
            onToggle={(next) => setActive({ ...active, [t]: next })}
          />
        ))}
      </div>
    </Frame>
  );
};

export const FestivalTraditionChip_All: Story = {
  name: "FestivalTraditionChip · all seven traditions",
  render: () => <TraditionRow />,
};

// ─── CitationKindBadge ─────────────────────────────────────────────

export const CitationKindBadge_All: Story = {
  name: "CitationKindBadge · primary · scholarly · community",
  render: () => (
    <Frame width={300}>
      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        {CITATION_KIND_ORDER.map((k) => (
          <CitationKindBadge key={k} kind={k} />
        ))}
      </div>
    </Frame>
  ),
};

// ─── FestivalDetail ────────────────────────────────────────────────

export const FestivalDetail_Vestalia: Story = {
  name: "FestivalDetail · Vestalia (multi-source primary + scholarly)",
  render: () => (
    <Frame width={420}>
      <FestivalDetail festival={vestalia} onDismiss={() => {}} />
    </Frame>
  ),
};

export const FestivalDetail_Litha: Story = {
  name: "FestivalDetail · Litha (mixed citation chain)",
  render: () => (
    <Frame width={420}>
      <FestivalDetail festival={litha} onDismiss={() => {}} />
    </Frame>
  ),
};

export const FestivalDetail_Deipnon: Story = {
  name: "FestivalDetail · Deipnon (community + primary)",
  render: () => (
    <Frame width={420}>
      <FestivalDetail festival={deipnon} onDismiss={() => {}} />
    </Frame>
  ),
};

// ─── MonthGrid ─────────────────────────────────────────────────────

function buildJune2026(): MonthWeek[] {
  const weeks: MonthWeek[] = [];
  for (let w = 0; w < 5; w++) {
    const days: MonthWeek["days"] = [];
    for (let col = 0; col < 7; col++) {
      const ci = w * 7 + col;
      const inMonth = ci >= 1 && ci <= 30;
      const dom = ci === 0 ? 31 : ci <= 30 ? ci : ci - 30;
      const isToday = ci === 21;
      const festivals: Festival[] = [];
      if (ci === 14) festivals.push(deipnon);
      if (ci === 21) festivals.push(litha);
      days.push({
        dom,
        inMonth,
        outOfMonthTag: ci === 0 ? "May" : ci === 31 ? "Jul" : undefined,
        isToday,
        festivals: festivals.length ? festivals : undefined,
        astro:
          ci === 21
            ? [{ id: "a21", glyph: "☀", label: "Summer solstice" }]
            : ci === 15
              ? [{ id: "a15", glyph: "●", label: "New moon" }]
              : ci === 29
                ? [{ id: "a29", glyph: "○", label: "Full moon" }]
                : undefined,
      });
    }
    const bars: MonthWeek["bars"] = [];
    // Vestalia 7-15 spans week 1 (cells 7-13 = col 0-6) and week 2 (cells 14-15 = col 0-1).
    if (w === 1) {
      bars.push({
        festival: vestalia,
        startCol: 0,
        span: 7,
        isStart: true,
        isEnd: false,
      });
    }
    if (w === 2) {
      bars.push({
        festival: vestalia,
        startCol: 0,
        span: 2,
        isStart: false,
        isEnd: true,
      });
    }
    weeks.push({ days, bars });
  }
  return weeks;
}

export const MonthGrid_June2026: Story = {
  name: "MonthGrid · June 2026 with Vestalia bar + Litha + astro",
  render: () => (
    <Frame width={900}>
      <MonthGrid
        weekdayNames={["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]}
        weeks={buildJune2026()}
      />
    </Frame>
  ),
};

export const MonthGrid_Empty: Story = {
  name: "MonthGrid · empty (no events)",
  render: () => {
    const weeks: MonthWeek[] = [];
    for (let w = 0; w < 5; w++) {
      const days: MonthWeek["days"] = [];
      for (let col = 0; col < 7; col++) {
        const ci = w * 7 + col;
        const inMonth = ci >= 1 && ci <= 30;
        days.push({
          dom: ci === 0 ? 31 : ci <= 30 ? ci : ci - 30,
          inMonth,
          outOfMonthTag: ci === 0 ? "May" : ci === 31 ? "Jul" : undefined,
        });
      }
      weeks.push({ days });
    }
    return (
      <Frame width={900}>
        <MonthGrid
          weekdayNames={["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]}
          weeks={weeks}
        />
      </Frame>
    );
  },
};
