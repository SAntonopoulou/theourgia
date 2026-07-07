/**
 * HubAdminDashboardSurface — H08 §S3 Cluster A surface 4.
 *
 * Faithful port of ``Theourgia Hub Admin Dashboard.dc.html``. Four
 * tabs: Members (default) · Curation queue · Public face · Settings.
 *
 * Honesty rules wired:
 *
 *   1. **Reject CTA uses --warn chrome (NEVER --danger).** Rejecting
 *      a curation item is a boundary, not a destructive act
 *      (rule 2 carry-forward — `--danger` is reserved for the
 *      Visibility → Public downgrade).
 *   2. **DIDs are rendered in --font-mono per the identity
 *      disclosure rule.** The members table + curation rows both
 *      surface the full DID directly under the display name.
 *   3. **The public-face editor PREVIEWS — it doesn't push on
 *      every keystroke.** A single "Publish public face changes"
 *      CTA at the bottom commits. The supplement is explicit
 *      about this — committed-make moments (rule 8).
 *   4. **Analytics opt-in is a CONFIGURABLE DEFAULT.** The hub
 *      admin picks the policy; the surface presents three options
 *      with the "Always require explicit consent" choice the
 *      most-protective default for sensitive hubs.
 *   5. **No member-count badge anywhere.** The admin sees the
 *      roster (a table of rows); rule 18 prohibits aggregating
 *      that into a single celebratory number. The curation queue
 *      uses "Approved · {when}" pills that are matter-of-fact,
 *      never decorated.
 */

import {
  type CSSProperties,
  type ReactNode,
  useId,
  useMemo,
  useState,
} from "react";

import {
  type AnalyticsOptInDefault,
  HA_ANALYTICS_OPTIONS,
  HA_APPROVED_PREFIX,
  HA_BREADCRUMB_ADMIN_SUFFIX,
  HA_BREADCRUMB_ROOT,
  HA_COL_LAST_ACTIVITY,
  HA_COL_MEMBER,
  HA_COL_ROLE,
  HA_CURATION_APPROVE,
  HA_CURATION_REJECT,
  HA_CURATION_SEND_BACK,
  HA_PUBLIC_BANNER_LABEL,
  HA_PUBLIC_BANNER_UPLOAD,
  HA_PUBLIC_DESCRIPTION_LABEL,
  HA_PUBLIC_HEADER,
  HA_PUBLIC_MOTTO_LABEL,
  HA_PUBLIC_PUBLISH_CTA,
  HA_ROLE_FILTERS,
  HA_SETTINGS_ANALYTICS_HEADING,
  HA_SETTINGS_AUDIT_LINK,
  HA_SETTINGS_ROLES_LINK,
  HA_TAB_KEYS,
  HA_TAB_LABELS,
  type HubAdminTab,
} from "./copy.js";

// ─── Data shapes ───────────────────────────────────────────────────

export interface HubMemberRow {
  /** Single-glyph monogram for the avatar tile. */
  initial: string;
  /** Display name (i18n-resolved). */
  name: string;
  /** Full DID, rendered in --font-mono. */
  did: string;
  /** Role string — one of the H08 canonical five (or a custom
   *  role key). The surface doesn't enforce; the consumer should
   *  pre-validate. */
  role: string;
  /** Display-friendly relative time ("today", "2 days ago"). */
  activity: string;
}

export type CurationItemKind = "entry" | "divination" | "publication";

export type CurationItemStatus =
  | "pending"
  | "approved"
  | "sent-back"
  | "rejected"
  | "withdrawn";

export interface CurationItem {
  id: string;
  /** Contributor DID, rendered --font-mono. */
  did: string;
  kind: CurationItemKind;
  /** Display-friendly submitted-at. */
  submitted: string;
  /** Short body preview (one-line truncation handled by CSS). */
  preview: string;
  status: CurationItemStatus;
  /** Set only when status="approved". Display-friendly. */
  approvedAt?: string;
}

export type CurationAction = "approve" | "send-back" | "reject";

export interface HubPublicFaceDraft {
  motto: string;
  description: string;
  /** Banner-image url (or null if none uploaded yet). */
  bannerUrl?: string | null;
}

