/**
 * AccountSettings — H10 Cluster B1 surface (sectioned hub).
 *
 * Default: only "Identity" is expanded. Click any section header to
 * toggle. Each section either renders a list of sub-page links, or a
 * special pane (Digital inheritance has a toggle + CTA; About renders
 * a description list of operator/version/source).
 */

import { useState, type CSSProperties, type ReactNode } from "react";

import {
  DEFAULT_SECTIONS,
  INHERITANCE_SETUP_CTA,
  INHERITANCE_TOGGLE_HINT,
  INHERITANCE_TOGGLE_LABEL,
  type SectionDef,
  type SectionKey,
} from "./copy.js";

export interface AboutMeta {
  operator: string;
  version: string;
  sourceLabel?: string;
  sourceHref?: string;
}

export interface AccountSettingsSurfaceProps {
  sections?: readonly SectionDef[];
  about?: AboutMeta;
  inheritanceOn?: boolean;
  /** Override default open section. Defaults to "identity" only. */
  initialOpen?: Partial<Record<SectionKey, boolean>>;
  onToggleInheritance?: (next: boolean) => void;
  onSetupExecutor?: () => void;
  /** Override the default icon mapper per section. */
  sectionIcon?: (key: SectionKey) => ReactNode;
  className?: string;
  style?: CSSProperties;
}

const PAGE: CSSProperties = {
  maxWidth: 680,
  margin: "0 auto",
  padding: "24px 24px 56px",
  display: "flex",
  flexDirection: "column",
  gap: 11,
};

function defaultIcon(key: SectionKey): ReactNode {
  const props = {
    width: 20,
    height: 20,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.5,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  switch (key) {
    case "identity":
      return (
        <svg {...props}>
          <path d="M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" />
          <path d="M5 20a7 7 0 0 1 14 0" />
        </svg>
      );
    case "security":
      return (
        <svg {...props}>
          <path d="M12 3l8 3v6c0 4.5-3.3 7.8-8 9-4.7-1.2-8-4.5-8-9V6z" />
        </svg>
      );
    case "privacy":
      return (
        <svg {...props}>
          <path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12z" />
          <path d="M12 9.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5z" />
        </svg>
      );
    case "access":
      return (
        <svg {...props}>
          <path d="M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z" />
          <path d="M12 8v4M12 16h.01" />
        </svg>
      );
    case "inheritance":
      return (
        <svg {...props}>
          <path d="M12 3l8 4v5c0 4-3.2 7.4-8 9-4.8-1.6-8-5-8-9V7z" />
          <path d="M9 12l2 2 4-4" />
        </svg>
      );
    case "lifecycle":
      return (
        <svg {...props}>
          <path d="M6 7h12l-1 13H7z" />
          <path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
        </svg>
      );
    case "about":
      return (
        <svg {...props}>
          <path d="M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z" />
          <path d="M12 11v5M12 8h.01" />
        </svg>
      );
  }
}

function Caret({ open }: { open: boolean }) {
  return (
    <span
      style={{
        display: "flex",
        color: "var(--ink-mute)",
        flex: "none",
        transition: "transform .18s ease",
        transform: open ? "rotate(90deg)" : "none",
      }}
      aria-hidden="true"
    >
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M9 6l6 6-6 6" />
      </svg>
    </span>
  );
}

function LinkArrow() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M9 6l6 6-6 6" />
    </svg>
  );
}

