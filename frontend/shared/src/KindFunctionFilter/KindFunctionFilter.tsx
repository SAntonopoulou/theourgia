/**
 * KindFunctionFilter — left-rail filter for the Entity catalog.
 *
 * Collapses 17 entity kinds into 5 function groups
 * (Venerated · Approached · Intimate · Constructed · Other),
 * plus a relationship-status filter row and a tradition list, plus
 * the "Show severed" switch (default off, severed entities use the
 * care palette).
 *
 * Per `Theourgia Entities.dc.html`. Caller supplies the counts; this
 * component owns nothing but the visible selection state via
 * `value`/`onChange`.
 */

import { type CSSProperties, useMemo } from "react";

import {
  RELATIONSHIP_STATUS_META,
  type EntityRelationshipStatus,
} from "../RelationshipStatusPill/RelationshipStatusPill.js";

/**
 * UI-side practitioner taxonomy of 17 distinct entity kinds (the
 * granular distinctions the catalog asks for). Backend `EntityKind`
 * (in api/types.ts) is the narrower 6-kind SQL enum; both will be
 * reconciled in a follow-up backend gap-fill — until then, persist
 * UI kind separately from the broad backend kind.
 */
export type EntityKindUI =
  | "deity"
  | "god"
  | "goddess"
  | "saint"
  | "angel"
  | "daemon"
  | "demon"
  | "spirit"
  | "ancestor"
  | "beloved_dead"
  | "familiar"
  | "servitor"
  | "egregore"
  | "place"
  | "object"
  | "principle"
  | "other";

export type EntityFunctionGroup =
  | "venerated"
  | "approached"
  | "intimate"
  | "constructed"
  | "other";

interface GroupMeta {
  label: string;
  color: string;
  kinds: EntityKindUI[];
}

export const FUNCTION_GROUPS: Record<EntityFunctionGroup, GroupMeta> = {
  venerated: {
    label: "Venerated",
    color: "var(--g-venerated)",
    kinds: ["deity", "god", "goddess", "saint", "angel"],
  },
  approached: {
    label: "Approached",
    color: "var(--g-approached)",
    kinds: ["daemon", "demon", "spirit"],
  },
  intimate: {
    label: "Intimate",
    color: "var(--g-intimate)",
    kinds: ["ancestor", "beloved_dead", "familiar"],
  },
  constructed: {
    label: "Constructed",
    color: "var(--g-constructed)",
    kinds: ["servitor", "egregore"],
  },
  other: {
    label: "Other",
    color: "var(--g-other)",
    kinds: ["place", "object", "principle", "other"],
  },
};

export const FUNCTION_GROUP_ORDER: EntityFunctionGroup[] = [
  "venerated",
  "approached",
  "intimate",
  "constructed",
  "other",
];

export const KIND_LABEL: Record<EntityKindUI, string> = {
  deity: "Deity",
  god: "God",
  goddess: "Goddess",
  saint: "Saint",
  angel: "Angel",
  daemon: "Daemon",
  demon: "Demon",
  spirit: "Spirit",
  ancestor: "Ancestor",
  beloved_dead: "Beloved dead",
  familiar: "Familiar",
  servitor: "Servitor",
  egregore: "Egregore",
  place: "Place",
  object: "Object",
  principle: "Principle",
  other: "Other",
};

export interface KindFunctionFilterValue {
  /** "all" or a function-group key or a specific kind. */
  kind: "all" | EntityFunctionGroup | EntityKindUI;
  status: "all" | EntityRelationshipStatus;
  tradition: string | "all";
}

export interface KindFunctionFilterCounts {
  total: number;
  perKind: Partial<Record<EntityKindUI, number>>;
  perTradition: Record<string, number>;
}

