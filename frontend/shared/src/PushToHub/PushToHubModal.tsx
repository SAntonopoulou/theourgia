/**
 * PushToHubModal — H08 §S3 Cluster A surface 15.
 *
 * Faithful port of ``Theourgia Push Content to Hub.dc.html``.
 *
 * Honesty rules wired:
 *
 *   * **Sealed entries NEVER push** (H08 rule 1, defence in
 *     depth). When ``entryKind === 'sealed'`` the modal swaps
 *     its body for a `--seal-soft` callout and the Push CTA
 *     becomes disabled with reduced opacity. The consumer
 *     cannot override this — the surface refuses on its own.
 *
 *   * **Every push is explicit** (rule 22). No "push to all
 *     hubs" shortcut, no auto-fanout. The user picks hub-by-hub
 *     via checkbox.
 *
 *   * **Auto-curating hubs are warned** (`--warn-soft` chip vs
 *     `--peer-ok-soft`). The user sees, before submitting, that
 *     their content will go live without human review on those
 *     hubs.
 *
 *   * **Cache-persistence disclosure is verbatim** under the
 *     pickers: "Content already mirrored may persist in caches."
 *     The brief is emphatic — federation is not a withdrawal.
 *
 *   * Push CTA uses `--warn-soft` chrome (consequential edit
 *     band), NOT `--accent` (default action band). The visual
 *     weight reflects that this is a federation moment.
 */

import { type CSSProperties, useEffect, useId, useState } from "react";

import {
  PTH_CACHE_NOTICE,
  PTH_CANCEL_CTA,
  PTH_HUB_TAG_AUTO_CURATES,
  PTH_HUB_TAG_REVIEWS,
  PTH_LABEL_CHOOSE_HUBS,
  PTH_NETWORK_HELPER,
  PTH_PUSH_CTA,
  PTH_ROLE_PREFIX,
  PTH_SEALED_BODY,
  PTH_SEALED_TITLE,
  PTH_TITLE,
} from "./copy.js";

// ─── Data shapes ──────────────────────────────────────────────────

export interface PthHubOption {
  /** Stable wire key (e.g. slug or DID). */
  id: string;
  /** Display name, e.g. "The Crossroads Coven". */
  name: string;
  /** Role prefix tail, e.g. "an officer" or "a member". */
  roleLabel: string;
  /** When true, the hub publishes submissions without human
   *  review — surfaced as a `--warn-soft` chip. */
  autoCurates: boolean;
}

export interface PthPushDraft {
  hubIds: readonly string[];
}

export type PthEntryKind = "network" | "sealed";

export interface PushToHubModalProps {
  /** The entry being pushed. */
  entryTitle: string;
  /** Drives the network-vs-sealed branch. */
  entryKind: PthEntryKind;
  /** Hub list to choose from. */
  hubs: readonly PthHubOption[];
  /** Optional initial selection — keys must exist in `hubs`. */
  initialSelectedIds?: readonly string[];
  onCancel: () => void;
  onPush: (draft: PthPushDraft) => void;
  className?: string;
  style?: CSSProperties;
}

// ─── Styles ───────────────────────────────────────────────────────

const SCRIM: CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 70,
  background: "rgba(0,0,0,.55)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 20,
};

const DIALOG: CSSProperties = {
  width: 520,
  maxWidth: "100%",
  background: "var(--bg)",
  borderWidth: 1,
  borderStyle: "solid",
  borderColor: "var(--line-2)",
  borderRadius: "var(--r-lg)",
  boxShadow: "0 28px 70px rgba(0,0,0,.55)",
  overflow: "hidden",
};

// ─── Component ─────────────────────────────────────────────────────

