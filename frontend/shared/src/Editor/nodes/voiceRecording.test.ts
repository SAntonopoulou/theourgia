import { Editor as CoreEditor } from "@tiptap/core";
import { describe, expect, it } from "vitest";

import { ApiError } from "../../api/errors.js";
import { buildExtensions } from "../extensions.js";

import {
  canRequestTranscription,
  transcriptionFailureFrom,
} from "./voiceRecording.js";

// ── canRequestTranscription (button gating) ───────────────────────

describe("canRequestTranscription", () => {
  it("allows when there is an assetId, no transcript, and a transcriber", () => {
    expect(
      canRequestTranscription({ assetId: "a1", transcript: "" }, true),
    ).toBe(true);
  });

  it("denies when the surface wired no transcriber function", () => {
    expect(
      canRequestTranscription({ assetId: "a1", transcript: "" }, false),
    ).toBe(false);
  });

  it("denies for URL-only nodes (no server assetId)", () => {
    expect(
      canRequestTranscription({ assetId: null, transcript: "" }, true),
    ).toBe(false);
    expect(
      canRequestTranscription({ assetId: "", transcript: "" }, true),
    ).toBe(false);
    expect(
      canRequestTranscription({ assetId: "   ", transcript: "" }, true),
    ).toBe(false);
  });

  it("denies when a transcript already exists", () => {
    expect(
      canRequestTranscription(
        { assetId: "a1", transcript: "Already transcribed." },
        true,
      ),
    ).toBe(false);
  });

  it("treats whitespace-only transcript as absent", () => {
    expect(
      canRequestTranscription({ assetId: "a1", transcript: "  \n" }, true),
    ).toBe(true);
  });
});

// ── transcriptionFailureFrom (403 probe via response) ─────────────

describe("transcriptionFailureFrom", () => {
  it("flags a 403 ApiError as forbidden and carries the detail", () => {
    const err = new ApiError(403, {
      type: "about:blank",
      title: "Forbidden",
      status: 403,
      detail: "Transcription is not enabled on this instance.",
    });
    const failure = transcriptionFailureFrom(err);
    expect(failure.forbidden).toBe(true);
    expect(failure.message).toBe(
      "Transcription is not enabled on this instance.",
    );
  });

  it("keeps the user-not-opted-in detail distinct", () => {
    const err = new ApiError(403, {
      type: "about:blank",
      title: "Forbidden",
      status: 403,
      detail:
        "You have not opted in to audio transcription. Enable " +
        "audio.transcription_opt_in in your settings first.",
    });
    const failure = transcriptionFailureFrom(err);
    expect(failure.forbidden).toBe(true);
    expect(failure.message).toContain("audio.transcription_opt_in");
  });

  it("does not flag a 409 as forbidden", () => {
    const err = new ApiError(409, {
      type: "about:blank",
      title: "Conflict",
      status: 409,
      detail: "A transcript already exists for this recording.",
    });
    const failure = transcriptionFailureFrom(err);
    expect(failure.forbidden).toBe(false);
    expect(failure.message).toContain("already exists");
  });

  it("normalises a bare Error", () => {
    const failure = transcriptionFailureFrom(new Error("network down"));
    expect(failure.forbidden).toBe(false);
    expect(failure.message).toBe("network down");
  });

  it("normalises a non-Error throw to a generic message", () => {
    const failure = transcriptionFailureFrom("boom");
    expect(failure.forbidden).toBe(false);
    expect(failure.message).toBe("Transcription request failed.");
  });
});

// ── Node attrs round-trip (headless editor) ───────────────────────

function mountHeadless(content: unknown): CoreEditor {
  return new CoreEditor({
    extensions: buildExtensions(),
    content: content as object,
  });
}

describe("voiceRecording node — transcript attrs", () => {
  it("round-trips assetId + transcript through the schema", () => {
    const doc = {
      type: "doc",
      content: [
        {
          type: "voiceRecording",
          attrs: {
            assetId: "att-123",
            url: "/media/att-123.ogg",
            caption: "Evening invocation",
            transcript: "Once, in the temple of the dawn.",
            duration: 42.7,
          },
        },
      ],
    };
    const editor = mountHeadless(doc);
    const block = (editor.getJSON().content ?? [])[0] as {
      type: string;
      attrs: { assetId: string; transcript: string };
    };
    expect(block.type).toBe("voiceRecording");
    expect(block.attrs.assetId).toBe("att-123");
    expect(block.attrs.transcript).toBe(
      "Once, in the temple of the dawn.",
    );
    editor.destroy();
  });

  it("defaults transcript to empty and assetId to null", () => {
    const doc = {
      type: "doc",
      content: [{ type: "voiceRecording" }],
    };
    const editor = mountHeadless(doc);
    const block = (editor.getJSON().content ?? [])[0] as {
      type: string;
      attrs: { assetId: string | null; transcript: string };
    };
    expect(block.attrs.assetId).toBeNull();
    expect(block.attrs.transcript).toBe("");
    editor.destroy();
  });
});
