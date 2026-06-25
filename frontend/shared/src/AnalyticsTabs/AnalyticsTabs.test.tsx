/**
 * AnalyticsTabs unit tests (H06 §S6 — Phase 09 cluster nav).
 */

import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import {
  ANALYTICS_DEFAULT_HREF_FOR,
  ANALYTICS_TABS,
  AnalyticsTabs,
} from "./AnalyticsTabs.js";

describe("AnalyticsTabs", () => {
  it("renders the three H06 tabs in the locked order", () => {
    const { container } = render(<AnalyticsTabs />);
    const links = container.querySelectorAll("a");
    expect(links).toHaveLength(3);
    expect(Array.from(links).map((a) => a.textContent?.trim())).toEqual([
      "Dashboard",
      "Query Builder",
      "Saved Studies",
    ]);
  });

  it("active tab carries aria-current=page", () => {
    const { container } = render(<AnalyticsTabs active="query" />);
    const current = container.querySelector("[aria-current='page']");
    expect(current?.textContent).toContain("Query Builder");
  });

  it("default href map matches the three locked routes", () => {
    expect(ANALYTICS_DEFAULT_HREF_FOR).toEqual({
      dashboard: "/analytics",
      query: "/analytics/query",
      studies: "/analytics/studies",
    });
  });

  it("renders without --danger anywhere — H06 forbids red in charts", () => {
    const { container } = render(<AnalyticsTabs active="dashboard" />);
    expect(container.innerHTML).not.toContain("--danger");
  });

  it("tab definitions use --chart-1..3 hue tokens", () => {
    const tokens = ANALYTICS_TABS.map((t) => t.iconToken);
    expect(tokens).toEqual(["--chart-1", "--chart-2", "--chart-3"]);
  });
});