export function PushToHubModal({
  entryTitle,
  entryKind,
  hubs,
  initialSelectedIds = [],
  onCancel,
  onPush,
  className,
  style,
}: PushToHubModalProps) {
  const titleId = useId();
  const [selected, setSelected] = useState<ReadonlySet<string>>(
    () => new Set(initialSelectedIds),
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  const isSealed = entryKind === "sealed";

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const pushDisabled = isSealed || selected.size === 0;

  return (
    <div
      style={SCRIM}
      data-surface="push-to-hub"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={PTH_TITLE}
        aria-labelledby={titleId}
        className={className}
        style={{ ...DIALOG, ...style }}
        data-modal="push-to-hub"
        data-entry-kind={entryKind}
      >
        <header
          style={{
            padding: "20px 24px 14px",
            borderBottom: "1px solid var(--line)",
          }}
        >
          <h2
            id={titleId}
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 21,
              margin: 0,
            }}
          >
            {PTH_TITLE}
          </h2>
          <div
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: 12.5,
              color: "var(--ink-mute)",
              marginTop: 3,
            }}
            data-field="entry-title"
          >
            “{entryTitle}”
          </div>
        </header>

        <div style={{ padding: "18px 24px" }}>
          {isSealed ? (
            <SealedBlockedCallout />
          ) : (
            <NetworkBody
              hubs={hubs}
              selected={selected}
              onToggle={toggle}
            />
          )}
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
            {PTH_CANCEL_CTA}
          </button>
          <button
            type="button"
            disabled={pushDisabled}
            data-action="push"
            data-disabled={pushDisabled}
            onClick={() => {
              if (pushDisabled) return;
              onPush({ hubIds: Array.from(selected) });
            }}
            style={
              pushDisabled
                ? {
                    padding: "11px 22px",
                    borderRadius: "var(--r-md)",
                    background: "var(--bg-3)",
                    color: "var(--ink-mute)",
                    fontFamily: "var(--font-ui)",
                    fontWeight: 700,
                    fontSize: 14,
                    cursor: "not-allowed",
                    opacity: 0.6,
                    borderWidth: 1,
                    borderStyle: "solid",
                    borderColor: "var(--line)",
                  }
                : {
                    padding: "11px 22px",
                    borderRadius: "var(--r-md)",
                    background: "var(--warn-soft)",
                    borderWidth: 1,
                    borderStyle: "solid",
                    borderColor: "var(--warn-border)",
                    color: "var(--ink)",
                    fontFamily: "var(--font-ui)",
                    fontWeight: 700,
                    fontSize: 14,
                    cursor: "pointer",
                  }
            }
          >
            {PTH_PUSH_CTA}
          </button>
        </footer>
      </div>
    </div>
  );
}

// ─── NetworkBody ─────────────────────────────────────────────────

function NetworkBody({
  hubs,
  selected,
  onToggle,
}: {
  hubs: readonly PthHubOption[];
  selected: ReadonlySet<string>;
  onToggle: (id: string) => void;
}) {
  return (
    <>
      <div
        style={{
          fontFamily: "var(--font-ui)",
          fontSize: 10.5,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          color: "var(--ink-mute)",
          marginBottom: 10,
        }}
      >
        {PTH_LABEL_CHOOSE_HUBS}
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 8,
          marginBottom: 16,
        }}
        data-field="hub-picker"
      >
        {hubs.map((h) => (
          <HubRow
            key={h.id}
            hub={h}
            checked={selected.has(h.id)}
            onToggle={() => onToggle(h.id)}
          />
        ))}
      </div>
      <div
        data-field="network-helper"
        style={{
          padding: "11px 13px",
          borderWidth: 1,
          borderStyle: "solid",
          borderColor: "var(--line)",
          borderRadius: "var(--r-md)",
          background: "var(--bg-2)",
          marginBottom: 14,
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-ui)",
            fontSize: 12.5,
            color: "var(--ink-soft)",
          }}
        >
          {PTH_NETWORK_HELPER}
        </span>
      </div>
      <div
        data-field="cache-notice"
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: 8,
          fontFamily: "var(--font-ui)",
          fontSize: 11.5,
          color: "var(--ink-mute)",
          lineHeight: 1.45,
        }}
      >
        <svg
          width={14}
          height={14}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.6}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          style={{ flex: "none", marginTop: 1 }}
        >
          <circle cx="12" cy="12" r="9" />
          <path d="M12 11v5M12 8h.01" />
        </svg>
        {PTH_CACHE_NOTICE}
      </div>
    </>
  );
}

