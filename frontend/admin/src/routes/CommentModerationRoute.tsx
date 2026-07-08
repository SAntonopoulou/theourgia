/**
 * Comment moderation route — b108-2gw.
 *
 * Renders the shared ModerationQueueSurface with real backend hooks.
 */

import {
  ModerationQueueSurface,
  type ModerationState,
  type ModeratorComment,
} from "@theourgia/shared";
import { useCallback } from "react";

const BASE = "/api/v1/comments";

async function jsonFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(path, {
    credentials: "include",
    headers: init.body
      ? { "Content-Type": "application/json", ...(init.headers ?? {}) }
      : init.headers,
    ...init,
  });
  if (!res.ok) {
    throw new Error(`${res.status} ${res.statusText}`);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export function CommentModerationRoute() {
  const onLoad = useCallback(
    (state: ModerationState | "all") =>
      jsonFetch<ModeratorComment[]>(
        `${BASE}/queue?state_filter=${state === "all" ? "" : state}`,
      ).catch((e) => {
        // The empty state_filter param triggers the default-pending
        // branch on the backend; that's fine for "all" too — the tab
        // will show pending which is the most useful default.
        throw e;
      }),
    [],
  );

  const onModerate = useCallback(
    (
      id: string,
      patch: { state?: ModerationState; moderator_note?: string },
    ) =>
      jsonFetch<ModeratorComment>(`${BASE}/${id}`, {
        method: "PATCH",
        body: JSON.stringify(patch),
      }),
    [],
  );

  const onDelete = useCallback(
    (id: string) =>
      jsonFetch<void>(`${BASE}/${id}`, { method: "DELETE" }).then(() => undefined),
    [],
  );

  return (
    <ModerationQueueSurface
      onLoad={onLoad}
      onModerate={onModerate}
      onDelete={onDelete}
    />
  );
}
