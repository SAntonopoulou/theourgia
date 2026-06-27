/**
 * RolesPermissionsEditorSurface — H08 §S3 Cluster A surface 12.
 *
 * Faithful port of ``Theourgia Roles Permissions Editor.dc.html``.
 *
 * Honesty rules wired:
 *
 *   * **Capabilities are explicit**, never inferred. The matrix
 *     is the source of truth; there is no hidden "implies"
 *     relationship between capabilities (a moderator does not
 *     auto-gain manage_members because the wire is rule-based).
 *   * **Save + apply effects immediately for all members.** The
 *     surface separates the staged-draft state from the
 *     applied/saved state — calling ``onSaveAndApply`` is the
 *     edge that propagates the new matrix to every member, so
 *     the verbatim ``You cannot do {action} …`` banner shows up
 *     on the next action a member attempts.
 *   * **Custom roles start at least-privilege.** If the consumer
 *     calls ``onAddCustomRole``, the row appears with NO
 *     capabilities checked. The practitioner must opt-in each
 *     cell explicitly. (Surfaced as a fixture pattern — the
 *     route owns the actual append.)
 *   * **Preview-as does not mutate** the matrix. It is a
 *     read-only lens for the operator to inspect a role's
 *     view; the underlying grid never changes from a preview
 *     selection.
 */

import {
  type CSSProperties,
  type ReactNode,
  useId,
  useMemo,
  useState,
} from "react";

import {
  RPE_ADD_CUSTOM_ROLE,
  RPE_APPLY_TEMPLATE_LABEL,
  RPE_APPLY_TEMPLATE_PLACEHOLDER,
  RPE_BREADCRUMB_TAIL,
  RPE_CAPABILITIES,
  RPE_DENIED_REQUEST_LINK,
  RPE_DENIED_TEMPLATE,
  RPE_LAST_CHANGED_BY,
  RPE_LAST_CHANGED_PREFIX,
  RPE_PREVIEW_AS_LABEL,
  RPE_PREVIEW_AS_PLACEHOLDER,
  RPE_ROLE_ACTIONS_LABEL,
  RPE_SAVE_AND_APPLY,
  RPE_SAVE_CHANGES,
  RPE_TEMPLATES,
  type HubCapabilityKey,
  type RpeTemplate,
} from "./copy.js";

// ─── Data shapes ──────────────────────────────────────────────────

export interface HubRoleRow {
  /** Stable wire key (lowercase). Display name capitalizes. */
  key: string;
  /** ``true`` if this role is built-in (admin/officer/etc.) and
   *  cannot be renamed/removed from the topbar dropdown. The flag
   *  doesn't restrict capability edits — admin can still alter
   *  every cell. */
  builtin?: boolean;
  /** The full capability set granted to this role. Anything not
   *  in the set is implicitly denied. */
  capabilities: ReadonlySet<HubCapabilityKey>;
}

export interface RpeDeniedBanner {
  /** The action that was attempted, in plain present-tense form
   *  (e.g. "delete this entry"). */
  action: string;
  /** The capability wire key the user lacked. Rendered verbatim
   *  to match the H08 brief ("permission {permission}.") — wire
   *  keys are user-visible at this seam. */
  permission: string;
  /** Fired when the practitioner taps "How to request this
   *  permission". */
  onRequest?: () => void;
}

export interface RolesPermissionsEditorSurfaceProps {
  hubLabel: string;
  /** Optional breadcrumb link target for the hub admin home. */
  hubHref?: string;
  /** ISO-ish display string — rendered verbatim. */
  lastChangedAgo: string;
  /** A DID. Rendered in --font-mono. */
  lastChangedBy: string;
  /** Initial matrix; the surface owns its draft state from here. */
  initialRoles: readonly HubRoleRow[];
  /** Optional denied-action banner. Consumers surface this when
   *  the most recent attempted action returned a 403. */
  denied?: RpeDeniedBanner;
  /** Fired when "Save changes" tapped, with the current draft. */
  onSave?: (roles: readonly HubRoleRow[]) => void;
  /** Fired when "Save + apply" tapped — the edge that propagates
   *  the new matrix to every member immediately. */
  onSaveAndApply?: (roles: readonly HubRoleRow[]) => void;
  /** Fired when "Add custom role" tapped. The route owns appending
   *  a least-privilege row. */
  onAddCustomRole?: () => void;
  /** Fired with the chosen template name. The route owns
   *  rewriting the matrix from the template. */
  onApplyTemplate?: (template: RpeTemplate) => void;
  /** Fired when a role-row kebab is tapped. */
  onRoleAction?: (roleKey: string) => void;
  /** Optional className/style on the section wrapper. */
  className?: string;
  style?: CSSProperties;
}

