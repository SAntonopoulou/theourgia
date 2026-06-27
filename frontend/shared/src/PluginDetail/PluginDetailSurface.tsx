/**
 * PluginDetailSurface — H09 Cluster A surface 2.
 *
 * Faithful port of ``Theourgia Plugin Detail.dc.html``.
 *
 * Honesty rules wired:
 *
 *   * **All capabilities are surfaced** with plain-English label
 *     + wire key + one-line consequence (rule 31 carry-forward).
 *   * Storage footprint renders as a quiet `--ink-mute` line —
 *     NEVER a "% of quota" panic chrome.
 *   * Uninstall CTA uses `--warn-soft` chrome (consequential
 *     edit) NEVER `--danger`.
 *   * Update CTA uses `--accent-soft` (visible but not pushy);
 *     elevates to solid `--accent` on hover via standard
 *     button chrome.
 */

import type { CSSProperties, ReactNode } from "react";

import { PluginKindIcon } from "../InstalledPlugins/PluginKindIcon.js";
import type {
  PluginKind,
  PluginStatus,
} from "../InstalledPlugins/copy.js";
import {
  IP_STATUS_LABELS,
} from "../InstalledPlugins/copy.js";
import {
  CapabilityRow,
  type CapabilityRowData,
} from "./CapabilityRow.js";
import {
  PD_BREADCRUMB_ROOT,
  PD_CAPABILITIES_HEADING,
  PD_CAPABILITIES_SUB,
  PD_CTA_ACTIVATE,
  PD_CTA_CONFIGURE,
  PD_CTA_DEACTIVATE,
  PD_CTA_UNINSTALL,
  PD_CTA_UPDATE_PREFIX,
  PD_DESCRIPTION_HEADING,
  PD_EXT_POINTS_HEADING,
  PD_LABEL_AUTHOR,
  PD_LABEL_COMPATIBLE,
  PD_LABEL_HOMEPAGE,
  PD_LABEL_LICENSE,
  PD_MANIFEST_HEADING,
  PD_MANIFEST_SUBHEAD,
  PD_MIGRATIONS_HEADING,
  PD_STORAGE_HEADING,
} from "./copy.js";

// ─── Data shapes ──────────────────────────────────────────────────

export interface PluginMigration {
  id: string;
  label: string;
  /** Display-friendly date. */
  date: string;
}

export interface PluginExtensionPoint {
  /** Plain-English label, e.g. "Editor blocks (1)". */
  label: string;
  /** Detail line, e.g. "'decan-reference'". */
  detail: string;
}

export interface PluginDetailSurfaceProps {
  /** Plugin chrome — drawn from the installed row. */
  name: string;
  version: string;
  kind: PluginKind;
  status: PluginStatus;
  author: string;
  license: string;
  homepage?: string;
  compatibleVersionRange: string;
  /** Markdown body — rendered as paragraphs by the consumer.
   *  The surface treats this as already-safe ReactNode. */
  description: ReactNode;
  capabilities: readonly CapabilityRowData[];
  extensionPoints: readonly PluginExtensionPoint[];
  migrations: readonly PluginMigration[];
  /** Quiet storage line — verbatim from the consumer. */
  storageFootprint: string;
  /** When set, the Update CTA renders with the version target. */
  updateAvailableVersion?: string;
  onConfigure?: () => void;
  onUpdate?: () => void;
  onActivate?: () => void;
  onDeactivate?: () => void;
  onUninstall?: () => void;
  onBreadcrumbHome?: () => void;
  className?: string;
  style?: CSSProperties;
}

// ─── Styles ───────────────────────────────────────────────────────

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
  padding: "26px 24px 40px",
};

const SECTION_H: CSSProperties = {
  fontFamily: "var(--font-display)",
  fontSize: 17,
  color: "var(--ink)",
  margin: "0 0 8px",
};

const DT: CSSProperties = {
  fontFamily: "var(--font-ui)",
  fontSize: 11,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "var(--ink-mute)",
};

