/**
 * Permissions admin — role rail + grouped permission matrix.
 *
 * Port of ``Theourgia Permissions.dc.html`` against the per-component
 * ritual:
 *
 *   · `.dc.html` read end-to-end (role rail + matrix + Preview-as +
 *     Save changes + Filter + 6 grouped perm sections)
 *   · `agent_onboarding.md §` Theourgia Permissions:
 *     - Server-side enforcement; this UI edits policy only.
 *     - "Preview as role X" *recomputes the whole UI's affordances* as if
 *       you held only that role — a real capability simulation. Stubbed
 *       here (UI toggle + banner) until the authz wiring lands.
 *     - Templates: coven / lodge / study group / scholarly. Designer only
 *       mocked the first three.
 *     - Permission-denied elsewhere routes through a non-punitive dialog
 *       (humane voice). That dialog lives in the shared overlay set;
 *       this surface only ships the editor.
 *
 * Permission catalog + per-role grants copied verbatim from
 * ``.dc.html`` lines 171-207. ~21 perms; the design says "30+" — there's
 * room to add scholarly templates and more perms later without changing
 * this surface's structure.
 */

import { useTopbar } from "@theourgia/shared";
import { type CSSProperties, useMemo, useState } from "react";

const LINE = "var(--line)";
const LINE_2 = "var(--line-2)";

type RoleKey = "admin" | "officer" | "moderator" | "member" | "observer";

interface Permission {
  key: string;
  name: string;
  description: string;
}

interface PermGroup {
  group: string;
  items: Permission[];
}

const CATALOG: PermGroup[] = [
  {
    group: "Content",
    items: [
      { key: "create", name: "Create entries & posts", description: "Author new content in the hub." },
      { key: "editOwn", name: "Edit own content", description: "Revise anything they authored." },
      { key: "editAny", name: "Edit any content", description: "Revise other members’ work." },
      { key: "deleteAny", name: "Delete any content", description: "Sensitive — irreversible removal." },
      { key: "templates", name: "Manage templates", description: "Create and edit shared block templates." },
    ],
  },
  {
    group: "Moderation",
    items: [
      { key: "hide", name: "Hide content", description: "Soft-remove from public view." },
      { key: "removePosts", name: "Remove members’ posts", description: "Take down rule-breaking posts." },
      { key: "reports", name: "Review reports", description: "See and resolve flagged items." },
      { key: "lock", name: "Lock threads", description: "Freeze comment threads." },
    ],
  },
  {
    group: "Members",
    items: [
      { key: "invite", name: "Invite members", description: "Send invitations to join." },
      { key: "approve", name: "Approve join requests", description: "Admit SSO and request-based joins." },
      { key: "assignRoles", name: "Assign roles", description: "Sensitive — grants others power." },
      { key: "remove", name: "Remove members", description: "Sensitive — revokes access." },
    ],
  },
  {
    group: "Networks",
    items: [
      { key: "acceptPeers", name: "Accept federation peers", description: "Approve inbound peer requests." },
      { key: "manageSSO", name: "Manage SSO", description: "Configure single sign-on for the hub." },
      { key: "viewPeers", name: "View peer list", description: "See federated peers." },
    ],
  },
  {
    group: "Publishing",
    items: [
      { key: "blog", name: "Publish to hub blog", description: "Release public articles." },
      { key: "schedule", name: "Schedule content", description: "Queue time-released releases." },
      { key: "newsletter", name: "Send newsletters", description: "Email the membership." },
    ],
  },
  {
    group: "Audit",
    items: [
      { key: "viewLog", name: "View audit log", description: "Read the hub action history." },
      { key: "exportData", name: "Export hub data", description: "Sensitive — bulk data egress." },
    ],
  },
];

const ALL_KEYS = CATALOG.flatMap((g) => g.items.map((i) => i.key));

const GRANTS: Record<RoleKey, string[]> = {
  admin: ALL_KEYS,
  officer: [
    "create", "editOwn", "editAny", "templates",
    "hide", "removePosts", "reports", "lock",
    "invite", "approve",
    "acceptPeers", "viewPeers",
    "blog", "schedule", "newsletter",
    "viewLog",
  ],
  moderator: ["create", "editOwn", "hide", "removePosts", "reports", "lock", "viewPeers", "viewLog"],
  member: ["create", "editOwn", "blog"],
  observer: [],
};

