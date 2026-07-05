/**
 * Publication Editor — admin route.
 *
 * Live-wired: GET /publications/{id} on mount, PATCH after a 700ms
 * debounce. Chapter body / title changes hit
 * PATCH /publications/{id}/chapters/{cid}; other metadata hits
 * PATCH /publications/{id}. Autosave indicator flips saving → saved
 * → idle as the network calls complete.
 */

import {
  type AutosaveState,
  type PublicationEditorRecord,
  PublicationEditorSurface,
  Toast,
  useTopbar,
} from "@theourgia/shared";
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { apiMethods } from "../data/api.js";

const SAVE_DEBOUNCE_MS = 700;
const HIDE_AFTER_SAVED_MS = 4000;

function makeFixture(): PublicationEditorRecord {
  return {
    id: "demo-publication-editor",
    title: "Walking the Crossroads",
    kind: "book",
    state: "draft",
    language: "English",
    license: "all-rights-reserved",
    summary:
      "A practitioner's record of three years keeping Hekate's lamp at the crossroads.",
    tags: ["Hekate", "crossroads"],
    cover_url: null,
    chapters: [
      {
        id: "ch-1",
        title: "Approaching the Triple Way",
        body: { type: "doc", content: [{ type: "paragraph" }] },
        word_count: 420,
      },
      {
        id: "ch-2",
        title: "The First Year",
        body: { type: "doc", content: [{ type: "paragraph" }] },
        word_count: 380,
      },
      {
        id: "ch-3",
        title: "The Lamp at the Crossroads",
        body: { type: "doc", content: [{ type: "paragraph" }] },
        word_count: 550,
      },
      {
        id: "ch-4",
        title: "On Constancy",
        body: { type: "doc", content: [{ type: "paragraph" }] },
        word_count: 295,
      },
      {
        id: "ch-5",
        title: "What the Keeping Taught",
        body: { type: "doc", content: [{ type: "paragraph" }] },
        word_count: 495,
      },
    ],
  };
}

