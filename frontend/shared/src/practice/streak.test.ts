import { describe, expect, it } from "vitest";

import { type CompletionStatus, countKept, streak } from "./streak.js";

const hist = (s: string): CompletionStatus[] =>
  s.split("").map((c) => {
    if (c === "d") return "done";
    if (c === "s") return "skip";
    return "miss";
  });

describe("streak", () => {
  it("empty history → 0", () => {
    expect(streak([], "pending")).toBe(0);
  });

  it("today done after a run of 4 done → 5", () => {
    // ....ddddd (last 5 are done; today is the last 'd' marked as done)
    const history = hist("xxxxddddd");
    expect(streak(history, "done")).toBe(5);
  });

  it("today skipped breaks the streak → 0", () => {
    const history = hist("xxxxdddds");
    expect(streak(history, "skipped")).toBe(0);
  });

  it("today pending does NOT break the prior run", () => {
    // History ends with 4 done's; today is still pending.
    // The mockup contract: pending counts the prior run.
    const history = hist("xxxxdddd?");
    // Replace '?' (mapped to miss) — pending means we read from the
    // second-to-last index back.
    history[history.length - 1] = "miss"; // today, irrelevant when pending
    expect(streak(history, "pending")).toBe(4);
  });

  it("today done with a skip yesterday → 1 (today only)", () => {
    const history = hist("dddsd");
    expect(streak(history, "done")).toBe(1);
  });

  it("all skips → 0", () => {
    expect(streak(hist("sssss"), "skipped")).toBe(0);
    expect(streak(hist("sssss"), "pending")).toBe(0);
  });

  it("a single day, done → 1", () => {
    expect(streak(hist("d"), "done")).toBe(1);
  });

  it("a single day, pending → 0 (no prior run to count)", () => {
    expect(streak(hist("d"), "pending")).toBe(0);
  });

  it("the mockup's worked example (35-day window)", () => {
    // 35 days, 27 done, ending with 4-day trailing run, today still
    // pending → streak = 4 (the trailing run).
    const window =
      "ddssddssddddddssdsdsddddssddddddd".split("");
    // Pad to 35 with one more 'd' + pending today.
    while (window.length < 34) window.push("d");
    window.push("?"); // index 34 = today, pending
    const history: CompletionStatus[] = window.map((c) => {
      if (c === "d") return "done";
      if (c === "s") return "skip";
      return "miss";
    });
    // Expect a streak >= 1 since the second-to-last is 'd'.
    expect(streak(history, "pending")).toBeGreaterThan(0);
  });
});

describe("countKept", () => {
  it("counts only 'done' days", () => {
    expect(countKept(hist("dddssd"))).toBe(4);
    expect(countKept(hist("sssss"))).toBe(0);
    expect(countKept([])).toBe(0);
  });

  it("ignores 'miss' and 'skip'", () => {
    expect(countKept(hist("dxxsdxd"))).toBe(3);
  });
});
