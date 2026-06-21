import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

import { CitationKindBadge } from "./CitationKindBadge.js";
import { FestivalDetail } from "./FestivalDetail.js";
import { FestivalTraditionChip } from "./FestivalTraditionChip.js";
import {
  CITATION_KIND_ORDER,
  CITATION_KINDS,
  FESTIVAL_TRADITION_ORDER,
  FESTIVAL_TRADITIONS,
  type Festival,
} from "./festivals.js";
import {
  MonthGrid,
  type MonthWeek,
} from "./MonthGrid.js";

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
    "Mola salsa offered and the hearth honoured through the week.",
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
  description: "The Wheel's midsummer station — the longest day.",
  practice: "Bonfires kept through the short night.",
  sources: [
    {
      kind: "community",
      title: "A Witches' Bible",
      author: "J. & S. Farrar",
      year: "1984",
      loc: "Litha",
    },
  ],
};

// ─── FestivalTraditionChip ─────────────────────────────────────────

describe("FestivalTraditionChip", () => {
  it("renders the canonical tradition name", () => {
    render(<FestivalTraditionChip tradition="woty" />);
    expect(screen.getByText("Wheel of the Year")).toBeInTheDocument();
  });

  it("calls onToggle with the negated active state", () => {
    const onToggle = vi.fn();
    render(
      <FestivalTraditionChip
        tradition="greek"
        active={false}
        onToggle={onToggle}
      />,
    );
    fireEvent.click(screen.getByRole("button"));
    expect(onToggle).toHaveBeenCalledWith(true);
  });

  it("rejects toggling for `soon` traditions", () => {
    const onToggle = vi.fn();
    render(
      <FestivalTraditionChip
        tradition="hindu"
        active={false}
        onToggle={onToggle}
      />,
    );
    const btn = screen.getByRole("button");
    expect(btn).toBeDisabled();
    fireEvent.click(btn);
    expect(onToggle).not.toHaveBeenCalled();
    expect(screen.getByText("soon")).toBeInTheDocument();
  });

  it("attaches structural data attributes", () => {
    const { container } = render(
      <FestivalTraditionChip tradition="hekatean" active />,
    );
    const btn = container.firstElementChild as HTMLElement;
    expect(btn.getAttribute("data-tradition")).toBe("hekatean");
    expect(btn.getAttribute("data-active")).toBe("true");
    expect(btn.getAttribute("data-soon")).toBe("false");
    expect(btn.getAttribute("aria-pressed")).toBe("true");
  });

  it("exposes all five active + two soon traditions in order", () => {
    expect(FESTIVAL_TRADITION_ORDER).toHaveLength(7);
    expect(FESTIVAL_TRADITION_ORDER.slice(0, 5).map((t) => FESTIVAL_TRADITIONS[t].soon)).toEqual(
      [false, false, false, false, false],
    );
    expect(FESTIVAL_TRADITIONS.hindu.soon).toBe(true);
    expect(FESTIVAL_TRADITIONS.egyptian.soon).toBe(true);
  });
});

// ─── CitationKindBadge ─────────────────────────────────────────────

describe("CitationKindBadge", () => {
  it.each(CITATION_KIND_ORDER)(
    "renders kind=%s with the canonical glyph + label",
    (kind) => {
      render(<CitationKindBadge kind={kind} />);
      const badge = screen.getByLabelText(CITATION_KINDS[kind].label);
      expect(badge.textContent).toBe(CITATION_KINDS[kind].glyph);
    },
  );

  it("uses the canonical full-form title by default", () => {
    const { container } = render(<CitationKindBadge kind="primary" />);
    expect(container.firstElementChild?.getAttribute("title")).toBe(
      CITATION_KINDS.primary.full,
    );
  });

  it("accepts a title override", () => {
    const { container } = render(
      <CitationKindBadge kind="scholarly" title="Custom title" />,
    );
    expect(container.firstElementChild?.getAttribute("title")).toBe(
      "Custom title",
    );
  });

  it("attaches the citation-kind data attribute", () => {
    const { container } = render(<CitationKindBadge kind="community" />);
    expect(container.firstElementChild?.getAttribute("data-citation-kind")).toBe(
      "community",
    );
  });
});

// ─── FestivalDetail ────────────────────────────────────────────────