export interface HubAdminDashboardSurfaceProps {
  /** Hub display name — used in the breadcrumb only. */
  hubName: string;
  members: readonly HubMemberRow[];
  curation: readonly CurationItem[];
  publicFace: HubPublicFaceDraft;
  analyticsOptIn: AnalyticsOptInDefault;
  initialTab?: HubAdminTab;
  /** Per-row kebab on the members table. */
  onMemberAction?: (memberDid: string) => void;
  /** One of approve / send-back / reject. */
  onCurationAction?: (itemId: string, action: CurationAction) => void;
  /** Save the public-face draft. */
  onPublicFaceSave?: (draft: HubPublicFaceDraft) => void;
  /** New analytics opt-in default selected. */
  onAnalyticsOptInChange?: (next: AnalyticsOptInDefault) => void;
  onOpenRoles?: () => void;
  onOpenAuditLog?: () => void;
  onOpenMyNetworks?: () => void;
  className?: string;
  style?: CSSProperties;
}

// ─── Style atoms ───────────────────────────────────────────────────

const TOPBAR: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 14,
  padding: "12px 24px",
  borderBottom: "1px solid var(--line)",
  background: "var(--bg)",
};

const BREADCRUMB: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  fontFamily: "var(--font-ui)",
  fontSize: 13,
  minWidth: 0,
};

const TAB_ROW: CSSProperties = {
  display: "flex",
  gap: 2,
  overflowX: "auto",
  borderBottom: "1px solid var(--line)",
  background: "var(--bg)",
  padding: "0 18px",
};

const TAB_BASE: CSSProperties = {
  padding: "13px 16px 11px",
  whiteSpace: "nowrap",
  fontFamily: "var(--font-ui)",
  fontSize: 13.5,
  color: "var(--ink-mute)",
  borderTopWidth: 0,
  borderRightWidth: 0,
  borderLeftWidth: 0,
  borderBottomWidth: 2,
  borderBottomStyle: "solid",
  borderBottomColor: "transparent",
  background: "transparent",
  cursor: "pointer",
  flex: "none",
};

const TAB_ON: CSSProperties = {
  ...TAB_BASE,
  color: "var(--ink)",
  borderBottomColor: "var(--network)",
};

const MAIN: CSSProperties = {
  overflowY: "auto",
  minHeight: 0,
  padding: "22px 24px 50px",
};

const INNER: CSSProperties = {
  maxWidth: 980,
  margin: "0 auto",
};

// ─── Glyphs ───────────────────────────────────────────────────────

function KebabGlyph(): ReactNode {
  return (
    <svg
      width={16}
      height={16}
      viewBox="0 0 24 24"
      fill="currentColor"
      stroke="none"
      aria-hidden="true"
    >
      <circle cx="12" cy="5" r="1.6" />
      <circle cx="12" cy="12" r="1.6" />
      <circle cx="12" cy="19" r="1.6" />
    </svg>
  );
}

function RolesGlyph(): ReactNode {
  return (
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
      <path d="M5 6h14M5 12h14M5 18h14M9 4v4M15 10v4M9 16v4" />
    </svg>
  );
}

function AuditGlyph(): ReactNode {
  return (
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
      <path d="M5 4h11l3 3v13H5z" />
      <path d="M9 9h6M9 13h6M9 17h3" />
    </svg>
  );
}

// ─── Component ─────────────────────────────────────────────────────

