/**
 * SsoAuthorizeConsent stories — H08 Cluster A surface 13. Single
 * point-to-point consent moment; no central SSO authority.
 */
import type { Meta, StoryObj } from "@storybook/react";

import { SsoAuthorizeConsentModal } from "./SsoAuthorizeConsentModal.js";

const meta = { title: "H08/SsoAuthorizeConsent" } satisfies Meta;
export default meta;
type Story = StoryObj;

const PROPS = {
  hubName: "The Hermetic Circle",
  fromInstance: "aurora.example",
  identityDid: "did:theourgia:hearth.sophia.example:sophia",
  willReceive:
    "Your display name · your tradition tag(s) · nothing else",
  authorizes:
    "Joining this hub. Specifically THIS join request. The assertion expires in 24 hours and can be revoked any time from Settings → SSO.",
};

export const Default: Story = {
  render: () => (
    <div style={{ height: "100vh", background: "var(--bg)" }}>
      <SsoAuthorizeConsentModal
        {...PROPS}
        onDecline={() => {}}
        onApprove={() => {}}
      />
    </div>
  ),
};
