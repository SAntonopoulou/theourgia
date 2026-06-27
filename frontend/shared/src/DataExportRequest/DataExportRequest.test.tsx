/**
 * DataExportRequest — H10 Cluster B2 surface tests.
 */

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";

import { DataExportRequestSurface } from "./DataExportRequestSurface.js";

const EMAIL = "aspasia@hearth.sophia.example";

describe("DataExportRequestSurface", () => {
  test("renders the preamble, every included row, every not-included row", () => {
    render(<DataExportRequestSurface email={EMAIL} />);
    expect(screen.getByText(/complete copy of everything/i)).toBeInTheDocument();
    expect(
      screen.getByText(/Sealed content as ciphertext only/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Sealed content in plaintext/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Federated content originated by other vaults/i),
    ).toBeInTheDocument();
  });

  test("renders the email in monospace in the delivery line", () => {
    render(<DataExportRequestSurface email={EMAIL} />);
    const emails = screen.getAllByText(EMAIL);
    expect(emails.length).toBeGreaterThan(0);
  });

  test("default format is 'both' — third option pressed", () => {
    render(<DataExportRequestSurface email={EMAIL} />);
    const both = screen.getByRole("radio", {
      name: /Both — two separate downloads/i,
    });
    expect(both).toHaveAttribute("aria-checked", "true");
  });

  test("clicking JSON option flips the selection", () => {
    render(<DataExportRequestSurface email={EMAIL} />);
    const json = screen.getByRole("radio", { name: /JSON archive/i });
    fireEvent.click(json);
    expect(json).toHaveAttribute("aria-checked", "true");
  });

  test("submit fires onSubmit with the current format", () => {
    const onSubmit = vi.fn();
    render(
      <DataExportRequestSurface email={EMAIL} onSubmit={onSubmit} />,
    );
    fireEvent.click(screen.getByText(/Request export/i));
    expect(onSubmit).toHaveBeenCalledWith("both");
  });

  test("requested state flips the label + disables the button", () => {
    render(
      <DataExportRequestSurface email={EMAIL} requested />,
    );
    const btn = screen.getByRole("button", { name: /Request received/i });
    expect(btn).toBeDisabled();
  });

  test("requested state renders the confirmation banner with email", () => {
    render(
      <DataExportRequestSurface email={EMAIL} requested />,
    );
    const banner = screen.getByRole("status");
    expect(banner).toHaveTextContent(/Request received/i);
    expect(banner).toHaveTextContent(EMAIL);
    expect(banner).toHaveTextContent(/within 24 hours/i);
    expect(banner).toHaveTextContent(/expire 7 days/i);
  });

  test("rule 45 — no spinner / no progress affordance present", () => {
    render(<DataExportRequestSurface email={EMAIL} busy />);
    expect(screen.queryByRole("progressbar")).toBeNull();
    expect(
      screen.queryByText(/Generating/i),
    ).toBeNull();
  });

  test("caution line renders verbatim", () => {
    render(<DataExportRequestSurface email={EMAIL} />);
    expect(
      screen.getByText(/Once submitted, the export cannot be cancelled/i),
    ).toBeInTheDocument();
  });
});