function HubRow({
  hub,
  checked,
  onToggle,
}: {
  hub: PthHubOption;
  checked: boolean;
  onToggle: () => void;
}) {
  const tagInk = hub.autoCurates ? "var(--warn)" : "var(--peer-ok)";
  const tagBg = hub.autoCurates
    ? "var(--warn-soft)"
    : "var(--peer-ok-soft)";
  const tagBorder = hub.autoCurates
    ? "var(--warn-border)"
    : "var(--peer-ok)";

  return (
    <label
      data-hub-id={hub.id}
      data-auto-curates={hub.autoCurates}
      data-checked={checked}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 11,
        padding: "11px 13px",
        borderWidth: 1,
        borderStyle: "solid",
        borderColor: "var(--line)",
        borderRadius: "var(--r-md)",
        background: "var(--bg-2)",
        cursor: "pointer",
      }}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={onToggle}
        data-field="hub-check"
        style={{
          position: "absolute",
          opacity: 0,
          width: 0,
          height: 0,
        }}
      />
      <span
        aria-hidden="true"
        data-visual-check
        data-checked={checked}
        style={{
          width: 19,
          height: 19,
          borderRadius: 5,
          borderWidth: 1,
          borderStyle: "solid",
          borderColor: checked ? "var(--accent)" : "var(--line-2)",
          background: checked ? "var(--accent)" : "transparent",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flex: "none",
        }}
      >
        {checked ? (
          <svg
            width={12}
            height={12}
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--accent-ink)"
            strokeWidth={2.6}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M5 12.5l4.5 4.5L19 6.5" />
          </svg>
        ) : null}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontFamily: "var(--font-serif)",
            fontSize: 14.5,
            color: "var(--ink)",
          }}
          data-field="hub-name"
        >
          {hub.name}
        </div>
        <div
          style={{
            fontFamily: "var(--font-ui)",
            fontSize: 11,
            color: "var(--ink-mute)",
          }}
          data-field="hub-role"
        >
          {PTH_ROLE_PREFIX}
          {hub.roleLabel}
        </div>
      </div>
      <span
        data-field="hub-tag"
        data-tone={hub.autoCurates ? "warn" : "peer-ok"}
        style={{
          padding: "2px 9px",
          borderWidth: 1,
          borderStyle: "solid",
          borderColor: tagBorder,
          borderRadius: 20,
          background: tagBg,
          fontFamily: "var(--font-ui)",
          fontSize: 10.5,
          color: tagInk,
        }}
      >
        {hub.autoCurates
          ? PTH_HUB_TAG_AUTO_CURATES
          : PTH_HUB_TAG_REVIEWS}
      </span>
    </label>
  );
}

// ─── Sealed-blocked callout ─────────────────────────────────────

function SealedBlockedCallout() {
  return (
    <div
      data-field="sealed-blocked"
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 11,
        padding: 16,
        borderWidth: 1,
        borderStyle: "solid",
        borderColor: "var(--seal-border)",
        borderRadius: "var(--r-md)",
        background: "var(--seal-soft)",
      }}
    >
      <span
        aria-hidden="true"
        style={{ display: "flex", color: "var(--seal)", flex: "none" }}
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
          <rect x="5" y="11" width="14" height="9" rx="2" />
          <path d="M8 11V8a4 4 0 0 1 8 0v3" />
        </svg>
      </span>
      <div>
        <div
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 16,
            color: "var(--ink)",
            marginBottom: 4,
          }}
          data-field="sealed-blocked-title"
        >
          {PTH_SEALED_TITLE}
        </div>
        <div
          style={{
            fontFamily: "var(--font-serif)",
            fontSize: 14,
            color: "var(--ink-soft)",
            lineHeight: 1.5,
          }}
          data-field="sealed-blocked-body"
        >
          {PTH_SEALED_BODY}
        </div>
      </div>
    </div>
  );
}
