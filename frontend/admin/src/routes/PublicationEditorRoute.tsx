/**
 * Publication Editor — admin route (H07 §S3 surface 5).
 *
 * Wraps PublicationEditorSurface with a debounced autosave
 * indicator. Phase 10 backend is unbuilt by design (per H07
 * onboarding) — the route holds the publication in memory; once
 * the backend ships it'll wire to GET /publications/{id} +
 * debounced PATCH.
 *
 * Autosave pattern (per H07 worked example point b):
 *   • Any state change → autosaveState = 'saving' immediately.
 *   • 700ms after last edit (debounced) → simulate PATCH +
 *     autosaveState = 'saved'.
 *   • 4s after 'saved' → autosaveState = 'idle' (indicator hides).
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

  // useParams is reserved for when /publications/:id wires up.
  useParams<{ id: string }>();
  const navigate = useNavigate();

  const [publication, setPublication] = useState<PublicationEditorRecord>(
    () => makeFixture(),
  );
  const [activeChapterId, setActiveChapterId] = useState<string | null>(
    publication.chapters[0]?.id ?? null,
  );
  const [autosaveState, setAutosaveState] = useState<AutosaveState>("idle");
  const [lastSavedLabel, setLastSavedLabel] = useState<string | null>(null);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hideRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const triggerAutosave = useCallback(() => {
    setAutosaveState("saving");
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (hideRef.current) clearTimeout(hideRef.current);
    debounceRef.current = setTimeout(() => {
      setAutosaveState("saved");
      setLastSavedLabel(formatTimeOfDay(new Date()));
      hideRef.current = setTimeout(() => {
        setAutosaveState("idle");
      }, HIDE_AFTER_SAVED_MS);
    }, SAVE_DEBOUNCE_MS);
  }, []);

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
      triggerAutosave();
    },
    [triggerAutosave],
  );

  const handleBodyChange = useCallback(
    (doc: unknown) => {
      setPublication((prev) => ({ ...prev, body: doc }));
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
      triggerAutosave();
    },
    [triggerAutosave],
  );

  const handleMetadataChange = useCallback(
    (patch: Partial<PublicationEditorRecord>) => {
      setPublication((prev) => ({ ...prev, ...patch }));
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
