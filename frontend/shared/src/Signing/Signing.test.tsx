import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import {
  CanonicalBytes,
  PublicKeyShort,
  RevokeDialog,
  ROLE_META,
  SignDialog,
  SignatureRoster,
  type SignatureRow,
  shortenPublicKey,
  formatCanonicalJson,
  VERIFY_META,
} from "./index.js";

// ───── PublicKeyShort ────────────────────────────────────────────────

describe("PublicKeyShort", () => {
  const KEY = "9F2A7C4E1B8D3056A1F29C7B4E8D2A19";

  it("renders 4 + 4 hex with the middle elided", () => {
    render(<PublicKeyShort keyHex={KEY} />);
    expect(screen.getByText("9F2A…2A19")).toBeInTheDocument();
  });

  it("full key in title attribute for hover preview", () => {
    render(<PublicKeyShort keyHex={KEY} />);
    const span = screen.getByText("9F2A…2A19");
    expect(span.getAttribute("title")).toBe(KEY);
  });

  it("aria-label exposes the full key for screen readers", () => {
    render(<PublicKeyShort keyHex={KEY} />);
    const span = screen.getByText("9F2A…2A19");
    expect(span.getAttribute("aria-label")).toBe(`Public key ${KEY}`);
  });

  it("data-full-key attribute carries the unshortened value", () => {
    render(<PublicKeyShort keyHex={KEY} />);
    const span = screen.getByText("9F2A…2A19");
    expect(span.dataset.fullKey).toBe(KEY);
  });

  it("uses mono font for hex readability", () => {
    render(<PublicKeyShort keyHex={KEY} />);
    const span = screen.getByText("9F2A…2A19") as HTMLElement;
    expect(span.style.fontFamily).toBe("var(--font-mono)");
  });

  it("custom prefix + suffix lengths honored", () => {
    render(<PublicKeyShort keyHex={KEY} prefix={6} suffix={2} />);
    expect(screen.getByText("9F2A7C…19")).toBeInTheDocument();
  });

  it("returns the full key when shorter than prefix + suffix + 1", () => {
    expect(shortenPublicKey("ABCD", 4, 4)).toBe("ABCD");
  });
});

// ───── CanonicalBytes ────────────────────────────────────────────────

describe("CanonicalBytes", () => {
  const claim = {
    subject: "persona:aspasia",
    kind: "initiation",
    tradition: "Lyceum",
    grade: "Minerval",
  };

  it("renders the canonical title by default", () => {
    render(<CanonicalBytes value={claim} />);
    expect(
      screen.getByText("What the signature commits to"),
    ).toBeInTheDocument();
  });

  it("shows formatted rows by default with humanised keys", () => {
    render(<CanonicalBytes value={{ granted_at: "2020-03-20", kind: "x" }} />);
    expect(screen.getByText("granted at")).toBeInTheDocument();
    expect(screen.getByText("kind")).toBeInTheDocument();
  });

  it("Show raw toggle flips to the JSON pre-format", async () => {
    render(<CanonicalBytes value={claim} />);
    const user = userEvent.setup();
    await user.click(screen.getByText("Show raw"));
    // Now the pre with JSON is rendered.
    const pre = document.querySelector("pre");
    expect(pre).not.toBeNull();
    expect(pre!.textContent).toContain("\"subject\":");
    expect(pre!.textContent).toContain("\"persona:aspasia\"");
  });

  it("toggle button label flips with state", async () => {
    render(<CanonicalBytes value={claim} />);
    const user = userEvent.setup();
    const toggle = screen.getByText("Show raw");
    await user.click(toggle);
    expect(screen.getByText("Show formatted")).toBeInTheDocument();
  });

  it("aria-pressed reflects raw/formatted state", async () => {
    render(<CanonicalBytes value={claim} />);
    const user = userEvent.setup();
    const toggle = screen.getByText("Show raw");
    expect(toggle.getAttribute("aria-pressed")).toBe("false");
    await user.click(toggle);
    expect(screen.getByText("Show formatted").getAttribute("aria-pressed"))
      .toBe("true");
  });

  it("starts in raw mode when defaultRaw=true", () => {
    render(<CanonicalBytes value={claim} defaultRaw />);
    expect(document.querySelector("pre")).not.toBeNull();
    expect(screen.getByText("Show formatted")).toBeInTheDocument();
  });

  it("sorts keys for deterministic raw output", () => {
    const json = formatCanonicalJson([
      ["zeta", 1],
      ["alpha", 2],
    ]);
    // The helper preserves the order we feed it; the component sorts
    // before calling it. Verify the component sorted alphabetically:
    render(<CanonicalBytes value={{ zeta: 1, alpha: 2 }} defaultRaw />);
    const pre = document.querySelector("pre")!;
    const idxAlpha = pre.textContent!.indexOf("\"alpha\"");
    const idxZeta = pre.textContent!.indexOf("\"zeta\"");
    expect(idxAlpha).toBeLessThan(idxZeta);
    expect(json).toContain("\"zeta\"");
  });

  it("drops undefined fields by default (canonical bytes never include them)", () => {
    render(
      <CanonicalBytes
        value={{ kept: "yes", dropped: undefined }}
        defaultRaw
      />,
    );
    const pre = document.querySelector("pre")!;
    expect(pre.textContent).toContain("kept");
    expect(pre.textContent).not.toContain("dropped");
  });

  it("dropUndefined=false keeps undefined fields (as JSON null/undefined)", () => {
    render(
      <CanonicalBytes
        value={{ kept: "yes", undef: undefined }}
        defaultRaw
        dropUndefined={false}
      />,
    );
    const pre = document.querySelector("pre")!;
    expect(pre.textContent).toContain("undef");
  });

  it("custom title override", () => {
    render(<CanonicalBytes value={claim} title="Bytes to sign" />);
    expect(screen.getByText("Bytes to sign")).toBeInTheDocument();
  });

  it("empty value object renders the empty JSON in raw mode", () => {
    render(<CanonicalBytes value={{}} defaultRaw />);
    expect(document.querySelector("pre")!.textContent).toBe("{}");
  });
});

