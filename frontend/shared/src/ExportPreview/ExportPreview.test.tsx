import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import {
  ExportPreview,
  type ExportPreviewRequest,
} from "./ExportPreview.js";

const entryRequest: ExportPreviewRequest = {
  kind: "entry-page",
  entry: {
    title: "On the noetic flower of the Chaldean Oracles",
    kindLabel: "Study note",
    kindColor: "#CDBE9E",
    stamp: "Sun ☉ in Gemini · waning gibbous · 26 Sivan 5786",
    paragraphs: [
      "The working opened at the appointed hour.",
      "What follows is set down while the impression is fresh.",
    ],
    citations: ["Majercik, R. (1989). The Chaldean Oracles, fr. 1."],
  },
};

const boundRequest: ExportPreviewRequest = {
  kind: "bound-cover",
  bound: {
    title: "Journal of the Year 2026",
    subtitle: "Anno MMXXVI",
    author: "Aspasia",
  },
};

const epubRequest: ExportPreviewRequest = {
  kind: "epub-cover",
  epub: { title: "Workings in Theurgy", author: "Aspasia" },
};

const sourceRequest: ExportPreviewRequest = {
  kind: "source",
  source: {
    language: "markdown",
    text: "# Title\n\n*stamp*\n\nBody.",
  },
};

describe("ExportPreview", () => {
  it("renders the entry page with title + stamp + paragraphs", () => {
    render(<ExportPreview request={entryRequest} />);
    expect(
      screen.getByText("On the noetic flower of the Chaldean Oracles"),
    ).toBeInTheDocument();
    expect(screen.getByText(/Sun ☉ in Gemini/)).toBeInTheDocument();
    expect(
      screen.getByText(/The working opened at the appointed hour/),
    ).toBeInTheDocument();
  });

  it("renders the kind label dot stripe with the kind color", () => {
    render(<ExportPreview request={entryRequest} />);
    expect(screen.getByText("Study note")).toBeInTheDocument();
  });

  it("renders the citation appendix when citations are present", () => {
    render(<ExportPreview request={entryRequest} />);
    expect(screen.getByText("Citations")).toBeInTheDocument();
    expect(screen.getByText(/Majercik/)).toBeInTheDocument();
  });

  it("hides the citation appendix when entry has no citations", () => {
    render(
      <ExportPreview
        request={{
          kind: "entry-page",
          entry: { ...entryRequest.entry, citations: [] },
        }}
      />,
    );
    expect(screen.queryByText("Citations")).toBeNull();
  });

  it("renders the bound cover with title + subtitle + author", () => {
    render(<ExportPreview request={boundRequest} />);
    expect(screen.getByText("Journal of the Year 2026")).toBeInTheDocument();
    expect(screen.getByText("Anno MMXXVI")).toBeInTheDocument();
    expect(screen.getByText("Aspasia")).toBeInTheDocument();
    expect(screen.getByText("The Magical Record")).toBeInTheDocument();
  });

  it("notes that sealed entries are omitted on the bound cover", () => {
    render(<ExportPreview request={boundRequest} />);
    expect(
      screen.getByText(/sealed entries omitted/i),
    ).toBeInTheDocument();
  });

  it("renders the EPUB cover with title + author + spine", () => {
    const { container } = render(<ExportPreview request={epubRequest} />);
    expect(screen.getByText("Workings in Theurgy")).toBeInTheDocument();
    expect(screen.getByText("Aspasia")).toBeInTheDocument();
    expect(screen.getByText("Theourgia")).toBeInTheDocument();
    const root = container.firstElementChild as HTMLElement;
    expect(root.getAttribute("data-kind")).toBe("epub-cover");
  });

  it("renders source mode as a <pre> with the raw text + language attribute", () => {
    const { container } = render(<ExportPreview request={sourceRequest} />);
    const pre = container.querySelector("pre");
    expect(pre).toBeInTheDocument();
    expect(pre?.getAttribute("data-language")).toBe("markdown");
    expect(pre?.textContent).toContain("# Title");
  });

  it("attaches the structural data-component + data-kind attributes", () => {
    const { container } = render(<ExportPreview request={entryRequest} />);
    const root = container.firstElementChild as HTMLElement;
    expect(root.getAttribute("data-component")).toBe("export-preview");
    expect(root.getAttribute("data-kind")).toBe("entry-page");
  });

  it("uses the parchment palette and never the --danger token", () => {
    const { container } = render(<ExportPreview request={boundRequest} />);
    expect(container.innerHTML).toContain("var(--paper");
    expect(container.innerHTML).not.toContain("--danger");
  });
});