const ROLES: { key: RoleKey; label: string; members: number }[] = [
  { key: "admin", label: "Admin", members: 3 },
  { key: "officer", label: "Officer", members: 5 },
  { key: "moderator", label: "Moderator", members: 8 },
  { key: "member", label: "Member", members: 142 },
  { key: "observer", label: "Observer", members: 54 },
];

const TEMPLATES: { key: string; label: string }[] = [
  { key: "coven", label: "Coven" },
  { key: "lodge", label: "Lodge" },
  { key: "study-group", label: "Study group" },
  { key: "scholarly", label: "Scholarly" },
];

function RoleRow({
  role,
  active,
  onSelect,
}: {
  role: { key: RoleKey; label: string; members: number };
  active: boolean;
  onSelect: () => void;
}) {
  const base: CSSProperties = {
    display: "flex",
    alignItems: "center",
    width: "100%",
    padding: "9px 12px",
    borderRadius: "var(--r-md)",
    color: active ? "var(--ink)" : "var(--ink-soft)",
    background: active ? "var(--accent-soft)" : "transparent",
    fontFamily: "var(--font-ui)",
    fontSize: 14,
    marginBottom: 2,
    boxShadow: active ? "inset 2px 0 0 var(--accent)" : "none",
    border: "none",
    cursor: "pointer",
  };
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={active ? "true" : "false"}
      style={base}
      onMouseEnter={(e) => {
        if (!active) (e.currentTarget as HTMLButtonElement).style.background = "var(--bg-3)";
      }}
      onMouseLeave={(e) => {
        if (!active) (e.currentTarget as HTMLButtonElement).style.background = "transparent";
      }}
    >
      <span style={{ flex: 1, textAlign: "left" }}>{role.label}</span>
      <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--ink-mute)" }}>{role.members}</span>
    </button>
  );
}

function PermSwitch({ enabled, onToggle }: { enabled: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled ? "true" : "false"}
      onClick={onToggle}
      style={{
        position: "relative",
        width: 38,
        height: 22,
        borderRadius: 999,
        border: `1px solid ${enabled ? "var(--accent)" : LINE_2}`,
        background: enabled ? "var(--accent)" : "var(--bg-3)",
        flex: "none",
        cursor: "pointer",
        padding: 0,
        transition: "all 0.16s ease",
      }}
    >
      <span
        className="knob"
        style={{
          position: "absolute",
          top: 2,
          left: 2,
          width: 16,
          height: 16,
          borderRadius: "50%",
          background: enabled ? "var(--accent-ink)" : "var(--ink-mute)",
          transform: enabled ? "translateX(16px)" : "translateX(0)",
          transition: "transform 0.16s ease, background 0.16s ease",
        }}
      />
    </button>
  );
}

