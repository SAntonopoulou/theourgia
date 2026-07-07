/**
 * BundleDetailSurface — H09 Cluster B surface 11.
 *
 * Honesty rules wired:
 *
 *   * Citation source rendered in --remote chip (rule 7).
 *   * **References-from-your-vault count is visible BEFORE
 *     Remove** (rule 35 — irrevocability of vault references).
 *   * Remove CTA uses --warn-soft, NEVER --danger.
 *   * Warn-line in the footer shows the affected-references
 *     count verbatim — the user reads what they'll lose.
 */

import type { CSSProperties, ReactNode } from "react";

import {
  BD_ABOUT_HEADING,
  BD_CITATION_GLYPH,
  BD_COL_COUNT,
  BD_COL_KIND,
  BD_COL_SAMPLE,
  BD_DATA_SHAPE_HEADING,
  BD_DATA_SHAPE_SUB,
  BD_LABEL_AUTHOR,
  BD_LABEL_INSTALLED,
  BD_LABEL_LICENSE,
  BD_LABEL_SOURCE,
  BD_REFERENCES_HEADING,
  BD_REFERENCES_TAIL,
  BD_REMOVE_CTA,
  BD_REMOVE_WARN_PREFIX,
  BD_REMOVE_WARN_SUFFIX,
} from "./copy.js";

export interface BundleDataShape {
  kind: string;
  count: string;
  sample: string;
}

export interface BundleDetailSurfaceProps {
  name: string;
  author: string;
  license: string;
  citationSource: string;
  installedDate: string;
  shapes: readonly BundleDataShape[];
  /** Single sentence describing what references the bundle. */
  referencesLine: ReactNode;
  /** Total reference count — surfaced in the footer warn line
   *  + Remove disclosure. */
  referenceCount: number;
  onBreadcrumbHome?: () => void;
  onRemove?: () => void;
  className?: string;
  style?: CSSProperties;
}

