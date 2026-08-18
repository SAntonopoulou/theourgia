/**
 * The record page — the phone's ledger read whole, and read only.
 *
 * What these check is fidelity: entries arrive as documents and are shown
 * as they are — the Greek unmangled, the mood in the phone's own words,
 * tombstones honoured — and an empty record explains how it fills rather
 * than sitting blank.
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, render, screen } from "@testing-library/react";
import {
  ActingAsProvider,
  AuthProvider,
  I18nProvider,
  ToastProvider,
  TopbarProvider,
} from "@theourgia/shared";
import { Suspense } from "react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ apiGet: vi.fn(), apiPut: vi.fn() }));

vi.mock("../../lib/api.js", () => ({
  apiGet: mocks.apiGet,
  apiPost: vi.fn(),
  apiPut: mocks.apiPut,
  ApiError: class extends Error {},
}));

import { RecordRoute, detailsOf, namesFrom, titleOf } from "../RecordRoute.js";

function renderRoute() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <I18nProvider>
        <AuthProvider api={{ getSession: async () => null } as never}>
          <ActingAsProvider>
            <ToastProvider />
            <MemoryRouter>
              <TopbarProvider>
                <Suspense fallback={<div>loading</div>}>
                  <Routes>
                    <Route path="/" element={<RecordRoute />} />
                  </Routes>
                </Suspense>
              </TopbarProvider>
            </MemoryRouter>
          </ActingAsProvider>
        </AuthProvider>
      </I18nProvider>
    </QueryClientProvider>,
  );
}

async function flush(): Promise<void> {
  await act(async () => {
    await Promise.resolve();
  });
}

function entry(overrides: Record<string, unknown> = {}) {
  return {
    id: "row-1",
    kind: "observance",
    doc: {
      subjectKey: "moonrise",
      observedAt: "2026-08-17T06:12:00Z",
      note: "Χαῖρε Σελήνη",
      mood: 4,
      bodyFeeling: 2,
      context: { moonSignIndex: 7, planetaryHourRuler: "moon", sect: null },
    },
    updated_at_utc: "2026-08-17T06:12:01Z",
    deleted_at_utc: null,
    seq: 1,
    ...overrides,
  };
}

afterEach(() => {
  cleanup();
  mocks.apiGet.mockReset();
  mocks.apiPut.mockReset();
});

describe("titleOf", () => {
  it("names stations by their own key and the rest by their kind", () => {
    expect(titleOf("moonrise")).toBe("Moonrise");
    expect(titleOf("schedule:abc")).toBe("A scheduled keeping");
    expect(titleOf("ritual:r1")).toBe("A rite");
    expect(titleOf(undefined)).toBe("A keeping");
  });
});

describe("namesFrom", () => {
  it("names a working's item by its title, its rite, or its working", () => {
    const names = namesFrom([
      {
        id: "w1",
        kind: "working",
        doc: { row: { name: "The Abramelin" } },
        updated_at_utc: "2026-08-17T06:00:00Z",
        deleted_at_utc: null,
        seq: 1,
      },
      {
        id: "r1",
        kind: "ritual",
        doc: { row: { name: "The Bornless" } },
        updated_at_utc: "2026-08-17T06:00:00Z",
        deleted_at_utc: null,
        seq: 2,
      },
      {
        id: "i1",
        kind: "working-item",
        doc: { row: { title: "Morning orison", workingId: "w1" } },
        updated_at_utc: "2026-08-17T06:00:00Z",
        deleted_at_utc: null,
        seq: 3,
      },
      {
        id: "i2",
        kind: "working-item",
        doc: { row: { title: "", ritualId: "r1", workingId: "w1" } },
        updated_at_utc: "2026-08-17T06:00:00Z",
        deleted_at_utc: null,
        seq: 4,
      },
      {
        id: "i3",
        kind: "working-item",
        doc: { row: { title: "", workingId: "w1" } },
        updated_at_utc: "2026-08-17T06:00:00Z",
        deleted_at_utc: null,
        seq: 5,
      },
    ] as never);
    expect(names.get("working-item:i1")).toBe("Morning orison");
    expect(names.get("working-item:i2")).toBe("The Bornless");
    expect(names.get("working-item:i3")).toBe("The Abramelin");
    expect(titleOf("working-item:i2", names)).toBe("The Bornless");
  });

  it("resolves an arrangement through to its subject's name", () => {
    const names = namesFrom([
      {
        id: "r1",
        kind: "ritual",
        doc: { row: { name: "The Star Ruby" } },
        updated_at_utc: "2026-08-17T06:00:00Z",
        deleted_at_utc: null,
        seq: 1,
      },
      {
        id: "s1",
        kind: "schedule",
        doc: { row: { title: "", subjectKind: "ritual", subjectId: "r1" } },
        updated_at_utc: "2026-08-17T06:00:00Z",
        deleted_at_utc: null,
        seq: 2,
      },
    ] as never);
    expect(names.get("ritual:r1")).toBe("The Star Ruby");
    expect(names.get("schedule:s1")).toBe("The Star Ruby");
    expect(titleOf("schedule:s1", names)).toBe("The Star Ruby");
    expect(titleOf("schedule:s1#2", names)).toBe("The Star Ruby");
  });
});

describe("detailsOf", () => {
  it("opens a keeping to the whole of its sky", () => {
    const opened = detailsOf({
      id: "k1",
      kind: "observance",
      doc: {
        subjectKey: "moonrise",
        occurrenceAt: "2026-08-17T06:03:00Z",
        observedAt: "2026-08-17T06:12:00Z",
        durationSeconds: 125,
        context: {
          moonSignIndex: 7,
          moonDegreeInSign: 13.85,
          sunSignIndex: 4,
          planetaryHourRuler: "moon",
          dayRuler: "sun",
          sect: "nocturnal",
          moonVoidOfCourse: true,
          locationLabel: "Brussels",
        },
      },
      updated_at_utc: "2026-08-17T06:12:01Z",
      deleted_at_utc: null,
      seq: 1,
    } as never);
    const byLabel = new Map(opened);
    const moons = opened.filter(([label]) => label === "Moon").map(([, v]) => v);
    expect(moons[0]).toContain("Scorpio");
    expect(moons[0]).toContain("13.8°");
    expect(byLabel.get("Sun")).toBe("Leo");
    expect(byLabel.get("Sect")).toBe("nocturnal");
    expect(byLabel.get("Where")).toBe("Brussels");
    expect(byLabel.get("Lasted")).toBe("2 min 5 s");
    expect(byLabel.get("Kept at")).toBeTruthy();
    // Two Moon lines: the sign, and void of course — both facts stand.
    expect(opened.filter(([label]) => label === "Moon")).toHaveLength(2);
  });

  it("opens a reckoning to its conventions, loud about the unread", () => {
    const opened = detailsOf({
      id: "r1",
      kind: "reckoning",
      doc: {
        row: {
          wrote: "ΑΓΑΠΗ",
          total: 93,
          systemId: "greek",
          methodId: "standard",
          letterTable: "default",
          normalising: "iota-adscript",
          unread: "𐤀",
          keptAt: "2026-08-16T10:00:00Z",
        },
      },
      updated_at_utc: "2026-08-16T10:00:01Z",
      deleted_at_utc: null,
      seq: 2,
    } as never);
    const byLabel = new Map(opened);
    expect(byLabel.get("Counted under")).toBe("default / iota-adscript");
    expect(byLabel.get("⚠ Unread")).toContain("𐤀");
  });

  it("has nothing to open on a bare day entry, and says so", () => {
    expect(
      detailsOf({
        id: "d1",
        kind: "day-entry",
        doc: { kind: "note", at: "2026-08-17T05:00:00Z", body: "x" },
        updated_at_utc: "2026-08-17T05:01:00Z",
        deleted_at_utc: null,
        seq: 3,
      } as never),
    ).toHaveLength(0);
  });
});

describe("RecordRoute", () => {
  it("names a keeping by its synced subject, and keeps definitions off the days", async () => {
    mocks.apiGet.mockResolvedValue({
      entries: [
        entry({
          id: "kept-1",
          doc: {
            subjectKey: "schedule:s1",
            observedAt: "2026-08-17T06:12:00Z",
          },
        }),
        {
          id: "r1",
          kind: "ritual",
          doc: { row: { name: "The Star Ruby" } },
          updated_at_utc: "2026-08-17T06:00:00Z",
          deleted_at_utc: null,
          seq: 2,
        },
        {
          id: "s1",
          kind: "schedule",
          doc: { row: { title: "", subjectKind: "ritual", subjectId: "r1" } },
          updated_at_utc: "2026-08-17T06:00:00Z",
          deleted_at_utc: null,
          seq: 3,
        },
      ],
      next_since: 3,
      more: false,
    });
    renderRoute();
    await flush();
    await flush();

    expect(screen.getByText("The Star Ruby")).toBeTruthy();
    // The rite's DEFINITION lends its name and is not itself a day's event.
    expect(screen.getAllByText("The Star Ruby").length).toBe(1);
  });

  it("a dream shows as a dream, with its words", async () => {
    mocks.apiGet.mockResolvedValue({
      entries: [
        {
          id: "d1",
          kind: "day-entry",
          doc: {
            kind: "dream",
            at: "2026-08-17T05:00:00Z",
            body: "The crossroads again.",
          },
          updated_at_utc: "2026-08-17T05:01:00Z",
          deleted_at_utc: null,
          seq: 4,
        },
      ],
      next_since: 4,
      more: false,
    });
    renderRoute();
    await flush();
    await flush();

    expect(screen.getByText("A dream")).toBeTruthy();
    expect(screen.getByText(/The crossroads again/)).toBeTruthy();
  });

  it("shows a keeping whole — the Greek, the mood, the sky", async () => {
    mocks.apiGet.mockResolvedValue({
      entries: [entry()],
      next_since: 1,
      more: false,
    });
    renderRoute();
    await flush();
    await flush();

    expect(screen.getByText("Moonrise")).toBeTruthy();
    expect(screen.getByText(/Χαῖρε Σελήνη/)).toBeTruthy();
    expect(screen.getByText(/Mood Glad/)).toBeTruthy();
    expect(screen.getByText(/Moon in Scorpio/)).toBeTruthy();
  });

  it("the rest of the record stands on its days — reckoning, reflection, election", async () => {
    mocks.apiGet.mockResolvedValue({
      entries: [
        {
          id: "k1",
          kind: "reckoning",
          doc: {
            row: {
              wrote: "ΑΓΑΠΗ",
              total: 93,
              note: "as Θελημα",
              keptAt: "2026-08-16T10:00:00Z",
            },
          },
          updated_at_utc: "2026-08-16T10:00:01Z",
          deleted_at_utc: null,
          seq: 1,
        },
        {
          id: "f1",
          kind: "reflection",
          doc: {
            row: {
              kind: "reflection",
              body: "It holds.",
              writtenAt: "2026-08-16T21:00:00Z",
            },
          },
          updated_at_utc: "2026-08-16T21:00:01Z",
          deleted_at_utc: null,
          seq: 2,
        },
        {
          id: "e1",
          kind: "election",
          doc: {
            row: {
              matterName: "a talisman of the Moon",
              note: "",
              createdAt: "2026-08-16T12:00:00Z",
            },
          },
          updated_at_utc: "2026-08-16T12:00:01Z",
          deleted_at_utc: null,
          seq: 3,
        },
      ],
      next_since: 3,
      more: false,
    });
    renderRoute();
    await flush();
    await flush();

    expect(screen.getByText("A reckoning")).toBeTruthy();
    expect(screen.getByText(/ΑΓΑΠΗ = 93/)).toBeTruthy();
    expect(screen.getByText("A reflection")).toBeTruthy();
    expect(screen.getByText(/It holds\./)).toBeTruthy();
    expect(screen.getByText("An election — a talisman of the Moon")).toBeTruthy();
  });

  it("honours a tombstone — removed is not shown, and not forgotten", async () => {
    mocks.apiGet.mockResolvedValue({
      entries: [
        entry(),
        entry({
          id: "row-2",
          deleted_at_utc: "2026-08-17T09:00:00Z",
          doc: { subjectKey: "moonset", observedAt: "2026-08-17T16:00:00Z" },
        }),
      ],
      next_since: 2,
      more: false,
    });
    renderRoute();
    await flush();
    await flush();

    expect(screen.getByText("Moonrise")).toBeTruthy();
    expect(screen.queryByText("Moonset")).toBeNull();
  });

  it("pages until the shelf is read whole", async () => {
    mocks.apiGet
      .mockResolvedValueOnce({
        entries: [entry()],
        next_since: 1,
        more: true,
      })
      .mockResolvedValueOnce({
        entries: [
          entry({
            id: "row-3",
            doc: { subjectKey: "moonset", observedAt: "2026-08-17T16:00:00Z" },
          }),
        ],
        next_since: 3,
        more: false,
      });
    renderRoute();
    await flush();
    await flush();

    expect(mocks.apiGet).toHaveBeenCalledTimes(2);
    expect(mocks.apiGet).toHaveBeenLastCalledWith("/record/entries?since=1&limit=500");
    expect(screen.getByText("Moonrise")).toBeTruthy();
    expect(screen.getByText("Moonset")).toBeTruthy();
  });

  it("an empty record says how it fills", async () => {
    mocks.apiGet.mockResolvedValue({ entries: [], next_since: 0, more: false });
    renderRoute();
    await flush();
    await flush();

    expect(screen.getByText(/Nothing here yet/)).toBeTruthy();
    expect(screen.getByText(/Sync the record now/)).toBeTruthy();
  });

  it("removes an entry through the protocol — a tombstone, not a deletion", async () => {
    mocks.apiGet.mockResolvedValue({
      entries: [entry()],
      next_since: 1,
      more: false,
    });
    mocks.apiPut.mockResolvedValue({ accepted: 1, stale: 0, latest_seq: 2 });
    const confirmed = vi.spyOn(window, "confirm").mockReturnValue(true);
    renderRoute();
    await flush();
    await flush();

    await act(async () => {
      screen.getByText("Remove from the record").click();
    });
    await flush();

    const [path, body] = mocks.apiPut.mock.calls[0] as [
      string,
      { entries: Array<Record<string, unknown>> },
    ];
    expect(path).toBe("/record/entries");
    const wire = body.entries[0];
    expect(wire?.id).toBe("row-1");
    expect(wire?.deleted_at_utc).toBeTruthy();
    // The page then shows what stands, exactly as the phone's reader would.
    expect(screen.queryByText("Moonrise")).toBeNull();
    confirmed.mockRestore();
  });

  it("mends the words through the protocol, newest writer winning", async () => {
    mocks.apiGet.mockResolvedValue({
      entries: [entry()],
      next_since: 1,
      more: false,
    });
    mocks.apiPut.mockResolvedValue({ accepted: 1, stale: 0, latest_seq: 2 });
    const asked = vi.spyOn(window, "prompt").mockReturnValue("Χαῖρε Σελήνη — mended");
    renderRoute();
    await flush();
    await flush();

    await act(async () => {
      screen.getByText("Mend the words").click();
    });
    await flush();

    const [, body] = mocks.apiPut.mock.calls[0] as [
      string,
      { entries: Array<{ doc: { note?: string }; updated_at_utc: string }> },
    ];
    const wire = body.entries[0];
    expect(wire?.doc.note).toBe("Χαῖρε Σελήνη — mended");
    expect(
      wire !== undefined && wire.updated_at_utc > "2026-08-17T06:12:01Z",
    ).toBe(true);
    expect(screen.getByText(/Σελήνη — mended/)).toBeTruthy();
    asked.mockRestore();
  });
});
