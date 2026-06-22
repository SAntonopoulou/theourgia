/**
 * Sandboxed expression evaluator for the Sigil Generator's
 * user-supplied parametric formula mode.
 *
 * The practitioner types something like `r = sin(g*θ) + 0.3*cos(3*t)`.
 * Per H05 §S3 + the original Phase 07 plan: the evaluator must be
 * sandboxed — whitelist of (sin · cos · tan · sqrt · pow · log · abs ·
 * exp · floor · ceil · round · π · e · g · θ · t · numeric literals ·
 * + - * / % ^) only.
 *
 * **No `eval`, no `Function()`, no DOM access, no property reads on
 * arbitrary objects.** A small recursive-descent parser produces an
 * AST; the evaluator walks the AST in O(n) time. Invalid input
 * returns `{ ok: false, error }` — never throws into the React tree.
 *
 * Caret `^` is exponentiation (matches the magickal/mathematical
 * convention, not bitwise-XOR — there is no bitwise in this language).
 */

export interface EvalContext {
  /** The polar angle in radians. Defaults to 0. */
  θ: number;
  /** The gematria value associated with the intention. Defaults to 1. */
  g: number;
  /** The time parameter (animation phase). Defaults to 0. */
  t: number;
}

export type EvalResult =
  | { ok: true; value: number }
  | { ok: false; error: string };

const ALLOWED_FUNCS: Record<string, (...args: number[]) => number> = {
  sin: Math.sin,
  cos: Math.cos,
  tan: Math.tan,
  sqrt: Math.sqrt,
  pow: (a, b) => Math.pow(a, b),
  log: Math.log,
  abs: Math.abs,
  exp: Math.exp,
  floor: Math.floor,
  ceil: Math.ceil,
  round: Math.round,
  min: (...xs) => Math.min(...xs),
  max: (...xs) => Math.max(...xs),
};

const ALLOWED_CONSTS: Record<string, number> = {
  π: Math.PI,
  pi: Math.PI,
  e: Math.E,
};

/** Tokenises an expression into a flat stream. Throws (caught by
 *  `evalFormula`) on illegal characters. */
type Tok =
  | { kind: "num"; value: number }
  | { kind: "ident"; value: string }
  | { kind: "op"; value: "+" | "-" | "*" | "/" | "%" | "^" }
  | { kind: "lparen" }
  | { kind: "rparen" }
  | { kind: "comma" };

function tokenize(input: string): Tok[] {
  const toks: Tok[] = [];
  let i = 0;
  const n = input.length;
  while (i < n) {
    const c = input[i]!;
    if (c === " " || c === "\t" || c === "\n") {
      i++;
      continue;
    }
    if (c === "(") {
      toks.push({ kind: "lparen" });
      i++;
      continue;
    }
    if (c === ")") {
      toks.push({ kind: "rparen" });
      i++;
      continue;
    }
    if (c === ",") {
      toks.push({ kind: "comma" });
      i++;
      continue;
    }
    if ("+-*/%^".includes(c)) {
      toks.push({ kind: "op", value: c as "+" });
      i++;
      continue;
    }
    if ((c >= "0" && c <= "9") || c === ".") {
      let j = i;
      while (
        j < n &&
        ((input[j]! >= "0" && input[j]! <= "9") || input[j] === ".")
      ) {
        j++;
      }
      const v = Number(input.slice(i, j));
      if (!Number.isFinite(v)) {
        throw new Error(`Invalid number near "${input.slice(i, j)}"`);
      }
      toks.push({ kind: "num", value: v });
      i = j;
      continue;
    }
    // Identifier: ascii letters + a tiny set of unicode (θ, π).
    if (
      (c >= "a" && c <= "z") ||
      (c >= "A" && c <= "Z") ||
      c === "θ" ||
      c === "π" ||
      c === "_"
    ) {
      let j = i;
      while (j < n) {
        const cj = input[j]!;
        if (
          (cj >= "a" && cj <= "z") ||
          (cj >= "A" && cj <= "Z") ||
          (cj >= "0" && cj <= "9") ||
          cj === "θ" ||
          cj === "π" ||
          cj === "_"
        ) {
          j++;
        } else {
          break;
        }
      }
      toks.push({ kind: "ident", value: input.slice(i, j) });
      i = j;
      continue;
    }
    throw new Error(`Unexpected character: ${JSON.stringify(c)}`);
  }
  return toks;
}

/* ─── Recursive-descent parser → number ─────────────────────────────── */

class Parser {
  private pos = 0;
  constructor(
    private readonly toks: Tok[],
    private readonly ctx: EvalContext,
  ) {}

  evaluate(): number {
    const v = this.parseExpr();
    if (this.pos < this.toks.length) {
      throw new Error(
        `Unexpected token after expression: ${JSON.stringify(this.toks[this.pos])}`,
      );
    }
    return v;
  }

