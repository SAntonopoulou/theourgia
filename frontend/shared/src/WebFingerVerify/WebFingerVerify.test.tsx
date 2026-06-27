/**
 * WebFingerVerifySurface — unit tests.
 *
 * Defining honesty rules:
 *
 *   * Failure subtitle is verbatim no-blame copy.
 *   * Failure card uses --warn chrome (NEVER --danger).
 *   * Pass card shows actor URL + key fingerprint in --font-mono.
 *   * Run button disabled when handle is empty.
 *   * onRunCheck fires with the handle.
 */

import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import {
  WebFingerVerifySurface,
  type WfvResult,
} from "./WebFingerVerifySurface.js";
import {
  WFV_FAIL_SUBTITLE,
  WFV_FAIL_TITLE,
  WFV_IDLE_BODY,
  WFV_PASS_SUBTITLE,
  WFV_PASS_TITLE,
  WFV_RUN_CTA,
  WFV_TITLE,
} from "./copy.js";

const PASS_RESULT: WfvResult = {
  outcome: "pass",
  actorUrl: "https://hearth.sophia.example/users/aspasia",
  keyFingerprint:
    "SHA256:7a3f 9c21 04bb e8d5 · 2f6a 90c3 11de 4b7f",
};
const FAIL_RESULT: WfvResult = {
  outcome: "fail",
  instance: "instance.tld",
};

// ─── Chrome ────────────────────────────────────────────────────

describe("WebFingerVerifySurface — chrome", () => {
  it("renders the title + subtitle", () => {
    render(<WebFingerVerifySurface onRunCheck={() => PASS_RESULT} />);
    expect(screen.getByText(WFV_TITLE)).toBeInTheDocument();
    expect(
      document.querySelector("[data-field='handle-input']"),
    ).not.toBeNull();
  });

  it("idle state shows the verbatim idle body", () => {
    render(<WebFingerVerifySurface onRunCheck={() => PASS_RESULT} />);
    expect(screen.getByText(WFV_IDLE_BODY)).toBeInTheDocument();
  });
});

// ─── Run-check gating ────────────────────────────────────────────

describe("WebFingerVerifySurface — run check gating", () => {
  it("Run check disabled when handle empty", () => {
    render(<WebFingerVerifySurface onRunCheck={() => PASS_RESULT} />);
    const run = document.querySelector(
      "[data-action='run-check']",
    ) as HTMLButtonElement;
    expect(run.disabled).toBe(true);
  });

  it("Run check enabled once handle is entered", () => {
    render(
      <WebFingerVerifySurface
        onRunCheck={() => PASS_RESULT}
        initialHandle="@x@y.example"
      />,
    );
    const run = document.querySelector(
      "[data-action='run-check']",
    ) as HTMLButtonElement;
    expect(run.disabled).toBe(false);
  });

  it("onRunCheck fires with the current handle", async () => {
    const onRunCheck = vi.fn().mockResolvedValue(PASS_RESULT);
    render(
      <WebFingerVerifySurface
        onRunCheck={onRunCheck}
        initialHandle="@aspasia@hearth.sophia.example"
      />,
    );
    fireEvent.click(screen.getByText(WFV_RUN_CTA));
    await waitFor(() =>
      expect(onRunCheck).toHaveBeenCalledWith(
        "@aspasia@hearth.sophia.example",
      ),
    );
  });
});

// ─── Pass state ─────────────────────────────────────────────────

describe("WebFingerVerifySurface — pass state", () => {
  it("renders pass card with actor URL + key fingerprint", async () => {
    render(
      <WebFingerVerifySurface
        onRunCheck={() => Promise.resolve(PASS_RESULT)}
        initialHandle="@x@y.example"
      />,
    );
    fireEvent.click(screen.getByText(WFV_RUN_CTA));
    await waitFor(() => {
      expect(
        document.querySelector("[data-field='result-pass']"),
      ).not.toBeNull();
    });
    expect(screen.getByText(WFV_PASS_TITLE)).toBeInTheDocument();
    expect(screen.getByText(WFV_PASS_SUBTITLE)).toBeInTheDocument();
    expect(
      document.querySelector("[data-field='pass-actor']")?.textContent,
    ).toBe(PASS_RESULT.actorUrl);
    expect(
      document
        .querySelector("[data-field='pass-fingerprint']")
        ?.textContent?.trim(),
    ).toBe(PASS_RESULT.keyFingerprint);
  });

  it("pass card uses --peer-ok chrome (NEVER --danger)", async () => {
    render(
      <WebFingerVerifySurface
        onRunCheck={() => Promise.resolve(PASS_RESULT)}
        initialHandle="@x@y.example"
      />,
    );
    fireEvent.click(screen.getByText(WFV_RUN_CTA));
    await waitFor(() => {
      const card = document.querySelector(
        "[data-field='result-pass']",
      ) as HTMLElement;
      expect(card.style.borderColor).toContain("--peer-ok");
      expect(card.style.background).toContain("--peer-ok");
      expect(card.style.background).not.toContain("--danger");
    });
  });
});

// ─── Fail state ─────────────────────────────────────────────────

describe("WebFingerVerifySurface — fail state", () => {
  it("renders fail subtitle verbatim (no-blame)", async () => {
    render(
      <WebFingerVerifySurface
        onRunCheck={() => Promise.resolve(FAIL_RESULT)}
        initialHandle="@x@y.example"
      />,
    );
    fireEvent.click(screen.getByText(WFV_RUN_CTA));
    await waitFor(() => {
      expect(
        document.querySelector("[data-field='fail-subtitle']")
          ?.textContent,
      ).toBe(WFV_FAIL_SUBTITLE);
    });
  });

  it("fail card uses --warn-soft chrome (NEVER --danger)", async () => {
    render(
      <WebFingerVerifySurface
        onRunCheck={() => Promise.resolve(FAIL_RESULT)}
        initialHandle="@x@y.example"
      />,
    );
    fireEvent.click(screen.getByText(WFV_RUN_CTA));
    await waitFor(() => {
      const card = document.querySelector(
        "[data-field='result-fail']",
      ) as HTMLElement;
      expect(card.style.background).toContain("--warn-soft");
      expect(card.style.borderColor).toContain("--warn-border");
      expect(card.style.background).not.toContain("--danger");
      expect(card.style.borderColor).not.toContain("--danger");
    });
  });

  it("fail card shows the 3 resolution steps as a list", async () => {
    render(
      <WebFingerVerifySurface
        onRunCheck={() => Promise.resolve(FAIL_RESULT)}
        initialHandle="@x@y.example"
      />,
    );
    fireEvent.click(screen.getByText(WFV_RUN_CTA));
    await waitFor(() => {
      const list = document.querySelector(
        "[data-field='fail-resolution-list']",
      ) as HTMLElement;
      expect(list.querySelectorAll("li")).toHaveLength(3);
    });
  });

  it("fail title verbatim", async () => {
    render(
      <WebFingerVerifySurface
        onRunCheck={() => Promise.resolve(FAIL_RESULT)}
        initialHandle="@x@y.example"
      />,
    );
    fireEvent.click(screen.getByText(WFV_RUN_CTA));
    await waitFor(() => {
      expect(screen.getByText(WFV_FAIL_TITLE)).toBeInTheDocument();
    });
  });
});
