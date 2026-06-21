/**
 * ActingAsSwitcher — the top-nav acting-as button + dropdown menu.
 *
 * Faithful port of the topbar block in ``Theourgia Identities.dc.html``
 * (lines 134-175). Renders the rounded chip showing the current
 * authoring identity; clicking opens a popover-style menu listing every
 * non-archived identity, with a "Manage identities" footer link.
 *
 * Reads + writes the acting-as id via :func:`useActingAs` /
 * :func:`useSetActingAs`. The list of identities is passed in as a prop
 * (the context doesn't own identity data — that comes from the API once
 * the identity model lands; for now the demo array from
 * ``DEMO_IDENTITIES`` is plumbed in by the app).
 */

import {
  type CSSProperties,
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import { useActingAs, useSetActingAs } from "./ActingAsContext.js";
import type { Identity } from "./types.js";

export interface ActingAsSwitcherProps {
  /** All authorable identities (archived ones are filtered out). */
  identities: ReadonlyArray<Identity>;
  /**
   * Optional callback for the "Manage identities" footer link. Typical
   * use: ``() => navigate("/identities")``. When omitted the link is a
   * plain anchor to ``/identities`` (works in Astro and React Router).
   */
  onManage?: () => void;
}

const chipBase: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 9,
  padding: "5px 8px 5px 6px",
  border: "1px solid var(--line-2)",
  borderRadius: 999,
  background: "var(--bg-2)",
  cursor: "pointer",
  fontFamily: "inherit",
  color: "inherit",
};

const labelStack: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "flex-start",
  lineHeight: 1.1,
  minWidth: 0,
};

const eyebrow: CSSProperties = {
  fontFamily: "var(--font-ui)",
  fontSize: 9.5,
  letterSpacing: "0.13em",
  textTransform: "uppercase",
  color: "var(--ink-mute)",
};

const nameLine: CSSProperties = {
  fontFamily: "var(--font-ui)",
  fontSize: 13,
  color: "var(--ink)",
  whiteSpace: "nowrap",
};

const menuStyle: CSSProperties = {
  position: "absolute",
  top: "calc(100% + 8px)",
  right: 0,
  width: 292,
  background: "var(--bg-2)",
  border: "1px solid var(--line-2)",
  borderRadius: "var(--r-lg)",
  boxShadow: "0 22px 48px rgba(0,0,0,.5)",
  padding: 7,
  zIndex: 40,
};

function CheckIcon({ size = 16 }: { size?: number }): ReactNode {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="var(--accent)"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ flex: "none" }}
      aria-hidden="true"
    >
      <path d="M5 12.5l4.5 4.5L19 6.5" />
    </svg>
  );
}

function CaretIcon(): ReactNode {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="var(--ink-mute)"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ flex: "none" }}
      aria-hidden="true"
    >
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

function GearIcon(): ReactNode {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M12 3v2.5M12 18.5V21M21 12h-2.5M5.5 12H3M18 6l-1.7 1.7M7.7 16.3 6 18M18 18l-1.7-1.7M7.7 7.7 6 6" />
    </svg>
  );
}

function IdentityMedallion({ identity, size = 30 }: { identity: Identity; size?: number }): ReactNode {
  const tone = identity.glyphTone ?? "accent";
  return (
    <span
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: tone === "mute" ? "var(--bg-3)" : "var(--accent-soft)",
        border: tone === "mute" ? "1px dashed var(--line-2)" : "1px solid var(--line-2)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "var(--font-glyph)",
        color: tone === "mute" ? "var(--ink-mute)" : "var(--accent)",
        fontSize: Math.round(size * 0.5),
        flex: "none",
      }}
      aria-hidden="true"
    >
      {identity.glyph ?? identity.name.slice(0, 1)}
    </span>
  );
}

export function ActingAsSwitcher({ identities, onManage }: ActingAsSwitcherProps) {
  const acting = useActingAs();
  const setActing = useSetActingAs();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const authorable = identities.filter((i) => !i.archived);
  const active = authorable.find((i) => i.id === acting) ?? authorable[0];

  // Click-outside + ESC to close.
  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const choose = useCallback(
    (id: string) => {
      setActing(id);
      setOpen(false);
    },
    [setActing],
  );

  if (!active) return null;

  return (
    <div ref={containerRef} style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open ? "true" : "false"}
        aria-label="Switch acting identity"
        style={chipBase}
      >
        <IdentityMedallion identity={active} size={28} />
        <span style={labelStack}>
          <span style={eyebrow}>Acting as</span>
          <span style={nameLine}>{active.name}</span>
        </span>
        <CaretIcon />
      </button>

      {open ? (
        <div role="menu" aria-label="Choose acting identity" style={menuStyle}>
          <div
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: 10,
              letterSpacing: "0.15em",
              textTransform: "uppercase",
              color: "var(--ink-mute)",
              padding: "7px 10px 8px",
            }}
          >
            Author as — switches the default for new work
          </div>
          {authorable.map((id) => {
            const isActive = id.id === active.id;
            return (
              <button
                key={id.id}
                type="button"
                role="menuitemradio"
                aria-checked={isActive ? "true" : "false"}
                onClick={() => choose(id.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 11,
                  width: "100%",
                  padding: "9px 10px",
                  borderRadius: "var(--r-md)",
                  textAlign: "left",
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  color: "inherit",
                  fontFamily: "inherit",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = "var(--bg-3)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = "transparent";
                }}
              >
                <IdentityMedallion identity={id} size={30} />
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span
                    style={{
                      display: "block",
                      fontFamily: id.glyphTone === "mute" ? "var(--font-mono)" : "var(--font-display)",
                      fontSize: id.glyphTone === "mute" ? 13.5 : 15,
                      color: "var(--ink)",
                    }}
                  >
                    {id.name}
                  </span>
                  <span
                    style={{
                      display: "block",
                      fontFamily: "var(--font-ui)",
                      fontSize: 11,
                      color: "var(--ink-mute)",
                    }}
                  >
                    {id.kind ?? ""}
                  </span>
                </span>
                {isActive ? <CheckIcon /> : null}
              </button>
            );
          })}
          <div style={{ borderTop: "1px solid var(--line)", margin: "6px 4px 0", paddingTop: 6 }}>
            <a
              href="/identities"
              onClick={(e) => {
                if (onManage) {
                  e.preventDefault();
                  setOpen(false);
                  onManage();
                }
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 9,
                width: "100%",
                padding: "8px 10px",
                borderRadius: "var(--r-md)",
                fontFamily: "var(--font-ui)",
                fontSize: 12.5,
                color: "var(--ink-soft)",
                textDecoration: "none",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLAnchorElement).style.background = "var(--bg-3)";
                (e.currentTarget as HTMLAnchorElement).style.color = "var(--ink)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLAnchorElement).style.background = "transparent";
                (e.currentTarget as HTMLAnchorElement).style.color = "var(--ink-soft)";
              }}
            >
              <GearIcon />
              Manage identities
            </a>
          </div>
        </div>
      ) : null}
    </div>
  );
}