  private peek(): Tok | undefined {
    return this.toks[this.pos];
  }

  private consume(): Tok {
    const tok = this.toks[this.pos];
    if (tok === undefined) throw new Error("Unexpected end of expression");
    this.pos++;
    return tok;
  }

  // expr := term (('+' | '-') term)*
  private parseExpr(): number {
    let v = this.parseTerm();
    while (true) {
      const t = this.peek();
      if (t && t.kind === "op" && (t.value === "+" || t.value === "-")) {
        this.consume();
        const rhs = this.parseTerm();
        v = t.value === "+" ? v + rhs : v - rhs;
      } else {
        break;
      }
    }
    return v;
  }

  // term := factor (('*' | '/' | '%') factor)*
  private parseTerm(): number {
    let v = this.parseFactor();
    while (true) {
      const t = this.peek();
      if (
        t &&
        t.kind === "op" &&
        (t.value === "*" || t.value === "/" || t.value === "%")
      ) {
        this.consume();
        const rhs = this.parseFactor();
        if (t.value === "*") v = v * rhs;
        else if (t.value === "/") v = v / rhs;
        else v = v % rhs;
      } else {
        break;
      }
    }
    return v;
  }

  // factor := unary ('^' factor)?   (right-associative)
  private parseFactor(): number {
    const base = this.parseUnary();
    const t = this.peek();
    if (t && t.kind === "op" && t.value === "^") {
      this.consume();
      const exp = this.parseFactor();
      return Math.pow(base, exp);
    }
    return base;
  }

  // unary := '-' unary | '+' unary | atom
  private parseUnary(): number {
    const t = this.peek();
    if (t && t.kind === "op" && (t.value === "+" || t.value === "-")) {
      this.consume();
      const v = this.parseUnary();
      return t.value === "-" ? -v : v;
    }
    return this.parseAtom();
  }

  // atom := number | ident | ident '(' args? ')' | '(' expr ')'
  private parseAtom(): number {
    const tok = this.consume();
    if (tok.kind === "num") return tok.value;
    if (tok.kind === "lparen") {
      const v = this.parseExpr();
      const close = this.consume();
      if (close.kind !== "rparen") {
        throw new Error("Expected closing ')'");
      }
      return v;
    }
    if (tok.kind === "ident") {
      const next = this.peek();
      if (next && next.kind === "lparen") {
        // Function call.
        const fn = ALLOWED_FUNCS[tok.value];
        if (!fn) throw new Error(`Unknown function: ${tok.value}`);
        this.consume(); // (
        const args: number[] = [];
        const after = this.peek();
        if (after && after.kind !== "rparen") {
          args.push(this.parseExpr());
          while (this.peek()?.kind === "comma") {
            this.consume();
            args.push(this.parseExpr());
          }
        }
        const close = this.consume();
        if (close.kind !== "rparen") {
          throw new Error("Expected closing ')'");
        }
        return fn(...args);
      }
      // Constant or context variable.
      if (tok.value in ALLOWED_CONSTS) return ALLOWED_CONSTS[tok.value]!;
      if (tok.value === "θ" || tok.value === "theta") return this.ctx.θ;
      if (tok.value === "g") return this.ctx.g;
      if (tok.value === "t") return this.ctx.t;
      throw new Error(`Unknown identifier: ${tok.value}`);
    }
    throw new Error(`Unexpected token: ${JSON.stringify(tok)}`);
  }
}

/** Evaluate a sandboxed formula. The caller passes θ/g/t; the
 *  formula may use any of the whitelisted functions, constants, and
 *  arithmetic operators. Returns `{ ok: false }` rather than throwing
 *  so React surfaces can render an inline `--warn` error.
 *
 *  Accepts both bare expressions ("sin(g*θ)") and `r = …` forms
 *  (the `r = ` prefix is stripped before parsing — it's notation,
 *  not syntax).
 */
export function evalFormula(
  expr: string,
  ctx: Partial<EvalContext> = {},
): EvalResult {
  const cleaned = expr.replace(/^\s*r\s*=\s*/, "").trim();
  if (cleaned.length === 0) {
    return { ok: false, error: "Formula is empty." };
  }
  try {
    const toks = tokenize(cleaned);
    if (toks.length === 0) {
      return { ok: false, error: "Formula has no terms." };
    }
    const filled: EvalContext = {
      θ: ctx.θ ?? 0,
      g: ctx.g ?? 1,
      t: ctx.t ?? 0,
    };
    const parser = new Parser(toks, filled);
    const value = parser.evaluate();
    if (!Number.isFinite(value)) {
      return { ok: false, error: "Formula did not produce a finite value." };
    }
    return { ok: true, value };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}
