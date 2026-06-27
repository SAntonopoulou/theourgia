/**
 * BundleDiscardModal — H09 Cluster B surface 16.
 *
 * The sandbox-discard modal. Two callout rows:
 *
 *   · **`--warn-soft`** — "{N} sandbox-local rows will be
 *     permanently deleted."
 *   · **`--peer-ok-soft`** — "{N} references already in your
 *     main vault will survive …" (this is GOOD news — copied
 *     references stay, sandbox-local removal stays bounded).
 *
 * Discard CTA uses `--warn-soft` NEVER `--danger`.
 */

import { type CSSProperties, useEffect } from "react";

import {
  BDX_CANCEL_CTA,
  BDX_DELETED_PREFIX_STRONG,
  BDX_DELETED_SUFFIX,
  BDX_DISCARD_CTA,
  BDX_SURVIVE_PREFIX_STRONG,
  BDX_SURVIVE_SUFFIX,
  BDX_TITLE,
} from "./copy.js";

export interface BundleDiscardModalProps {
  /** N — number of sandbox-local rows that will be deleted. */
  sandboxLocalRowCount: number;
  /** N — number of main-vault references that will survive. */
  mainVaultReferenceCount: number;
  onCancel: () => void;
  onDiscard: () => void;
  className?: string;
  style?: CSSProperties;
}

export function BundleDiscardModal({
  sandboxLocalRowCount,
  mainVaultReferenceCount,
  onCancel,
  onDiscard,
  className,
  style,
}: BundleDiscardModalProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  return (
    <div
      data-surface="bundle-discard"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 80,
        background: "rgba(0,0,0,.55)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={BDX_TITLE}
        className={className}
        data-modal="bundle-discard"
        style={{
          width: 460,
          maxWidth: "100%",
          background: "var(--bg)",
          borderWidth: 1,
          borderStyle: "solid",
          borderColor: "var(--line-2)",
          borderRadius: "var(--r-lg)",
          boxShadow: "0 28px 70px rgba(0,0,0,.55)",
          overflow: "hidden",
          ...style,
        }}
      >
        <header
          style={{
            padding: "22px 24px 15px",
            borderBottom: "1px solid var(--line)",
          }}
        >
          <h2
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 21,
              margin: 0,
              color: "var(--ink)",
            }}
          >
            {BDX_TITLE}
          </h2>
        </header>
        <div
          style={{
            padding: "18px 24px",
            display: "flex",
            flexDirection: "column",
            gap: 11,
          }}
        >
          <div
            data-field="deleted-row"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "13px 15px",
              borderWidth: 1,
              borderStyle: "solid",
              borderColor: "var(--warn-border)",
              borderRadius: "var(--r-md)",
              background: "var(--warn-soft)",
            }}
          >
            <span
              aria-hidden="true"
              style={{
                display: "flex",
                color: "var(--warn)",
                flex: "none",
              }}
            >
              <svg
                width={20}
                height={20}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.5}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M6 7h12l-1 13H7zM9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M10 11v6M14 11v6" />
              </svg>
            </span>
            <div
              style={{
                fontFamily: "var(--font-serif)",
                fontSize: 14,
                color: "var(--ink)",
                lineHeight: 1.5,
              }}
            >
              <strong style={{ color: "var(--ink)" }}>
                {sandboxLocalRowCount}
                {BDX_DELETED_PREFIX_STRONG}
              </strong>
              {BDX_DELETED_SUFFIX}
            </div>
          </div>
          <div
            data-field="survive-row"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "13px 15px",
              borderWidth: 1,
              borderStyle: "solid",
              borderColor: "var(--peer-ok)",
              borderRadius: "var(--r-md)",
              background: "var(--peer-ok-soft)",
            }}
          >
            <span
              aria-hidden="true"
              style={{
                display: "flex",
                color: "var(--peer-ok)",
                flex: "none",
              }}
            >
              <svg
                width={20}
                height={20}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.5}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M20 6L9 17l-5-5" />
              </svg>
            </span>
            <div
              style={{
                fontFamily: "var(--font-serif)",
                fontSize: 14,
                color: "var(--ink)",
                lineHeight: 1.5,
              }}
            >
              <strong style={{ color: "var(--ink)" }}>
                {mainVaultReferenceCount}
                {BDX_SURVIVE_PREFIX_STRONG}
              </strong>
              {BDX_SURVIVE_SUFFIX}
            </div>
          </div>
        </div>
        <footer
          style={{
            padding: "16px 24px",
            borderTop: "1px solid var(--line)",
            display: "flex",
            gap: 10,
            justifyContent: "flex-end",
          }}
        >
          <button
            type="button"
            onClick={onCancel}
            data-action="cancel"
            style={{
              padding: "11px 18px",
              borderRadius: "var(--r-md)",
              borderWidth: 1,
              borderStyle: "solid",
              borderColor: "var(--line-2)",
              background: "transparent",
              fontFamily: "var(--font-ui)",
              fontSize: 14,
              color: "var(--ink-soft)",
              cursor: "pointer",
            }}
          >
            {BDX_CANCEL_CTA}
          </button>
          <button
            type="button"
            onClick={onDiscard}
            data-action="discard"
            style={{
              padding: "11px 22px",
              borderRadius: "var(--r-md)",
              background: "var(--warn-soft)",
              borderWidth: 1,
              borderStyle: "solid",
              borderColor: "var(--warn-border)",
              fontFamily: "var(--font-ui)",
              fontWeight: 700,
              fontSize: 14,
              color: "var(--warn)",
              cursor: "pointer",
            }}
          >
            {BDX_DISCARD_CTA}
          </button>
        </footer>
      </div>
    </div>
  );
}