export function AccountSettingsSurface({
  sections = DEFAULT_SECTIONS,
  about,
  inheritanceOn = false,
  initialOpen = { identity: true },
  onToggleInheritance,
  onSetupExecutor,
  sectionIcon = defaultIcon,
  className,
  style,
}: AccountSettingsSurfaceProps) {
  const [openMap, setOpenMap] =
    useState<Partial<Record<SectionKey, boolean>>>(initialOpen);

  return (
    <div className={className} style={{ ...PAGE, ...style }}>
      {sections.map((section) => {
        const isOpen = !!openMap[section.key];
        return (
          <section
            key={section.key}
            data-section={section.key}
            style={{
              borderWidth: 1,
              borderStyle: "solid",
              borderColor: "var(--line)",
              borderRadius: "var(--r-lg)",
              background: "var(--bg-2)",
              overflow: "hidden",
            }}
          >
            <button
              type="button"
              aria-expanded={isOpen}
              onClick={() =>
                setOpenMap((m) => ({ ...m, [section.key]: !m[section.key] }))
              }
              style={{
                display: "flex",
                alignItems: "center",
                gap: 13,
                width: "100%",
                padding: "16px 18px",
                textAlign: "left",
                background: "transparent",
                border: "none",
                cursor: "pointer",
                font: "inherit",
                color: "inherit",
              }}
            >
              <span
                style={{
                  display: "flex",
                  color: "var(--accent)",
                  flex: "none",
                }}
                aria-hidden="true"
              >
                {sectionIcon(section.key)}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: 17,
                    color: "var(--ink)",
                  }}
                >
                  {section.title}
                </div>
                <div
                  style={{
                    fontFamily: "var(--font-ui)",
                    fontSize: 12,
                    color: "var(--ink-mute)",
                    marginTop: 1,
                  }}
                >
                  {section.sub}
                </div>
              </div>
              <Caret open={isOpen} />
            </button>

            {isOpen ? (
              <div
                style={{
                  padding: "4px 18px 18px 51px",
                  borderTopWidth: 1,
                  borderTopStyle: "solid",
                  borderTopColor: "var(--line)",
                }}
              >
                {section.links.length > 0 ? (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 8,
                      marginTop: 13,
                    }}
                  >
                    {section.links.map((l) => (
                      <a
                        key={l.href + l.label}
                        href={l.href}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                          padding: "11px 13px",
                          borderWidth: 1,
                          borderStyle: "solid",
                          borderColor: "var(--line)",
                          borderRadius: "var(--r-md)",
                          background: "var(--bg)",
                          fontFamily: "var(--font-serif)",
                          fontSize: 14,
                          color: l.warn ? "var(--warn)" : "var(--ink)",
                          textDecoration: "none",
                        }}
                      >
                        <span style={{ flex: 1, minWidth: 0 }}>{l.label}</span>
                        <LinkArrow />
                      </a>
                    ))}
                  </div>
                ) : null}

                {section.inheritance ? (
                  <>
                    <label
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        marginTop: 11,
                        padding: "12px 14px",
                        borderWidth: 1,
                        borderStyle: "solid",
                        borderColor: "var(--line)",
                        borderRadius: "var(--r-md)",
                        background: "var(--bg)",
                        cursor: "pointer",
                      }}
                    >
                      <button
                        type="button"
                        role="switch"
                        aria-checked={inheritanceOn}
                        onClick={() =>
                          onToggleInheritance?.(!inheritanceOn)
                        }
                        style={{
                          position: "relative",
                          width: 44,
                          height: 25,
                          borderRadius: 13,
                          background: inheritanceOn
                            ? "var(--accent)"
                            : "var(--bg-3)",
                          borderWidth: 1,
                          borderStyle: "solid",
                          borderColor: inheritanceOn
                            ? "var(--accent)"
                            : "var(--line-2)",
                          flex: "none",
                          transition: "background .18s ease",
                          padding: 0,
                          cursor: "pointer",
                        }}
                      >
                        <span
                          style={{
                            position: "absolute",
                            top: 2,
                            left: inheritanceOn ? 21 : 2,
                            width: 19,
                            height: 19,
                            borderRadius: "50%",
                            background: inheritanceOn
                              ? "var(--accent-ink)"
                              : "var(--ink-mute)",
                            transition: "left .18s ease",
                          }}
                        />
                      </button>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            fontFamily: "var(--font-serif)",
                            fontSize: 14,
                            color: "var(--ink)",
                          }}
                        >
                          {INHERITANCE_TOGGLE_LABEL}
                        </div>
                        <div
                          style={{
                            fontFamily: "var(--font-ui)",
                            fontSize: 11.5,
                            color: "var(--ink-mute)",
                          }}
                        >
                          {INHERITANCE_TOGGLE_HINT}
                        </div>
                      </div>
                    </label>
                    {inheritanceOn ? (
                      <button
                        type="button"
                        onClick={() => onSetupExecutor?.()}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 8,
                          marginTop: 9,
                          padding: "9px 15px",
                          borderRadius: "var(--r-md)",
                          background: "var(--accent-soft)",
                          borderWidth: 1,
                          borderStyle: "solid",
                          borderColor: "var(--line-2)",
                          fontFamily: "var(--font-ui)",
                          fontSize: 13,
                          color: "var(--accent)",
                          cursor: "pointer",
                        }}
                      >
                        {INHERITANCE_SETUP_CTA} →
                      </button>
                    ) : null}
                  </>
                ) : null}

                {section.about && about ? (
                  <dl
                    style={{
                      display: "grid",
                      gridTemplateColumns: "auto 1fr",
                      gap: "7px 16px",
                      margin: "13px 0 0",
                    }}
                  >
                    <dt
                      style={{
                        fontFamily: "var(--font-ui)",
                        fontSize: 11,
                        letterSpacing: "0.06em",
                        textTransform: "uppercase",
                        color: "var(--ink-mute)",
                      }}
                    >
                      Operator
                    </dt>
                    <dd
                      style={{
                        margin: 0,
                        fontFamily: "var(--font-serif)",
                        fontSize: 13.5,
                        color: "var(--ink-soft)",
                      }}
                    >
                      {about.operator}
                    </dd>
                    <dt
                      style={{
                        fontFamily: "var(--font-ui)",
                        fontSize: 11,
                        letterSpacing: "0.06em",
                        textTransform: "uppercase",
                        color: "var(--ink-mute)",
                      }}
                    >
                      Version
                    </dt>
                    <dd
                      style={{
                        margin: 0,
                        fontFamily: "var(--font-mono)",
                        fontSize: 12.5,
                        color: "var(--ink-soft)",
                      }}
                    >
                      {about.version}
                    </dd>
                    {about.sourceHref ? (
                      <>
                        <dt
                          style={{
                            fontFamily: "var(--font-ui)",
                            fontSize: 11,
                            letterSpacing: "0.06em",
                            textTransform: "uppercase",
                            color: "var(--ink-mute)",
                          }}
                        >
                          Source
                        </dt>
                        <dd
                          style={{
                            margin: 0,
                            fontFamily: "var(--font-ui)",
                            fontSize: 13.5,
                          }}
                        >
                          <a
                            href={about.sourceHref}
                            style={{ color: "var(--network)" }}
                          >
                            {about.sourceLabel ?? "Repository"} →
                          </a>
                        </dd>
                      </>
                    ) : null}
                  </dl>
                ) : null}
              </div>
            ) : null}
          </section>
        );
      })}
    </div>
  );
}
