/**
 * InstalledPluginsSurface — H09 Cluster A surface 1.
 *
 * Faithful port of ``Theourgia Installed Plugins.dc.html``.
 *
 * Honesty rules wired:
 *
 *   * Sort is chronological by ``installed_at`` desc — NO
 *     popularity, NO featured, NO rank (H09 rule 38).
 *   * Status chips use neutral chrome: active → `--plugin-active-soft`,
 *     disabled → `--ink-mute` border, error → `--plugin-error-soft`.
 *     None are `--danger`.
 *   * **Tombstoned plugins keep working** (rule 40 — withdraw is
 *     not delete). The row renders the `‡ tombstoned by author`
 *     chip on `--tombstone-soft` and a disabled-line border, but
 *     the kebab + link remain functional.
 *   * Uninstall in the kebab uses `--warn` ink (consequential
 *     edit, NOT `--danger`).
 */

import { type CSSProperties, useId, useState } from "react";

import {
  IP_BROWSE_REGISTRY_CTA,
  IP_COUNT_SUFFIX,
  IP_COUNT_SUFFIX_ONE,
  IP_EMPTY_BODY,
  IP_EMPTY_TITLE,
  IP_MENU_LABELS,
  IP_STATUS_LABELS,
  IP_SUBHEAD,
  IP_TITLE,
  IP_TOMBSTONE_GLYPH,
  IP_TOMBSTONE_LABEL,
  type PluginKind,
  type PluginStatus,
} from "./copy.js";
import { PluginKindIcon } from "./PluginKindIcon.js";

// ─── Data shapes ──────────────────────────────────────────────────

export interface InstalledPluginRow {
  id: string;
  kind: PluginKind;
  name: string;
  /** Version string, displayed verbatim (e.g. `v2.1.0`). */
  version: string;
  /** Author DID — full `did:theourgia:host:slug`. */
  author: string;
  description: string;
  status: PluginStatus;
  tombstoned?: boolean;
}

export type PluginAction =
  | "configure"
  | "activate"
  | "deactivate"
  | "update"
  | "uninstall"
  | "view-capabilities";

export interface InstalledPluginsSurfaceProps {
  plugins: readonly InstalledPluginRow[];
  onBrowseRegistry?: () => void;
  onPluginAction?: (pluginId: string, action: PluginAction) => void;
  className?: string;
  style?: CSSProperties;
}

// ─── Style atoms ───────────────────────────────────────────────────

const TOPBAR: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 14,
  padding: "13px 24px",
  borderBottom: "1px solid var(--line)",
  background: "var(--bg)",
};

const MAIN: CSSProperties = {
  overflowY: "auto",
  minHeight: 0,
  padding: "22px 24px 48px",
};

const STATUS_CHROME: Record<PluginStatus, CSSProperties> = {
  active: {
    background: "var(--plugin-active-soft)",
    color: "var(--plugin-active)",
    borderColor: "var(--plugin-active)",
  },
  disabled: {
    background: "transparent",
    color: "var(--ink-mute)",
    borderColor: "var(--plugin-disabled-line)",
  },
  error: {
    background: "var(--plugin-error-soft)",
    color: "var(--plugin-error)",
    borderColor: "var(--plugin-error)",
  },
};

// ─── Component ─────────────────────────────────────────────────────

