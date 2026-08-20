/**
 * A rite written as one continuous script, with the lightest possible markup.
 *
 * This is a faithful port of the phone's `lib/domain/rite_script.dart` — the
 * two surfaces must read a rite the same way, since the `script` string crosses
 * verbatim in the record sync. The marks:
 *
 *   | Typed        | Means                                        |
 *   |--------------|----------------------------------------------|
 *   | `(face East)`| an instruction — what the body does          |
 *   | `# The Cross`| a section of the rite                        |
 *   | `*ΙΑΩ*`      | emphasis, for a name vibrated rather than said|
 *   | anything else| liturgy, said aloud                          |
 *
 * Parsing produces a *view*: the stored string is never normalised, reflowed or
 * trimmed. The parser is total — there is no invalid input. An unclosed
 * parenthesis runs to the end of its line and is an instruction; an unclosed
 * asterisk is simply an asterisk.
 */

/** One run of characters within a line. */
export type ScriptSpan =
  | { kind: "spoken"; text: string; emphasised: boolean }
  | { kind: "instruction"; text: string };

/** One block of the script. */
export type ScriptBlock =
  | { kind: "heading"; text: string }
  | { kind: "line"; spans: ScriptSpan[] }
  | { kind: "break" };

/** The marks, for a hint shown under an editor. */
export const RITE_SYNTAX_HINT = "( ) for what you do · # for a section · *word* to vibrate";

/** Whether anything has been written at all. */
export function isRiteEmpty(script: string): boolean {
  return script.trim().length === 0;
}

/** Split a spoken run on `*emphasis*`. An unmatched asterisk is left literal. */
function emphasis(text: string): ScriptSpan[] {
  const out: ScriptSpan[] = [];
  const pattern = /\*([^*]+)\*/g;
  let index = 0;
  for (let m = pattern.exec(text); m !== null; m = pattern.exec(text)) {
    if (m.index > index) {
      out.push({ kind: "spoken", text: text.slice(index, m.index), emphasised: false });
    }
    out.push({ kind: "spoken", text: m[1] ?? "", emphasised: true });
    index = m.index + m[0].length;
  }
  if (index < text.length) {
    out.push({ kind: "spoken", text: text.slice(index), emphasised: false });
  }
  return out;
}

/** Split one line into instruction and spoken runs. */
function spansOf(line: string): ScriptSpan[] {
  const spans: ScriptSpan[] = [];
  let buffer = "";

  const flushSpoken = (): void => {
    if (buffer.length === 0) return;
    spans.push(...emphasis(buffer));
    buffer = "";
  };

  let depth = 0;
  let instruction = "";
  // Iterate by code point so polytonic Greek (base letter + combining marks)
  // and anything outside the BMP is left exactly as typed.
  for (const char of line) {
    if (char === "(") {
      if (depth === 0) {
        flushSpoken();
      } else {
        // Nested parentheses stay part of the instruction text rather than
        // opening a second one, so "(turn (slowly))" reads as written.
        instruction += char;
      }
      depth++;
      continue;
    }
    if (char === ")" && depth > 0) {
      depth--;
      if (depth === 0) {
        spans.push({ kind: "instruction", text: instruction });
        instruction = "";
      } else {
        instruction += char;
      }
      continue;
    }
    if (depth > 0) {
      instruction += char;
    } else {
      buffer += char;
    }
  }

  // An unclosed parenthesis runs to the end of the line — the practitioner
  // meant an instruction and simply has not typed the bracket yet.
  if (depth > 0) {
    spans.push({ kind: "instruction", text: instruction });
  }
  flushSpoken();
  return spans;
}

/** The heading of a `#`-prefixed line, or null. Levels are not distinguished. */
function headingOf(line: string): ScriptBlock | null {
  const trimmed = line.replace(/^\s+/, "");
  if (!trimmed.startsWith("#")) return null;
  return { kind: "heading", text: trimmed.replace(/^#+\s*/, "") };
}

/** Parse a script into blocks for rendering. Pure and total. */
export function parseRite(script: string): ScriptBlock[] {
  const blocks: ScriptBlock[] = [];
  // Split on \n keeps every blank line, which is the point — a blank line the
  // practitioner typed is kept as space, because the spacing of a liturgy is
  // part of how it is read aloud.
  for (const raw of script.split("\n")) {
    const line = raw.replace(/\s+$/, "");
    if (line.trim().length === 0) {
      blocks.push({ kind: "break" });
      continue;
    }
    const heading = headingOf(line);
    if (heading) {
      blocks.push(heading);
      continue;
    }
    blocks.push({ kind: "line", spans: spansOf(line) });
  }
  return blocks;
}

/** The words alone, instructions and marks stripped — for a summary or count. */
export function spokenOnly(script: string): string {
  const out: string[] = [];
  for (const block of parseRite(script)) {
    if (block.kind !== "line") continue;
    const said = block.spans
      .filter((s): s is Extract<ScriptSpan, { kind: "spoken" }> => s.kind === "spoken")
      .map((s) => s.text)
      .join("")
      .trim();
    if (said.length > 0) out.push(said);
  }
  return out.join("\n");
}