export function HubAdminDashboardSurface({
  hubName,
  members,
  curation,
  publicFace,
  analyticsOptIn,
  initialTab = "members",
  onMemberAction,
  onCurationAction,
  onPublicFaceSave,
  onAnalyticsOptInChange,
  onOpenRoles,
  onOpenAuditLog,
  onOpenMyNetworks,
  className,
  style,
}: HubAdminDashboardSurfaceProps) {
  const titleId = useId();
  const [activeTab, setActiveTab] = useState<HubAdminTab>(initialTab);

  return (
    <section
      aria-labelledby={titleId}
      className={className}
      data-surface="hub-admin-dashboard"
      style={{
        display: "flex",
        flexDirection: "column",
        minWidth: 0,
        minHeight: 0,
        height: "100%",
        ...style,
      }}
    >
      <header style={TOPBAR}>
        <nav aria-label="Breadcrumb" style={BREADCRUMB}>
          <button
            type="button"
            onClick={onOpenMyNetworks}
            data-action="breadcrumb-root"
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
            {HA_BREADCRUMB_ROOT}
          </button>
          <span aria-hidden="true" style={{ color: "var(--line-2)" }}>
            /
          </span>
          <span id={titleId} style={{ color: "var(--ink)" }}>
            {hubName}
            {HA_BREADCRUMB_ADMIN_SUFFIX}
          </span>
        </nav>
      </header>

      <nav
        className="scroll"
        aria-label="Hub admin"
        style={TAB_ROW}
        data-block="hub-admin-tabs"
      >
        {HA_TAB_KEYS.map((k) => {
          const on = activeTab === k;
          return (
            <button
              key={k}
              type="button"
              onClick={() => setActiveTab(k)}
              aria-current={on ? "page" : undefined}
              data-tab={k}
              style={on ? TAB_ON : TAB_BASE}
            >
              {HA_TAB_LABELS[k]}
            </button>
          );
        })}
      </nav>

      <div className="scroll" style={MAIN}>
        <div style={INNER}>
          {activeTab === "members" ? (
            <MembersTab
              members={members}
              onMemberAction={onMemberAction}
            />
          ) : null}
          {activeTab === "curation" ? (
            <CurationTab
              curation={curation}
              onCurationAction={onCurationAction}
            />
          ) : null}
          {activeTab === "public" ? (
            <PublicFaceTab
              publicFace={publicFace}
              onPublicFaceSave={onPublicFaceSave}
            />
          ) : null}
          {activeTab === "settings" ? (
            <SettingsTab
              analyticsOptIn={analyticsOptIn}
              onAnalyticsOptInChange={onAnalyticsOptInChange}
              onOpenRoles={onOpenRoles}
              onOpenAuditLog={onOpenAuditLog}
            />
          ) : null}
        </div>
      </div>
    </section>
  );
}

// ─── Members tab ───────────────────────────────────────────────────

const ROLE_CHIP_BASE: CSSProperties = {
  padding: "6px 12px",
  borderRadius: "999px",
  // Long-hand so the "on" state can swap borderColor without
  // tripping React 19's shorthand-mix warning.
  borderWidth: 1,
  borderStyle: "solid",
  borderColor: "var(--line)",
  background: "var(--bg-2)",
  fontFamily: "var(--font-ui)",
  fontSize: 12,
  color: "var(--ink-mute)",
  whiteSpace: "nowrap",
  flex: "none",
  cursor: "pointer",
};

const ROLE_CHIP_ON: CSSProperties = {
  ...ROLE_CHIP_BASE,
  color: "var(--ink)",
  background: "var(--network-soft)",
  borderColor: "var(--network)",
};

const TABLE: CSSProperties = {
  border: "1px solid var(--line)",
  borderRadius: "var(--r-lg)",
  overflow: "hidden",
};

const HEADER_ROW: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "2.4fr 1fr 1fr 40px",
  background: "var(--bg-3)",
  fontFamily: "var(--font-ui)",
  fontSize: 10.5,
  letterSpacing: ".06em",
  textTransform: "uppercase",
  color: "var(--ink-mute)",
};

const HEADER_CELL: CSSProperties = {
  padding: "11px 12px",
};

const HEADER_CELL_FIRST: CSSProperties = {
  ...HEADER_CELL,
  padding: "11px 16px",
};

const MEMBER_ROW: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "2.4fr 1fr 1fr 40px",
  borderTop: "1px solid var(--line)",
  alignItems: "center",
};

const MEMBER_NAME: CSSProperties = {
  fontFamily: "var(--font-serif)",
  fontSize: 14.5,
  color: "var(--ink)",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
};

const MEMBER_DID: CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 10.5,
  color: "var(--ink-mute)",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
};

