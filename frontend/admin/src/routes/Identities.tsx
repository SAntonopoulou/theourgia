/**
 * Identities admin surface — wired to the real personas API.
 *
 * Reads ``GET /api/v1/identities`` (read-only journaling-layer router:
 * one default persona + N secondaries per account). The earlier build
 * of this surface rendered fabricated demo identities from
 * ``@theourgia/shared``'s ``DEMO_IDENTITIES``; those are gone — every
 * row below is the signed-in practitioner's own personas.
 *
 * Layout keeps the design's skeleton (`Theourgia Identities.dc.html`):
 *   · Title / sub block in topbar
 *   · Left: identity cards grid
 *   · Right: sticky detail rail with "Set as acting"
 *
 * Persona mutations (create / edit / archive), signing keypairs, and
 * per-surface defaults live in later phases — this surface renders
 * only what the backend actually stores today, and says so.
 */

import {
  type IdentityRead,
  Skeleton,
  useActingAs,
  useApiCall,
  useSetActingAs,
  useTopbar,
} from "@theourgia/shared";
import { type CSSProperties, type ReactNode, useState } from "react";

import { apiMethods } from "../data/api.js";

const ACCENT_SOFT = "var(--accent-soft)";
const LINE = "var(--line)";
const LINE_2 = "var(--line-2)";

function kindLabel(identity: IdentityRead): string {
  return identity.kind === "default" ? "Default identity" : "Secondary identity";
}