// ─── Styles ───────────────────────────────────────────────────────

const TOPBAR: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 14,
  padding: "12px 24px",
  borderBottom: "1px solid var(--line)",
  background: "var(--bg)",
};

const MAIN: CSSProperties = {
  overflowY: "auto",
  minHeight: 0,
  padding: "22px 24px 50px",
};

const INNER: CSSProperties = {
  maxWidth: 1080,
  margin: "0 auto",
};

// ─── Component ─────────────────────────────────────────────────────

export function RolesPermissionsEditorSurface({
  hubLabel,
  hubHref,
  lastChangedAgo,
  lastChangedBy,
  initialRoles,
  denied,
  onSave,
  onSaveAndApply,
  onAddCustomRole,
  onApplyTemplate,
  onRoleAction,
  className,
  style,
}: RolesPermissionsEditorSurfaceProps) {
  const headingId = useId();
  const [roles, setRoles] = useState<HubRoleRow[]>(() =>
    initialRoles.map((r) => ({
      ...r,
      capabilities: new Set(r.capabilities),
    })),
  );
  const [previewAs, setPreviewAs] = useState<string>("");

  const toggle = (roleKey: string, cap: HubCapabilityKey) => {
    setRoles((prev) =>
      prev.map((r) => {
        if (r.key !== roleKey) return r;
        const next = new Set(r.capabilities);
        if (next.has(cap)) next.delete(cap);
        else next.add(cap);
        return { ...r, capabilities: next };
      }),
    );
  };

  // ── Headers / footers built once-per-roles via memo so the
  //    matrix doesn't rebuild on preview-as changes.
  const matrix = useMemo(
    () => (
      <CapabilityMatrix
        roles={roles}
        onToggle={toggle}
        onRoleAction={onRoleAction}
      />
    ),
    [roles, onRoleAction],
  );

  return (
    <section
      aria-labelledby={headingId}
      className={className}
      data-surface="roles-permissions-editor"
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
        <nav
          aria-label="Breadcrumb"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontFamily: "var(--font-ui)",
            fontSize: 13,
            minWidth: 0,
          }}
        >
          {hubHref ? (
            <a
              href={hubHref}
              style={{ color: "var(--ink-mute)" }}
              data-field="hub-link"
            >
              {hubLabel}
            </a>
          ) : (
            <span
              style={{ color: "var(--ink-mute)" }}
              data-field="hub-label"
            >
              {hubLabel}
            </span>
          )}
          <span style={{ color: "var(--line-2)" }}>/</span>
          <span id={headingId} style={{ color: "var(--ink)" }}>
            {RPE_BREADCRUMB_TAIL}
          </span>
        </nav>

        <div
          style={{
            marginLeft: "auto",
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <label
            style={{
              position: "relative",
              display: "inline-block",
            }}
          >
            <span className="sr-only">{RPE_PREVIEW_AS_LABEL}</span>
            <select
              aria-label={RPE_PREVIEW_AS_LABEL}
              value={previewAs}
              onChange={(e) => setPreviewAs(e.currentTarget.value)}
              data-field="preview-as"
              style={{
                padding: "8px 30px 8px 12px",
                borderWidth: 1,
                borderStyle: "solid",
                borderColor: "var(--line-2)",
                borderRadius: "var(--r-md)",
                background: "var(--bg-2)",
                color: "var(--ink-soft)",
                fontFamily: "var(--font-ui)",
                fontSize: 12.5,
                appearance: "none",
              }}
            >
              <option value="">{RPE_PREVIEW_AS_PLACEHOLDER}</option>
              {roles.map((r) => (
                <option key={r.key} value={r.key}>
                  {r.key}
                </option>
              ))}
            </select>
          </label>
        </div>
      </header>

      <main className="scroll" style={MAIN}>
        <div style={INNER}>
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              color: "var(--ink-mute)",
              marginBottom: 14,
            }}
            data-field="last-changed"
          >
            {RPE_LAST_CHANGED_PREFIX}
            {lastChangedAgo}
            {RPE_LAST_CHANGED_BY}
            <span data-field="last-changed-by">{lastChangedBy}</span>
          </div>

          <div
            className="scroll"
            style={{
              border: "1px solid var(--line)",
              borderRadius: "var(--r-lg)",
              overflow: "auto",
            }}
            data-field="matrix-wrapper"
            data-preview-as={previewAs || undefined}
          >
            <div style={{ minWidth: 760 }}>{matrix}</div>
          </div>

          <Footer
            onAddCustomRole={onAddCustomRole}
            onApplyTemplate={onApplyTemplate}
            onSave={() => onSave?.(roles)}
            onSaveAndApply={() => onSaveAndApply?.(roles)}
          />

          {denied ? <DeniedBanner denied={denied} /> : null}
        </div>
      </main>
    </section>
  );
}

