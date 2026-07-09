/**
 * Editor — Tiptap extension stack.
 *
 * StarterKit + Link + Placeholder, plus two Theourgia inline marks
 * that the format toolbar drives:
 *
 *   - `lang` — tags a span with its script (greek/hebrew/latin). The
 *     renderer maps each script to its display font + writes a real
 *     `lang` HTML attribute (BCP-47-ish: `el`, `he`, `en`).
 *   - `smallCaps` — the editor's small-caps toggle (Sᴄ button).
 *
 * Custom block nodes (ritualLog, quoteCitation, gematria, sensation,
 * entityRef, sigil, chart, divination) ship in B98+; the slash menu
 * registers a command for each as it lands.
 */

import { Mark, mergeAttributes } from "@tiptap/core";
import Placeholder from "@tiptap/extension-placeholder";
import StarterKit from "@tiptap/starter-kit";

import { LANG_FONT, type LangScript } from "./lang.js";
import { CalendarStampNode } from "./nodes/CalendarStampNode.js";
import { ChartNode } from "./nodes/ChartNode.js";
import { CorrespondenceNode } from "./nodes/CorrespondenceNode.js";
import { DivinationNode } from "./nodes/DivinationNode.js";
import { RitualLogNode } from "./nodes/RitualLogNode.js";
import { QuoteCitationNode } from "./nodes/QuoteCitationNode.js";
import { GematriaNode } from "./nodes/GematriaNode.js";
import { SensationNode } from "./nodes/SensationNode.js";
import { EntityRefNode } from "./nodes/EntityRefNode.js";
import { SigilNode } from "./nodes/SigilNode.js";
import { VoxMagicaeNode } from "./nodes/VoxMagicaeNode.js";
import { VoiceRecordingNode } from "./nodes/VoiceRecordingNode.js";
import { VideoEmbedNode } from "./nodes/VideoEmbedNode.js";

export { LANG_FONT, type LangScript };

/**
 * Inline `lang` mark — tags a run of text with a script. The format
 * toolbar's three-segment lang chip toggles the mark on the current
 * selection (or arms it for the next insertion when collapsed).
 *
 * Round-trip:  <span lang="el" data-script="greek">…</span>
 */
export const LangMark = Mark.create({
  name: "lang",

  addAttributes() {
    return {
      script: {
        default: "en",
        parseHTML: (el: HTMLElement) =>
          el.getAttribute("data-script") ?? "en",
        renderHTML: (attrs: { script: LangScript }) => {
          const bcp47: Record<LangScript, string> = {
            el: "el",
            he: "he",
            en: "en",
          };
          return {
            "data-script": attrs.script,
            lang: bcp47[attrs.script as LangScript] ?? "en",
            style: `font-family: ${LANG_FONT[attrs.script as LangScript] ?? LANG_FONT.en}`,
          };
        },
      },
    };
  },

  parseHTML() {
    return [{ tag: "span[data-script]" }];
  },

  renderHTML({ HTMLAttributes }: { HTMLAttributes: Record<string, unknown> }) {
    return ["span", mergeAttributes(HTMLAttributes), 0];
  },
});

/**
 * Inline `smallCaps` mark — the Sᴄ toggle in the format toolbar.
 * Round-trip: <span data-mark="small-caps">…</span>.
 */
export const SmallCapsMark = Mark.create({
  name: "smallCaps",

  parseHTML() {
    return [{ tag: "span[data-mark='small-caps']" }];
  },

  renderHTML({ HTMLAttributes }: { HTMLAttributes: Record<string, unknown> }) {
    return [
      "span",
      mergeAttributes(HTMLAttributes, {
        "data-mark": "small-caps",
        style: "font-variant: small-caps; letter-spacing: 0.04em",
      }),
      0,
    ];
  },
});

export interface BuildExtensionsOptions {
  placeholder?: string;
}

export function buildExtensions(opts: BuildExtensionsOptions = {}) {
  return [
    StarterKit.configure({
      heading: { levels: [1, 2, 3] },
      link: {
        openOnClick: false,
        HTMLAttributes: { rel: "noopener noreferrer" },
      },
    }),
    Placeholder.configure({
      placeholder: opts.placeholder ?? "Begin writing…",
      emptyEditorClass: "is-editor-empty",
    }),
    LangMark,
    SmallCapsMark,
    RitualLogNode,
    QuoteCitationNode,
    GematriaNode,
    SensationNode,
    EntityRefNode,
    SigilNode,
    ChartNode,
    DivinationNode,
    CorrespondenceNode,
    CalendarStampNode,
    VoxMagicaeNode,
    VoiceRecordingNode,
    VideoEmbedNode,
  ];
}
