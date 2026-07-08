/**
 * Family tree route — b108-2ha.
 *
 * Lists ancestor / beloved-dead entities in a sidebar and renders
 * the kinship graph for whichever one is selected. Also lets the
 * user add or remove kinship edges from the same surface.
 *
 * The design brief here is deliberately spare — FEATURES.md §3
 * calls for a "lightweight family tree visualisation, no
 * integration with genealogy services for privacy". This is the
 * lightweight variant.
 */

import {
  FamilyTreeSurface,
  type FamilyEdgeKind,
  type FamilyTreeInput,
  Skeleton,
  Toast,
  useTopbar,
} from "@theourgia/shared";
import { useCallback, useEffect, useMemo, useState } from "react";

function toastError(title: string, body: unknown): void {
  Toast.push({
    tone: "warning",
    title,
    body: body instanceof Error ? body.message : String(body ?? ""),
  });
}

function toastOk(title: string): void {
  Toast.push({ tone: "success", title });
}

import { apiMethods } from "../data/api.js";

type EntityLike = {
  id: string;
  name: string;
  kind: string;
};

const KIN_KINDS: FamilyEdgeKind[] = ["parent-of", "sibling-of", "spouse-of"];

const KIN_LABEL: Record<FamilyEdgeKind, string> = {
  "parent-of": "Parent of",
  "sibling-of": "Sibling of",
  "spouse-of": "Spouse of",
};

