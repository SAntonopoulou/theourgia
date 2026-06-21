/**
 * Entities — the alias-graph ledger surface.
 *
 * Composition tracks ``Theourgia Entities.dc.html``:
 *   Topbar    · "Entities" + subtitle "X figures · taxonomy line" +
 *               "New entity" primary action.
 *   Filter    · Class chips (All / Deities / Daimones / Angels / Demons /
 *               Saints), each with a colored dot + count.
 *   Grid      · Auto-fill 248px-min entity cards: glyph medallion + kind
 *               badge with colored dot + name + native script + italic
 *               description + footer (X appearances · invoked Y).
 *   Right     · "By tradition" panel (counts derived from loaded data),
 *               "By planet" panel (planet bubbles — filter wiring lands
 *               with the planet-correspondences field).
 *
 * Class chips map to broader backend ``EntityKind`` values (deity → both
 * gods + goddesses; spirit → daimones + angels + demons + saints until
 * the taxonomy reconciliation lands).
 */

import {
  type CreateEntityInput,
  type EntityKind,
  type EntityRecord,
  PromptDialog,
  Skeleton,
  Toast,
  useApiCall,
  useTopbar,
} from "@theourgia/shared";
import { useMemo, useState } from "react";

import { apiMethods } from "../data/api.js";

// ─── UI taxonomy ────────────────────────────────────────────────────────────

type EntityClass = "all" | "deity" | "daimon" | "angel" | "demon" | "saint";

const CLASS_LABEL: Record<Exclude<EntityClass, "all">, string> = {
  deity: "Deity",
  daimon: "Daimon",
  angel: "Angel",
  demon: "Demon",
  saint: "Saint",
};

const CLASS_PLURAL: Record<Exclude<EntityClass, "all">, string> = {
  deity: "Deities",
  daimon: "Daimones",
  angel: "Angels",
  demon: "Demons",
  saint: "Saints",
};

const CLASS_COLOR: Record<Exclude<EntityClass, "all">, string> = {
  deity: "var(--c-entity)",
  daimon: "var(--c-synchronicity)",
  angel: "var(--c-divination)",
  demon: "var(--c-working)",
  saint: "var(--c-library)",
};

/**
 * Map the UI class chip to backend kind(s). Backend's EntityKind is broader
 * (deity covers gods + goddesses; spirit covers daimones / angels / demons /
 * saints until the taxonomy reconciliation lands). We tag each entity with
 * a "ui class" derived from a combination of backend kind + tradition + name
 * heuristics — good enough until the dedicated field ships.
 */
function classifyEntity(entity: EntityRecord): Exclude<EntityClass, "all"> {
  const trad = (entity.tradition ?? "").toLowerCase();
  const name = (entity.name ?? "").toLowerCase();
  if (entity.kind === "deity") return "deity";
  if (entity.kind === "spirit") {
    if (trad.includes("hellenic") || name.includes("daimon")) return "daimon";
    if (trad.includes("qabalistic") || trad.includes("kabbalah") || name.includes("angel")) {
      return "angel";
    }
    if (trad.includes("goetic") || trad.includes("demon")) return "demon";
    if (trad.includes("hagiographic") || trad.includes("saint")) return "saint";
    return "daimon";
  }
  return "daimon";
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function nativeScriptOf(entity: EntityRecord): string | null {
  // The backend Entity model doesn't yet carry a dedicated native-script
  // field; lift it from the first alias when one looks like non-Latin script.
  const candidate = entity.aliases?.[0];
  if (!candidate) return null;
  // Quick heuristic: any non-ASCII alias is "native".
  return /[^\x20-\x7e]/.test(candidate) ? candidate : null;
}

function relativeInvocation(_entity: EntityRecord): string {
  // No citation-tracking endpoint yet — the design shows "invoked 14 Jun"
  // / "invoked today" / "sealed" per card. Until citations land, render an
  // honest dash.
  return "—";
}

// ─── Topbar action ──────────────────────────────────────────────────────────

function NewEntityButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "9px 16px",
        borderRadius: "var(--r-md, 8px)",
        background: "var(--accent)",
        color: "var(--accent-ink, white)",
        fontFamily: "var(--font-ui)",
        fontWeight: 700,
        fontSize: 13.5,
        border: "none",
        cursor: "pointer",
      }}
    >
      <svg
        width="15"
        height="15"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        aria-hidden="true"
      >
        <path d="M12 5v14M5 12h14" />
      </svg>
      New entity
    </button>
  );
}

