import "@testing-library/jest-dom";

import { render, screen, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import {
  CommentsSurface,
  type Comment,
  type CommentDraft,
} from "./CommentsSurface.js";
import { ModerationQueueSurface, type ModeratorComment } from "./ModerationQueueSurface.js";

const APPROVED_ROWS: Comment[] = [
  {
    id: "c1",
    target_kind: "publication",
    target_id: "pub-1",
    author_name: "Sappho",
    author_url: null,
    body: "I asked her to visit me but she never did.",
    created_at: "2026-07-08T12:00:00Z",
  },
];

describe("CommentsSurface", () => {
  it("renders loading, then a comment", async () => {
    render(
      <CommentsSurface
        targetKind="publication"
        targetId="pub-1"
        onLoad={() => Promise.resolve(APPROVED_ROWS)}
        onSubmit={vi.fn()}
      />,
    );
    expect(screen.getByText("Loading…")).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByText(/asked her to visit me/i)).toBeInTheDocument(),
    );
    expect(screen.getByText("Sappho")).toBeInTheDocument();
  });

  it("submits a comment through the callback + trips the honeypot", async () => {
    let received: CommentDraft | null = null;
    const onSubmit = vi.fn((draft: CommentDraft) => {
      received = draft;
      return Promise.resolve(APPROVED_ROWS[0]!);
    });
    render(
      <CommentsSurface
        targetKind="entry"
        targetId="ent-1"
        onLoad={() => Promise.resolve([])}
        onSubmit={onSubmit}
      />,
    );
    await waitFor(() =>
      expect(screen.getByText("No comments yet.")).toBeInTheDocument(),
    );
    await userEvent.type(screen.getByLabelText(/your name/i), "Anon");
    await userEvent.type(
      screen.getByLabelText(/your comment/i),
      "solve et coagula",
    );
    await userEvent.click(screen.getByRole("button", { name: /submit/i }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledOnce());
    expect(received).not.toBeNull();
    expect(received!.author_name).toBe("Anon");
    expect(received!.body).toBe("solve et coagula");
    expect(received!.website_ref).toBe("");
  });

  it("renders a confirmation after submission", async () => {
    const onSubmit = vi.fn(() => Promise.resolve(APPROVED_ROWS[0]!));
    render(
      <CommentsSurface
        targetKind="publication"
        targetId="p"
        onLoad={() => Promise.resolve([])}
        onSubmit={onSubmit}
      />,
    );
    await waitFor(() =>
      expect(screen.getByText("No comments yet.")).toBeInTheDocument(),
    );
    await userEvent.type(screen.getByLabelText(/your name/i), "Q");
    await userEvent.type(screen.getByLabelText(/your comment/i), "hi");
    await userEvent.click(screen.getByRole("button", { name: /submit/i }));
    await waitFor(() =>
      expect(screen.getByText(/submitted for moderation/i)).toBeInTheDocument(),
    );
  });
});

const QUEUE_ROWS: ModeratorComment[] = [
  {
    id: "m1",
    target_kind: "publication",
    target_id: "pub-1",
    author_name: "Bot",
    author_email: "bot@example.com",
    author_url: null,
    body: "cheap watches",
    state: "pending",
    moderator_note: null,
    ip_address: "10.0.0.1",
    created_at: "2026-07-08T12:00:00Z",
  },
];

describe("ModerationQueueSurface", () => {
  it("loads the pending queue and calls onModerate on approve", async () => {
    const onLoad = vi.fn(() => Promise.resolve(QUEUE_ROWS));
    const onModerate = vi.fn(() => Promise.resolve(QUEUE_ROWS[0]!));
    render(
      <ModerationQueueSurface
        onLoad={onLoad}
        onModerate={onModerate}
        onDelete={vi.fn()}
      />,
    );
    await waitFor(() =>
      expect(screen.getByText("cheap watches")).toBeInTheDocument(),
    );
    expect(onLoad).toHaveBeenLastCalledWith("pending");
    await userEvent.click(screen.getByRole("button", { name: /^approve$/i }));
    await waitFor(() =>
      expect(onModerate).toHaveBeenCalledWith("m1", { state: "approved" }),
    );
    // Optimistically removed.
    expect(screen.queryByText("cheap watches")).not.toBeInTheDocument();
  });

  it("shows Nothing here when queue is empty", async () => {
    render(
      <ModerationQueueSurface
        onLoad={() => Promise.resolve([])}
        onModerate={vi.fn()}
        onDelete={vi.fn()}
      />,
    );
    await waitFor(() =>
      expect(screen.getByText("Nothing here.")).toBeInTheDocument(),
    );
  });
});