describe("FestivalDetail", () => {
  it("renders the festival name + label + tradition", () => {
    render(<FestivalDetail festival={vestalia} />);
    expect(screen.getByText("Vestalia")).toBeInTheDocument();
    expect(screen.getByText("7–15 June")).toBeInTheDocument();
    expect(screen.getByText("Roman")).toBeInTheDocument();
  });

  it("renders the description + practice sections", () => {
    render(<FestivalDetail festival={vestalia} />);
    expect(screen.getByText(/festival of Vesta/)).toBeInTheDocument();
    expect(screen.getByText("Practice")).toBeInTheDocument();
    expect(screen.getByText(/Mola salsa offered/)).toBeInTheDocument();
  });

  it("renders each source with its byline + kind label", () => {
    render(<FestivalDetail festival={vestalia} />);
    expect(screen.getByText("Fasti VI.249–348")).toBeInTheDocument();
    expect(screen.getByText(/Ovid · 8 CE · VI\.249/)).toBeInTheDocument();
    expect(screen.getByText("Primary source")).toBeInTheDocument();
    expect(screen.getByText(/fullest surviving account/)).toBeInTheDocument();
  });

  it("renders the citation-kind badge for each source", () => {
    const { container } = render(<FestivalDetail festival={vestalia} />);
    const badges = container.querySelectorAll("[data-citation-kind]");
    expect(badges).toHaveLength(2);
    expect(badges[0]?.getAttribute("data-citation-kind")).toBe("primary");
    expect(badges[1]?.getAttribute("data-citation-kind")).toBe("scholarly");
  });

  it("calls onDismiss when the dismiss button is clicked", () => {
    const onDismiss = vi.fn();
    render(<FestivalDetail festival={vestalia} onDismiss={onDismiss} />);
    fireEvent.click(screen.getByLabelText(/Back to today/i));
    expect(onDismiss).toHaveBeenCalledOnce();
  });

  it("attaches structural data attributes", () => {
    const { container } = render(<FestivalDetail festival={litha} />);
    const root = container.firstElementChild as HTMLElement;
    expect(root.getAttribute("data-component")).toBe("festival-detail");
    expect(root.getAttribute("data-festival-id")).toBe("litha");
    expect(root.getAttribute("data-tradition")).toBe("woty");
  });
});

// ─── MonthGrid ─────────────────────────────────────────────────────

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function buildJune2026Weeks(): MonthWeek[] {
  // June 2026 starts on a Monday (this is the design's fixture
  // example — Sun 31 May leads the first row).
  const weeks: MonthWeek[] = [];
  // Build 5 rows: cell 0 = 31 May (Sun), cells 1..30 = June 1..30,
  // cells 31..34 = July 1..4.
  for (let w = 0; w < 5; w++) {
    const days: MonthWeek["days"] = [];
    for (let col = 0; col < 7; col++) {
      const ci = w * 7 + col;
      const inMonth = ci >= 1 && ci <= 30;
      const dom = ci === 0 ? 31 : ci <= 30 ? ci : ci - 30;
      days.push({
        dom,
        inMonth,
        outOfMonthTag: ci === 0 ? "May" : ci === 31 ? "Jul" : undefined,
        isToday: ci === 21,
        festivals: ci === 21 ? [litha] : undefined,
        astro:
          ci === 21
            ? [{ id: "a21", glyph: "☀", label: "Summer solstice" }]
            : undefined,
      });
    }
    // Vestalia bar (7–15 June) crosses weeks 1 + 2.
    const bars: MonthWeek["bars"] = [];
    if (w === 1) {
      bars.push({
        festival: vestalia,
        startCol: 0, // cell 7 = column 0 of week 1
        span: 7,
        isStart: true,
        isEnd: false,
      });
    }
    if (w === 2) {
      bars.push({
        festival: vestalia,
        startCol: 0,
        span: 2, // cells 14..15
        isStart: false,
        isEnd: true,
      });
    }
    weeks.push({ days, bars });
  }
  return weeks;
}

