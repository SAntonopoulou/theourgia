/**
 * Card — the surface primitive every list / panel composes from.
 *
 * Two flavors:
 *
 *   passive    — a structural surface (the default). Renders as the chosen
 *                element ``as`` (default ``<article>``) with no interactive
 *                affordances.
 *
 *   interactive — set ``interactive=true`` to mark the card as a clickable
 *                surface (link / button-shaped). The card becomes focusable
 *                with a visible focus ring and keyboard activation.
 *
 * Padding, radius, and shadow flow from the token scale; callers don't pass
 * sizing — the design system intentionally ships one card shape.
 */

import type {
  AriaAttributes,
  CSSProperties,
  KeyboardEvent,
  MouseEvent,
  ReactNode,
} from "react";

export interface CardProps extends AriaAttributes {
  /** HTML tag rendered for the surface. Defaults to ``article``. */
  as?: "article" | "section" | "div" | "li";
  /** Mark as a clickable surface (focus ring + keyboard activation). */
  interactive?: boolean;
  /** Click handler — required when ``interactive`` is true. */
  onClick?: (event: MouseEvent<HTMLElement> | KeyboardEvent<HTMLElement>) => void;
  className?: string;
  style?: CSSProperties;
  id?: string;
  children?: ReactNode;
}

export function Card({
  as = "article",
  interactive = false,
  onClick,
  className,
  style,
  id,
  children,
  ...aria
}: CardProps): JSX.Element {
  const Tag = as;
  const composedStyle: CSSProperties = {
    background: "var(--bg-2)",
    border: "1px solid var(--line)",
    borderRadius: "var(--r-lg, 12px)",
    padding: "var(--space-5, 24px)",
    boxShadow: "var(--shadow-sm)",
    fontFamily: "var(--font-serif, Georgia, serif)",
    color: "var(--ink)",
    cursor: interactive ? "pointer" : undefined,
    transition: interactive
      ? "border-color 150ms ease, background-color 150ms ease"
      : undefined,
    ...style,
  };

  function handleKey(event: KeyboardEvent<HTMLElement>): void {
    if (!interactive || !onClick) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onClick(event);
    }
  }

  return (
    <Tag
      id={id}
      role={interactive ? "button" : undefined}
      tabIndex={interactive ? 0 : undefined}
      onClick={interactive ? onClick : undefined}
      onKeyDown={interactive ? handleKey : undefined}
      className={className}
      style={composedStyle}
      {...aria}
    >
      {children}
    </Tag>
  );
}
