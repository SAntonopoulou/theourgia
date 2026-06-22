/**
 * Slash menu — command catalogue.
 *
 * Each command corresponds to a custom block node registered in
 * `buildExtensions`. The list is filtered by the user's typed query
 * and rendered by `SlashMenu`.
 */

import type { Editor } from "@tiptap/core";

export interface SlashCommand {
  key: string;
  /** Verbatim slash form (e.g. "/sigil") — shown on the right of the row. */
  command: string;
  title: string;
  description: string;
  /** Designer-supplied SVG path on a 24x24 viewBox. */
  iconPath: string;
  iconColor: string;
  /** Executes the insertion on the given editor + range. */
  run: (editor: Editor, range: { from: number; to: number }) => void;
}

export const SLASH_COMMANDS: SlashCommand[] = [
  {
    key: "sigil",
    command: "/sigil",
    title: "Sigil",
    description: "Embed or construct a sigil",
    iconColor: "var(--c-working)",
    iconPath: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z M12 4.5l6.5 11.3H5.5z",
    run: (editor, range) => {
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .insertContent({ type: "sigil", attrs: { intent: "", sigilId: "", hashSeed: "" } })
        .run();
    },
  },
  {
    key: "quote",
    command: "/quote",
    title: "Quote & citation",
    description: "Cite a work from the Library",
    iconColor: "var(--accent)",
    iconPath: "M7 8h10M7 12h7M7 16h10M4 5v14",
    run: (editor, range) => {
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .insertContent({
          type: "quoteCitation",
          attrs: { sourceText: "", sourceScript: "el", translation: "", citation: "" },
        })
        .run();
    },
  },
  {
    key: "gematria",
    command: "/gematria",
    title: "Gematria",
    description: "Isopsephy / gematria value",
    iconColor: "var(--accent)",
    iconPath: "M5 5h14M9 5v14M5 19h14",
    run: (editor, range) => {
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .insertContent({ type: "gematria", attrs: { word: "", script: "greek", also: "" } })
        .run();
    },
  },
  {
    key: "sensation",
    command: "/sensation",
    title: "Sensation diagram",
    description: "Map sensation on a silhouette",
    iconColor: "var(--c-divination)",
    iconPath: "M12 2.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5z M12 7.5v8M7 11h10M9 21l3-5 3 5",
    run: (editor, range) => {
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .insertContent({ type: "sensation", attrs: { points: [] } })
        .run();
    },
  },
  {
    key: "entity",
    command: "/entity",
    title: "Entity reference",
    description: "Link a god, daemon or angel",
    iconColor: "var(--c-entity)",
    iconPath: "M6 6.5h12M7 9.5h10M9 9.5v8M15 9.5v8M5 20.5h14",
    run: (editor, range) => {
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .insertContent({
          type: "entityRef",
          attrs: { entityId: "", displayName: "", kind: "god" },
        })
        .insertContent(" ")
        .run();
    },
  },
  {
    key: "ritual-log",
    command: "/ritual",
    title: "Ritual log",
    description: "Timestamped steps of a working",
    iconColor: "var(--c-working)",
    iconPath: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z M12 7v5l3 2",
    run: (editor, range) => {
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .insertContent({ type: "ritualLog", attrs: { entries: [] } })
        .run();
    },
  },
];

export function filterSlashCommands(query: string): SlashCommand[] {
  if (!query) return SLASH_COMMANDS;
  const q = query.toLowerCase();
  return SLASH_COMMANDS.filter(
    (c) => c.title.toLowerCase().includes(q) || c.key.toLowerCase().includes(q),
  );
}