export interface KindFunctionFilterProps {
  counts: KindFunctionFilterCounts;
  value: KindFunctionFilterValue;
  onChange: (next: KindFunctionFilterValue) => void;
  /** Whether severed entities are included in the catalog. */
  showSevered: boolean;
  onToggleSevered: (next: boolean) => void;
  /** List of tradition keys to show. */
  traditions: string[];
  className?: string;
  style?: CSSProperties;
}

function groupCount(
  group: GroupMeta,
  perKind: Partial<Record<EntityKindUI, number>>,
): number {
  return group.kinds.reduce((sum, k) => sum + (perKind[k] ?? 0), 0);
}

const railHeading: CSSProperties = {
  fontFamily: "var(--font-ui)",
  fontSize: 10.5,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  color: "var(--ink-mute)",
};

function railBtnStyle(on: boolean): CSSProperties {
  return {
    display: "flex",
    alignItems: "center",
    gap: 9,
    width: "100%",
    textAlign: "left",
    padding: "7px 9px",
    borderRadius: 7,
    fontFamily: "var(--font-ui)",
    fontSize: 13,
    color: on ? "var(--ink)" : "var(--ink-soft)",
    background: on ? "var(--accent-soft)" : "transparent",
    border: `1px solid ${on ? "var(--line-2)" : "transparent"}`,
    cursor: "pointer",
  };
}

function subBtnStyle(on: boolean): CSSProperties {
  return {
    display: "flex",
    alignItems: "center",
    gap: 8,
    width: "100%",
    textAlign: "left",
    padding: "5px 9px",
    borderRadius: 6,
    fontFamily: "var(--font-ui)",
    fontSize: 12,
    color: on ? "var(--ink)" : "var(--ink-mute)",
    background: on ? "var(--bg-3)" : "transparent",
    border: "1px solid transparent",
    cursor: "pointer",
  };
}

function statusPillStyle(on: boolean): CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "5px 10px",
    borderRadius: 999,
    fontFamily: "var(--font-ui)",
    fontSize: 11.5,
    color: on ? "var(--ink)" : "var(--ink-soft)",
    background: on ? "var(--accent-soft)" : "transparent",
    border: `1px solid ${on ? "var(--line-2)" : "var(--line)"}`,
    cursor: "pointer",
  };
}

const countStyle: CSSProperties = {
  marginLeft: "auto",
  fontFamily: "var(--font-mono)",
  fontSize: 11,
  color: "var(--ink-mute)",
};

const subCountStyle: CSSProperties = {
  marginLeft: "auto",
  fontFamily: "var(--font-mono)",
  fontSize: 10.5,
  color: "var(--ink-mute)",
};

