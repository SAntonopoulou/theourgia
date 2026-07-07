/**
 * RolesPermissionsEditorSurface — unit tests.
 *
 * Defining honesty rules:
 *
 *   * Matrix renders all eleven capabilities in fixed order.
 *   * Toggling a cell flips its `aria-checked` and the matrix
 *     mutation flows through into `onSave` / `onSaveAndApply`.
 *   * Save vs Save + apply hit DISTINCT callbacks.
 *   * Denied banner renders the verbatim template with two
 *     interpolated slots.
 *   * Custom role + template wires fire with the expected args.
 */

import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

import {
  RolesPermissionsEditorSurface,
  type HubRoleRow,
} from "./RolesPermissionsEditorSurface.js";
import {
  type HubCapabilityKey,
  RPE_ADD_CUSTOM_ROLE,
  RPE_BREADCRUMB_TAIL,
  RPE_CAPABILITIES,
  RPE_DENIED_REQUEST_LINK,
  RPE_SAVE_AND_APPLY,
  RPE_SAVE_CHANGES,
} from "./copy.js";

const ROLES: HubRoleRow[] = [
  {
    key: "admin",
    builtin: true,
    capabilities: new Set<HubCapabilityKey>(
      RPE_CAPABILITIES.map(([k]) => k),
    ),
  },
  {
    key: "officer",
    builtin: true,
    capabilities: new Set<HubCapabilityKey>([
      "edit_hub_content",
      "moderate_submissions",
      "manage_members",
      "send_newsletters",
      "run_analytics_queries",
      "accept_federation_peers",
      "view_audit_log",
      "schedule_group_rituals",
      "approve_curation_submissions",
    ]),
  },
  {
    key: "moderator",
    builtin: true,
    capabilities: new Set<HubCapabilityKey>([
      "moderate_submissions",
      "view_audit_log",
      "schedule_group_rituals",
      "approve_curation_submissions",
    ]),
  },
  {
    key: "member",
    builtin: true,
    capabilities: new Set<HubCapabilityKey>(["schedule_group_rituals"]),
  },
  {
    key: "observer",
    builtin: true,
    capabilities: new Set<HubCapabilityKey>(),
  },
];

function renderRpe(
  overrides: Partial<
    Parameters<typeof RolesPermissionsEditorSurface>[0]
  > = {},
) {
  return render(
    <RolesPermissionsEditorSurface
      hubLabel="Crossroads Coven"
      hubHref="/hubs/crossroads-coven/admin"
      lastChangedAgo="3 days ago"
      lastChangedBy="did:theourgia:aurora.example:soror-aurora"
      initialRoles={ROLES}
      {...overrides}
    />,
  );
}

// ─── Chrome ────────────────────────────────────────────────────────

describe("RolesPermissionsEditorSurface — chrome", () => {
  it("renders the breadcrumb verbatim", () => {
    renderRpe();
    expect(screen.getByText("Crossroads Coven")).toBeInTheDocument();
    expect(screen.getByText(RPE_BREADCRUMB_TAIL)).toBeInTheDocument();
  });

  it("renders the last-changed line with DID in --font-mono", () => {
    renderRpe();
    const line = document.querySelector(
      "[data-field='last-changed']",
    ) as HTMLElement;
    expect(line.textContent).toContain("Last changed 3 days ago by");
    expect(line.style.fontFamily).toContain("font-mono");
    const by = line.querySelector(
      "[data-field='last-changed-by']",
    ) as HTMLElement;
    expect(by.textContent).toBe(
      "did:theourgia:aurora.example:soror-aurora",
    );
  });
});

// ─── Matrix ───────────────────────────────────────────────────────

describe("RolesPermissionsEditorSurface — capability matrix", () => {
  it("renders all eleven capability columns in fixed order", () => {
    renderRpe();
    const headers = Array.from(
      document.querySelectorAll(
        "[data-field='capability-matrix'] thead [data-cap-key]",
      ),
    ).map((th) => th.getAttribute("data-cap-key"));
    expect(headers).toEqual(RPE_CAPABILITIES.map(([k]) => k));
  });

  it("renders five role rows in initialRoles order", () => {
    renderRpe();
    const rows = Array.from(
      document.querySelectorAll("[data-role-key]"),
    ).map((tr) => tr.getAttribute("data-role-key"));
    expect(rows).toEqual([
      "admin",
      "officer",
      "moderator",
      "member",
      "observer",
    ]);
  });

  it("observer row has zero capabilities checked", () => {
    renderRpe();
    const observerRow = document.querySelector(
      "[data-role-key='observer']",
    ) as HTMLElement;
    const checked = observerRow.querySelectorAll(
      "[data-checked='true']",
    );
    expect(checked).toHaveLength(0);
  });

  it("admin row has every capability checked", () => {
    renderRpe();
    const adminRow = document.querySelector(
      "[data-role-key='admin']",
    ) as HTMLElement;
    const checked = adminRow.querySelectorAll(
      "[data-checked='true']",
    );
    expect(checked).toHaveLength(RPE_CAPABILITIES.length);
  });

  it("toggles a cell on click", () => {
    renderRpe();
    const cell = document.querySelector(
      "[data-cell='moderator:manage_members']",
    ) as HTMLElement;
    expect(cell.getAttribute("data-checked")).toBe("false");
    fireEvent.click(cell);
    expect(cell.getAttribute("data-checked")).toBe("true");
    fireEvent.click(cell);
    expect(cell.getAttribute("data-checked")).toBe("false");
  });

  it("kebab fires onRoleAction with the role key", () => {
    const onRoleAction = vi.fn();
    renderRpe({ onRoleAction });
    const row = document.querySelector(
      "[data-role-key='officer']",
    ) as HTMLElement;
    fireEvent.click(
      row.querySelector("[data-action='role-kebab']") as HTMLElement,
    );
    expect(onRoleAction).toHaveBeenCalledWith("officer");
  });
});

