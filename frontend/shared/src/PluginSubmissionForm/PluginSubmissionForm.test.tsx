/**
 * PluginSubmissionForm — H10 Cluster A2 tests.
 */

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";

import { PluginSubmissionFormSurface } from "./PluginSubmissionFormSurface.js";
import { ACCEPTED_LICENSES } from "./copy.js";

const BASE = {
  manifestText: '[plugin]\nname = "geomancy-workbench"\nversion = "2.2.0"',
  manifestSizeBytes: 2150,
  pluginName: "Geomancy Workbench",
  pluginVersion: "2.2.0",
  authorDid: "did:theourgia:terra.example:agrippa-tools",
  licenseSpdx: "CC-BY-SA-4.0",
  sourceUrl: "https://github.com/x/y/releases/tag/v2.2.0",
  signatureBase64: "ed25519:abc=",
  signatureKeyFingerprint: "SHA256:7a3f 9c21 04bb e8d5",
  capabilities: [
    { label: "Read all your journal entries", wireKey: "read.entries" },
    {
      label: "Add a divination system",
      wireKey: "ui.divination.add-system",
    },
  ],
};

describe("PluginSubmissionFormSurface", () => {
  test("rule 42 — ACCEPTED_LICENSES matches the H10-locked set verbatim", () => {
    expect(ACCEPTED_LICENSES).toEqual([
      "AGPL-3.0-only",
      "AGPL-3.0-or-later",
      "GPL-3.0-or-later",
      "LGPL-3.0-or-later",
      "MPL-2.0",
      "MIT",
      "BSD-2-Clause",
      "BSD-3-Clause",
      "Apache-2.0",
      "CC-BY-SA-4.0",
      "Unlicense",
    ]);
  });

  test("renders the manifest preview text", () => {
    render(<PluginSubmissionFormSurface {...BASE} />);
    expect(screen.getByText(/name = "geomancy-workbench"/)).toBeInTheDocument();
  });

  test("identity fields render name + version + author DID + license", () => {
    render(<PluginSubmissionFormSurface {...BASE} />);
    expect(screen.getByText("Geomancy Workbench")).toBeInTheDocument();
    expect(screen.getByText("v2.2.0")).toBeInTheDocument();
    expect(
      screen.getByText(/did:theourgia:terra\.example:agrippa-tools/),
    ).toBeInTheDocument();
    // License appears in the identity dd AND in the accepted-list
    // chips — assert at least one.
    expect(screen.getAllByText("CC-BY-SA-4.0").length).toBeGreaterThan(0);
  });

  test("rule 42 — accepted license shows SPDX-validated chip", () => {
    render(<PluginSubmissionFormSurface {...BASE} />);
    expect(screen.getByText(/SPDX-validated/i)).toBeInTheDocument();
  });

  test("rule 42 — non-acceptable license disables Submit + surfaces accepted list", () => {
    render(
      <PluginSubmissionFormSurface
        {...BASE}
        licenseSpdx="Custom-Proprietary-License"
      />,
    );
    expect(
      screen.getByText(/License is not in the accepted set/i),
    ).toBeInTheDocument();
    // The accepted list renders as chips
    expect(screen.getByText("AGPL-3.0-only")).toBeInTheDocument();
    expect(screen.getByText("MIT")).toBeInTheDocument();
    // Submit is disabled
    expect(screen.getByText("Submit for review")).toBeDisabled();
  });

  test("source-kind radio selection toggles aria-checked", () => {
    render(<PluginSubmissionFormSurface {...BASE} />);
    const pypi = screen.getByRole("radio", {
      name: /PyPI package/i,
    });
    expect(pypi).toHaveAttribute("aria-checked", "false");
    fireEvent.click(pypi);
    expect(pypi).toHaveAttribute("aria-checked", "true");
  });

  test("Submit fires onSubmit with the current source kind + url + signature", () => {
    const onSubmit = vi.fn();
    render(
      <PluginSubmissionFormSurface {...BASE} onSubmit={onSubmit} />,
    );
    fireEvent.click(
      screen.getByRole("button", { name: /Submit for review/i }),
    );
    expect(onSubmit).toHaveBeenCalledWith({
      sourceKind: "github",
      sourceUrl: BASE.sourceUrl,
      signature: BASE.signatureBase64,
    });
  });

  test("Replace fires onReplaceManifest callback", () => {
    const onReplaceManifest = vi.fn();
    render(
      <PluginSubmissionFormSurface
        {...BASE}
        onReplaceManifest={onReplaceManifest}
      />,
    );
    fireEvent.click(screen.getByText("Replace"));
    expect(onReplaceManifest).toHaveBeenCalledTimes(1);
  });

  test("renders capability chips with wire key + label", () => {
    render(<PluginSubmissionFormSurface {...BASE} />);
    expect(
      screen.getByText("Read all your journal entries"),
    ).toBeInTheDocument();
    expect(screen.getByText("read.entries")).toBeInTheDocument();
    expect(screen.getByText("ui.divination.add-system")).toBeInTheDocument();
  });

  test("signature fingerprint line renders verbatim prefix", () => {
    render(<PluginSubmissionFormSurface {...BASE} />);
    expect(
      screen.getByText(/Verified against the key in your DID document/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText("SHA256:7a3f 9c21 04bb e8d5"),
    ).toBeInTheDocument();
  });
});
