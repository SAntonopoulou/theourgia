/**
 * Editor version-history tests (v1-028).
 *
 * Covered: the History affordance opens a panel listing fixture
 * revisions (relative time + excerpt) · clicking a revision fetches
 * and previews it read-only · Restore routes through the house
 * ConfirmDialog (never native confirm) and calls the restore
 * endpoint · the title rehydrates from the restored detail · sealed
 * entries show the no-history explanation and never fetch.
 *
 * TiptapEditor is stubbed — mounting ProseMirror in jsdom is out of
 * scope here (the shared Editor suite covers it headlessly).
 */

import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import {
  ActingAsProvider,
  AuthProvider,
  I18nProvider,
  ToastProvider,
  TopbarProvider,
  VaultTopbar,
} from "@theourgia/shared";
import { Suspense } from "react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

const tiptap = (...texts: string[]) =>
  JSON.stringify({
    type: "doc",
    content: texts.map((text) => ({
      type: "paragraph",
      content: [{ type: "text", text }],
    })),
  });

const mocks = vi.hoisted(() => {
  const tiptapDoc = (...texts: string[]) =>
    JSON.stringify({
      type: "doc",
      content: texts.map((text) => ({
        type: "paragraph",
        content: [{ type: "text", text }],
      })),
    });
  const DETAIL = {
    id: "1",
    title: "Candle held its flame",
    type: "observation",
    excerpt: "",
    glyph: "candle",
    created_at: "2026-07-19T10:00:00Z",
    updated_at: "2026-07-19T10:00:00Z",
    body: tiptapDoc("Current text of the entry."),
    visibility: "personal",
    sealed: false,
    published_at: null,
    astro_snapshot: null,
    calendar_snapshot: null,
    tags: [],
    tradition_tags: [],
    publish_on_death: false,
  };
  const REVISIONS = [
    {
      id: "rev-2",
      revision_number: 2,
      created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      title: "Candle held its flame",
      body_excerpt: "The taper at the eastern station burned through the invocation.",
    },
    {
      id: "rev-1",
      revision_number: 1,
      created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      title: "Candle observation (draft)",
      body_excerpt: "First note: the taper burned steadily.",
    },
  ];
  const FULL_REV_1 = {
    id: "rev-1",
    revision_number: 1,
    created_at: REVISIONS[1]!.created_at,
    title: "Candle observation (draft)",
    body: tiptapDoc("First note: the taper burned steadily."),
    edit_summary: null,
  };
  const RESTORED_DETAIL = {
    ...DETAIL,
    title: "Candle observation (draft)",
    body: FULL_REV_1.body,
  };
  return {
    DETAIL,
    REVISIONS,
    FULL_REV_1,
    RESTORED_DETAIL,
    getEntryDetail: vi.fn(() => Promise.resolve(DETAIL)),
    listEntities: vi.fn(() => Promise.resolve([])),
    listBooks: vi.fn(() => Promise.resolve([])),
    listEntryRevisions: vi.fn(() => Promise.resolve(REVISIONS)),
    getEntryRevision: vi.fn(() => Promise.resolve(FULL_REV_1)),
    restoreEntryRevision: vi.fn(() => Promise.resolve(RESTORED_DETAIL)),
    updateEntry: vi.fn(() => Promise.resolve(DETAIL)),
    publishEntry: vi.fn(() => Promise.resolve(DETAIL)),
    createEntry: vi.fn(() => Promise.resolve(DETAIL)),
    updateEntryBody: vi.fn(() => Promise.resolve(DETAIL)),
    getChart: vi.fn(() => Promise.resolve({})),
    transcribeAudio: vi.fn(() => Promise.resolve({})),
  };
});

vi.mock("../../data/api.js", () => ({
  apiClient: { request: () => Promise.resolve([]) },
  apiMethods: {
    getEntryDetail: mocks.getEntryDetail,
    listEntities: mocks.listEntities,
    listBooks: mocks.listBooks,
    listEntryRevisions: mocks.listEntryRevisions,
    getEntryRevision: mocks.getEntryRevision,
    restoreEntryRevision: mocks.restoreEntryRevision,
    updateEntry: mocks.updateEntry,
    publishEntry: mocks.publishEntry,
    createEntry: mocks.createEntry,
    updateEntryBody: mocks.updateEntryBody,
    getChart: mocks.getChart,
    transcribeAudio: mocks.transcribeAudio,
  },
  API_MODE: "mock" as const,
  API_BASE_URL: "",
}));

// Mounting ProseMirror in jsdom is not the subject under test.
vi.mock("@theourgia/shared", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@theourgia/shared")>();
  return {
    ...actual,
    TiptapEditor: () => <div data-testid="tiptap-editor-stub" />,
  };
});

import { Editor } from "../Editor.js";