// ───── SignatureRoster ───────────────────────────────────────────────

describe("SignatureRoster", () => {
  const sigs: SignatureRow[] = [
    {
      id: "s1",
      role: "self",
      signerLabel: "Soror Ευ. Α.",
      signerPublicKey: "9F2A7C4E1B8D3056A1F29C7B4E8D2A19",
      signedAt: "21 March 2020",
      verify: "ok",
    },
    {
      id: "s2",
      role: "counter-sign",
      signerLabel: "L. Vespera, Lodge Master",
      signerPublicKey: "4B8E2A19F7C3D0568D3056A1F29C7B4E",
      signedAt: "22 March 2020",
      verify: "ok",
    },
  ];

  it("renders one card per signature", () => {
    const { container } = render(<SignatureRoster signatures={sigs} />);
    expect(container.querySelectorAll("article")).toHaveLength(2);
  });

  it("verify pill shows label + color per status", () => {
    render(<SignatureRoster signatures={sigs} />);
    const pills = screen.getAllByText("Verified", { exact: false });
    expect(pills.length).toBeGreaterThanOrEqual(2);
    pills.forEach((pill) => {
      const span = pill.closest("span")!;
      expect(span.style.color).toBe("var(--verify)");
    });
  });

  it("does-not-verify pill uses --warn (amber, never red)", () => {
    render(
      <SignatureRoster
        signatures={[
          {
            ...sigs[0]!,
            verify: "fail",
          },
        ]}
      />,
    );
    const span = screen.getByText("Does not verify", { exact: false }).closest("span")!;
    expect(span.style.color).toBe("var(--warn)");
    expect(span.style.color).not.toContain("danger");
  });

  it("revocation role always renders the Revoked verify pill", () => {
    render(
      <SignatureRoster
        signatures={[
          {
            id: "r1",
            role: "revocation",
            signerLabel: "Soror Ευ. Α.",
            signerPublicKey: "9F2A7C4E1B8D3056A1F29C7B4E8D2A19",
            signedAt: "12 April 2026",
            verify: "ok", // underlying check is OK …
            reason: "Claim made in error.",
          },
        ]}
      />,
    );
    // … but the row presents as Revoked since the role IS the revocation.
    const card = document.querySelector("[data-role='revocation']") as HTMLElement;
    expect(card.dataset.verify).toBe("revoked");
    expect(screen.getByText("Revoked", { exact: false })).toBeInTheDocument();
  });

  it("revocation reason appears in a quoted block", () => {
    render(
      <SignatureRoster
        signatures={[
          {
            id: "r1",
            role: "revocation",
            signerLabel: "x",
            signerPublicKey: "0".repeat(32),
            signedAt: "today",
            verify: "ok",
            reason: "Claim made in error.",
          },
        ]}
      />,
    );
    expect(screen.getByText("Claim made in error.")).toBeInTheDocument();
  });

  it("verify pill renders a glyph alongside the label (color + glyph, not color alone)", () => {
    const { container } = render(<SignatureRoster signatures={sigs} />);
    const pill = container.querySelector(
      "[data-verify='ok']",
    ) as HTMLElement;
    expect(pill.querySelector("svg")).not.toBeNull();
  });

  it("role labels are correct + carry their canonical colour", () => {
    expect(ROLE_META.self.color).toBe("var(--accent)");
    expect(ROLE_META["counter-sign"].color).toBe("var(--verify)");
    expect(ROLE_META.revocation.color).toBe("var(--revoke)");
  });

  it("VERIFY_META carries soft backgrounds for the pill tints", () => {
    expect(VERIFY_META.ok.soft).toBe("var(--verify-soft)");
    expect(VERIFY_META.fail.soft).toBe("var(--warn-soft)");
    expect(VERIFY_META.revoked.soft).toBe("var(--revoke-soft)");
  });

  it("ul has aria-label='Signatures' for SR semantics", () => {
    const { container } = render(<SignatureRoster signatures={sigs} />);
    const ul = container.querySelector("ul")!;
    expect(ul.getAttribute("aria-label")).toBe("Signatures");
  });

  it("each signature card includes a PublicKeyShort", () => {
    render(<SignatureRoster signatures={sigs} />);
    expect(screen.getByText("9F2A…2A19")).toBeInTheDocument();
    expect(screen.getByText("4B8E…7B4E")).toBeInTheDocument();
  });
});

