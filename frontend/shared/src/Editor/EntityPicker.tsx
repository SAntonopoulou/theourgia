/**
 * EntityPicker — modal opened from the EntityRefNode NodeView.
 *
 * Lists entities from `useEditorData()`; filters by name / aliases;
 * grouped by kind (god · daemon · angel · ancestor · unified).
 * Selecting a row populates the node's `entityId / displayName / kind`.
 *
 * Matches the `ElectionPickerModal` (B93) layout family — scrim +
 * 480 px panel + search input + scrollable row list. Closes on
 * scrim click + Escape.
 */

import { type CSSProperties, useEffect, useMemo, useState } from "react";

import type { EntityKind, EntityRecord } from "../api/types.js";

import { useEditorData } from "./EditorContext.js";

const SCRIM_STYLE: CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 90,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 20,
};

const SCRIM_BG: CSSProperties = {
  position: "absolute",
  inset: 0,
  background: "rgba(0,0,0,.55)",
};

const PANEL_STYLE: CSSProperties = {
  position: "relative",
  width: "min(520px, 100%)",
  maxHeight: "min(640px, 90vh)",
  display: "flex",
  flexDirection: "column",
  borderWidth: 1,
  borderStyle: "solid",
  borderColor: "var(--line-2)",
  borderRadius: "var(--r-lg)",
  background: "var(--bg)",
  boxShadow: "0 24px 60px rgba(0,0,0,.5)",
};

const KIND_COLOR: Partial<Record<EntityKind, string>> = {
  god: "var(--c-entity)",
  goddess: "var(--c-entity)",
  daemon: "var(--c-entity)",
  angel: "var(--c-entity)",
  demon: "var(--c-entity)",
  saint: "var(--c-entity)",
  ancestor: "var(--c-entity)",
  beloved_dead: "var(--c-entity)",
  familiar: "var(--c-entity)",
  servitor: "var(--accent)",
  egregore: "var(--accent)",
  deity: "var(--c-entity)",
  spirit: "var(--c-entity)",
};

function kindColor(k: EntityKind): string {
  return KIND_COLOR[k] ?? "var(--ink-mute)";
}

export interface EntityPickerProps {
  open: boolean;
  onClose: () => void;
  onPick: (entity: EntityRecord) => void;
  /** Override the data context's entities. Useful in tests/stories. */
  entities?: readonly EntityRecord[];
}