const DD: CSSProperties = {
  margin: 0,
  fontFamily: "var(--font-mono)",
  fontSize: 12.5,
  color: "var(--ink-soft)",
  wordBreak: "break-all",
};

const STATUS_CHROME: Record<
  PluginStatus,
  { bg: string; ink: string; border: string }
> = {
  active: {
    bg: "var(--plugin-active-soft)",
    ink: "var(--plugin-active)",
    border: "var(--plugin-active)",
  },
  disabled: {
    bg: "transparent",
    ink: "var(--ink-mute)",
    border: "var(--plugin-disabled-line)",
  },
  error: {
    bg: "var(--plugin-error-soft)",
    ink: "var(--plugin-error)",
    border: "var(--plugin-error)",
  },
};

// ─── Component ─────────────────────────────────────────────────────

export function PluginDetailSurface({
  name,
  version,
  kind,
  status,
  author,
  license,
  homepage,
  compatibleVersionRange,
  description,
  capabilities,
  extensionPoints,
  migrations,
  storageFootprint,
  updateAvailableVersion,
  onConfigure,
  onUpdate,
  onActivate,
  onDeactivate,
  onUninstall,
  onBreadcrumbHome,
  className,
  style,
}: PluginDetailSurfaceProps) {
  const chip = STATUS_CHROME[status];
  return (
    <section
      data-surface="plugin-detail"
      className={className}
      style={{
        display: "flex",
        flexDirection: "column",
        minHeight: 0,
        height: "100%",
        ...style,
      }}
    >
      <header style={TOPBAR}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            flexWrap: "wrap",
            minWidth: 0,
          }}
        >
          <button
            type="button"
            onClick={onBreadcrumbHome}
            data-action="breadcrumb-home"
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: 13,
              color: "var(--ink-mute)",
              background: "transparent",
              border: "none",
              padding: 0,
              cursor: "pointer",
            }}
          >
            {PD_BREADCRUMB_ROOT}
          </button>
          <span style={{ color: "var(--ink-mute)" }}>/</span>
          <span
            data-field="plugin-name"
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 20,
              lineHeight: 1.1,
            }}
          >
            {name}
          </span>
          <span
            data-field="plugin-version"
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 12.5,
              color: "var(--ink-mute)",
            }}
          >
            {version}
          </span>
          <span
            data-field="status-chip"
            data-status={status}
            style={{
              display: "inline-flex",
              alignItems: "center",
              padding: "1px 10px",
              borderRadius: 20,
              background: chip.bg,
              borderWidth: 1,
              borderStyle: "solid",
              borderColor: chip.border,
              fontFamily: "var(--font-ui)",
              fontSize: 11,
              color: chip.ink,
            }}
          >
            {IP_STATUS_LABELS[status]}
          </span>
        </div>
      </header>

      <main className="scroll" style={MAIN}>
        <div
          style={{
            maxWidth: 640,
            margin: "0 auto",
            display: "flex",
            flexDirection: "column",
            gap: 24,
          }}
        >
          <ManifestSection
            kind={kind}
            author={author}
            license={license}
            homepage={homepage}
            compatibleVersionRange={compatibleVersionRange}
          />

          <section data-field="description">
            <h2 style={SECTION_H}>{PD_DESCRIPTION_HEADING}</h2>
            <div
              style={{
                fontFamily: "var(--font-serif)",
                fontSize: 15,
                lineHeight: 1.65,
                color: "var(--ink-soft)",
              }}
            >
              {description}
            </div>
          </section>

          <section data-field="capabilities">
            <h2 style={SECTION_H}>{PD_CAPABILITIES_HEADING}</h2>
            <p
              style={{
                fontFamily: "var(--font-ui)",
                fontSize: 12,
                color: "var(--ink-mute)",
                margin: "0 0 12px",
              }}
            >
              {PD_CAPABILITIES_SUB}
            </p>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 9,
              }}
            >
              {capabilities.map((c) => (
                <CapabilityRow key={c.wireKey} {...c} />
              ))}
            </div>
          </section>

          <section data-field="extension-points">
            <h2 style={SECTION_H}>{PD_EXT_POINTS_HEADING}</h2>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 7,
              }}
            >
              {extensionPoints.map((e, i) => (
                <div
                  key={i}
                  data-field="ext-point-row"
                  style={{
                    display: "flex",
                    alignItems: "baseline",
                    gap: 10,
                    padding: "11px 14px",
                    borderWidth: 1,
                    borderStyle: "solid",
                    borderColor: "var(--line)",
                    borderRadius: "var(--r-md)",
                    background: "var(--bg-2)",
                  }}
                >
                  <span
                    style={{
                      fontFamily: "var(--font-serif)",
                      fontSize: 14,
                      color: "var(--ink)",
                    }}
                  >
                    {e.label}
                  </span>
                  <span
                    style={{
                      fontFamily: "var(--font-ui)",
                      fontSize: 12,
                      color: "var(--ink-mute)",
                      flex: 1,
                      minWidth: 0,
                    }}
                  >
                    {e.detail}
                  </span>
                </div>
              ))}
            </div>
          </section>

          <section data-field="migrations">
            <h2 style={SECTION_H}>{PD_MIGRATIONS_HEADING}</h2>
            <div
              style={{
                borderWidth: 1,
                borderStyle: "solid",
                borderColor: "var(--line)",
                borderRadius: "var(--r-md)",
                background: "var(--bg-2)",
                overflow: "hidden",
              }}
            >
              {migrations.map((m, i) => (
                <div
                  key={m.id}
                  data-migration-id={m.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "11px 15px",
                    borderBottomWidth:
                      i < migrations.length - 1 ? 1 : 0,
                    borderBottomStyle: "solid",
                    borderBottomColor: "var(--line)",
                  }}
                >
                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 12,
                      color: "var(--ink-soft)",
                    }}
                  >
                    {m.id}
                  </span>
                  <span
                    style={{
                      fontFamily: "var(--font-serif)",
                      fontSize: 13.5,
                      color: "var(--ink-soft)",
                      flex: 1,
                      minWidth: 0,
                    }}
                  >
                    {m.label}
                  </span>
                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 11.5,
                      color: "var(--ink-mute)",
                    }}
                  >
                    {m.date}
                  </span>
                </div>
              ))}
            </div>
          </section>

          <section data-field="storage">
            <h2 style={SECTION_H}>{PD_STORAGE_HEADING}</h2>
            <div
              data-field="storage-line"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                fontFamily: "var(--font-ui)",
                fontSize: 13,
                color: "var(--ink-mute)",
              }}
            >
              <svg
                width={16}
                height={16}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.5}
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <ellipse cx="12" cy="6" rx="7" ry="2.6" />
                <path d="M5 6v12c0 1.4 3.1 2.6 7 2.6s7-1.2 7-2.6V6M5 12c0 1.4 3.1 2.6 7 2.6s7-1.2 7-2.6" />
              </svg>
              {storageFootprint}
            </div>
          </section>

          {/* Kind icon hint */}
          <span
            aria-hidden="true"
            data-field="kind-icon-hint"
            style={{ display: "none" }}
          >
            <PluginKindIcon kind={kind} />
          </span>
        </div>
      </main>

      <footer
        style={{
          padding: "13px 24px",
          borderTop: "1px solid var(--line)",
          background: "var(--bg)",
          display: "flex",
          gap: 10,
          justifyContent: "center",
        }}
      >
        <div
          style={{
            maxWidth: 640,
            width: "100%",
            display: "flex",
            gap: 10,
            justifyContent: "flex-end",
            flexWrap: "wrap",
          }}
        >
          <button
            type="button"
            onClick={onConfigure}
            data-action="configure"
            style={ghostBtn()}
          >
            {PD_CTA_CONFIGURE}
          </button>
          {updateAvailableVersion ? (
            <button
              type="button"
              onClick={onUpdate}
              data-action="update"
              style={{
                padding: "10px 17px",
                borderRadius: "var(--r-md)",
                borderWidth: 1,
                borderStyle: "solid",
                borderColor: "var(--accent)",
                background: "var(--accent-soft)",
                fontFamily: "var(--font-ui)",
                fontSize: 13.5,
                color: "var(--accent)",
                cursor: "pointer",
              }}
            >
              {PD_CTA_UPDATE_PREFIX}
              {updateAvailableVersion}
            </button>
          ) : null}
          <button
            type="button"
            onClick={
              status === "disabled" ? onActivate : onDeactivate
            }
            data-action={
              status === "disabled" ? "activate" : "deactivate"
            }
            style={ghostBtn()}
          >
            {status === "disabled" ? PD_CTA_ACTIVATE : PD_CTA_DEACTIVATE}
          </button>
          <button
            type="button"
            onClick={onUninstall}
            data-action="uninstall"
            style={{
              padding: "10px 17px",
              borderRadius: "var(--r-md)",
              borderWidth: 1,
              borderStyle: "solid",
              borderColor: "var(--warn-border)",
              background: "var(--warn-soft)",
              fontFamily: "var(--font-ui)",
              fontSize: 13.5,
              color: "var(--warn)",
              cursor: "pointer",
            }}
          >
            {PD_CTA_UNINSTALL}
          </button>
        </div>
      </footer>
    </section>
  );
}