// ─── Class-chip filter bar ─────────────────────────────────────────────────

function ClassFilters({
  active,
  counts,
  onChange,
}: {
  active: EntityClass;
  counts: Record<EntityClass, number>;
  onChange: (cls: EntityClass) => void;
}) {
  const chipStyle = (selected: boolean): React.CSSProperties => ({
    display: "flex",
    alignItems: "center",
    padding: "7px 13px",
    fontFamily: "var(--font-ui)",
    fontSize: 12.5,
    color: selected ? "var(--ink)" : "var(--ink-soft)",
    background: selected ? "var(--accent-soft)" : "transparent",
    border: `1px solid ${selected ? "var(--line-2)" : "var(--line)"}`,
    borderRadius: "var(--r-pill, 999px)",
    cursor: "pointer",
  });

  return (
    <div
      role="tablist"
      aria-label="Entity class"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        flexWrap: "wrap",
        marginBottom: 22,
      }}
    >
      <button
        type="button"
        role="tab"
        aria-selected={active === "all"}
        onClick={() => onChange("all")}
        style={chipStyle(active === "all")}
      >
        All <span style={{ opacity: 0.6, marginLeft: 6 }}>{counts.all}</span>
      </button>
      {(Object.keys(CLASS_LABEL) as Exclude<EntityClass, "all">[]).map((cls) => {
        const selected = active === cls;
        return (
          <button
            key={cls}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(cls)}
            style={chipStyle(selected)}
          >
            <span
              aria-hidden="true"
              style={{
                width: 7,
                height: 7,
                borderRadius: "50%",
                background: CLASS_COLOR[cls],
                display: "inline-block",
                marginRight: 7,
              }}
            />
            {CLASS_PLURAL[cls]}{" "}
            <span style={{ opacity: 0.6, marginLeft: 4 }}>{counts[cls] ?? 0}</span>
          </button>
        );
      })}
    </div>
  );
}

// ─── Entity card ────────────────────────────────────────────────────────────

function EntityCard({ entity }: { entity: EntityRecord }) {
  const cls = classifyEntity(entity);
  const color = CLASS_COLOR[cls];
  const label = CLASS_LABEL[cls];
  const native = nativeScriptOf(entity);
  const invocation = relativeInvocation(entity);
  // Prefer a glyph from the model's field; fall back to the first character
  // of the name (Σ-style monogram is a common journal convention).
  const glyph =
    entity.glyph && entity.glyph !== "entity"
      ? entity.glyph
      : entity.name.slice(0, 1).toUpperCase();
  // If the alias used as "native script" happens to be Hebrew, set the
  // direction so the glyph renders RTL correctly.
  const isHebrew = native && /[֐-׿]/.test(native);
  return (
    <article
      style={{
        background: "var(--bg-2)",
        border: "1px solid var(--line)",
        borderRadius: "var(--r-lg, 14px)",
        padding: 18,
        transition: "border-color 0.15s ease",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          marginBottom: 14,
        }}
      >
        <span
          aria-hidden="true"
          style={{
            width: 44,
            height: 44,
            borderRadius: "50%",
            background: "var(--accent-soft)",
            border: "1px solid var(--line-2)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "var(--font-glyph, var(--font-serif))",
            fontSize: 20,
            color: "var(--accent)",
          }}
        >
          {glyph}
        </span>
        <span
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            fontFamily: "var(--font-ui)",
            fontSize: 10.5,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "var(--ink-mute)",
          }}
        >
          <span
            aria-hidden="true"
            style={{
              width: 7,
              height: 7,
              borderRadius: "50%",
              background: color,
            }}
          />
          {label}
        </span>
      </div>
      <div
        style={{
          fontFamily: "var(--font-display, var(--font-serif))",
          fontSize: 20,
          lineHeight: 1.1,
        }}
      >
        {entity.name}
      </div>
      {native ? (
        <div
          lang={isHebrew ? "he" : undefined}
          dir={isHebrew ? "rtl" : undefined}
          style={{
            fontFamily: isHebrew ? "var(--font-hebrew, var(--font-serif))" : "var(--font-serif)",
            fontSize: isHebrew ? 15 : 14,
            color: "var(--ink-mute)",
            margin: "2px 0 10px",
          }}
        >
          {native}
        </div>
      ) : (
        <div style={{ height: 12 }} />
      )}
      {entity.description ? (
        <p
          style={{
            fontFamily: "var(--font-serif)",
            fontStyle: "italic",
            fontSize: 14,
            lineHeight: 1.5,
            color: "var(--ink-soft)",
            margin: "0 0 14px",
          }}
        >
          {entity.description}
        </p>
      ) : null}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontFamily: "var(--font-ui)",
          fontSize: 11.5,
          color: "var(--ink-mute)",
          borderTop: "1px solid var(--line)",
          paddingTop: 11,
        }}
      >
        <span>— appearances</span>
        <span>invoked {invocation}</span>
      </div>
    </article>
  );
}