export function FamilyTreeRoute() {
  useTopbar(
    () => ({
      title: "Family tree",
      subtitle: "Ancestors and beloved dead — private, never uploaded",
    }),
    [],
  );

  const [entities, setEntities] = useState<EntityLike[]>([]);
  const [probeId, setProbeId] = useState<string | null>(null);
  const [tree, setTree] = useState<FamilyTreeInput | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [linkTargetId, setLinkTargetId] = useState<string>("");
  const [linkKind, setLinkKind] = useState<FamilyEdgeKind>("parent-of");
  const [linkNote, setLinkNote] = useState<string>("");
  const [linkBusy, setLinkBusy] = useState<boolean>(false);

  const loadEntities = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const rows = await apiMethods.listEntities();
      const kin = rows.filter(
        (r) => r.kind === "ancestor" || r.kind === "beloved_dead",
      );
      setEntities(kin);
      const first = kin[0];
      if (first && probeId === null) {
        setProbeId(first.id);
      }
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, [probeId]);

  const loadTree = useCallback(async (id: string) => {
    try {
      const t = await apiMethods.getFamilyTree(id);
      setTree(t);
    } catch (e) {
      setError(String(e));
    }
  }, []);

  useEffect(() => {
    void loadEntities();
  }, [loadEntities]);

  useEffect(() => {
    if (probeId) {
      void loadTree(probeId);
    }
  }, [probeId, loadTree]);

  const handleAddKin = useCallback(async () => {
    if (!probeId || !linkTargetId) return;
    setLinkBusy(true);
    try {
      await apiMethods.addKinship(probeId, {
        target_entity_id: linkTargetId,
        kind: linkKind,
        notes: linkNote || null,
      });
      setLinkTargetId("");
      setLinkNote("");
      await loadTree(probeId);
      toastOk("Kinship added");
    } catch (e) {
      toastError("Could not add kinship", e);
    } finally {
      setLinkBusy(false);
    }
  }, [probeId, linkTargetId, linkKind, linkNote, loadTree]);

  const handleRemoveEdge = useCallback(
    async (edgeId: string) => {
      if (!probeId) return;
      try {
        await apiMethods.removeKinship(edgeId);
        await loadTree(probeId);
        toastOk("Kinship removed");
      } catch (e) {
        toastError("Could not remove kinship", e);
      }
    },
    [probeId, loadTree],
  );

  const kinCandidates = useMemo(
    () => entities.filter((e) => e.id !== probeId),
    [entities, probeId],
  );

  if (loading) {
    return (
      <div style={{ padding: "var(--space-4)" }}>
        <Skeleton kind="text" width="60%" />
        <Skeleton kind="text" width="80%" />
        <Skeleton kind="text" width="70%" />
      </div>
    );
  }
  if (error) {
    return (
      <div style={{ padding: "var(--space-4)" }}>
        <p style={{ color: "var(--care)" }}>{error}</p>
      </div>
    );
  }
  if (entities.length === 0) {
    return (
      <div style={{ padding: "var(--space-4)" }}>
        <p>
          No ancestor or beloved-dead entities yet. Create one from the
          Entities page to build a tree.
        </p>
      </div>
    );
  }

  return (
    <div
      data-route="family-tree"
      style={{
        display: "grid",
        gridTemplateColumns: "220px 1fr 260px",
        gap: "var(--space-4)",
        padding: "var(--space-4)",
      }}
    >
      <aside data-role="probe-picker">
        <h3
          style={{
            font: "var(--type-eyebrow)",
            color: "var(--muted)",
            marginBottom: "var(--space-2)",
          }}
        >
          Probe
        </h3>
        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {entities.map((e) => (
            <li key={e.id}>
              <button
                type="button"
                data-active={e.id === probeId}
                onClick={() => setProbeId(e.id)}
                style={{
                  display: "block",
                  width: "100%",
                  textAlign: "left",
                  padding: "var(--space-2)",
                  background:
                    e.id === probeId ? "var(--bg-2)" : "transparent",
                  border: "1px solid var(--line-2)",
                  borderRadius: "var(--radius-sm)",
                  color: "var(--ink)",
                  marginBottom: "var(--space-1)",
                  cursor: "pointer",
                  font: "var(--type-body)",
                }}
              >
                {e.name}
              </button>
            </li>
          ))}
        </ul>
      </aside>

      <section data-role="tree-canvas">
        {tree ? (
          <FamilyTreeSurface
            tree={tree}
            onSelectNode={(id) => setProbeId(id)}
            onRemoveEdge={(edgeId) => void handleRemoveEdge(edgeId)}
          />
        ) : (
          <Skeleton kind="text" width="80%" />
        )}
      </section>

      <aside data-role="link-editor">
        <h3
          style={{
            font: "var(--type-eyebrow)",
            color: "var(--muted)",
            marginBottom: "var(--space-2)",
          }}
        >
          Add kinship
        </h3>
        <label
          style={{
            display: "block",
            font: "var(--type-label)",
            color: "var(--muted)",
            marginBottom: "var(--space-1)",
          }}
        >
          Relative
        </label>
        <select
          value={linkTargetId}
          onChange={(e) => setLinkTargetId(e.target.value)}
          style={{
            width: "100%",
            padding: "var(--space-2)",
            marginBottom: "var(--space-2)",
            background: "var(--bg-2)",
            color: "var(--ink)",
            border: "1px solid var(--line-2)",
            borderRadius: "var(--radius-sm)",
          }}
        >
          <option value="">Choose…</option>
          {kinCandidates.map((e) => (
            <option key={e.id} value={e.id}>
              {e.name}
            </option>
          ))}
        </select>
        <label
          style={{
            display: "block",
            font: "var(--type-label)",
            color: "var(--muted)",
            marginBottom: "var(--space-1)",
          }}
        >
          Relationship
        </label>
        <select
          value={linkKind}
          onChange={(e) => setLinkKind(e.target.value as FamilyEdgeKind)}
          style={{
            width: "100%",
            padding: "var(--space-2)",
            marginBottom: "var(--space-2)",
            background: "var(--bg-2)",
            color: "var(--ink)",
            border: "1px solid var(--line-2)",
            borderRadius: "var(--radius-sm)",
          }}
        >
          {KIN_KINDS.map((k) => (
            <option key={k} value={k}>
              {KIN_LABEL[k]}
            </option>
          ))}
        </select>
        <label
          style={{
            display: "block",
            font: "var(--type-label)",
            color: "var(--muted)",
            marginBottom: "var(--space-1)",
          }}
        >
          Notes (optional)
        </label>
        <textarea
          value={linkNote}
          onChange={(e) => setLinkNote(e.target.value)}
          rows={3}
          style={{
            width: "100%",
            padding: "var(--space-2)",
            marginBottom: "var(--space-2)",
            background: "var(--bg-2)",
            color: "var(--ink)",
            border: "1px solid var(--line-2)",
            borderRadius: "var(--radius-sm)",
            fontFamily: "var(--font-ui)",
          }}
        />
        <button
          type="button"
          onClick={() => void handleAddKin()}
          disabled={!linkTargetId || linkBusy}
          style={{
            width: "100%",
            padding: "var(--space-2)",
            background: "var(--accent)",
            color: "var(--bg)",
            border: "none",
            borderRadius: "var(--radius-sm)",
            cursor: linkTargetId ? "pointer" : "not-allowed",
            opacity: linkTargetId ? 1 : 0.5,
          }}
        >
          Add
        </button>
        <p
          style={{
            font: "var(--type-caption)",
            color: "var(--muted)",
            marginTop: "var(--space-3)",
          }}
        >
          Click an edge label to remove it. Click a relative to make them
          the probe.
        </p>
      </aside>

    </div>
  );
}