export function EntityPicker({ open, onClose, onPick, entities: override }: EntityPickerProps) {
  const ctx = useEditorData();
  const all = override ?? ctx.entities ?? [];

  const [query, setQuery] = useState("");
  const [activeKind, setActiveKind] = useState<EntityKind | "all">("all");

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return all.filter((e) => {
      if (activeKind !== "all" && e.kind !== activeKind) return false;
      if (q === "") return true;
      if (e.name.toLowerCase().includes(q)) return true;
      return e.aliases.some((a) => a.toLowerCase().includes(q));
    });
  }, [all, query, activeKind]);

  const kinds = useMemo(() => {
    const s = new Set<EntityKind>();
    all.forEach((e) => s.add(e.kind));
    return Array.from(s);
  }, [all]);

  if (!open) return null;
  return (
    <div role="dialog" aria-modal="true" aria-label="Link entity" data-component="editor-entity-picker" style={SCRIM_STYLE}>
      <div onClick={onClose} style={SCRIM_BG} aria-hidden="true" />
      <div style={PANEL_STYLE}>
        <div style={{ padding: "20px 24px 12px", borderBottom: "1px solid var(--line)" }}>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: 21, margin: "0 0 4px" }}>
            Link an entity
          </h2>
          <p
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: 12.5,
              color: "var(--ink-mute)",
              margin: "0 0 14px",
            }}
          >
            Pick the god, daemon, angel, ancestor, or unified view this entry references.
          </p>
          <input
            type="text"
            autoFocus
            placeholder="Search by name or alias…"
            aria-label="Search entities"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{
              width: "100%",
              padding: "10px 12px",
              borderWidth: 1,
              borderStyle: "solid",
              borderColor: "var(--line)",
              borderRadius: "var(--r-md)",
              background: "var(--bg-2)",
              color: "var(--ink)",
              fontFamily: "var(--font-serif)",
              fontSize: 14,
              outline: "none",
            }}
          />
          {kinds.length > 1 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 12 }}>
              <KindChip label="All" active={activeKind === "all"} onClick={() => setActiveKind("all")} />
              {kinds.map((k) => (
                <KindChip
                  key={k}
                  label={kindLabel(k)}
                  color={kindColor(k)}
                  active={activeKind === k}
                  onClick={() => setActiveKind(k)}
                />
              ))}
            </div>
          )}
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "8px 12px 16px" }}>
          {filtered.length === 0 ? (
            <div
              style={{
                padding: "24px 12px",
                textAlign: "center",
                color: "var(--ink-mute)",
                fontFamily: "var(--font-ui)",
                fontSize: 13,
              }}
            >
              {all.length === 0
                ? "No entities loaded yet — link will be available once the entities API is wired."
                : "No matches for the current filter."}
            </div>
          ) : (
            filtered.map((entity) => (
              <button
                key={entity.id}
                type="button"
                onClick={() => {
                  onPick(entity);
                  onClose();
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  width: "100%",
                  padding: "10px 12px",
                  border: "none",
                  background: "transparent",
                  borderRadius: "var(--r-md)",
                  cursor: "pointer",
                  textAlign: "left",
                  color: "inherit",
                  fontFamily: "inherit",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-3)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                <span
                  aria-hidden="true"
                  style={{
                    width: 9,
                    height: 9,
                    borderRadius: "50%",
                    background: kindColor(entity.kind),
                    flex: "none",
                  }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: "var(--font-serif)", fontSize: 15, color: "var(--ink)" }}>
                    {entity.name}
                  </div>
                  {entity.aliases.length > 0 && (
                    <div
                      style={{
                        fontFamily: "var(--font-ui)",
                        fontSize: 11.5,
                        color: "var(--ink-mute)",
                        marginTop: 2,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      also: {entity.aliases.slice(0, 4).join(" · ")}
                    </div>
                  )}
                </div>
                <span
                  style={{
                    fontFamily: "var(--font-ui)",
                    fontSize: 10.5,
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    color: "var(--ink-mute)",
                  }}
                >
                  {kindLabel(entity.kind)}
                </span>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

const KIND_LABEL: Partial<Record<EntityKind, string>> = {
  god: "God",
  goddess: "Goddess",
  daemon: "Daemon",
  angel: "Angel",
  demon: "Demon",
  saint: "Saint",
  ancestor: "Ancestor",
  beloved_dead: "Beloved dead",
  familiar: "Familiar",
  servitor: "Servitor",
  egregore: "Egregore",
  deity: "Deity",
  spirit: "Spirit",
  principle: "Principle",
  place: "Place",
  object: "Object",
  other: "Other",
};

function kindLabel(k: EntityKind): string {
  return KIND_LABEL[k] ?? k;
}

interface KindChipProps {
  label: string;
  color?: string;
  active: boolean;
  onClick: () => void;
}

function KindChip({ label, color, active, onClick }: KindChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active ? "true" : "false"}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        padding: "4px 10px",
        borderWidth: 1,
        borderStyle: "solid",
        borderColor: active ? "var(--accent)" : "var(--line)",
        borderRadius: "var(--r-pill)",
        background: active ? "var(--accent-soft)" : "transparent",
        color: active ? "var(--ink)" : "var(--ink-soft)",
        fontFamily: "var(--font-ui)",
        fontSize: 11.5,
        cursor: "pointer",
      }}
    >
      {color && (
        <span aria-hidden="true" style={{ width: 7, height: 7, borderRadius: "50%", background: color }} />
      )}
      {label}
    </button>
  );
}