// ─── Right rail ─────────────────────────────────────────────────────────────

const railCardStyle: React.CSSProperties = {
  background: "var(--bg-2)",
  border: "1px solid var(--line)",
  borderRadius: "var(--r-lg, 14px)",
  padding: "16px 18px",
};

const railLabel: React.CSSProperties = {
  fontFamily: "var(--font-ui)",
  fontSize: 10.5,
  letterSpacing: "0.16em",
  textTransform: "uppercase",
  color: "var(--ink-mute)",
  marginBottom: 14,
};

function ByTraditionCard({ entities }: { entities: EntityRecord[] }) {
  const counts = useMemo(() => {
    const c = new Map<string, number>();
    for (const e of entities) {
      const t = (e.tradition ?? "").trim() || "Untagged";
      const key = t.charAt(0).toUpperCase() + t.slice(1);
      c.set(key, (c.get(key) ?? 0) + 1);
    }
    return Array.from(c.entries()).sort((a, b) => b[1] - a[1]);
  }, [entities]);

  return (
    <article style={railCardStyle}>
      <div style={railLabel}>By tradition</div>
      {counts.length === 0 ? (
        <div
          style={{
            fontFamily: "var(--font-ui)",
            fontSize: 12,
            color: "var(--ink-mute)",
          }}
        >
          Tradition counts appear when entities carry the field.
        </div>
      ) : (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 11,
            fontFamily: "var(--font-ui)",
            fontSize: 13.5,
            color: "var(--ink-soft)",
          }}
        >
          {counts.map(([tradition, count]) => (
            <div key={tradition} style={{ display: "flex", alignItems: "center", gap: 10 }}>
              {tradition}
              <span
                style={{
                  marginLeft: "auto",
                  fontFamily: "var(--font-mono)",
                  fontSize: 12,
                  color: "var(--ink-mute)",
                }}
              >
                {count}
              </span>
            </div>
          ))}
        </div>
      )}
    </article>
  );
}

function ByPlanetCard() {
  const planets = ["☉", "☽", "☿", "♀", "♂", "♃", "♄"];
  return (
    <article style={railCardStyle}>
      <div style={railLabel}>By planet</div>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 8,
          fontFamily: "var(--font-glyph, var(--font-serif))",
          fontSize: 18,
          color: "var(--ink-soft)",
        }}
        aria-label="Planetary filter (planet correspondences ship later)"
      >
        {planets.map((p) => (
          <span
            key={p}
            aria-hidden="true"
            style={{
              width: 34,
              height: 34,
              border: "1px solid var(--line)",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
            title="Planetary filter lands with the correspondences field"
          >
            {p}
          </span>
        ))}
      </div>
    </article>
  );
}

// ─── Page ───────────────────────────────────────────────────────────────────

