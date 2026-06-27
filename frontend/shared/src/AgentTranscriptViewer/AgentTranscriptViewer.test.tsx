/**
 * AgentTranscriptViewer — H10 Cluster C8 tests.
 */

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";

import { AgentTranscriptViewerSurface } from "./AgentTranscriptViewerSurface.js";
import type { TranscriptRow } from "./AgentTranscriptViewerSurface.js";

const ROWS: TranscriptRow[] = [
  {
    id: "r1",
    speaker: "magician",
    body: "Find resonances between my last 5 Hekate readings.",
    meta: { tokens: "18", model: "—", timestamp: "11:40", mcpCalls: "no calls" },
  },
  {
    id: "r2",
    speaker: "agent",
    speakerLabel: "Divination companion",
    body: "I read your five most recent readings and surface two threads that recur.",
    meta: {
      tokens: "3,180",
      model: "claude · sonnet",
      timestamp: "11:41",
      mcpCalls: "4 MCP calls",
    },
  },
];

describe("AgentTranscriptViewerSurface", () => {
  test("renders both speaker labels (magician + agent override)", () => {
    render(<AgentTranscriptViewerSurface rows={ROWS} />);
    expect(screen.getByText("You")).toBeInTheDocument();
    expect(screen.getByText("Divination companion")).toBeInTheDocument();
  });

  test("renders the verbatim body of each row", () => {
    render(<AgentTranscriptViewerSurface rows={ROWS} />);
    expect(
      screen.getByText(/Find resonances between my last 5 Hekate readings/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/I read your five most recent readings/),
    ).toBeInTheDocument();
  });

  test("meta strip is hidden by default + reveals on detail toggle", () => {
    render(<AgentTranscriptViewerSurface rows={ROWS} />);
    expect(screen.queryByText("3,180 tokens")).toBeNull();
    const detailButtons = screen.getAllByText("detail");
    fireEvent.click(detailButtons[1]!);
    expect(screen.getByText("3,180 tokens")).toBeInTheDocument();
    expect(screen.getByText("claude · sonnet")).toBeInTheDocument();
    expect(screen.getByText("4 MCP calls")).toBeInTheDocument();
  });

  test("immutable-footer copy renders verbatim", () => {
    render(<AgentTranscriptViewerSurface rows={ROWS} />);
    expect(
      screen.getByText("End of transcript · this record is immutable."),
    ).toBeInTheDocument();
  });

  test("agent rows render in --bg-2 chrome, magician in transparent", () => {
    const { container } = render(<AgentTranscriptViewerSurface rows={ROWS} />);
    const agentRow = container.querySelector('[data-speaker="agent"]');
    const magicianRow = container.querySelector('[data-speaker="magician"]');
    const agentStyle = agentRow?.getAttribute("style") ?? "";
    const magicianStyle = magicianRow?.getAttribute("style") ?? "";
    expect(agentStyle).toContain("var(--bg-2)");
    expect(magicianStyle).toContain("transparent");
  });

  test("rows without meta render no detail toggle", () => {
    render(
      <AgentTranscriptViewerSurface
        rows={[{ id: "x", speaker: "magician", body: "no-meta row" }]}
      />,
    );
    expect(screen.queryByText("detail")).toBeNull();
  });
});