export function BundleDetailSurface({
  name,
  author,
  license,
  citationSource,
  installedDate,
  shapes,
  referencesLine,
  referenceCount,
  onBreadcrumbHome,
  onRemove,
  className,
  style,
}: BundleDetailSurfaceProps) {
  return (
    <section
      data-surface="bundle-detail"
      className={className}
      style={{
        display: "flex",
        flexDirection: "column",
        minHeight: 0,
        height: "100%",
        ...style,
      }}
    >
      <header
        style={{
          display: "flex",
          alignItems: "center",
          gap: 14,
          padding: "13px 24px",
          borderBottom: "1px solid var(--line)",
          background: "var(--bg)",
        }}
      >
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
            Bundles
          </button>
          <span style={{ color: "var(--ink-mute)" }}>/</span>
          <span
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 20,
              lineHeight: 1.1,
            }}
            data-field="bundle-name"
          >
            {name}
          </span>
        </div>
      </header>

      <div
        className="scroll"
        style={{
          overflowY: "auto",
          minHeight: 0,
          padding: "26px 24px 40px",
        }}
      >
        <div
          style={{
            maxWidth: 680,
            margin: "0 auto",
            display: "flex",
            flexDirection: "column",
            gap: 24,
          }}
        >
          <section
            data-field="about"
            style={{
              padding: "18px 20px",
              borderWidth: 1,
              borderStyle: "solid",
              borderColor: "var(--line)",
              borderRadius: "var(--r-lg)",
              background: "var(--bg-2)",
            }}
          >
            <h2 style={sectionH(17)}>{BD_ABOUT_HEADING}</h2>
            <dl
              style={{
                display: "grid",
                gridTemplateColumns: "auto 1fr",
                gap: "9px 18px",
                margin: 0,
              }}
            >
              <dt style={dtStyle()}>{BD_LABEL_AUTHOR}</dt>
              <dd style={ddMono()} data-field="bd-author">
                {author}
              </dd>
              <dt style={dtStyle()}>{BD_LABEL_LICENSE}</dt>
              <dd
                style={{ ...ddMono(), color: "var(--ink-mute)" }}
                data-field="bd-license"
              >
                {license}
              </dd>
              <dt style={dtStyle()}>{BD_LABEL_SOURCE}</dt>
              <dd style={{ margin: 0, display: "flex" }}>
                <span
                  data-field="bd-citation"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "2px 11px",
                    borderRadius: 20,
                    background: "var(--remote-soft)",
                    borderWidth: 1,
                    borderStyle: "solid",
                    borderColor: "var(--remote)",
                    fontFamily: "var(--font-ui)",
                    fontSize: 11.5,
                    color: "var(--remote)",
                  }}
                >
                  <span
                    aria-hidden="true"
                    style={{
                      fontFamily: "var(--font-display)",
                      fontSize: 13,
                      lineHeight: 1,
                    }}
                  >
                    {BD_CITATION_GLYPH}
                  </span>
                  {citationSource}
                </span>
              </dd>
              <dt style={dtStyle()}>{BD_LABEL_INSTALLED}</dt>
              <dd
                style={{
                  margin: 0,
                  fontFamily: "var(--font-serif)",
                  fontSize: 13.5,
                  color: "var(--ink-soft)",
                }}
                data-field="bd-installed"
              >
                {installedDate}
              </dd>
            </dl>
          </section>

          <section data-field="data-shape">
            <h2 style={sectionH(17)}>{BD_DATA_SHAPE_HEADING}</h2>
            <p
              style={{
                fontFamily: "var(--font-ui)",
                fontSize: 12,
                color: "var(--ink-mute)",
                margin: "0 0 12px",
              }}
            >
              {BD_DATA_SHAPE_SUB}
            </p>
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
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 64px 2fr",
                  gap: 14,
                  padding: "10px 16px",
                  borderBottom: "1px solid var(--line)",
                  fontFamily: "var(--font-ui)",
                  fontSize: 10.5,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: "var(--ink-mute)",
                }}
              >
                <span>{BD_COL_KIND}</span>
                <span style={{ textAlign: "right" }}>{BD_COL_COUNT}</span>
                <span>{BD_COL_SAMPLE}</span>
              </div>
              {shapes.map((s, i) => (
                <div
                  key={s.kind}
                  data-shape-row
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 64px 2fr",
                    gap: 14,
                    padding: "12px 16px",
                    borderBottomWidth: i < shapes.length - 1 ? 1 : 0,
                    borderBottomStyle: "solid",
                    borderBottomColor: "var(--line)",
                    alignItems: "center",
                  }}
                >
                  <span
                    style={{
                      fontFamily: "var(--font-serif)",
                      fontSize: 14,
                      color: "var(--ink)",
                    }}
                  >
                    {s.kind}
                  </span>
                  <span
                    style={{
                      textAlign: "right",
                      fontFamily: "var(--font-mono)",
                      fontSize: 13,
                      color: "var(--ink-soft)",
                    }}
                  >
                    {s.count}
                  </span>
                  <span
                    style={{
                      fontFamily: "var(--font-serif)",
                      fontSize: 12.5,
                      color: "var(--ink-mute)",
                      lineHeight: 1.45,
                    }}
                  >
                    {s.sample}
                  </span>
                </div>
              ))}
            </div>
          </section>

          <section data-field="references">
            <h2 style={sectionH(17)}>{BD_REFERENCES_HEADING}</h2>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 13,
                padding: "15px 17px",
                borderWidth: 1,
                borderStyle: "solid",
                borderColor: "var(--line)",
                borderRadius: "var(--r-md)",
                background: "var(--bg-2)",
              }}
            >
              <span
                aria-hidden="true"
                style={{
                  display: "flex",
                  color: "var(--network)",
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
                  <path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1" />
                  <path d="M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1" />
                </svg>
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  data-field="references-line"
                  style={{
                    fontFamily: "var(--font-serif)",
                    fontSize: 14.5,
                    color: "var(--ink)",
                  }}
                >
                  {referencesLine}
                </div>
                <div
                  style={{
                    fontFamily: "var(--font-ui)",
                    fontSize: 12,
                    color: "var(--ink-mute)",
                    marginTop: 2,
                  }}
                >
                  {BD_REFERENCES_TAIL}
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>

      <footer
        style={{
          padding: "13px 24px",
          borderTop: "1px solid var(--line)",
          background: "var(--bg)",
          display: "flex",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            maxWidth: 680,
            width: "100%",
            display: "flex",
            alignItems: "center",
            gap: 12,
            justifyContent: "flex-end",
          }}
        >
          <span
            data-field="remove-warn-line"
            style={{
              marginRight: "auto",
              fontFamily: "var(--font-ui)",
              fontSize: 11.5,
              color: "var(--warn)",
            }}
          >
            {BD_REMOVE_WARN_PREFIX}
            {referenceCount}
            {BD_REMOVE_WARN_SUFFIX}
          </span>
          <button
            type="button"
            onClick={onRemove}
            data-action="remove"
            style={{
              padding: "11px 18px",
              borderRadius: "var(--r-md)",
              borderWidth: 1,
              borderStyle: "solid",
              borderColor: "var(--warn-border)",
              background: "var(--warn-soft)",
              fontFamily: "var(--font-ui)",
              fontSize: 14,
              color: "var(--warn)",
              cursor: "pointer",
            }}
          >
            {BD_REMOVE_CTA}
          </button>
        </div>
      </footer>
    </section>
  );
}

function sectionH(size: number): CSSProperties {
  return {
    fontFamily: "var(--font-display)",
    fontSize: size,
    color: "var(--ink)",
    margin: "0 0 13px",
  };
}

function dtStyle(): CSSProperties {
  return {
    fontFamily: "var(--font-ui)",
    fontSize: 11,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    color: "var(--ink-mute)",
  };
}

function ddMono(): CSSProperties {
  return {
    margin: 0,
    fontFamily: "var(--font-mono)",
    fontSize: 12.5,
    color: "var(--ink-soft)",
    wordBreak: "break-all",
  };
}