// ─── Save semantics ───────────────────────────────────────────────

describe("RolesPermissionsEditorSurface — save semantics", () => {
  it("Save → onSave with the current draft (NOT onSaveAndApply)", () => {
    const onSave = vi.fn();
    const onSaveAndApply = vi.fn();
    renderRpe({ onSave, onSaveAndApply });
    fireEvent.click(
      document.querySelector("[data-action='save']") as HTMLElement,
    );
    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSaveAndApply).not.toHaveBeenCalled();
  });

  it("Save + apply → onSaveAndApply (NOT onSave)", () => {
    const onSave = vi.fn();
    const onSaveAndApply = vi.fn();
    renderRpe({ onSave, onSaveAndApply });
    fireEvent.click(
      document.querySelector(
        "[data-action='save-and-apply']",
      ) as HTMLElement,
    );
    expect(onSaveAndApply).toHaveBeenCalledTimes(1);
    expect(onSave).not.toHaveBeenCalled();
  });

  it("draft toggles flow into the save payload", () => {
    const onSave = vi.fn();
    renderRpe({ onSave });
    fireEvent.click(
      document.querySelector(
        "[data-cell='moderator:manage_members']",
      ) as HTMLElement,
    );
    fireEvent.click(
      document.querySelector("[data-action='save']") as HTMLElement,
    );
    const payload = onSave.mock.calls[0]![0];
    const moderator = payload.find(
      (r: HubRoleRow) => r.key === "moderator",
    ) as HubRoleRow;
    expect(moderator.capabilities.has("manage_members")).toBe(true);
  });

  it("Save + apply CTA has --warn-soft chrome (not --danger)", () => {
    renderRpe();
    const saveApply = document.querySelector(
      "[data-action='save-and-apply']",
    ) as HTMLElement;
    expect(saveApply.style.background).toContain("--warn-soft");
    expect(saveApply.style.background).not.toContain("--danger");
  });
});

// ─── Custom role + templates ─────────────────────────────────────

describe("RolesPermissionsEditorSurface — custom + template", () => {
  it("Add custom role fires onAddCustomRole", () => {
    const onAddCustomRole = vi.fn();
    renderRpe({ onAddCustomRole });
    fireEvent.click(screen.getByText(RPE_ADD_CUSTOM_ROLE));
    expect(onAddCustomRole).toHaveBeenCalledTimes(1);
  });

  it("Apply template fires onApplyTemplate with the template name", () => {
    const onApplyTemplate = vi.fn();
    renderRpe({ onApplyTemplate });
    const sel = document.querySelector(
      "[data-field='apply-template']",
    ) as HTMLSelectElement;
    fireEvent.change(sel, { target: { value: "Coven" } });
    expect(onApplyTemplate).toHaveBeenCalledWith("Coven");
  });
});

// ─── Denied banner ───────────────────────────────────────────────

describe("RolesPermissionsEditorSurface — denied banner", () => {
  it("does not render when undefined", () => {
    renderRpe();
    expect(
      document.querySelector("[data-field='denied-banner']"),
    ).toBeNull();
  });

  it("renders verbatim with two interpolated slots", () => {
    renderRpe({
      denied: {
        action: "delete this entry",
        permission: "manage_permission_matrix",
      },
    });
    const msg = document.querySelector(
      "[data-field='denied-message']",
    ) as HTMLElement;
    expect(msg.textContent).toBe(
      "You cannot do delete this entry because you lack permission manage_permission_matrix.",
    );
  });

  it("uses --warn-soft chrome (never --danger)", () => {
    renderRpe({
      denied: { action: "x", permission: "y" },
    });
    const banner = document.querySelector(
      "[data-field='denied-banner']",
    ) as HTMLElement;
    expect(banner.style.background).toContain("--warn-soft");
    expect(banner.style.background).not.toContain("--danger");
  });

  it("request link fires onRequest", () => {
    const onRequest = vi.fn();
    renderRpe({
      denied: { action: "x", permission: "y", onRequest },
    });
    fireEvent.click(screen.getByText(RPE_DENIED_REQUEST_LINK));
    expect(onRequest).toHaveBeenCalledTimes(1);
  });
});

// ─── Preview-as ──────────────────────────────────────────────────

describe("RolesPermissionsEditorSurface — preview-as", () => {
  it("changing preview-as does NOT mutate the matrix", () => {
    const onSave = vi.fn();
    renderRpe({ onSave });
    const sel = document.querySelector(
      "[data-field='preview-as']",
    ) as HTMLSelectElement;
    fireEvent.change(sel, { target: { value: "member" } });
    fireEvent.click(
      document.querySelector("[data-action='save']") as HTMLElement,
    );
    const payload = onSave.mock.calls[0]![0];
    const observer = payload.find(
      (r: HubRoleRow) => r.key === "observer",
    ) as HubRoleRow;
    expect(observer.capabilities.size).toBe(0);
    const admin = payload.find(
      (r: HubRoleRow) => r.key === "admin",
    ) as HubRoleRow;
    expect(admin.capabilities.size).toBe(RPE_CAPABILITIES.length);
  });
});

// ─── Smoke ───────────────────────────────────────────────────────

describe("RolesPermissionsEditorSurface — smoke", () => {
  it("renders the Save changes + Save + apply CTAs", () => {
    renderRpe();
    expect(screen.getByText(RPE_SAVE_CHANGES)).toBeInTheDocument();
    expect(screen.getByText(RPE_SAVE_AND_APPLY)).toBeInTheDocument();
  });
});