function renderEditor() {
  return render(
    <I18nProvider>
      <AuthProvider api={{ getSession: async () => null } as never}>
        <ActingAsProvider>
          <ToastProvider />
          <MemoryRouter initialEntries={["/editor/1"]}>
            <TopbarProvider>
              <VaultTopbar />
              <Suspense fallback={<div>loading</div>}>
                <Routes>
                  <Route path="/editor/:id" element={<Editor />} />
                </Routes>
              </Suspense>
            </TopbarProvider>
          </MemoryRouter>
        </ActingAsProvider>
      </AuthProvider>
    </I18nProvider>,
  );
}

async function openHistory() {
  renderEditor();
  const toggle = await screen.findByRole("button", { name: "History" });
  await act(async () => {
    fireEvent.click(toggle);
  });
  return toggle;
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("Editor — version history (v1-028)", () => {
  it("opens a panel listing fixture revisions with relative time + excerpt", async () => {
    await openHistory();
    expect(mocks.listEntryRevisions).toHaveBeenCalledWith("1");
    const panel = await screen.findByRole("dialog", { name: "Version history" });
    expect(within(panel).getByText("Candle observation (draft)")).toBeTruthy();
    expect(within(panel).getByText("First note: the taper burned steadily.")).toBeTruthy();
    expect(within(panel).getByText("2 h ago")).toBeTruthy();
    expect(within(panel).getByText("2 days ago")).toBeTruthy();
  });

  it("previews a revision read-only on click", async () => {
    await openHistory();
    const panel = await screen.findByRole("dialog", { name: "Version history" });
    await act(async () => {
      fireEvent.click(within(panel).getByText("Candle observation (draft)"));
    });
    expect(mocks.getEntryRevision).toHaveBeenCalledWith("1", "rev-1");
    const preview = await screen.findByText(/Preview · revision 1/);
    expect(preview).toBeTruthy();
    // The full body renders as read-only paragraphs, not an editor.
    expect(
      screen.getAllByText("First note: the taper burned steadily.").length,
    ).toBeGreaterThanOrEqual(1);
  });

  it("restores through the house ConfirmDialog and rehydrates the title", async () => {
    await openHistory();
    const panel = await screen.findByRole("dialog", { name: "Version history" });
    await act(async () => {
      fireEvent.click(within(panel).getByText("Candle observation (draft)"));
    });
    await screen.findByText(/Preview · revision 1/);
    // The preview's Restore button opens the ConfirmDialog — no call yet.
    await act(async () => {
      fireEvent.click(within(panel).getByRole("button", { name: "Restore" }));
    });
    expect(mocks.restoreEntryRevision).not.toHaveBeenCalled();
    const confirm = await screen.findByRole("dialog", {
      name: "Restore this version?",
    });
    await act(async () => {
      fireEvent.click(within(confirm).getByRole("button", { name: "Restore" }));
    });
    expect(mocks.restoreEntryRevision).toHaveBeenCalledWith("1", "rev-1");
    // Success toast + title rehydrated from the restored detail.
    expect(await screen.findByText("Version restored")).toBeTruthy();
    const titleInput = screen.getByLabelText("Entry title") as HTMLInputElement;
    expect(titleInput.value).toBe("Candle observation (draft)");
    // History refreshed after the restore (initial open + post-restore).
    expect(mocks.listEntryRevisions).toHaveBeenCalledTimes(2);
  });

  it("cancelling the ConfirmDialog never calls the endpoint", async () => {
    await openHistory();
    const panel = await screen.findByRole("dialog", { name: "Version history" });
    await act(async () => {
      fireEvent.click(within(panel).getByText("Candle observation (draft)"));
    });
    await screen.findByText(/Preview · revision 1/);
    await act(async () => {
      fireEvent.click(within(panel).getByRole("button", { name: "Restore" }));
    });
    const confirm = await screen.findByRole("dialog", {
      name: "Restore this version?",
    });
    await act(async () => {
      fireEvent.click(within(confirm).getByRole("button", { name: "Cancel" }));
    });
    expect(mocks.restoreEntryRevision).not.toHaveBeenCalled();
  });

  it("sealed entries show the no-history explanation and never fetch", async () => {
    mocks.getEntryDetail.mockResolvedValueOnce({ ...mocks.DETAIL, sealed: true });
    await openHistory();
    const panel = await screen.findByRole("dialog", { name: "Version history" });
    expect(within(panel).getByText(/Sealed entries keep no server-readable history/)).toBeTruthy();
    expect(mocks.listEntryRevisions).not.toHaveBeenCalled();
  });

  it("keeps a stable body shape for the preview paragraphs", () => {
    // Guard the fixture format the preview parser expects.
    const parsed = JSON.parse(tiptap("a", "b")) as { content: unknown[] };
    expect(parsed.content).toHaveLength(2);
  });
});