describe("MonthGrid", () => {
  it("renders 7 weekday header cells", () => {
    const { container } = render(
      <MonthGrid weekdayNames={WEEKDAYS} weeks={buildJune2026Weeks()} />,
    );
    expect(container.querySelectorAll("[data-month-week]")).toHaveLength(5);
  });

  it("renders 5 weeks × 7 days = 35 cells", () => {
    const { container } = render(
      <MonthGrid weekdayNames={WEEKDAYS} weeks={buildJune2026Weeks()} />,
    );
    expect(container.querySelectorAll("[data-month-day]")).toHaveLength(35);
  });

  it("marks today with data-is-today=true", () => {
    const { container } = render(
      <MonthGrid weekdayNames={WEEKDAYS} weeks={buildJune2026Weeks()} />,
    );
    const today = container.querySelectorAll('[data-is-today="true"]');
    expect(today).toHaveLength(1);
    expect(today[0]?.getAttribute("data-month-day")).toBe("21");
  });

  it("renders the out-of-month tag on padding cells", () => {
    render(<MonthGrid weekdayNames={WEEKDAYS} weeks={buildJune2026Weeks()} />);
    expect(screen.getByText("May")).toBeInTheDocument();
    expect(screen.getByText("Jul")).toBeInTheDocument();
  });

  it("renders single-day festival chips with the festival name", () => {
    const { container } = render(
      <MonthGrid weekdayNames={WEEKDAYS} weeks={buildJune2026Weeks()} />,
    );
    expect(container.querySelector("[data-festival-id='litha']")).toBeInTheDocument();
  });

  it("renders multi-day festival bars in the bar lane", () => {
    const { container } = render(
      <MonthGrid weekdayNames={WEEKDAYS} weeks={buildJune2026Weeks()} />,
    );
    const bars = container.querySelectorAll("[data-bar-id]");
    expect(bars).toHaveLength(2); // one per week the bar crosses
    expect(bars[0]?.getAttribute("data-bar-start")).toBe("true");
    expect(bars[0]?.getAttribute("data-bar-end")).toBe("false");
    expect(bars[1]?.getAttribute("data-bar-start")).toBe("false");
    expect(bars[1]?.getAttribute("data-bar-end")).toBe("true");
  });

  it("reserves a bar lane height on weeks that carry bars", () => {
    const { container } = render(
      <MonthGrid weekdayNames={WEEKDAYS} weeks={buildJune2026Weeks()} />,
    );
    const weeks = container.querySelectorAll("[data-month-week]");
    // Week 0 (no bars) → lane height 0; week 1 (vestalia start) → 24px.
    const week0Lanes = weeks[0]!.querySelectorAll("[data-bar-lane]");
    const week1Lanes = weeks[1]!.querySelectorAll("[data-bar-lane]");
    expect((week0Lanes[0] as HTMLElement).style.height).toBe("0px");
    expect((week1Lanes[0] as HTMLElement).style.height).toBe("24px");
  });

  it("calls onSelectFestival when a festival chip is clicked", () => {
    const onSelectFestival = vi.fn();
    const { container } = render(
      <MonthGrid
        weekdayNames={WEEKDAYS}
        weeks={buildJune2026Weeks()}
        onSelectFestival={onSelectFestival}
      />,
    );
    fireEvent.click(container.querySelector("[data-festival-id='litha']")!);
    expect(onSelectFestival).toHaveBeenCalledWith(litha);
  });

  it("calls onSelectFestival when a multi-day bar is clicked", () => {
    const onSelectFestival = vi.fn();
    const { container } = render(
      <MonthGrid
        weekdayNames={WEEKDAYS}
        weeks={buildJune2026Weeks()}
        onSelectFestival={onSelectFestival}
      />,
    );
    fireEvent.click(container.querySelector("[data-bar-id='vestalia']")!);
    expect(onSelectFestival).toHaveBeenCalledWith(vestalia);
  });

  it("calls onSelectAstro when an astro button is clicked", () => {
    const onSelectAstro = vi.fn();
    const { container } = render(
      <MonthGrid
        weekdayNames={WEEKDAYS}
        weeks={buildJune2026Weeks()}
        onSelectAstro={onSelectAstro}
      />,
    );
    fireEvent.click(container.querySelector("[data-astro-id='a21']")!);
    expect(onSelectAstro).toHaveBeenCalledWith({
      id: "a21",
      glyph: "☀",
      label: "Summer solstice",
    });
  });

  it("attaches the structural data-component attribute", () => {
    const { container } = render(
      <MonthGrid weekdayNames={WEEKDAYS} weeks={buildJune2026Weeks()} />,
    );
    expect(container.firstElementChild?.getAttribute("data-component")).toBe(
      "month-grid",
    );
  });
});
