/**
 * Theourgia Editor — live Tiptap editor with the format toolbar,
 * slash menu, and 6 custom block nodes (ritualLog · quoteCitation ·
 * gematria · sensation · entityRef · sigil).
 *
 * The shape this surface composes against is `Theourgia Editor.dc.html`
 * from the base 50-bundle. Behavior:
 *
 *   - `/` opens the slash menu; arrow keys + Enter pick a block,
 *     Escape closes. Typing after `/` filters the catalog.
 *   - Format toolbar drives bold / italic / small-caps / link marks
 *     plus an inline language chip (EN · ΕΛ · עב) that toggles the
 *     `lang` mark with the corresponding script.
 *   - The document round-trips as Tiptap JSON via `initialDoc` /
 *     `onChange`. The 6 custom blocks store their parameters as node
 *     attrs so the same JSON renders identically in the read view.
 */

import { type Editor } from "@tiptap/core";
import { EditorContent, useEditor } from "@tiptap/react";
import {
  type KeyboardEvent as ReactKeyboardEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import type { BookRecord, EntityRecord } from "../api/types.js";

import { EditorDataProvider, type ChartFetchFn } from "./EditorContext.js";
import { buildExtensions, type LangScript } from "./extensions.js";
import { SlashMenu } from "./SlashMenu.js";
import { filterSlashCommands, type SlashCommand } from "./slashCommands.js";
import { Toolbar } from "./Toolbar.js";

export interface TiptapEditorProps {
  /** Initial Tiptap JSON document. Defaults to an empty paragraph. */
  initialDoc?: unknown;
  /** Fires on every change with the editor's current JSON doc. */
  onChange?: (doc: unknown) => void;
  /** Placeholder shown when the document is empty. */
  placeholder?: string;
  /** If false, the editor renders read-only (no toolbar, no slash). */
  editable?: boolean;
  /** Entities surfaced to the EntityPicker. Optional — picker shows an empty state when unset. */
  entities?: readonly EntityRecord[];
  /** Library books surfaced to the LibraryPicker. */
  books?: readonly BookRecord[];
  /** Async fetcher for the ChartPicker. Optional. */
  fetchChart?: ChartFetchFn;
}

const EMPTY_DOC = { type: "doc", content: [{ type: "paragraph" }] };

interface SlashState {
  open: boolean;
  query: string;
  /** ProseMirror position where the leading "/" was typed. */
  from: number;
  /** Active row in the filtered menu. */
  active: number;
  /** Coordinates of the slash relative to the editor scroll surface. */
  coords: { top: number; left: number } | null;
}

const INITIAL_SLASH: SlashState = {
  open: false,
  query: "",
  from: 0,
  active: 0,
  coords: null,
};

export function TiptapEditor({
  initialDoc,
  onChange,
  placeholder,
  editable = true,
  entities,
  books,
  fetchChart,
}: TiptapEditorProps): React.ReactElement {
  const [lang, setLang] = useState<LangScript>("en");
  const [slash, setSlash] = useState<SlashState>(INITIAL_SLASH);
  const slashRef = useRef(slash);
  slashRef.current = slash;

  const extensions = useMemo(() => buildExtensions({ placeholder }), [placeholder]);

  const editor = useEditor({
    extensions,
    content: (initialDoc as object | undefined) ?? EMPTY_DOC,
    editable,
    onUpdate({ editor: ed }) {
      onChange?.(ed.getJSON());
      const next = computeSlashState(ed, slashRef.current);
      if (!slashStateEqual(next, slashRef.current)) {
        setSlash(next);
      }
    },
    onSelectionUpdate({ editor: ed }) {
      const next = computeSlashState(ed, slashRef.current);
      if (!slashStateEqual(next, slashRef.current)) {
        setSlash(next);
      }
    },
  });

  // Surface the editor to layout-aware children (e.g. tests) without
  // requiring them to mount their own editor instance.
  const editorRef = useRef<Editor | null>(null);
  editorRef.current = editor;

  const items = useMemo(() => filterSlashCommands(slash.query), [slash.query]);

  const closeSlash = useCallback(() => {
    setSlash(INITIAL_SLASH);
  }, []);

  const execCommand = useCallback(
    (cmd: SlashCommand) => {
      if (!editor) return;
      const to = editor.state.selection.to;
      cmd.run(editor, { from: slashRef.current.from, to });
      closeSlash();
    },
    [editor, closeSlash],
  );

  const onInsertBlockClick = useCallback(() => {
    if (!editor) return;
    editor.chain().focus().insertContent("/").run();
  }, [editor]);

  const onKeyDown = useCallback(
    (e: ReactKeyboardEvent<HTMLDivElement>) => {
      if (!slash.open) return;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSlash((s) => ({ ...s, active: Math.min(items.length - 1, s.active + 1) }));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSlash((s) => ({ ...s, active: Math.max(0, s.active - 1) }));
      } else if (e.key === "Enter") {
        const picked = items[slash.active];
        if (picked) {
          e.preventDefault();
          execCommand(picked);
        }
      } else if (e.key === "Escape") {
        e.preventDefault();
        closeSlash();
      }
    },
    [slash.open, slash.active, items, execCommand, closeSlash],
  );

  // Clean up on unmount handled by useEditor.

  useEffect(() => {
    return () => {
      slashRef.current = INITIAL_SLASH;
    };
  }, []);

  if (!editor) {
    return <div data-editor-loading aria-busy="true" />;
  }

  return (
    <EditorDataProvider entities={entities} books={books} fetchChart={fetchChart}>
      <div
        data-editor-root
        onKeyDown={onKeyDown}
        style={{ position: "relative", display: "flex", flexDirection: "column", flex: 1 }}
      >
        {editable && (
          <Toolbar
            editor={editor}
            lang={lang}
            onLangChange={setLang}
            onInsertBlockClick={onInsertBlockClick}
          />
        )}
        <div style={{ position: "relative", flex: 1 }}>
          <EditorContent editor={editor} className="theourgia-editor" />
          <SlashMenu
            open={slash.open}
            query={slash.query}
            activeIndex={slash.active}
            onActiveIndexChange={(i) => setSlash((s) => ({ ...s, active: i }))}
            onSelect={execCommand}
            position={slash.coords ?? undefined}
          />
        </div>
      </div>
    </EditorDataProvider>
  );
}

