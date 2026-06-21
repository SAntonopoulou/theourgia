/**
 * ElectionRecipeCard — single tile in the "Start from a recipe"
 * gallery.
 *
 * Per `Theourgia Election Finder.dc.html`. Each tile is a button
 * showing the recipe's glyph + title (top), short blurb, and an
 * italic editorial source line at the bottom. The active tile is
 * outlined with --accent.
 */

import { type CSSProperties } from "react";

import type { ElectionRecipe } from "./types.js";

export interface ElectionRecipeCardProps {
  recipe: ElectionRecipe;
  active?: boolean;
  onSelect?: () => void;
  className?: string;
  style?: CSSProperties;
}

export function ElectionRecipeCard({
  recipe,
  active = false,
  onSelect,
  className,
  style,
}: ElectionRecipeCardProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={className}
      data-component="election-recipe-card"
      data-recipe-id={recipe.id}
      data-active={active ? "true" : "false"}
      aria-pressed={active}
      style={{
        padding: "11px 13px",
        textAlign: "left",
        borderRadius: "var(--r-md, 8px)",
        background: active ? "var(--bg-3)" : "var(--bg-2)",
        borderWidth: 1,
        borderStyle: "solid",
        borderColor: active ? "var(--accent)" : "var(--line)",
        color: "var(--ink)",
        cursor: "pointer",
        ...style,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 5,
        }}
      >
        <span
          aria-hidden="true"
          style={{
            fontFamily: "var(--font-glyph)",
            fontSize: 16,
            color: "var(--accent)",
          }}
        >
          {recipe.glyph}
        </span>
        <span
          style={{
            fontFamily: "var(--font-serif)",
            fontSize: 15,
            color: "var(--ink)",
            lineHeight: 1.15,
          }}
        >
          {recipe.title}
        </span>
      </div>
      <div
        style={{
          fontFamily: "var(--font-ui)",
          fontSize: 11,
          color: "var(--ink-mute)",
          lineHeight: 1.4,
        }}
      >
        {recipe.blurb}
      </div>
      {recipe.source ? (
        <div
          style={{
            fontFamily: "var(--font-ui)",
            fontSize: 10,
            color: "var(--ink-mute)",
            marginTop: 6,
            fontStyle: "italic",
          }}
        >
          {recipe.source}
        </div>
      ) : null}
    </button>
  );
}
