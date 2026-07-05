/**
 * Editor — format toolbar.
 *
 * Lifted from `Theourgia Editor.dc.html`. Buttons drive marks on the
 * live Tiptap editor; the language chip toggles the `lang` mark with
 * the chosen script.
 */

import type { Editor } from "@tiptap/core";
import { type CSSProperties, type ReactElement, useState } from "react";

import { PromptDialog } from "../Dialog/PromptDialog.js";
import { BlockKindMenu } from "./BlockKindMenu.js";
import type { LangScript } from "./extensions.js";

const LINE = "var(--line)";
const LINE_2 = "var(--line-2)";

const LANG_LABEL: Record<LangScript, string> = {
  en: "EN",
  el: "ΕΛ",
  he: "עב",
};

interface ToolbarButtonProps {
  label?: string;
  ariaLabel: string;
  active?: boolean;
  italic?: boolean;
  monospace?: boolean;
  smallCaps?: boolean;
  onClick?: () => void;
  children?: ReactElement;
}

function ToolbarButton({
  label,
  ariaLabel,
  active,
  italic,
  monospace,
  smallCaps,
  onClick,
  children,
}: ToolbarButtonProps) {
  const base: CSSProperties = {
    width: smallCaps ? "auto" : 32,
    height: 32,
    padding: smallCaps ? "0 8px" : 0,
    borderRadius: "var(--r-sm)",
    fontFamily: monospace ? "var(--font-mono)" : "var(--font-serif)",
    fontWeight: italic || smallCaps ? 400 : 700,
    fontStyle: italic ? "italic" : "normal",
    fontSize: smallCaps ? 12 : 15,
    letterSpacing: smallCaps ? "0.04em" : "normal",
    color: active ? "var(--ink)" : "var(--ink-soft)",
    background: active ? "var(--bg-3)" : "transparent",
    border: "none",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  };
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      aria-pressed={active ? "true" : "false"}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      style={base}
    >
      {children ?? label}
    </button>
  );
}

interface LangButtonProps {
  value: LangScript;
  current: LangScript;
  onClick: () => void;
}

function LangButton({ value, current, onClick }: LangButtonProps) {
  const active = value === current;
  return (
    <button
      type="button"
      aria-pressed={active ? "true" : "false"}
      aria-label={`Set language to ${LANG_LABEL[value]}`}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      style={{
        padding: "5px 11px",
        fontFamily: "var(--font-ui)",
        fontSize: 12,
        color: active ? "var(--ink)" : "var(--ink-mute)",
        background: active ? "var(--accent-soft)" : "transparent",
        border: "none",
        cursor: "pointer",
      }}
    >
      {LANG_LABEL[value]}
    </button>
  );
}

export interface ToolbarProps {
  editor: Editor;
  /** Current armed language (for the next inserted span). */
  lang: LangScript;
  onLangChange: (lang: LangScript) => void;
  onInsertBlockClick: () => void;
}

export function Toolbar({ editor, lang, onLangChange, onInsertBlockClick }: ToolbarProps) {
  const isBold = editor.isActive("bold");
  const isItalic = editor.isActive("italic");
  const isSmallCaps = editor.isActive("smallCaps");
  const isLink = editor.isActive("link");
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [linkInitial, setLinkInitial] = useState("");

  const setLang = (value: LangScript) => {
    onLangChange(value);
    if (value === "en") {
      editor.chain().focus().unsetMark("lang").run();
    } else {
      editor
        .chain()
        .focus()
        .setMark("lang", { script: value })
        .run();
    }
  };

  return (
    <>
    <div
      data-editor-toolbar
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        padding: "8px 28px",
        borderBottom: `1px solid ${LINE}`,
        background: "var(--bg-2)",
        flexWrap: "wrap",
      }}
    >
      <BlockKindMenu editor={editor} />
      <span style={{ width: 1, height: 22, background: LINE, margin: "0 3px" }} />
      <ToolbarButton
        label="B"
        ariaLabel="Bold"
        active={isBold}
        onClick={() => editor.chain().focus().toggleBold().run()}
      />
      <ToolbarButton
        label="I"
        ariaLabel="Italic"
        active={isItalic}
        italic
        onClick={() => editor.chain().focus().toggleItalic().run()}
      />
      <ToolbarButton
        label="Sᴄ"
        ariaLabel="Small caps"
        active={isSmallCaps}
        smallCaps
        onClick={() => editor.chain().focus().toggleMark("smallCaps").run()}
      />
      <ToolbarButton
        ariaLabel="Link"
        active={isLink}
        onClick={() => {
          const prev = editor.getAttributes("link").href as string | undefined;
          setLinkInitial(prev ?? "https://");
          setLinkDialogOpen(true);
        }}
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden="true">
          <path d="M10 13a5 5 0 0 0 7 0l2-2a5 5 0 0 0-7-7l-1 1M14 11a5 5 0 0 0-7 0l-2 2a5 5 0 0 0 7 7l1-1" />
        </svg>
      </ToolbarButton>
      <span style={{ width: 1, height: 22, background: LINE, margin: "0 3px" }} />
      <div
        role="group"
        aria-label="Inline language"
        style={{ display: "flex", border: `1px solid ${LINE}`, borderRadius: "var(--r-md)", overflow: "hidden" }}
      >
        <LangButton value="en" current={lang} onClick={() => setLang("en")} />
        <LangButton value="el" current={lang} onClick={() => setLang("el")} />
        <LangButton value="he" current={lang} onClick={() => setLang("he")} />
      </div>
      <button
        type="button"
        aria-label="Insert magickal block"
        onMouseDown={(e) => e.preventDefault()}
        onClick={onInsertBlockClick}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          marginLeft: "auto",
          padding: "6px 12px",
          border: `1px solid ${LINE_2}`,
          borderRadius: "var(--r-md)",
          fontFamily: "var(--font-ui)",
          fontSize: 12.5,
          color: "var(--ink)",
          background: "transparent",
          cursor: "pointer",
        }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden="true">
          <path d="M12 5v14M5 12h14" />
        </svg>
        Insert block · /
      </button>
    </div>
    <PromptDialog
      open={linkDialogOpen}
      title="Link URL"
      label="URL (empty to remove the link)"
      placeholder="https://"
      defaultValue={linkInitial}
      confirmLabel="Set link"
      onSubmit={(value) => {
        setLinkDialogOpen(false);
        if (value === "") {
          editor.chain().focus().extendMarkRange("link").unsetLink().run();
          return;
        }
        editor
          .chain()
          .focus()
          .extendMarkRange("link")
          .setLink({ href: value })
          .run();
      }}
      onCancel={() => setLinkDialogOpen(false)}
    />
    </>
  );
}
