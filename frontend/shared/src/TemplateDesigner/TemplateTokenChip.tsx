/**
 * TemplateTokenChip — mono-font insert chip for a template variable.
 *
 * Per `Theourgia Template Designer.dc.html`. Small pill with the
 * literal token text (e.g. `{date}`). Clicking inserts the token
 * into the active default-value input; the surface owns the insert
 * mechanic.
 */

import { type CSSProperties } from "react";

import { TEMPLATE_TOKENS, type TemplateTokenMeta } from "./catalog.js";

export interface TemplateTokenChipProps {
  token: string;
  /** Override the title attr; defaults to the catalog description. */
  description?: string;
  onInsert?: () => void;
  className?: string;
  style?: CSSProperties;
}

function describe(token: string): string | undefined {
  return TEMPLATE_TOKENS.find((t: TemplateTokenMeta) => t.token === token)
    ?.description;
}

export function TemplateTokenChip({
  token,
  description,
  onInsert,
  className,
  style,
}: TemplateTokenChipProps) {
  const title = description ?? describe(token) ?? token;
  return (
    <button
      type="button"
      onClick={onInsert}
      title={title}
      className={className}
      data-component="template-token-chip"
      data-token={token}
      style={{
        fontFamily: "var(--font-mono)",
        fontSize: 11,
        color: "var(--format)",
        padding: "3px 8px",
        borderWidth: 1,
        borderStyle: "solid",
        borderColor: "var(--line)",
        borderRadius: 999,
        background: "var(--bg-3)",
        cursor: "pointer",
        ...style,
      }}
    >
      {token}
    </button>
  );
}
