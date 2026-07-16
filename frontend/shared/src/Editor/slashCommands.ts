/**
 * Slash menu — command catalogue.
 *
 * Each command corresponds to a custom block node registered in
 * `buildExtensions`. The list is filtered by the user's typed query
 * and rendered by `SlashMenu`.
 */

import type { Editor } from "@tiptap/core";

import {
  pickGeomancySnapshot,
  pickIchingSnapshot,
  pickRunesSnapshot,
  pickTarotSnapshot,
} from "./nodes/DivinationNode.js";

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
  {
    key: "chart",
    command: "/chart",
    title: "Chart",
    description: "Natal, horary or election chart",
    iconColor: "var(--c-divination)",
    iconPath: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z M12 3v18M3 12h18",
    run: (editor, range) => {
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .insertContent({
          type: "chart",
          attrs: { title: "", description: "", snapshot: null },
        })
        .run();
    },
  },
  {
    key: "tarot",
    command: "/tarot",
    title: "Tarot reading",
    description: "Three-card spread (deterministic seed)",
    iconColor: "var(--c-divination)",
    iconPath: "M4 4h6v16H4z M14 4h6v16h-6z",
    run: (editor, range) => {
      const seed = Math.floor(Math.random() * 2 ** 31);
      const cards = pickTarotSnapshot("three", seed);
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .insertContent({
          type: "divination",
          attrs: { kind: "tarot", seed, question: "", spread: "three", cards, lines: [] },
        })
        .run();
    },
  },
  {
    key: "iching",
    command: "/iching",
    title: "I Ching cast",
    description: "Six-line cast (deterministic seed)",
    iconColor: "var(--c-divination)",
    iconPath: "M3 5h18M3 9h7M14 9h7M3 13h18M3 17h7M14 17h7",
    run: (editor, range) => {
      const seed = Math.floor(Math.random() * 2 ** 31);
      const lines = pickIchingSnapshot(seed);
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .insertContent({
          type: "divination",
          attrs: { kind: "iching", seed, question: "", spread: "three", cards: [], lines },
        })
        .run();
    },
  },
  {
    key: "geomancy",
    command: "/geomancy",
    title: "Geomancy cast",
    description: "Four mothers → shield → judge",
    iconColor: "var(--c-divination)",
    iconPath: "M6 5h2M14 5h2M6 9h2M14 9h2M6 13h2M14 13h2M6 17h2M14 17h2",
    run: (editor, range) => {
      const seed = Math.floor(Math.random() * 2 ** 31);
      const mothers = pickGeomancySnapshot(seed);
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .insertContent({
          type: "divination",
          attrs: { kind: "geomancy", seed, question: "", mothers },
        })
        .run();
    },
  },
  {
    key: "runes",
    command: "/runes",
    title: "Rune cast",
    description: "Elder Futhark three-rune draw",
    iconColor: "var(--c-divination)",
    iconPath: "M5 4v16M8 4l4 6-4 6M16 4v16M14 12h4",
    run: (editor, range) => {
      const seed = Math.floor(Math.random() * 2 ** 31);
      const runes = pickRunesSnapshot(3, seed);
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .insertContent({
          type: "divination",
          attrs: { kind: "runes", seed, question: "", runes, runeSize: 3 },
        })
        .run();
    },
  },
  {
    key: "voce",
    command: "/voce",
    title: "Vox magica",
    description: "Embed an utterance with transliteration",
    iconColor: "var(--c-working)",
    iconPath: "M12 4v16M8 8v8M16 8v8M4 11v2M20 11v2",
    run: (editor, range) => {
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .insertContent({
          type: "voxMagicae",
          attrs: {
            voceId: null,
            text: "",
            script: "grc",
            transliteration: "",
            ipa: "",
            citation: "",
          },
        })
        .run();
    },
  },
  {
    key: "correspondence",
    command: "/correspondence",
    title: "Correspondence table",
    description: "Planetary · elemental · decan attributions",
    iconColor: "var(--accent)",
    iconPath: "M4 6h16M4 12h16M4 18h16",
    run: (editor, range) => {
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .insertContent({
          type: "correspondence",
          attrs: { subject: "", rows: [] },
        })
        .run();
    },
  },
  {
    key: "calendar-stamp",
    command: "/calendar",
    title: "Calendar stamp",
    description: "Multi-calendar snapshot of a moment",
    iconColor: "var(--c-synchronicity)",
    iconPath: "M4 6h16v14H4z M4 10h16 M9 4v4 M15 4v4",
    run: (editor, range) => {
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .insertContent({
          type: "calendarStamp",
          attrs: {
            at: new Date().toISOString(),
            note: "",
            calendars: ["gregorian", "hebrew", "thelemic"],
          },
        })
        .run();
    },
  },
  {
    key: "voice",
    command: "/voice",
    title: "Voice recording",
    description: "Audio embed with caption + transcript",
    iconColor: "var(--accent)",
    iconPath: "M9 4h6v12H9z M6 12v2a6 6 0 0 0 12 0v-2 M12 20v1",
    run: (editor, range) => {
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .insertContent({
          type: "voiceRecording",
          attrs: {
            assetId: null,
            url: "",
            caption: "",
            transcript: "",
            duration: null,
          },
        })
        .run();
    },
  },
  {
    key: "video",
    command: "/video",
    title: "Video",
    description: "Video embed (YouTube · Cloudflare Stream · Mux) with chapters + captions",
    iconColor: "var(--accent)",
    iconPath: "M2 4h20v16H2z M10 8v8l6-4z",
    run: (editor, range) => {
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .insertContent({
          type: "videoEmbed",
          attrs: {
            provider: "youtube",
            video_id: "",
            youtube_id: "",
            title: "",
            caption: "",
            captions_url: "",
            chapters: [],
          },
        })
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