function formatTimeOfDay(date: Date): string {
  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export function PublicationEditorRoute() {
  useTopbar(
    () => ({
      title: "Publication Editor",
      subtitle:
        "Compose chapters, prose, and references — autosave is debounced",
    }),
    [],
  );

  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [publication, setPublication] = useState<PublicationEditorRecord>(
    () => makeFixture(),
  );
  const [activeChapterId, setActiveChapterId] = useState<string | null>(
    publication.chapters[0]?.id ?? null,
  );
  const [autosaveState, setAutosaveState] = useState<AutosaveState>("idle");
  const [lastSavedLabel, setLastSavedLabel] = useState<string | null>(null);
  const [, setLoadError] = useState<string | null>(null);

  // Fetch real publication if we have an :id. If none, fall through to
  // the fixture (dev-mode composition target).
  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    apiMethods
      .getPublication(id)
      .then((row) => {
        if (cancelled) return;
        const rec = row as unknown as {
          id: string;
          title: string;
          kind: string;
          state: string;
          language: string;
          license: string;
          summary: string | null;
          cover_url: string | null;
          chapters: Array<{
            id: string;
            title: string;
            body: Record<string, unknown>;
          }>;
        };
        setPublication({
          id: rec.id,
          title: rec.title,
          kind: rec.kind as PublicationEditorRecord["kind"],
          state: rec.state as PublicationEditorRecord["state"],
          language: rec.language,
          license: rec.license as PublicationEditorRecord["license"],
          summary: rec.summary ?? "",
          tags: [],
          cover_url: rec.cover_url,
          chapters: (rec.chapters ?? []).map((c) => ({
            id: c.id,
            title: c.title,
            body: c.body ?? { type: "doc", content: [{ type: "paragraph" }] },
            word_count: 0,
          })),
        });
        setActiveChapterId(rec.chapters?.[0]?.id ?? null);
      })
      .catch((e) => {
        if (!cancelled) {
          setLoadError(
            e instanceof Error ? e.message : "Failed to load publication",
          );
        }
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hideRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingRef = useRef<Partial<PublicationEditorRecord>>({});
  const pendingChapterRef = useRef<
    Map<string, { title?: string; body?: Record<string, unknown> }>
  >(new Map());

  const flushSave = useCallback(async () => {
    if (!id) {
      // No id → fixture mode; simulate a successful save so the
      // autosave indicator still animates.
      setAutosaveState("saved");
      setLastSavedLabel(formatTimeOfDay(new Date()));
      hideRef.current = setTimeout(
        () => setAutosaveState("idle"),
        HIDE_AFTER_SAVED_MS,
      );
      return;
    }
    const pending = { ...pendingRef.current };
    const pendingChapters = new Map(pendingChapterRef.current);
    pendingRef.current = {};
    pendingChapterRef.current.clear();
    try {
      if (Object.keys(pending).length > 0) {
        await apiMethods.updatePublication(id, pending);
      }
      for (const [chapterId, patch] of pendingChapters) {
        await apiMethods.updatePublicationChapter(id, chapterId, patch);
      }
      setAutosaveState("saved");
      setLastSavedLabel(formatTimeOfDay(new Date()));
      hideRef.current = setTimeout(
        () => setAutosaveState("idle"),
        HIDE_AFTER_SAVED_MS,
      );
    } catch (err) {
      Toast.push({
        tone: "error",
        title: "Autosave failed",
        body: err instanceof Error ? err.message : String(err),
      });
      setAutosaveState("idle");
    }
  }, [id]);

  const triggerAutosave = useCallback(() => {
    setAutosaveState("saving");
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (hideRef.current) clearTimeout(hideRef.current);
    debounceRef.current = setTimeout(() => {
      void flushSave();
    }, SAVE_DEBOUNCE_MS);
  }, [flushSave]);

  useEffect(
    () => () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (hideRef.current) clearTimeout(hideRef.current);
    },
    [],
  );

  const handleChapterBodyChange = useCallback(
    (chapterId: string, doc: unknown) => {
      setPublication((prev) => ({
        ...prev,
        chapters: prev.chapters.map((c) =>
          c.id === chapterId ? { ...c, body: doc } : c,
        ),
      }));
      const prev = pendingChapterRef.current.get(chapterId) ?? {};
      pendingChapterRef.current.set(chapterId, {
        ...prev,
        body: doc as Record<string, unknown>,
      });
      triggerAutosave();
    },
    [triggerAutosave],
  );

  const handleBodyChange = useCallback(
    (doc: unknown) => {
      setPublication((prev) => ({ ...prev, body: doc }));
      pendingRef.current.body = doc as PublicationEditorRecord["body"];
      triggerAutosave();
    },
    [triggerAutosave],
  );

  const handleChapterTitleChange = useCallback(
    (chapterId: string, title: string) => {
      setPublication((prev) => ({
        ...prev,
        chapters: prev.chapters.map((c) =>
          c.id === chapterId ? { ...c, title } : c,
        ),
      }));
      const prev = pendingChapterRef.current.get(chapterId) ?? {};
      pendingChapterRef.current.set(chapterId, { ...prev, title });
      triggerAutosave();
    },
    [triggerAutosave],
  );

  const handleMetadataChange = useCallback(
    (patch: Partial<PublicationEditorRecord>) => {
      setPublication((prev) => ({ ...prev, ...patch }));
      // Merge only string / boolean / null fields the backend accepts.
      const backendPatch: Record<string, unknown> = {};
      if (patch.title !== undefined) backendPatch.title = patch.title;
      if (patch.summary !== undefined) backendPatch.summary = patch.summary;
      if (patch.language !== undefined) backendPatch.language = patch.language;
      if (patch.license !== undefined) backendPatch.license = patch.license;
      if (patch.cover_url !== undefined) backendPatch.cover_url = patch.cover_url;
      pendingRef.current = { ...pendingRef.current, ...backendPatch };
      triggerAutosave();
    },
    [triggerAutosave],
  );

  const handleAddChapter = useCallback(() => {
    setPublication((prev) => {
      const newId = `ch-${prev.chapters.length + 1}-${Date.now().toString(36)}`;
      return {
        ...prev,
        chapters: [
          ...prev.chapters,
          {
            id: newId,
            title: "New chapter",
            body: { type: "doc", content: [{ type: "paragraph" }] },
            word_count: 0,
          },
        ],
      };
    });
    triggerAutosave();
  }, [triggerAutosave]);

  const handleOpenSettings = useCallback(() => {
    Toast.push({
      tone: "info",
      title: "Publication Settings",
      body: "Settings surface ships next in the H07 Cluster B sprint (#6).",
    });
  }, []);

  const handleNavigateHome = useCallback(() => {
    navigate("/publications");
  }, [navigate]);

  return (
    <PublicationEditorSurface
      publication={publication}
      activeChapterId={activeChapterId}
      onActiveChapterChange={setActiveChapterId}
      onChapterBodyChange={handleChapterBodyChange}
      onBodyChange={handleBodyChange}
      onChapterTitleChange={handleChapterTitleChange}
      onMetadataChange={handleMetadataChange}
      onAddChapter={handleAddChapter}
      onOpenSettings={handleOpenSettings}
      onNavigateHome={handleNavigateHome}
      autosaveState={autosaveState}
      lastSavedLabel={lastSavedLabel}
    />
  );
}