// ─── Matrix ───────────────────────────────────────────────────────

function CapabilityMatrix({
  roles,
  onToggle,
  onRoleAction,
}: {
  roles: readonly HubRoleRow[];
  onToggle: (roleKey: string, cap: HubCapabilityKey) => void;
  onRoleAction?: (roleKey: string) => void;
}) {
  const headCell: CSSProperties = {
    padding: "10px 8px",
    fontFamily: "var(--font-ui)",
    fontSize: 10,
    color: "var(--ink-mute)",
    verticalAlign: "bottom",
    textAlign: "center",
    borderBottom: "1px solid var(--line)",
    minWidth: 54,
    lineHeight: 1.2,
  };

  return (
    <table
      style={{
        width: "100%",
        borderCollapse: "collapse",
        background: "var(--bg-2)",
      }}
      data-field="capability-matrix"
    >
      <thead>
        <tr>
          <th
            style={{
              padding: "10px 14px",
              textAlign: "left",
              borderBottom: "1px solid var(--line)",
              position: "sticky",
              left: 0,
              background: "var(--bg-3)",
              zIndex: 1,
            }}
            scope="col"
          />
          {RPE_CAPABILITIES.map(([key, label]) => (
            <th
              key={key}
              style={headCell}
              scope="col"
              data-cap-key={key}
            >
              {label}
            </th>
          ))}
          <th style={{ ...headCell, minWidth: 36 }} scope="col" />
        </tr>
      </thead>
      <tbody>
        {roles.map((role) => (
          <tr
            key={role.key}
            data-role-key={role.key}
            style={{ borderTop: "1px solid var(--line)" }}
          >
            <th
              scope="row"
              style={{
                padding: "12px 14px",
                position: "sticky",
                left: 0,
                background: "var(--bg-2)",
                zIndex: 1,
                fontWeight: 400,
              }}
            >
              <span
                style={{
                  padding: "3px 10px",
                  borderWidth: 1,
                  borderStyle: "solid",
                  borderColor: "var(--line-2)",
                  borderRadius: 20,
                  fontFamily: "var(--font-ui)",
                  fontSize: 12.5,
                  color: "var(--ink)",
                  textTransform: "capitalize",
                }}
              >
                {role.key}
              </span>
            </th>
            {RPE_CAPABILITIES.map(([key]) => {
              const on = role.capabilities.has(key);
              return (
                <td
                  key={key}
                  style={{ textAlign: "center", padding: 8 }}
                >
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={on}
                    aria-label={`${role.key} · ${key}`}
                    onClick={() => onToggle(role.key, key)}
                    data-cell={`${role.key}:${key}`}
                    data-checked={on}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: 20,
                      height: 20,
                      borderRadius: 5,
                      borderWidth: 1,
                      borderStyle: "solid",
                      borderColor: on
                        ? "var(--network)"
                        : "var(--line-2)",
                      background: on
                        ? "var(--network-soft)"
                        : "transparent",
                      cursor: "pointer",
                      padding: 0,
                    }}
                  >
                    {on ? (
                      <svg
                        width={13}
                        height={13}
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="var(--network)"
                        strokeWidth={2.6}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <path d="M5 12.5l4.5 4.5L19 6.5" />
                      </svg>
                    ) : null}
                  </button>
                </td>
              );
            })}
            <td style={{ textAlign: "center", padding: 8 }}>
              <button
                type="button"
                aria-label={RPE_ROLE_ACTIONS_LABEL}
                onClick={() => onRoleAction?.(role.key)}
                data-action="role-kebab"
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: "var(--r-sm)",
                  color: "var(--ink-mute)",
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                <svg
                  width={15}
                  height={15}
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <circle cx="5" cy="12" r="1.5" />
                  <circle cx="12" cy="12" r="1.5" />
                  <circle cx="19" cy="12" r="1.5" />
                </svg>
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// ─── Footer ───────────────────────────────────────────────────────

function Footer({
  onAddCustomRole,
  onApplyTemplate,
  onSave,
  onSaveAndApply,
}: {
  onAddCustomRole?: () => void;
  onApplyTemplate?: (template: RpeTemplate) => void;
  onSave: () => void;
  onSaveAndApply: () => void;
}) {
  const [template, setTemplate] = useState<string>("");

  return (
    <div
      style={{
        display: "flex",
        gap: 10,
        alignItems: "center",
        marginTop: 18,
        flexWrap: "wrap",
      }}
      data-field="footer"
    >
      <button
        type="button"
        onClick={onAddCustomRole}
        data-action="add-custom-role"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 7,
          padding: "9px 14px",
          borderWidth: 1,
          borderStyle: "dashed",
          borderColor: "var(--line-2)",
          borderRadius: "var(--r-md)",
          background: "transparent",
          fontFamily: "var(--font-ui)",
          fontSize: 13,
          color: "var(--ink-soft)",
          cursor: "pointer",
        }}
      >
        <svg
          width={14}
          height={14}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.6}
          strokeLinecap="round"
          aria-hidden="true"
        >
          <path d="M12 5v14M5 12h14" />
        </svg>
        {RPE_ADD_CUSTOM_ROLE}
      </button>

      <label style={{ position: "relative", marginLeft: "auto" }}>
        <span className="sr-only">{RPE_APPLY_TEMPLATE_LABEL}</span>
        <select
          aria-label={RPE_APPLY_TEMPLATE_LABEL}
          value={template}
          onChange={(e) => {
            const next = e.currentTarget.value;
            setTemplate(next);
            if (next && RPE_TEMPLATES.includes(next as RpeTemplate)) {
              onApplyTemplate?.(next as RpeTemplate);
            }
          }}
          data-field="apply-template"
          style={{
            padding: "9px 30px 9px 12px",
            borderWidth: 1,
            borderStyle: "solid",
            borderColor: "var(--line-2)",
            borderRadius: "var(--r-md)",
            background: "var(--bg-2)",
            color: "var(--ink-soft)",
            fontFamily: "var(--font-ui)",
            fontSize: 13,
            appearance: "none",
          }}
        >
          <option value="">{RPE_APPLY_TEMPLATE_PLACEHOLDER}</option>
          {RPE_TEMPLATES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </label>

      <button
        type="button"
        onClick={onSave}
        data-action="save"
        style={{
          padding: "10px 16px",
          borderRadius: "var(--r-md)",
          borderWidth: 1,
          borderStyle: "solid",
          borderColor: "var(--line-2)",
          background: "transparent",
          fontFamily: "var(--font-ui)",
          fontSize: 13.5,
          color: "var(--ink-soft)",
          cursor: "pointer",
        }}
      >
        {RPE_SAVE_CHANGES}
      </button>

      <button
        type="button"
        onClick={onSaveAndApply}
        data-action="save-and-apply"
        style={{
          padding: "10px 18px",
          borderRadius: "var(--r-md)",
          background: "var(--warn-soft)",
          borderWidth: 1,
          borderStyle: "solid",
          borderColor: "var(--warn-border)",
          fontFamily: "var(--font-ui)",
          fontWeight: 700,
          fontSize: 13.5,
          color: "var(--ink)",
          cursor: "pointer",
        }}
      >
        {RPE_SAVE_AND_APPLY}
      </button>
    </div>
  );
}

// ─── Denied banner ────────────────────────────────────────────────

function DeniedBanner({ denied }: { denied: RpeDeniedBanner }): ReactNode {
  return (
    <div
      role="status"
      data-field="denied-banner"
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 9,
        marginTop: 18,
        padding: "12px 15px",
        borderWidth: 1,
        borderStyle: "solid",
        borderColor: "var(--warn-border)",
        borderRadius: "var(--r-md)",
        background: "var(--warn-soft)",
        maxWidth: 560,
      }}
    >
      <span
        style={{
          color: "var(--warn)",
          flex: "none",
          marginTop: 1,
        }}
        aria-hidden="true"
      >
        <svg
          width={15}
          height={15}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.6}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="9" />
          <path d="M12 11v5M12 8h.01" />
        </svg>
      </span>
      <div>
        <div
          style={{
            fontFamily: "var(--font-ui)",
            fontSize: 12.5,
            color: "var(--ink)",
            marginBottom: 3,
          }}
          data-field="denied-message"
        >
          {RPE_DENIED_TEMPLATE(denied.action, denied.permission)}
        </div>
        <button
          type="button"
          onClick={denied.onRequest}
          data-action="request-permission"
          style={{
            fontFamily: "var(--font-ui)",
            fontSize: 12,
            color: "var(--network)",
            background: "transparent",
            border: "none",
            cursor: "pointer",
            padding: 0,
          }}
        >
          {RPE_DENIED_REQUEST_LINK}
        </button>
      </div>
    </div>
  );
}