export function KindFunctionFilter({
  counts,
  value,
  onChange,
  showSevered,
  onToggleSevered,
  traditions,
  className,
  style,
}: KindFunctionFilterProps) {
  const pickKind = (kind: KindFunctionFilterValue["kind"]) =>
    onChange({ ...value, kind });
  const pickStatus = (status: EntityRelationshipStatus) =>
    onChange({ ...value, status: value.status === status ? "all" : status });
  const pickTradition = (tradition: string | "all") =>
    onChange({
      ...value,
      tradition: value.tradition === tradition ? "all" : tradition,
    });

  const groups = useMemo(
    () =>
      FUNCTION_GROUP_ORDER.map((key) => {
        const meta = FUNCTION_GROUPS[key];
        return {
          key,
          meta,
          count: groupCount(meta, counts.perKind),
          on: value.kind === key,
          visibleKinds: meta.kinds.filter(
            (k) => (counts.perKind[k] ?? 0) > 0,
          ),
        };
      }),
    [counts.perKind, value.kind],
  );

  const statusEntries = (
    Object.keys(RELATIONSHIP_STATUS_META) as EntityRelationshipStatus[]
  ).filter((k) => k !== "severed");

  return (
    <div
      className={className}
      data-component="kind-function-filter"
      style={{ display: "flex", flexDirection: "column", ...style }}
    >
      {/* KIND */}
      <div style={{ ...railHeading, marginBottom: 9 }}>Kind</div>
      <button
        type="button"
        onClick={() => pickKind("all")}
        aria-pressed={value.kind === "all"}
        style={railBtnStyle(value.kind === "all")}
      >
        All beings
        <span style={countStyle}>{counts.total}</span>
      </button>

      {groups.map(({ key, meta, count, on, visibleKinds }) => (
        <div key={key} style={{ marginTop: 10 }}>
          <button
            type="button"
            onClick={() => pickKind(key)}
            aria-pressed={on}
            style={railBtnStyle(on)}
          >
            <span
              aria-hidden="true"
              style={{
                width: 7,
                height: 7,
                borderRadius: "50%",
                background: meta.color,
                flex: "none",
              }}
            />
            {meta.label}
            <span style={countStyle}>{count}</span>
          </button>
          {visibleKinds.length > 0 && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 1,
                margin: "2px 0 0 16px",
              }}
            >
              {visibleKinds.map((kind) => {
                const sel = value.kind === kind;
                return (
                  <button
                    key={kind}
                    type="button"
                    onClick={() => pickKind(kind)}
                    aria-pressed={sel}
                    style={subBtnStyle(sel)}
                  >
                    {KIND_LABEL[kind]}
                    <span style={subCountStyle}>
                      {counts.perKind[kind] ?? 0}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      ))}

      {/* RELATIONSHIP */}
      <div style={{ ...railHeading, margin: "20px 0 9px" }}>Relationship</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {statusEntries.map((status) => {
          const meta = RELATIONSHIP_STATUS_META[status];
          const on = value.status === status;
          return (
            <button
              key={status}
              type="button"
              onClick={() => pickStatus(status)}
              aria-pressed={on}
              style={statusPillStyle(on)}
            >
              <span
                aria-hidden="true"
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: meta.color,
                }}
              />
              {meta.label}
            </button>
          );
        })}
      </div>

      {/* TRADITION */}
      <div style={{ ...railHeading, margin: "20px 0 9px" }}>Tradition</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
        <button
          type="button"
          onClick={() => pickTradition("all")}
          aria-pressed={value.tradition === "all"}
          style={subBtnStyle(value.tradition === "all")}
        >
          All traditions
          <span style={subCountStyle}>{counts.total}</span>
        </button>
        {traditions.map((tradition) => {
          const on = value.tradition === tradition;
          return (
            <button
              key={tradition}
              type="button"
              onClick={() => pickTradition(tradition)}
              aria-pressed={on}
              style={subBtnStyle(on)}
            >
              {tradition}
              <span style={subCountStyle}>
                {counts.perTradition[tradition] ?? 0}
              </span>
            </button>
          );
        })}
      </div>

      {/* SHOW SEVERED — care palette toggle */}
      <label
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          marginTop: 20,
          padding: "9px 10px",
          borderTop: "1px solid var(--line)",
          cursor: "pointer",
        }}
      >
        <button
          type="button"
          role="switch"
          aria-checked={showSevered}
          onClick={() => onToggleSevered(!showSevered)}
          aria-label="Show severed relationships"
          style={{
            width: 38,
            height: 22,
            borderRadius: 999,
            padding: 2,
            background: showSevered ? "var(--accent)" : "var(--bg-sunk)",
            border: "1px solid var(--line-2)",
            display: "inline-flex",
            justifyContent: showSevered ? "flex-end" : "flex-start",
            flex: "none",
            cursor: "pointer",
          }}
        >
          <span
            aria-hidden="true"
            style={{
              width: 16,
              height: 16,
              borderRadius: "50%",
              background: showSevered ? "var(--accent-ink)" : "var(--ink-mute)",
              display: "block",
            }}
          />
        </button>
        <span
          style={{
            fontFamily: "var(--font-ui)",
            fontSize: 12.5,
            color: "var(--ink-soft)",
          }}
        >
          Show severed
        </span>
      </label>
    </div>
  );
}
