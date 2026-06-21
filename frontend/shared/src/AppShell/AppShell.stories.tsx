/**
 * AppShell — composition of VaultNav (left) + VaultTopbar (top) + route
 * content. The full admin layout in one frame. Use to verify the layout
 * holds under every tradition/mode and that the topbar/nav respond
 * properly on narrow viewports (the off-canvas drawer kicks in
 * &lt; 1024px).
 */
import type { Meta, StoryObj } from "@storybook/react";

import { ActingAsProvider } from "../identity/ActingAsContext.js";
import { ActingAsSwitcher } from "../identity/ActingAsSwitcher.js";
import { ACTING_AS_DEFAULT_ID, DEMO_IDENTITIES } from "../identity/mocks.js";
import { TopbarProvider, useTopbar } from "../VaultTopbar/TopbarContext.js";
import { VaultTopbar } from "../VaultTopbar/VaultTopbar.js";
import { VaultNav } from "../VaultNav/VaultNav.js";
import { AppShell } from "./AppShell.js";

const meta = {
  title: "Chrome/AppShell",
  parameters: { layout: "fullscreen" },
} satisfies Meta;

export default meta;
type Story = StoryObj;

function TopbarRegistration() {
  useTopbar(
    () => ({
      title: "Today",
      subtitle: "Tuesday, 21 June 2026 · summer solstice",
    }),
    [],
  );
  return null;
}

export const AdminLayout: Story = {
  render: () => (
    <ActingAsProvider initial={ACTING_AS_DEFAULT_ID}>
      <TopbarProvider>
        <TopbarRegistration />
        <AppShell
          topbar={<VaultTopbar actingAs={<ActingAsSwitcher identities={DEMO_IDENTITIES} />} />}
          nav={<VaultNav active="today" />}
        >
          <div style={{ padding: 28 }}>
            <h1 style={{ fontFamily: "var(--font-display)", fontSize: 28, margin: "0 0 12px" }}>
              The morning page
            </h1>
            <p style={{ fontFamily: "var(--font-serif)", fontSize: 16, lineHeight: 1.7, color: "var(--ink-soft)" }}>
              The shell composes nav, topbar, and route content. Resize the canvas under 1024px to
              see the off-canvas drawer take over.
            </p>
          </div>
        </AppShell>
      </TopbarProvider>
    </ActingAsProvider>
  ),
};
