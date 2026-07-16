/**
 * Editor data context.
 *
 * Threads entity + library + chart-fetch data from the surrounding
 * surface (admin / public) into the Tiptap custom NodeViews without
 * coupling the shared module to a specific API client.
 *
 * The TiptapEditor wraps its children in `EditorDataProvider`, taking
 * the data as props. NodeViews consume via `useEditorData()`.
 *
 * Missing fields are tolerated — the picker components render an
 * empty state when the relevant list is undefined, so the editor
 * still mounts in tests/storybook without backend wiring.
 */

import { createContext, useContext, type ReactNode } from "react";

import type { BookRecord, EntityRecord } from "../api/types.js";
import type { ChartSnapshot } from "./nodes/ChartNode.js";

export interface ChartFetchRequest {
  kind: "natal" | "horary" | "election";
  datetime: string; // ISO 8601
  latitude: number;
  longitude: number;
  system: "placidus" | "whole-sign";
}

export type ChartFetchFn = (req: ChartFetchRequest) => Promise<ChartSnapshot>;

/**
 * Queue local Whisper transcription for a server audio attachment
 * (v1-012). Resolves the backend's 202 body; rejects with an ApiError
 * whose 403 detail distinguishes "instance disabled" from "user not
 * opted in".
 */
export type TranscribeAudioFn = (
  attachmentId: string,
  opts?: { force?: boolean },
) => Promise<{ queued: boolean }>;

export interface EditorData {
  entities?: readonly EntityRecord[];
  books?: readonly BookRecord[];
  fetchChart?: ChartFetchFn;
  transcribeAudio?: TranscribeAudioFn;
}

const Ctx = createContext<EditorData>({});

export interface EditorDataProviderProps extends EditorData {
  children: ReactNode;
}

export function EditorDataProvider({
  children,
  entities,
  books,
  fetchChart,
  transcribeAudio,
}: EditorDataProviderProps) {
  return (
    <Ctx.Provider value={{ entities, books, fetchChart, transcribeAudio }}>
      {children}
    </Ctx.Provider>
  );
}

export function useEditorData(): EditorData {
  return useContext(Ctx);
}