export function Permissions() {
  const [role, setRole] = useState<RoleKey>("officer");
  const [previewAs, setPreviewAs] = useState<RoleKey | null>(null);
  const [filter, setFilter] = useState("");
  // Local per-role grants — start from defaults, drift on toggle. Real
  // persistence wires up with the authz backend.
  const [grants, setGrants] = useState<Record<RoleKey, Set<string>>>(() => ({
    admin: new Set(GRANTS.admin),
    officer: new Set(GRANTS.officer),
    moderator: new Set(GRANTS.moderator),
    member: new Set(GRANTS.member),
    observer: new Set(GRANTS.observer),
  }));
  const [dirty, setDirty] = useState(false);

  const enabled = grants[role];
  const totalCount = ALL_KEYS.length;
  const roleMembers = ROLES.find((r) => r.key === role)?.members ?? 0;
  const roleName = ROLES.find((r) => r.key === role)?.label ?? "";

  useTopbar(
    () => ({
      title: "Permissions",
      subtitle: "The Aurora Lodge · network roles & grants",
    }),
    [],
  );

  const filteredCatalog = useMemo(() => {
    if (!filter.trim()) return CATALOG;
    const q = filter.trim().toLowerCase();
    return CATALOG.map((g) => ({
      group: g.group,
      items: g.items.filter(
        (i) => i.name.toLowerCase().includes(q) || i.description.toLowerCase().includes(q),
      ),
    })).filter((g) => g.items.length > 0);
  }, [filter]);

  function togglePerm(key: string) {
    setGrants((prev) => {
      const nextSet = new Set(prev[role]);
      if (nextSet.has(key)) nextSet.delete(key);
      else nextSet.add(key);
      return { ...prev, [role]: nextSet };
    });
    setDirty(true);
  }

  function saveChanges() {
    // Real PATCH to /api/v1/hubs/{slug}/roles will land with the authz
    // backend. For now we mark the policy clean.
    setDirty(false);
  }

  return (
    <div style={{ display: "flex", minHeight: 0, margin: "0 -28px", flex: 1 }}>
      {/* Role rail */}
      <div
        className="scroll"
        style={{
          flex: "none",
          width: 236,
          borderRight: `1px solid ${LINE}`,
          background: "var(--bg-2)",
          padding: "18px 14px",
          overflowY: "auto",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 8px 12px" }}>
          <span
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: 10.5,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              color: "var(--ink-mute)",
            }}
          >
            Roles
          </span>
          <button
            type="button"
            aria-label="Create role"
            style={{ color: "var(--accent)", background: "transparent", border: "none", cursor: "pointer" }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden="true">
              <path d="M12 5v14M5 12h14" />
            </svg>
          </button>
        </div>

        {ROLES.map((r) => (
          <RoleRow key={r.key} role={r} active={role === r.key} onSelect={() => setRole(r.key)} />
        ))}

        <div
          style={{
            margin: "14px 8px 8px",
            borderTop: `1px solid ${LINE}`,
            paddingTop: 12,
            fontFamily: "var(--font-ui)",
            fontSize: 10.5,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: "var(--ink-mute)",
          }}
        >
          Templates
        </div>
        {TEMPLATES.map((t) => (
          <button
            key={t.key}
            type="button"
            style={{
              display: "flex",
              width: "100%",
              padding: "8px 12px",
              borderRadius: "var(--r-md)",
              color: "var(--ink-soft)",
              fontFamily: "var(--font-ui)",
              fontSize: 13,
              background: "transparent",
              border: "none",
              cursor: "pointer",
              textAlign: "left",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = "var(--bg-3)";
              (e.currentTarget as HTMLButtonElement).style.color = "var(--ink)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = "transparent";
              (e.currentTarget as HTMLButtonElement).style.color = "var(--ink-soft)";
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Matrix */}
      <main
        className="scroll"
        style={{
          flex: 1,
          minWidth: 0,
          overflowY: "auto",
          minHeight: 0,
          padding: "26px 32px",
        }}
      >
        <div style={{ maxWidth: 760 }}>
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              gap: 16,
              flexWrap: "wrap",
              marginBottom: 6,
            }}
          >
            <div>
              <h2 style={{ fontFamily: "var(--font-display)", fontSize: 26, margin: 0 }}>{roleName}</h2>
              <div
                style={{
                  fontFamily: "var(--font-ui)",
                  fontSize: 13,
                  color: "var(--ink-mute)",
                  marginTop: 3,
                }}
              >
                {enabled.size} of {totalCount} permissions granted · {roleMembers} members
              </div>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button
                type="button"
                onClick={() => setPreviewAs(previewAs === role ? null : role)}
                aria-pressed={previewAs === role ? "true" : "false"}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 7,
                  padding: "9px 14px",
                  border: `1px solid ${previewAs === role ? "var(--accent)" : LINE_2}`,
                  background: previewAs === role ? "var(--accent-soft)" : "transparent",
                  borderRadius: "var(--r-md)",
                  fontFamily: "var(--font-ui)",
                  fontSize: 13,
                  color: "var(--ink)",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
                onMouseEnter={(e) => {
                  if (previewAs !== role) (e.currentTarget as HTMLButtonElement).style.background = "var(--bg-2)";
                }}
                onMouseLeave={(e) => {
                  if (previewAs !== role) (e.currentTarget as HTMLButtonElement).style.background = "transparent";
                }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
                  <path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12z" />
                  <circle cx="12" cy="12" r="2.5" />
                </svg>
                {previewAs === role ? "Exit preview" : `Preview as ${roleName}`}
              </button>
              <button
                type="button"
                onClick={saveChanges}
                disabled={!dirty}
                style={{
                  padding: "9px 16px",
                  borderRadius: "var(--r-md)",
                  background: "var(--accent)",
                  color: "var(--accent-ink)",
                  fontFamily: "var(--font-ui)",
                  fontWeight: 700,
                  fontSize: 13,
                  border: "none",
                  cursor: dirty ? "pointer" : "not-allowed",
                  opacity: dirty ? 1 : 0.55,
                }}
                onMouseEnter={(e) => {
                  if (dirty) (e.currentTarget as HTMLButtonElement).style.opacity = "0.9";
                }}
                onMouseLeave={(e) => {
                  if (dirty) (e.currentTarget as HTMLButtonElement).style.opacity = "1";
                }}
              >
                Save changes
              </button>
            </div>
          </div>

          {/* preview-as banner (non-punitive, info-toned) — recompute of
              affordances elsewhere lands with the authz wiring. */}
          {previewAs ? (
            <div
              role="status"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 11,
                padding: "12px 15px",
                border: `1px solid var(--accent)`,
                background: "var(--accent-soft)",
                borderRadius: "var(--r-md)",
                margin: "14px 0 22px",
              }}
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" style={{ flex: "none" }} aria-hidden="true">
                <path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12z" />
                <circle cx="12" cy="12" r="2.5" />
              </svg>
              <span style={{ fontFamily: "var(--font-ui)", fontSize: 13, color: "var(--ink)", flex: 1 }}>
                Previewing the UI as a <strong>{roleName}</strong>. The rest of the admin recomputes its affordances against this role. (Real recompute wires up with the authz substrate.)
              </span>
              <button
                type="button"
                onClick={() => setPreviewAs(null)}
                style={{
                  fontFamily: "var(--font-ui)",
                  fontSize: 12.5,
                  color: "var(--ink-soft)",
                  background: "transparent",
                  border: `1px solid ${LINE_2}`,
                  borderRadius: "var(--r-sm)",
                  padding: "5px 11px",
                  cursor: "pointer",
                }}
              >
                Exit preview
              </button>
            </div>
          ) : null}

          {/* Filter */}
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "9px 13px",
              border: `1px solid ${LINE}`,
              borderRadius: "var(--r-md)",
              background: "var(--bg-2)",
              margin: previewAs ? "0 0 22px" : "18px 0 22px",
              color: "var(--ink-mute)",
            }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
              <circle cx="11" cy="11" r="7" />
              <path d="M21 21l-4.3-4.3" />
            </svg>
            <input
              type="text"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Filter permissions…"
              aria-label="Filter permissions"
              style={{
                flex: 1,
                fontFamily: "var(--font-ui)",
                fontSize: 13,
                color: "var(--ink)",
                background: "transparent",
                border: "none",
                outline: "none",
                minWidth: 0,
              }}
            />
          </label>

          {filteredCatalog.map((g) => (
            <div key={g.group} style={{ marginBottom: 24 }}>
              <div
                style={{
                  fontFamily: "var(--font-ui)",
                  fontSize: 11,
                  letterSpacing: "0.16em",
                  textTransform: "uppercase",
                  color: "var(--ink-mute)",
                  marginBottom: 10,
                }}
              >
                {g.group}
              </div>
              <div
                style={{
                  border: `1px solid ${LINE}`,
                  borderRadius: "var(--r-lg)",
                  overflow: "hidden",
                  background: "var(--bg-2)",
                }}
              >
                {g.items.map((perm, i) => (
                  <div
                    key={perm.key}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 14,
                      padding: "13px 16px",
                      borderBottom: i < g.items.length - 1 ? `1px solid ${LINE}` : "none",
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: "var(--font-ui)", fontSize: 14, color: "var(--ink)" }}>{perm.name}</div>
                      <div style={{ fontFamily: "var(--font-ui)", fontSize: 12, color: "var(--ink-mute)" }}>{perm.description}</div>
                    </div>
                    <PermSwitch
                      enabled={enabled.has(perm.key)}
                      onToggle={() => togglePerm(perm.key)}
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