function MembersTab({
  members,
  onMemberAction,
}: {
  members: readonly HubMemberRow[];
  onMemberAction?: (memberDid: string) => void;
}): ReactNode {
  const [activeRole, setActiveRole] = useState<string>("All");
  const visible = useMemo(() => {
    if (activeRole === "All") return members;
    return members.filter((m) => m.role === activeRole);
  }, [members, activeRole]);

  return (
    <div data-tab-panel="members">
      <div
        className="scroll"
        role="group"
        aria-label="Filter by role"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 7,
          overflowX: "auto",
          marginBottom: 16,
        }}
      >
        {HA_ROLE_FILTERS.map((r) => {
          const on = activeRole === r;
          return (
            <button
              key={r}
              type="button"
              onClick={() => setActiveRole(r)}
              aria-pressed={on}
              data-filter-role={r}
              style={on ? ROLE_CHIP_ON : ROLE_CHIP_BASE}
            >
              {r}
            </button>
          );
        })}
      </div>

      <div style={TABLE} data-block="members-table">
        <div style={HEADER_ROW} role="row">
          <span style={HEADER_CELL_FIRST}>{HA_COL_MEMBER}</span>
          <span className="ad-hide" style={HEADER_CELL}>
            {HA_COL_ROLE}
          </span>
          <span className="ad-hide" style={HEADER_CELL}>
            {HA_COL_LAST_ACTIVITY}
          </span>
          <span />
        </div>
        {visible.map((m) => (
          <div
            key={m.did}
            style={MEMBER_ROW}
            data-member-did={m.did}
            data-role={m.role}
          >
            <div
              style={{
                padding: "12px 16px",
                display: "flex",
                alignItems: "center",
                gap: 11,
                minWidth: 0,
              }}
            >
              <span
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  background: "var(--network-soft)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flex: "none",
                  fontFamily: "var(--font-display)",
                  fontSize: 14,
                  color: "var(--network)",
                }}
                aria-hidden="true"
              >
                {m.initial}
              </span>
              <div style={{ minWidth: 0 }}>
                <div style={MEMBER_NAME} data-field="name">
                  {m.name}
                </div>
                <div style={MEMBER_DID} data-field="did">
                  {m.did}
                </div>
              </div>
            </div>
            <span className="ad-hide" style={{ padding: 12 }}>
              <span
                data-pill="role"
                style={{
                  padding: "2px 9px",
                  border: "1px solid var(--line-2)",
                  borderRadius: "999px",
                  fontFamily: "var(--font-ui)",
                  fontSize: 11,
                  color: "var(--ink-soft)",
                }}
              >
                {m.role}
              </span>
            </span>
            <span
              className="ad-hide"
              style={{
                padding: 12,
                fontFamily: "var(--font-ui)",
                fontSize: 12,
                color: "var(--ink-mute)",
              }}
              data-field="activity"
            >
              {m.activity}
            </span>
            <span style={{ padding: "0 8px" }}>
              <button
                type="button"
                aria-label="Member actions"
                onClick={() => onMemberAction?.(m.did)}
                data-action="member-kebab"
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: "var(--r-sm)",
                  color: "var(--ink-mute)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                <KebabGlyph />
              </button>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Curation tab ──────────────────────────────────────────────────

function CurationTab({
  curation,
  onCurationAction,
}: {
  curation: readonly CurationItem[];
  onCurationAction?: (itemId: string, action: CurationAction) => void;
}): ReactNode {
  return (
    <div
      data-tab-panel="curation"
      style={{ display: "flex", flexDirection: "column", gap: 10 }}
    >
      {curation.map((c) => {
        const isPending = c.status === "pending";
        const isApproved = c.status === "approved";
        return (
          <div
            key={c.id}
            data-curation-item={c.id}
            data-status={c.status}
            style={{
              border: "1px solid var(--line)",
              borderRadius: "var(--r-md)",
              background: "var(--bg-2)",
              padding: "15px 18px",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 9,
                flexWrap: "wrap",
                marginBottom: 8,
              }}
            >
              <span
                data-field="did"
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 11,
                  color: "var(--ink-mute)",
                }}
              >
                {c.did}
              </span>
              <span
                data-pill="kind"
                style={{
                  padding: "2px 9px",
                  border: "1px solid var(--line-2)",
                  borderRadius: "999px",
                  fontFamily: "var(--font-ui)",
                  fontSize: 11,
                  color: "var(--ink-soft)",
                }}
              >
                {c.kind}
              </span>
              <span
                style={{
                  fontFamily: "var(--font-ui)",
                  fontSize: 11,
                  color: "var(--ink-mute)",
                }}
                data-field="submitted"
              >
                {c.submitted}
              </span>
              {isApproved && c.approvedAt ? (
                <span
                  data-pill="approved"
                  style={{
                    marginLeft: "auto",
                    padding: "2px 9px",
                    border: "1px solid var(--peer-ok)",
                    borderRadius: "999px",
                    background: "var(--peer-ok-soft)",
                    fontFamily: "var(--font-ui)",
                    fontSize: 11,
                    color: "var(--peer-ok)",
                  }}
                >
                  {HA_APPROVED_PREFIX}
                  {c.approvedAt}
                </span>
              ) : null}
            </div>
            <p
              data-field="preview"
              style={{
                fontFamily: "var(--font-serif)",
                fontSize: 14.5,
                color: "var(--ink-soft)",
                lineHeight: 1.5,
                margin: "0 0 12px",
              }}
            >
              {c.preview}
            </p>
            {isPending ? (
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  type="button"
                  onClick={() => onCurationAction?.(c.id, "approve")}
                  data-action="approve"
                  style={{
                    padding: "7px 14px",
                    borderRadius: "var(--r-md)",
                    background: "var(--network-soft)",
                    border: "1px solid var(--network-line)",
                    fontFamily: "var(--font-ui)",
                    fontWeight: 700,
                    fontSize: 12.5,
                    color: "var(--ink)",
                    cursor: "pointer",
                  }}
                >
                  {HA_CURATION_APPROVE}
                </button>
                <button
                  type="button"
                  onClick={() => onCurationAction?.(c.id, "send-back")}
                  data-action="send-back"
                  style={{
                    padding: "7px 14px",
                    borderRadius: "var(--r-md)",
                    border: "1px solid var(--line-2)",
                    background: "transparent",
                    fontFamily: "var(--font-ui)",
                    fontSize: 12.5,
                    color: "var(--ink-soft)",
                    cursor: "pointer",
                  }}
                >
                  {HA_CURATION_SEND_BACK}
                </button>
                <button
                  type="button"
                  onClick={() => onCurationAction?.(c.id, "reject")}
                  data-action="reject"
                  style={{
                    padding: "7px 14px",
                    borderRadius: "var(--r-md)",
                    border: "1px solid var(--warn-border)",
                    background: "var(--warn-soft)",
                    fontFamily: "var(--font-ui)",
                    fontSize: 12.5,
                    color: "var(--warn)",
                    cursor: "pointer",
                  }}
                >
                  {HA_CURATION_REJECT}
                </button>
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

// ─── Public face tab ───────────────────────────────────────────────

function PublicFaceTab({
  publicFace,
  onPublicFaceSave,
}: {
  publicFace: HubPublicFaceDraft;
  onPublicFaceSave?: (draft: HubPublicFaceDraft) => void;
}): ReactNode {
  const [motto, setMotto] = useState(publicFace.motto);
  const [description, setDescription] = useState(publicFace.description);

  const labelStyle: CSSProperties = {
    display: "block",
    fontFamily: "var(--font-ui)",
    fontSize: 11,
    letterSpacing: ".06em",
    textTransform: "uppercase",
    color: "var(--ink-mute)",
    marginBottom: 7,
  };

  return (
    <div data-tab-panel="public">
      <p
        style={{
          fontFamily: "var(--font-ui)",
          fontSize: 12.5,
          color: "var(--ink-mute)",
          margin: "0 0 18px",
        }}
      >
        {HA_PUBLIC_HEADER}
      </p>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 16,
          marginBottom: 20,
        }}
      >
        <div>
          <label htmlFor="banner" style={labelStyle}>
            {HA_PUBLIC_BANNER_LABEL}
          </label>
          <button
            id="banner"
            type="button"
            data-action="upload-banner"
            style={{
              width: "100%",
              height: 110,
              border: "1px dashed var(--line-2)",
              borderRadius: "var(--r-md)",
              background: "var(--bg-2)",
              color: "var(--ink-mute)",
              fontFamily: "var(--font-ui)",
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            {HA_PUBLIC_BANNER_UPLOAD}
          </button>
        </div>
        <div>
          <label htmlFor="motto" style={labelStyle}>
            {HA_PUBLIC_MOTTO_LABEL}
          </label>
          <input
            id="motto"
            type="text"
            value={motto}
            onChange={(e) => setMotto(e.currentTarget.value)}
            data-field="motto"
            style={{
              width: "100%",
              padding: "10px 12px",
              border: "1px solid var(--line-2)",
              borderRadius: "var(--r-md)",
              background: "var(--bg-2)",
              color: "var(--ink)",
              fontFamily: "var(--font-serif)",
              fontSize: 15,
            }}
          />
        </div>
        <div>
          <label htmlFor="description" style={labelStyle}>
            {HA_PUBLIC_DESCRIPTION_LABEL}
          </label>
          <textarea
            id="description"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.currentTarget.value)}
            data-field="description"
            style={{
              width: "100%",
              padding: "10px 12px",
              border: "1px solid var(--line-2)",
              borderRadius: "var(--r-md)",
              background: "var(--bg-2)",
              color: "var(--ink)",
              fontFamily: "var(--font-serif)",
              fontSize: 14.5,
              lineHeight: 1.5,
              resize: "vertical",
            }}
          />
        </div>
      </div>
      <button
        type="button"
        onClick={() =>
          onPublicFaceSave?.({
            motto,
            description,
            bannerUrl: publicFace.bannerUrl ?? null,
          })
        }
        data-action="publish-public-face"
        style={{
          padding: "11px 20px",
          borderRadius: "var(--r-md)",
          background: "var(--accent)",
          color: "var(--accent-ink)",
          fontFamily: "var(--font-ui)",
          fontWeight: 700,
          fontSize: 14,
          border: "none",
          cursor: "pointer",
        }}
      >
        {HA_PUBLIC_PUBLISH_CTA}
      </button>
    </div>
  );
}

// ─── Settings tab ──────────────────────────────────────────────────

function SettingsTab({
  analyticsOptIn,
  onAnalyticsOptInChange,
  onOpenRoles,
  onOpenAuditLog,
}: {
  analyticsOptIn: AnalyticsOptInDefault;
  onAnalyticsOptInChange?: (next: AnalyticsOptInDefault) => void;
  onOpenRoles?: () => void;
  onOpenAuditLog?: () => void;
}): ReactNode {
  return (
    <div
      data-tab-panel="settings"
      style={{ display: "flex", flexDirection: "column", gap: 24 }}
    >
      <div>
        <div
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 16,
            marginBottom: 12,
          }}
        >
          {HA_SETTINGS_ANALYTICS_HEADING}
        </div>
        <div
          role="radiogroup"
          aria-label={HA_SETTINGS_ANALYTICS_HEADING}
          style={{ display: "flex", flexDirection: "column", gap: 9 }}
        >
          {HA_ANALYTICS_OPTIONS.map((o) => {
            const on = analyticsOptIn === o.key;
            return (
              <label
                key={o.key}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  cursor: "pointer",
                }}
              >
                <input
                  type="radio"
                  name="analytics-opt-in"
                  value={o.key}
                  checked={on}
                  onChange={() => onAnalyticsOptInChange?.(o.key)}
                  data-radio={o.key}
                  // The visual radio is the next span; this input
                  // is the keyboard / SR contact point.
                  style={{
                    position: "absolute",
                    opacity: 0,
                    width: 0,
                    height: 0,
                  }}
                />
                <span
                  aria-hidden="true"
                  data-visual-radio={o.key}
                  data-checked={on}
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: "50%",
                    border: `1px solid ${
                      on ? "var(--accent)" : "var(--line-2)"
                    }`,
                    background: on ? "var(--accent)" : "transparent",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flex: "none",
                  }}
                >
                  {on ? (
                    <span
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        background: "var(--accent-ink)",
                      }}
                    />
                  ) : null}
                </span>
                <span
                  style={{
                    fontFamily: "var(--font-serif)",
                    fontSize: 15,
                    color: "var(--ink)",
                  }}
                >
                  {o.label}
                </span>
              </label>
            );
          })}
        </div>
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 10,
          borderTop: "1px solid var(--line)",
          paddingTop: 20,
        }}
      >
        <button
          type="button"
          onClick={onOpenRoles}
          data-action="open-roles"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            fontFamily: "var(--font-ui)",
            fontSize: 14,
            color: "var(--ink-soft)",
            background: "transparent",
            border: "none",
            padding: 0,
            cursor: "pointer",
          }}
        >
          <RolesGlyph />
          {HA_SETTINGS_ROLES_LINK}
        </button>
        <button
          type="button"
          onClick={onOpenAuditLog}
          data-action="open-audit-log"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            fontFamily: "var(--font-ui)",
            fontSize: 14,
            color: "var(--ink-soft)",
            background: "transparent",
            border: "none",
            padding: 0,
            cursor: "pointer",
          }}
        >
          <AuditGlyph />
          {HA_SETTINGS_AUDIT_LINK}
        </button>
      </div>
    </div>
  );
}