export function Entities() {
  const [active, setActive] = useState<EntityClass>("all");
  const [composing, setComposing] = useState(false);
  const entities = useApiCall<EntityRecord[]>((signal) => apiMethods.listEntities({ signal }));

  // Counts per class (derived from loaded data so chip badges stay honest).
  const counts = useMemo(() => {
    const c: Record<EntityClass, number> = {
      all: 0,
      deity: 0,
      daimon: 0,
      angel: 0,
      demon: 0,
      saint: 0,
    };
    for (const e of entities.data ?? []) {
      c.all += 1;
      c[classifyEntity(e)] += 1;
    }
    return c;
  }, [entities.data]);

  const filtered = useMemo(() => {
    const rows = entities.data ?? [];
    if (active === "all") return rows;
    return rows.filter((e) => classifyEntity(e) === active);
  }, [entities.data, active]);

  const subtitle = `${counts.all.toLocaleString()} figures · gods, daimones, angels, demons, saints`;

  useTopbar(
    () => ({
      title: "Entities",
      subtitle,
      after: <NewEntityButton onClick={() => setComposing(true)} />,
    }),
    [subtitle],
  );

  async function applyCompose(name: string): Promise<void> {
    setComposing(false);
    try {
      const payload: CreateEntityInput = {
        name: name.slice(0, 120),
        kind: "other" as EntityKind,
      };
      await apiMethods.createEntity(payload);
      Toast.push({ tone: "success", title: "Entity added" });
      await entities.refresh();
    } catch (e) {
      Toast.push({
        tone: "error",
        title: "Couldn't add entity",
        body: e instanceof Error ? e.message : String(e),
      });
    }
  }

  return (
    <>
      <div style={{ maxWidth: 1180, margin: "0 auto" }}>
        <ClassFilters active={active} counts={counts} onChange={setActive} />

        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-start", gap: 24 }}>
          {/* GRID */}
          <div
            style={{
              flex: "3 1 540px",
              minWidth: 0,
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(248px, 1fr))",
              gap: 16,
            }}
          >
            {entities.status === "loading" ? (
              <>
                {[0, 1, 2, 3, 4, 5].map((i) => (
                  <div
                    key={`ent-skel-${i}`}
                    style={{
                      background: "var(--bg-2)",
                      border: "1px solid var(--line)",
                      borderRadius: "var(--r-lg, 14px)",
                      padding: 18,
                    }}
                  >
                    <Skeleton kind="circle" width={44} height={44} />
                    <div style={{ height: 14 }} />
                    <Skeleton kind="text" width="60%" />
                    <div style={{ height: 6 }} />
                    <Skeleton kind="text" width="40%" />
                    <div style={{ height: 14 }} />
                    <Skeleton kind="text" width="100%" />
                    <Skeleton kind="text" width="85%" />
                  </div>
                ))}
              </>
            ) : entities.status === "error" ? (
              <div
                style={{
                  gridColumn: "1 / -1",
                  border: "1px solid var(--line)",
                  borderRadius: "var(--r-lg, 14px)",
                  background: "var(--bg-2)",
                  padding: "20px 24px",
                  fontFamily: "var(--font-serif)",
                  fontSize: 14.5,
                  color: "var(--ink-soft)",
                }}
              >
                Couldn't load entities: {entities.error?.message ?? "unknown error."}
              </div>
            ) : filtered.length === 0 ? (
              <div
                style={{
                  gridColumn: "1 / -1",
                  border: "1px solid var(--line)",
                  borderRadius: "var(--r-lg, 14px)",
                  background: "var(--bg-2)",
                  padding: "32px 24px",
                  textAlign: "center",
                  fontFamily: "var(--font-serif)",
                  fontSize: 14.5,
                  color: "var(--ink-mute)",
                  lineHeight: 1.6,
                }}
              >
                {counts.all === 0
                  ? "The ledger is empty. Add the first figure to begin the catalogue."
                  : "No entities match the current filter."}
              </div>
            ) : (
              filtered.map((entity) => <EntityCard key={entity.id} entity={entity} />)
            )}
          </div>

          {/* RIGHT RAIL */}
          <aside
            style={{
              flex: "1 1 240px",
              minWidth: 0,
              display: "flex",
              flexDirection: "column",
              gap: 20,
            }}
          >
            <ByTraditionCard entities={entities.data ?? []} />
            <ByPlanetCard />
          </aside>
        </div>
      </div>

      <PromptDialog
        open={composing}
        title="New entity"
        label="Name"
        placeholder="e.g. Hekate"
        validate={(v) => (v.trim().length < 1 ? "Name required." : null)}
        confirmLabel="Add"
        onSubmit={(value) => void applyCompose(value)}
        onCancel={() => setComposing(false)}
      />
    </>
  );
}