function IdentityMedallion({
  identity,
  size,
  fontSize,
}: {
  identity: IdentityRead;
  size: number;
  fontSize: number;
}): ReactNode {
  return (
    <span
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: ACCENT_SOFT,
        border: `1px solid ${LINE_2}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "var(--font-display)",
        color: "var(--accent)",
        fontSize,
        flex: "none",
      }}
      aria-hidden="true"
    >
      {identity.display_name.slice(0, 1) || identity.handle.slice(0, 1)}
    </span>
  );
}

function tagStyle(tone: "soft" | "success" | undefined): CSSProperties {
  return {
    fontFamily: "var(--font-ui)",
    fontSize: 10.5,
    color: tone === "success" ? "var(--success)" : "var(--ink-soft)",
    padding: "2px 8px",
    border: `1px solid ${LINE}`,
    borderRadius: 999,
    display: "flex",
    alignItems: "center",
    gap: 5,
  };
}

function IdentityCard({
  identity,
  selected,
  acting,
  onSelect,
}: {
  identity: IdentityRead;
  selected: boolean;
  acting: boolean;
  onSelect: () => void;
}): ReactNode {
  return (
    <button
      type="button"
      data-idcard
      aria-pressed={selected ? "true" : "false"}
      onClick={onSelect}
      className="identity-card"
      style={{
        textAlign: "left",
        display: "flex",
        flexDirection: "column",
        gap: 12,
        padding: 16,
        border: `1px solid ${LINE}`,
        borderRadius: "var(--r-lg)",
        background: "var(--bg-2)",
        cursor: "pointer",
        fontFamily: "inherit",
        color: "inherit",
        boxShadow: selected ? "inset 3px 0 0 var(--accent)" : "none",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <IdentityMedallion identity={identity} size={42} fontSize={21} />
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 18,
              lineHeight: 1.1,
              color: "var(--ink)",
            }}
          >
            {identity.display_name}
          </div>
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 11.5,
              color: "var(--ink-mute)",
              marginTop: 2,
            }}
          >
            @{identity.handle}
          </div>
        </div>
      </div>
      {identity.bio ? (
        <p
          style={{
            fontFamily: "var(--font-serif)",
            fontSize: 13,
            lineHeight: 1.5,
            color: "var(--ink-soft)",
            margin: 0,
          }}
        >
          {identity.bio}
        </p>
      ) : null}
      <div style={{ display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap" }}>
        <span style={tagStyle("soft")}>{kindLabel(identity)}</span>
        {identity.public_face_enabled ? <span style={tagStyle("soft")}>Public face</span> : null}
        {acting ? (
          <span style={tagStyle("success")}>
            <span
              aria-hidden="true"
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: "var(--success)",
              }}
            />
            Acting now
          </span>
        ) : null}
      </div>
    </button>
  );
}

function DetailField({ label, children }: { label: string; children: ReactNode }): ReactNode {
  return (
    <div>
      <div
        style={{
          fontFamily: "var(--font-ui)",
          fontSize: 10,
          letterSpacing: "0.15em",
          textTransform: "uppercase",
          color: "var(--ink-mute)",
          marginBottom: 7,
        }}
      >
        {label}
      </div>
      {children}
    </div>
  );
}

function DetailRail({
  identity,
  acting,
  onSetActing,
}: {
  identity: IdentityRead;
  acting: boolean;
  onSetActing: () => void;
}): ReactNode {
  return (
    <div
      style={{
        background: "var(--bg-2)",
        border: `1px solid ${LINE}`,
        borderRadius: "var(--r-lg)",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          padding: "22px 20px 18px",
          borderBottom: `1px solid ${LINE}`,
          background: "var(--bg-3)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <IdentityMedallion identity={identity} size={52} fontSize={26} />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 22, lineHeight: 1.05 }}>
              {identity.display_name}
            </div>
            <div
              style={{
                fontFamily: "var(--font-ui)",
                fontSize: 12,
                color: "var(--ink-mute)",
                marginTop: 3,
              }}
            >
              {kindLabel(identity)}
            </div>
          </div>
        </div>
        {acting ? (
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              marginTop: 14,
              fontFamily: "var(--font-ui)",
              fontSize: 11,
              color: "var(--success)",
              padding: "3px 9px",
              border: `1px solid ${LINE}`,
              borderRadius: 999,
            }}
          >
            <span
              aria-hidden="true"
              style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--success)" }}
            />
            Acting identity
          </div>
        ) : null}
      </div>

      <div style={{ padding: "18px 20px", display: "flex", flexDirection: "column", gap: 16 }}>
        <DetailField label="Handle">
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 13.5,
              padding: "9px 12px",
              border: `1px solid ${LINE_2}`,
              borderRadius: "var(--r-md)",
              background: "var(--bg)",
            }}
          >
            @{identity.handle}
          </div>
        </DetailField>

        <DetailField label="Bio">
          <div
            style={{
              fontFamily: "var(--font-serif)",
              fontSize: 14,
              lineHeight: 1.55,
              color: identity.bio ? "var(--ink-soft)" : "var(--ink-mute)",
              fontStyle: identity.bio ? "normal" : "italic",
              padding: "10px 12px",
              border: `1px solid ${LINE}`,
              borderRadius: "var(--r-md)",
              background: "var(--bg)",
              minHeight: 64,
            }}
          >
            {identity.bio || "No bio yet."}
          </div>
        </DetailField>

        <DetailField label="Public face">
          <div
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: 12.5,
              color: "var(--ink-soft)",
              lineHeight: 1.5,
            }}
          >
            {identity.public_face_enabled
              ? "Enabled — this identity has a public profile others can browse."
              : "Disabled — this identity is not browsable by others."}
          </div>
        </DetailField>
      </div>

      <div
        style={{ display: "flex", gap: 9, padding: "16px 20px", borderTop: `1px solid ${LINE}` }}
      >
        <button
          type="button"
          onClick={onSetActing}
          disabled={acting}
          style={{
            flex: 1,
            fontFamily: "var(--font-ui)",
            fontSize: 13,
            fontWeight: 700,
            color: "var(--accent-ink)",
            background: "var(--accent)",
            padding: "9px 14px",
            borderRadius: "var(--r-md)",
            border: "none",
            cursor: acting ? "not-allowed" : "pointer",
            opacity: acting ? 0.55 : 1,
          }}
        >
          {acting ? "Currently acting" : "Set as acting"}
        </button>
      </div>
    </div>
  );
}

function CenteredNote({ children }: { children: ReactNode }): ReactNode {
  return (
    <div
      className="scroll"
      style={{
        overflowY: "auto",
        overflowX: "hidden",
        minHeight: 0,
        padding: "48px 28px",
      }}
    >
      <div
        style={{
          maxWidth: 620,
          margin: "0 auto",
          padding: "32px 28px",
          border: `1px solid ${LINE}`,
          borderRadius: "var(--r-lg)",
          background: "var(--bg-2)",
        }}
      >
        {children}
      </div>
    </div>
  );
}

export function Identities() {
  const acting = useActingAs();
  const setActing = useSetActingAs();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const identities = useApiCall<IdentityRead[]>((signal) => apiMethods.listIdentities({ signal }));

  const rows = identities.data ?? [];
  const publicFaces = rows.filter((i) => i.public_face_enabled).length;

  useTopbar(
    () => ({
      title: "Identities",
      subtitle:
        identities.status === "ok"
          ? `${rows.length} author ${rows.length === 1 ? "identity" : "identities"}${
              publicFaces > 0
                ? ` · ${publicFaces} public ${publicFaces === 1 ? "face" : "faces"}`
                : ""
            }`
          : "Your personas — one person, many masks",
    }),
    [identities.status, rows.length, publicFaces],
  );

  if (identities.status === "loading" || identities.status === "idle") {
    return (
      <div style={{ padding: "24px 28px", display: "flex", flexDirection: "column", gap: 12 }}>
        {[0, 1, 2].map((i) => (
          <div
            key={`identities-skel-${i}`}
            style={{
              background: "var(--bg-2)",
              border: `1px solid ${LINE}`,
              borderRadius: "var(--r-lg)",
              padding: 16,
              maxWidth: 520,
            }}
          >
            <Skeleton kind="text" width="55%" />
          </div>
        ))}
      </div>
    );
  }

  if (identities.status === "error") {
    return (
      <CenteredNote>
        <h2 style={{ fontFamily: "var(--font-display)", fontSize: 23, margin: "0 0 12px" }}>
          Couldn't load identities.
        </h2>
        <p
          style={{
            fontFamily: "var(--font-serif)",
            fontSize: 14.5,
            lineHeight: 1.55,
            color: "var(--ink-soft)",
            margin: "0 0 18px",
          }}
        >
          {identities.error?.message ?? "Unknown error."}
        </p>
        <button
          type="button"
          onClick={() => void identities.refresh()}
          style={{
            fontFamily: "var(--font-ui)",
            fontSize: 13,
            fontWeight: 700,
            color: "var(--accent-ink)",
            background: "var(--accent)",
            padding: "9px 16px",
            borderRadius: "var(--r-md)",
            border: "none",
            cursor: "pointer",
          }}
        >
          Retry
        </button>
      </CenteredNote>
    );
  }

  if (rows.length === 0) {
    return (
      <CenteredNote>
        <h2 style={{ fontFamily: "var(--font-display)", fontSize: 23, margin: "0 0 12px" }}>
          No identities yet.
        </h2>
        <p
          style={{
            fontFamily: "var(--font-serif)",
            fontSize: 14.5,
            lineHeight: 1.55,
            color: "var(--ink-soft)",
            margin: 0,
          }}
        >
          Multi-identity authoring is not configured on this vault yet. When personas are set up,
          this surface lists each of your author identities — one person, many masks — and lets you
          choose which one speaks on each surface.
        </p>
      </CenteredNote>
    );
  }

  const selected = rows.find((i) => i.id === selectedId) ?? rows[0];
  if (!selected) return null;

  return (
    <div
      className="scroll"
      style={{ overflowY: "auto", overflowX: "hidden", minHeight: 0, padding: "24px 28px" }}
    >
      <div
        style={{
          maxWidth: 1240,
          margin: "0 auto",
          display: "flex",
          flexWrap: "wrap",
          alignItems: "flex-start",
          gap: 26,
        }}
      >
        {/* LEFT — cards grid */}
        <div style={{ flex: "3 1 520px", minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 4 }}>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: 23, margin: 0 }}>
              Your identities
            </h2>
            <span
              style={{ fontFamily: "var(--font-ui)", fontSize: 12.5, color: "var(--ink-mute)" }}
            >
              One person, many masks.
            </span>
          </div>
          <p
            style={{
              fontFamily: "var(--font-serif)",
              fontSize: 14.5,
              lineHeight: 1.55,
              color: "var(--ink-soft)",
              maxWidth: "62ch",
              margin: "8px 0 20px",
            }}
          >
            Choose which identity speaks on each surface. Nothing links one to another in public — a
            reader of the blog need never know two names share a vault.
          </p>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(248px, 1fr))",
              gap: 14,
              marginBottom: 22,
            }}
          >
            {rows.map((identity) => (
              <IdentityCard
                key={identity.id}
                identity={identity}
                selected={identity.id === selected.id}
                acting={identity.id === acting}
                onSelect={() => setSelectedId(identity.id)}
              />
            ))}
          </div>

          <p
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: 12,
              lineHeight: 1.55,
              color: "var(--ink-mute)",
              maxWidth: "62ch",
              margin: 0,
            }}
          >
            Creating, editing, and archiving personas — and per-identity signing keys and
            per-surface defaults — arrive with the persona admin substrate in a later phase.
          </p>
        </div>

        {/* RIGHT — detail rail */}
        <div style={{ flex: "1 1 300px", minWidth: 0, position: "sticky", top: 0 }}>
          <DetailRail
            identity={selected}
            acting={selected.id === acting}
            onSetActing={() => setActing(selected.id)}
          />
        </div>
      </div>
    </div>
  );
}
