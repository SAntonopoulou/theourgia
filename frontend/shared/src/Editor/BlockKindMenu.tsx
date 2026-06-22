/**
 * Editor — block-kind dropdown.
 *
 * Replaces the static "Paragraph" chip in the toolbar with a real
 * menu. Six options:
 *   Paragraph · Heading 1 · Heading 2 · Heading 3 · Quotation · Code
 *
 * Each option fires the matching Tiptap command. The active row reads
 * back from `editor.isActive(...)` so the chip label tracks the
 * current selection's block kind.
 */

import type { Editor } from "@tiptap/core";
import {
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  useEffect,
  useRef,
  useState,
} from "react";

const LINE = "var(--line)";
const LINE_2 = "var(--line-2)";

export type BlockKind =
  | "paragraph"
  | "heading-1"
  | "heading-2"
  | "heading-3"
  | "quote"
  | "code";

interface BlockKindMeta {
  kind: BlockKind;
  label: string;
  preview: CSSProperties;
}

const BLOCK_KINDS: BlockKindMeta[] = [
  {
    kind: "paragraph",
    label: "Paragraph",
    preview: { fontFamily: "var(--font-serif)", fontSize: 15 },
  },
  {
    kind: "heading-1",
    label: "Heading 1",
    preview: { fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 700 },
  },
  {
    kind: "heading-2",
    label: "Heading 2",
    preview: { fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 700 },
  },
  {
    kind: "heading-3",
    label: "Heading 3",
    preview: { fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 700 },
  },
  {
    kind: "quote",
    label: "Quotation",
    preview: { fontFamily: "var(--font-serif)", fontSize: 15, fontStyle: "italic" },
  },
  {
    kind: "code",
    label: "Code",
    preview: { fontFamily: "var(--font-mono)", fontSize: 13 },
  },
];

export function detectBlockKind(editor: Editor): BlockKind {
  if (editor.isActive("heading", { level: 1 })) return "heading-1";
  if (editor.isActive("heading", { level: 2 })) return "heading-2";
  if (editor.isActive("heading", { level: 3 })) return "heading-3";
  if (editor.isActive("blockquote")) return "quote";
  if (editor.isActive("codeBlock")) return "code";
  return "paragraph";
}

export function applyBlockKind(editor: Editor, kind: BlockKind): void {
  const chain = editor.chain().focus();
  switch (kind) {
    case "paragraph":
      chain.setParagraph().run();
      return;
    case "heading-1":
      chain.setHeading({ level: 1 }).run();
      return;
    case "heading-2":
      chain.setHeading({ level: 2 }).run();
      return;
    case "heading-3":
      chain.setHeading({ level: 3 }).run();
      return;
    case "quote":
      chain.setParagraph().wrapIn("blockquote").run();
      return;
    case "code":
      chain.setCodeBlock().run();
      return;
  }
}

export interface BlockKindMenuProps {
  editor: Editor;
}

export function BlockKindMenu({ editor }: BlockKindMenuProps) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const active = detectBlockKind(editor);
  const activeMeta = BLOCK_KINDS.find((b) => b.kind === active) ?? BLOCK_KINDS[0]!;

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  const onKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Escape" && open) {
      e.preventDefault();
      setOpen(false);
    }
  };

  return (
    <div ref={wrapRef} onKeyDown={onKeyDown} style={{ position: "relative" }}>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open ? "true" : "false"}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => setOpen((s) => !s)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: "6px 11px",
          border: `1px solid ${LINE}`,
          borderRadius: "var(--r-md)",
          fontFamily: "var(--font-ui)",
          fontSize: 12.5,
          color: "var(--ink-soft)",
          background: open ? "var(--bg-3)" : "transparent",
          cursor: "pointer",
          minWidth: 110,
        }}
      >
        <span>{activeMeta.label}</span>
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      {open && (
        <div
          role="listbox"
          aria-label="Block kind"
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            width: 220,
            background: "var(--bg-2)",
            border: `1px solid ${LINE_2}`,
            borderRadius: "var(--r-md)",
            boxShadow: "0 12px 28px rgba(0,0,0,.4)",
            overflow: "hidden",
            zIndex: 30,
          }}
        >
          {BLOCK_KINDS.map((meta) => {
            const isActive = meta.kind === active;
            return (
              <button
                key={meta.kind}
                type="button"
                role="option"
                aria-selected={isActive ? "true" : "false"}
                onMouseDown={(e) => {
                  e.preventDefault();
                  applyBlockKind(editor, meta.kind);
                  setOpen(false);
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  width: "100%",
                  padding: "9px 12px",
                  border: "none",
                  background: isActive ? "var(--accent-soft)" : "transparent",
                  color: "var(--ink)",
                  cursor: "pointer",
                  textAlign: "left",
                  fontFamily: "var(--font-ui)",
                  fontSize: 13,
                }}
              >
                <span style={{ ...meta.preview, flex: 1, color: "var(--ink)" }}>
                  {meta.label}
                </span>
                {isActive && (
                  <span
                    aria-hidden="true"
                    style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--accent)" }}
                  />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