function slashStateEqual(a: SlashState, b: SlashState): boolean {
  return (
    a.open === b.open &&
    a.query === b.query &&
    a.from === b.from &&
    a.active === b.active &&
    (a.coords?.top === b.coords?.top && a.coords?.left === b.coords?.left)
  );
}

/**
 * Walks back from the caret to find a `/` that's either at the start
 * of a line or preceded by whitespace. Everything between that slash
 * and the caret becomes the query. If no slash is found, returns the
 * closed state.
 */
function computeSlashState(editor: Editor, prev: SlashState): SlashState {
  const { selection, doc } = editor.state;
  if (!selection.empty) return INITIAL_SLASH;

  const $from = selection.$from;
  const parent = $from.parent;
  if (!parent.isTextblock) return INITIAL_SLASH;

  const textBefore = $from.parent.textBetween(0, $from.parentOffset, "\n", "\n");
  // Match: optional whitespace, a slash, then word chars only (no spaces).
  const match = /(^|\s)\/(\w*)$/.exec(textBefore);
  if (!match) return INITIAL_SLASH;

  const query = match[2] ?? "";
  const slashIndex = match.index + (match[1]?.length ?? 0);
  const lineStart = $from.start();
  const slashPos = lineStart + slashIndex;

  let coords: { top: number; left: number } | null = null;
  try {
    const c = editor.view.coordsAtPos(slashPos);
    const rootRect = editor.view.dom.getBoundingClientRect();
    coords = { top: c.bottom - rootRect.top + 6, left: c.left - rootRect.left };
  } catch {
    coords = null;
  }

  const active = prev.from === slashPos ? prev.active : 0;
  // Silence unused-var lint on `doc` — kept for future block-context lookups.
  void doc;
  return { open: true, query, from: slashPos, active, coords };
}