// ───── SignDialog ────────────────────────────────────────────────────

describe("SignDialog", () => {
  const claim = { subject: "persona:aspasia", kind: "initiation" };

  it("title + canonical bytes preview render by default", () => {
    render(
      <SignDialog
        open
        canonical={claim}
        onSign={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    expect(
      screen.getByRole("heading", { name: /Review & sign/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Canonical bytes"),
    ).toBeInTheDocument();
  });

  it("key-never-leaves reassurance copy is present", () => {
    render(
      <SignDialog
        open
        canonical={claim}
        onSign={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    expect(
      screen.getByText(/key never leaves it/i),
    ).toBeInTheDocument();
  });

  it("Sign & publish disabled until passphrase typed", async () => {
    render(
      <SignDialog
        open
        canonical={claim}
        onSign={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    const sign = screen.getByRole("button", { name: /Sign & publish/i });
    expect(sign).toBeDisabled();
    const user = userEvent.setup();
    await user.type(screen.getByLabelText(/Your passphrase/i), "secret");
    expect(sign).not.toBeDisabled();
  });

  it("Sign fires onSign with passphrase", async () => {
    const onSign = vi.fn();
    render(
      <SignDialog
        open
        canonical={claim}
        onSign={onSign}
        onCancel={vi.fn()}
      />,
    );
    const user = userEvent.setup();
    await user.type(screen.getByLabelText(/Your passphrase/i), "hekate");
    await user.click(screen.getByRole("button", { name: /Sign & publish/i }));
    expect(onSign).toHaveBeenCalledWith("hekate");
  });

  it("Enter in the input submits", async () => {
    const onSign = vi.fn();
    render(
      <SignDialog
        open
        canonical={claim}
        onSign={onSign}
        onCancel={vi.fn()}
      />,
    );
    const user = userEvent.setup();
    await user.type(
      screen.getByLabelText(/Your passphrase/i),
      "abc{Enter}",
    );
    expect(onSign).toHaveBeenCalled();
  });

  it("Cancel calls onCancel", async () => {
    const onCancel = vi.fn();
    render(
      <SignDialog
        open
        canonical={claim}
        onSign={vi.fn()}
        onCancel={onCancel}
      />,
    );
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /Cancel/i }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("ESC closes via Overlay", async () => {
    const onCancel = vi.fn();
    render(
      <SignDialog
        open
        canonical={claim}
        onSign={vi.fn()}
        onCancel={onCancel}
      />,
    );
    const user = userEvent.setup();
    await user.keyboard("{Escape}");
    await waitFor(() => expect(onCancel).toHaveBeenCalled());
  });

  it("renders inline error in --warn when errorMessage provided", () => {
    render(
      <SignDialog
        open
        canonical={claim}
        onSign={vi.fn()}
        onCancel={vi.fn()}
        errorMessage="Passphrase didn't unlock the signing key"
      />,
    );
    const alert = screen.getByRole("alert");
    expect(alert.style.color).toBe("var(--warn)");
    expect(alert.textContent).toContain("Passphrase didn't unlock");
  });

  it("resets passphrase on close → open cycle", async () => {
    const { rerender } = render(
      <SignDialog
        open
        canonical={claim}
        onSign={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    const user = userEvent.setup();
    const input = screen.getByLabelText(
      /Your passphrase/i,
    ) as HTMLInputElement;
    await user.type(input, "stuff");
    rerender(
      <SignDialog
        open={false}
        canonical={claim}
        onSign={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    rerender(
      <SignDialog
        open
        canonical={claim}
        onSign={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    expect(
      (screen.getByLabelText(/Your passphrase/i) as HTMLInputElement).value,
    ).toBe("");
  });

  it("custom title + signLabel honored", () => {
    render(
      <SignDialog
        open
        canonical={claim}
        onSign={vi.fn()}
        onCancel={vi.fn()}
        title="Sign locally"
        signLabel="Sign & confirm"
      />,
    );
    expect(
      screen.getByRole("heading", { name: /Sign locally/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Sign & confirm/i }),
    ).toBeInTheDocument();
  });
});

// ───── RevokeDialog ──────────────────────────────────────────────────

describe("RevokeDialog", () => {
  it("title + the canonical 'original signature stays in the record' copy", () => {
    render(
      <RevokeDialog
        open
        onRevoke={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    expect(
      screen.getByRole("heading", { name: /Publish a revocation/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/original signature stays in the record/i),
    ).toBeInTheDocument();
  });

  it("Sign-and-publish disabled until a reason is typed", async () => {
    render(
      <RevokeDialog
        open
        onRevoke={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    const sign = screen.getByRole("button", {
      name: /Sign & publish revocation/i,
    });
    expect(sign).toBeDisabled();
    const user = userEvent.setup();
    await user.type(
      screen.getByLabelText(/Reason \(becomes part of the signed bytes\)/i),
      "Claim made in error.",
    );
    expect(sign).not.toBeDisabled();
  });

  it("Sign fires onRevoke with trimmed reason", async () => {
    const onRevoke = vi.fn();
    render(
      <RevokeDialog
        open
        onRevoke={onRevoke}
        onCancel={vi.fn()}
      />,
    );
    const user = userEvent.setup();
    await user.type(
      screen.getByLabelText(/Reason/i),
      "  withdrawn  ",
    );
    await user.click(
      screen.getByRole("button", { name: /Sign & publish revocation/i }),
    );
    expect(onRevoke).toHaveBeenCalledWith("withdrawn");
  });

  it("whitespace-only reason keeps the action disabled", async () => {
    render(
      <RevokeDialog
        open
        onRevoke={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    const user = userEvent.setup();
    await user.type(screen.getByLabelText(/Reason/i), "   ");
    expect(
      screen.getByRole("button", { name: /Sign & publish revocation/i }),
    ).toBeDisabled();
  });

  it("uses role='alertdialog' (not 'dialog') for the destructive intent", () => {
    render(
      <RevokeDialog
        open
        onRevoke={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
  });

  it("revoke icon uses --revoke palette (slate, never red)", () => {
    render(
      <RevokeDialog
        open
        onRevoke={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    // The header icon container.
    const icon = screen
      .getByRole("alertdialog")
      .querySelector("span[aria-hidden='true']") as HTMLElement;
    expect(icon.style.color).toBe("var(--revoke)");
    expect(icon.style.background).toBe("var(--revoke-soft)");
  });

  it("ESC closes via Overlay", async () => {
    const onCancel = vi.fn();
    render(
      <RevokeDialog
        open
        onRevoke={vi.fn()}
        onCancel={onCancel}
      />,
    );
    const user = userEvent.setup();
    await user.keyboard("{Escape}");
    await waitFor(() => expect(onCancel).toHaveBeenCalled());
  });

  it("inline errorMessage renders in --warn", () => {
    render(
      <RevokeDialog
        open
        onRevoke={vi.fn()}
        onCancel={vi.fn()}
        errorMessage="Signing failed — try again"
      />,
    );
    const alert = screen.getByRole("alert");
    expect(alert.style.color).toBe("var(--warn)");
  });

  it("does NOT render when open=false", () => {
    render(
      <RevokeDialog
        open={false}
        onRevoke={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    expect(
      screen.queryByRole("heading", { name: /Publish a revocation/i }),
    ).toBeNull();
  });
});