function ghostBtn(): CSSProperties {
  return {
    padding: "10px 17px",
    borderRadius: "var(--r-md)",
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "var(--line-2)",
    background: "transparent",
    fontFamily: "var(--font-ui)",
    fontSize: 13.5,
    color: "var(--ink-soft)",
    cursor: "pointer",
  };
}

function ManifestSection({
  kind,
  author,
  license,
  homepage,
  compatibleVersionRange,
}: {
  kind: PluginKind;
  author: string;
  license: string;
  homepage?: string;
  compatibleVersionRange: string;
}) {
  return (
    <section
      data-field="manifest"
      style={{
        padding: "18px 20px",
        borderWidth: 1,
        borderStyle: "solid",
        borderColor: "var(--line)",
        borderRadius: "var(--r-lg)",
        background: "var(--bg-2)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 13,
          marginBottom: 15,
        }}
      >
        <span
          aria-hidden="true"
          style={{
            width: 44,
            height: 44,
            borderRadius: "var(--r-md)",
            flex: "none",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--accent)",
            background: "var(--accent-soft)",
            borderWidth: 1,
            borderStyle: "solid",
            borderColor: "var(--line-2)",
          }}
        >
          <PluginKindIcon kind={kind} />
        </span>
        <div>
          <div
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 18,
              color: "var(--ink)",
            }}
          >
            {PD_MANIFEST_HEADING}
          </div>
          <div
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: 11.5,
              color: "var(--ink-mute)",
            }}
          >
            {PD_MANIFEST_SUBHEAD}
          </div>
        </div>
      </div>
      <dl
        style={{
          display: "grid",
          gridTemplateColumns: "auto 1fr",
          gap: "9px 18px",
          margin: 0,
        }}
      >
        <dt style={DT}>{PD_LABEL_AUTHOR}</dt>
        <dd style={DD} data-field="manifest-author">
          {author}
        </dd>
        <dt style={DT}>{PD_LABEL_LICENSE}</dt>
        <dd
          style={{ ...DD, color: "var(--ink-mute)" }}
          data-field="manifest-license"
        >
          {license}
        </dd>
        {homepage ? (
          <>
            <dt style={DT}>{PD_LABEL_HOMEPAGE}</dt>
            <dd
              style={{
                margin: 0,
                fontFamily: "var(--font-ui)",
                fontSize: 13,
              }}
            >
              <a
                href={homepage}
                data-field="manifest-homepage"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  color: "var(--network)",
                  textDecoration: "none",
                }}
              >
                {homepage} →
              </a>
            </dd>
          </>
        ) : null}
        <dt style={DT}>{PD_LABEL_COMPATIBLE}</dt>
        <dd
          style={{ ...DD, color: "var(--ink-mute)" }}
          data-field="manifest-compatible"
        >
          {compatibleVersionRange}
        </dd>
      </dl>
    </section>
  );
}
