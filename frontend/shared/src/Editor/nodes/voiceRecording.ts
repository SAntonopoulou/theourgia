/**
 * voiceRecording — pure helpers for the VoiceRecordingNode view.
 *
 * v1-012: local Whisper transcription wiring. The node view shows a
 * "Transcribe" button that calls `POST /audio/{id}/transcribe` via a
 * context-injected function (same decoupling as ChartPicker's
 * `fetchChart`). These helpers keep the gating and error-normalising
 * logic testable without mounting a Tiptap editor.
 */

export interface TranscriptionAttrs {
  /** Server audio-attachment id — null/empty when URL-only. */
  assetId: string | null;
  /** Current transcript attr ("" when absent). */
  transcript: string;
}

/**
 * The Transcribe button shows only when there is a server asset to
 * transcribe, no transcript yet, and the surrounding surface wired a
 * transcriber function into the editor context.
 */
export function canRequestTranscription(
  attrs: TranscriptionAttrs,
  transcriberAvailable: boolean,
): boolean {
  return (
    transcriberAvailable &&
    typeof attrs.assetId === "string" &&
    attrs.assetId.trim() !== "" &&
    attrs.transcript.trim() === ""
  );
}

export interface TranscriptionFailure {
  /** Human-readable message — the backend's problem detail when present. */
  message: string;
  /**
   * True when the server answered 403 — one of the two opt-in gates
   * (instance / user) is closed, so the button should hide. Probed
   * via the response per the design note, never via a capability
   * pre-check.
   */
  forbidden: boolean;
}

/** Normalise an error thrown by the transcribe call. */
export function transcriptionFailureFrom(err: unknown): TranscriptionFailure {
  const status =
    typeof err === "object" && err !== null && "status" in err
      ? Number((err as { status?: unknown }).status)
      : null;
  const message =
    err instanceof Error && err.message
      ? err.message
      : "Transcription request failed.";
  return { message, forbidden: status === 403 };
}
