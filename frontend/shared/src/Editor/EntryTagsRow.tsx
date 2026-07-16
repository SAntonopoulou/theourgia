/**
 * EntryTagsRow — compact tag-chip row for the entry Editor (v1-001).
 *
 * Sits below the title input. Typing a tag and pressing Enter appends
 * a chip; chips are removable (each remove button carries a
 * "Remove {tag}" aria-label via the Chip primitive); Backspace in the
 * empty input removes the last chip. The component is presentational —
 * the mounting surface persists `onChange` results (the admin Editor
 * PATCHes via `updateEntry`, mirroring the title's save pattern).
 */

import { useState, type CSSProperties, type KeyboardEvent } from "react";

import { Chip } from "../Chip/index.js";

export interface EntryTagsRowProps {
  /** Visible row label — "Tags" or "Tradition tags". */
  label: string;
  /** Current tag list. */
  values: string[];
  /** Fired with the full next list on every add / remove. */
  onChange: (next: string[]) => void;
  /** Input placeholder. Defaults to "Add a tag". */
  placeholder?: string;
  disabled?: boolean;
}

const labelStyle: CSSProperties = {
  fontFamily: "var(--font-ui)",
  fontSize: 10.5,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  color: "var(--ink-mute)",
  flexShrink: 0,
  minWidth: 96,
};

const inputStyle: CSSProperties = {
  border: "none",
  outline: "none",
  background: "transparent",
  fontFamily: "var(--font-ui)",
  fontSize: 12.5,
  color: "var(--ink)",
  padding: "6px 0",
  minWidth: 120,
  flex: 1,
};

export function EntryTagsRow({
  label,
  values,
  onChange,
  placeholder = "Add a tag",
  disabled = false,
}: EntryTagsRowProps) {
  const [draft, setDraft] = useState("");

  function commitDraft(): void {
    const trimmed = draft.trim();
    if (!trimmed) return;
    setDraft("");
    if (values.includes(trimmed)) return;
    onChange([...values, trimmed]);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>): void {
    if (event.key === "Enter") {
      event.preventDefault();
      commitDraft();
      return;
    }
    if (event.key === "Backspace" && draft === "" && values.length > 0) {
      event.preventDefault();
      onChange(values.slice(0, -1));
    }
  }

  return (
    <div
      data-role="entry-tags-row"
      style={{
        display: "flex",
        alignItems: "center",
        flexWrap: "wrap",
        gap: 6,
      }}
    >
      <span style={labelStyle}>{label}</span>
      {values.map((tag) => (
        <Chip
          key={tag}
          label={tag}
          removable
          selected
          disabled={disabled}
          onToggle={() => onChange(values.filter((t) => t !== tag))}
        />
      ))}
      <input
        type="text"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        aria-label={`${label} — type and press Enter to add`}
        disabled={disabled}
        style={inputStyle}
      />
    </div>
  );
}
