/**
 * VoiceRecordingNode view tests — v1-012 (local Whisper transcription).
 *
 * Renders the node view component directly with a stateful stand-in
 * for Tiptap's NodeViewProps (the view only reads `node.attrs`,
 * `updateAttributes` and `editor.isEditable`) inside an
 * `EditorDataProvider`, so the Transcribe button gating — shown only
 * with a server assetId + no transcript + a wired transcriber, hidden
 * after a 403 with the backend's detail rendered inline — is
 * exercised as real DOM without mounting ProseMirror.
 */

import "@testing-library/jest-dom";

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { NodeViewProps } from "@tiptap/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { ApiError } from "../../api/errors.js";
import {
  EditorDataProvider,
  type TranscribeAudioFn,
} from "../EditorContext.js";

import { VoiceRecordingView } from "./VoiceRecordingNode.js";

const DEFAULT_ATTRS = {
  assetId: null as string | null,
  url: "",
  caption: "",
  transcript: "",
  duration: null as number | null,
};

function Harness({
  initial = {},
  editable = true,
  transcribeAudio,
}: {
  initial?: Partial<typeof DEFAULT_ATTRS>;
  editable?: boolean;
  transcribeAudio?: TranscribeAudioFn;
}) {
  const [attrs, setAttrs] = useState<Record<string, unknown>>({
    ...DEFAULT_ATTRS,
    ...initial,
  });
  const props = {
    node: { attrs },
    editor: { isEditable: editable },
    updateAttributes: (patch: Record<string, unknown>) =>
      setAttrs((a) => ({ ...a, ...patch })),
  } as unknown as NodeViewProps;
  return (
    <EditorDataProvider transcribeAudio={transcribeAudio}>
      <VoiceRecordingView {...props} />
    </EditorDataProvider>
  );
}

function forbidden(detail: string): ApiError {
  return new ApiError(403, {
    type: "about:blank",
    title: "Forbidden",
    status: 403,
    detail,
  });
}

describe("VoiceRecordingView — Transcribe button gating", () => {
  it("shows the button for a server asset with no transcript", () => {
    render(
      <Harness
        initial={{ assetId: "att-1", url: "/media/a.ogg" }}
        transcribeAudio={vi.fn()}
      />,
    );
    expect(
      screen.getByRole("button", { name: "Transcribe" }),
    ).toBeInTheDocument();
  });

  it("hides the button when no transcriber is wired", () => {
    render(<Harness initial={{ assetId: "att-1" }} />);
    expect(
      screen.queryByRole("button", { name: "Transcribe" }),
    ).not.toBeInTheDocument();
  });

  it("hides the button for URL-only nodes (no assetId)", () => {
    render(
      <Harness
        initial={{ url: "/media/a.ogg" }}
        transcribeAudio={vi.fn()}
      />,
    );
    expect(
      screen.queryByRole("button", { name: "Transcribe" }),
    ).not.toBeInTheDocument();
  });

  it("hides the button when a transcript already exists", () => {
    render(
      <Harness
        initial={{ assetId: "att-1", transcript: "Done already." }}
        transcribeAudio={vi.fn()}
      />,
    );
    expect(
      screen.queryByRole("button", { name: "Transcribe" }),
    ).not.toBeInTheDocument();
  });

  it("hides the button in read-only mode", () => {
    render(
      <Harness
        initial={{ assetId: "att-1" }}
        editable={false}
        transcribeAudio={vi.fn()}
      />,
    );
    expect(
      screen.queryByRole("button", { name: "Transcribe" }),
    ).not.toBeInTheDocument();
  });
});

describe("VoiceRecordingView — Transcribe flow", () => {
  it("queues transcription with the assetId and shows the status line", async () => {
    const user = userEvent.setup();
    const transcribe = vi.fn().mockResolvedValue({ queued: true });
    render(
      <Harness initial={{ assetId: "att-42" }} transcribeAudio={transcribe} />,
    );

    await user.click(screen.getByRole("button", { name: "Transcribe" }));

    await waitFor(() => {
      expect(screen.getByRole("status")).toHaveTextContent(
        /Transcription queued/,
      );
    });
    expect(transcribe).toHaveBeenCalledWith("att-42");
    // Queued replaces the button — no double submits.
    expect(
      screen.queryByRole("button", { name: "Transcribe" }),
    ).not.toBeInTheDocument();
  });

  it("a 403 hides the button and renders the backend detail", async () => {
    const user = userEvent.setup();
    const detail = "Transcription is not enabled on this instance.";
    const transcribe = vi.fn().mockRejectedValue(forbidden(detail));
    render(
      <Harness initial={{ assetId: "att-42" }} transcribeAudio={transcribe} />,
    );

    await user.click(screen.getByRole("button", { name: "Transcribe" }));

    await waitFor(() => {
      expect(screen.getByRole("status")).toHaveTextContent(detail);
    });
    expect(
      screen.queryByRole("button", { name: "Transcribe" }),
    ).not.toBeInTheDocument();
  });

  it("the not-opted-in 403 detail is surfaced verbatim", async () => {
    const user = userEvent.setup();
    const detail =
      "You have not opted in to audio transcription. Enable " +
      "audio.transcription_opt_in in your settings first.";
    const transcribe = vi.fn().mockRejectedValue(forbidden(detail));
    render(
      <Harness initial={{ assetId: "att-42" }} transcribeAudio={transcribe} />,
    );

    await user.click(screen.getByRole("button", { name: "Transcribe" }));

    await waitFor(() => {
      expect(screen.getByRole("status")).toHaveTextContent(
        /audio\.transcription_opt_in/,
      );
    });
  });

  it("a non-403 failure keeps the button for retry and shows the message", async () => {
    const user = userEvent.setup();
    const transcribe = vi
      .fn()
      .mockRejectedValue(new Error("network down"));
    render(
      <Harness initial={{ assetId: "att-42" }} transcribeAudio={transcribe} />,
    );

    await user.click(screen.getByRole("button", { name: "Transcribe" }));

    await waitFor(() => {
      expect(screen.getByRole("status")).toHaveTextContent("network down");
    });
    expect(
      screen.getByRole("button", { name: "Transcribe" }),
    ).toBeInTheDocument();
  });
});

describe("VoiceRecordingView — transcript rendering", () => {
  it("renders the transcript text in read mode", () => {
    render(
      <Harness
        initial={{
          assetId: "att-1",
          transcript: "Once, in the temple of the dawn.",
        }}
        editable={false}
      />,
    );
    expect(
      screen.getByText("Once, in the temple of the dawn."),
    ).toBeInTheDocument();
  });

  it("editable mode offers the transcript textarea with the updated placeholder", () => {
    render(<Harness initial={{ assetId: "att-1" }} transcribeAudio={vi.fn()} />);
    expect(
      screen.getByPlaceholderText(
        "Transcript (optional — type one, or use Transcribe)",
      ),
    ).toBeInTheDocument();
  });
});