export function InstalledPluginsSurface({
  plugins,
  onBrowseRegistry,
  onPluginAction,
  className,
  style,
}: InstalledPluginsSurfaceProps) {
  const titleId = useId();
  const [openKebab, setOpenKebab] = useState<string | null>(null);

  const isEmpty = plugins.length === 0;
  const countLabel = `${plugins.length}${
    plugins.length === 1 ? IP_COUNT_SUFFIX_ONE : IP_COUNT_SUFFIX
  }`;

  return (
    <section
      aria-labelledby={titleId}
      className={className}
      data-surface="installed-plugins"
      style={{
        display: "flex",
        flexDirection: "column",
        minHeight: 0,
        height: "100%",
        ...style,
      }}
    >
      <header style={TOPBAR}>
        <div style={{ minWidth: 0 }}>
          <h1
            id={titleId}
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 21,
              lineHeight: 1.1,
              margin: 0,
            }}
          >
            {IP_TITLE}
          </h1>
          <div
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: 12.5,
              color: "var(--ink-mute)",
              marginTop: 1,
            }}
          >
            {IP_SUBHEAD}
          </div>
        </div>
        <button
          type="button"
          onClick={onBrowseRegistry}
          data-action="browse-registry"
          style={{
            marginLeft: "auto",
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "9px 15px",
            borderRadius: "var(--r-md)",
            background: "var(--accent)",
            color: "var(--accent-ink)",
            fontFamily: "var(--font-ui)",
            fontWeight: 700,
            fontSize: 13,
            border: "none",
            cursor: "pointer",
          }}
        >
          <svg
            width={15}
            height={15}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.6}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="M20 20l-3.5-3.5" />
          </svg>
          {IP_BROWSE_REGISTRY_CTA}
        </button>
      </header>

      <div className="scroll" style={MAIN}>
        <div style={{ maxWidth: 860, margin: "0 auto" }}>
          <div
            data-field="count-label"
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: 11.5,
              color: "var(--ink-mute)",
              marginBottom: 13,
            }}
          >
            {countLabel}
          </div>

          {isEmpty ? (
            <EmptyState onBrowseRegistry={onBrowseRegistry} />
          ) : (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 10,
              }}
              data-field="plugin-list"
            >
              {plugins.map((p) => (
                <PluginCard
                  key={p.id}
                  plugin={p}
                  open={openKebab === p.id}
                  onToggleKebab={() =>
                    setOpenKebab((cur) => (cur === p.id ? null : p.id))
                  }
                  onAction={(action) => {
                    setOpenKebab(null);
                    onPluginAction?.(p.id, action);
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

// ─── PluginCard ──────────────────────────────────────────────────

function PluginCard({
  plugin,
  open,
  onToggleKebab,
  onAction,
}: {
  plugin: InstalledPluginRow;
  open: boolean;
  onToggleKebab: () => void;
  onAction: (action: PluginAction) => void;
}) {
  const isTombstoned = !!plugin.tombstoned;
  const chip = STATUS_CHROME[plugin.status];

  return (
    <div
      data-plugin-id={plugin.id}
      data-status={plugin.status}
      data-tombstoned={isTombstoned}
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 14,
        padding: "14px 16px",
        borderWidth: 1,
        borderStyle: "solid",
        borderColor: isTombstoned
          ? "var(--plugin-disabled-line)"
          : "var(--line)",
        borderRadius: "var(--r-md)",
        background: "var(--bg-2)",
      }}
    >
      <span
        aria-hidden="true"
        style={{
          width: 36,
          height: 36,
          borderRadius: "var(--r-sm)",
          flex: "none",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--ink-mute)",
          background: "var(--bg-3)",
        }}
      >
        <PluginKindIcon kind={plugin.kind} />
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            gap: 9,
            flexWrap: "wrap",
          }}
        >
          <span
            data-field="plugin-name"
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 17,
              color: "var(--ink)",
            }}
          >
            {plugin.name}
          </span>
          <span
            data-field="plugin-version"
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 12,
              color: "var(--ink-mute)",
            }}
          >
            {plugin.version}
          </span>
          <span
            data-field="status-chip"
            data-status={plugin.status}
            style={{
              display: "inline-flex",
              alignItems: "center",
              padding: "1px 9px",
              borderRadius: 20,
              borderWidth: 1,
              borderStyle: "solid",
              fontFamily: "var(--font-ui)",
              fontSize: 10.5,
              ...chip,
            }}
          >
            {IP_STATUS_LABELS[plugin.status]}
          </span>
          {isTombstoned ? (
            <span
              data-field="tombstone-chip"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                padding: "1px 9px",
                borderRadius: 20,
                background: "var(--tombstone-soft)",
                fontFamily: "var(--font-ui)",
                fontSize: 10.5,
                color: "var(--ink-mute)",
              }}
            >
              <span
                aria-hidden="true"
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: 12,
                  lineHeight: 1,
                }}
              >
                {IP_TOMBSTONE_GLYPH}
              </span>
              {IP_TOMBSTONE_LABEL}
            </span>
          ) : null}
        </div>
        <div
          data-field="plugin-author"
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 11.5,
            color: "var(--ink-mute)",
            margin: "3px 0 5px",
          }}
        >
          {plugin.author}
        </div>
        <div
          data-field="plugin-desc"
          style={{
            fontFamily: "var(--font-serif)",
            fontSize: 13.5,
            color: "var(--ink-soft)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {plugin.description}
        </div>
      </div>
      <div style={{ position: "relative", flex: "none" }}>
        <button
          type="button"
          aria-label="Plugin actions"
          aria-expanded={open}
          onClick={onToggleKebab}
          data-action="kebab"
          style={{
            width: 32,
            height: 32,
            borderRadius: "var(--r-sm)",
            color: "var(--ink-mute)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "transparent",
            border: "none",
            cursor: "pointer",
          }}
        >
          <svg
            width={16}
            height={16}
            viewBox="0 0 24 24"
            fill="currentColor"
            aria-hidden="true"
          >
            <circle cx="12" cy="5" r="1.6" />
            <circle cx="12" cy="12" r="1.6" />
            <circle cx="12" cy="19" r="1.6" />
          </svg>
        </button>
        {open ? (
          <div
            role="menu"
            data-field="kebab-menu"
            style={{
              position: "absolute",
              top: 36,
              right: 0,
              zIndex: 20,
              minWidth: 186,
              padding: 6,
              background: "var(--bg-2)",
              borderWidth: 1,
              borderStyle: "solid",
              borderColor: "var(--line-2)",
              borderRadius: "var(--r-md)",
              boxShadow: "0 18px 44px rgba(0,0,0,.5)",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <MenuItem
              label={IP_MENU_LABELS.configure}
              onClick={() => onAction("configure")}
            />
            <MenuItem
              label={
                plugin.status === "disabled"
                  ? IP_MENU_LABELS.activate
                  : IP_MENU_LABELS.deactivate
              }
              onClick={() =>
                onAction(
                  plugin.status === "disabled" ? "activate" : "deactivate",
                )
              }
            />
            <MenuItem
              label={IP_MENU_LABELS.update}
              onClick={() => onAction("update")}
            />
            <MenuItem
              label={IP_MENU_LABELS.viewCapabilities}
              onClick={() => onAction("view-capabilities")}
            />
            <MenuItem
              label={IP_MENU_LABELS.uninstall}
              onClick={() => onAction("uninstall")}
              warn
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}

function MenuItem({
  label,
  onClick,
  warn = false,
}: {
  label: string;
  onClick: () => void;
  warn?: boolean;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      data-menu-item={label}
      data-warn={warn}
      style={{
        display: "block",
        width: "100%",
        textAlign: "left",
        padding: "8px 10px",
        borderRadius: "var(--r-sm)",
        fontFamily: "var(--font-ui)",
        fontSize: 13,
        color: warn ? "var(--warn)" : "var(--ink-soft)",
        background: "transparent",
        border: "none",
        cursor: "pointer",
      }}
    >
      {label}
    </button>
  );
}

// ─── EmptyState ──────────────────────────────────────────────────

function EmptyState({
  onBrowseRegistry,
}: {
  onBrowseRegistry?: () => void;
}) {
  return (
    <div
      data-field="empty-state"
      style={{
        marginTop: 10,
        padding: "44px 30px",
        borderWidth: 1,
        borderStyle: "dashed",
        borderColor: "var(--line-2)",
        borderRadius: "var(--r-lg)",
        textAlign: "center",
      }}
    >
      <div
        style={{
          fontFamily: "var(--font-display)",
          fontSize: 20,
          color: "var(--ink)",
          marginBottom: 6,
        }}
      >
        {IP_EMPTY_TITLE}
      </div>
      <div
        style={{
          fontFamily: "var(--font-ui)",
          fontSize: 13.5,
          color: "var(--ink-mute)",
          marginBottom: 18,
        }}
      >
        {IP_EMPTY_BODY}
      </div>
      <button
        type="button"
        onClick={onBrowseRegistry}
        data-action="browse-registry-empty"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          padding: "10px 18px",
          borderRadius: "var(--r-md)",
          background: "var(--accent)",
          color: "var(--accent-ink)",
          fontFamily: "var(--font-ui)",
          fontWeight: 700,
          fontSize: 13.5,
          border: "none",
          cursor: "pointer",
        }}
      >
        {IP_BROWSE_REGISTRY_CTA}
      </button>
    </div>
  );
}
