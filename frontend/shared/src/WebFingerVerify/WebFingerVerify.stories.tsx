/**
 * WebFingerVerify stories — H08 Cluster B surface 19. Three result
 * states: idle / pass (key fingerprint surfaced) / fail (no-blame
 * --warn copy).
 */
import type { Meta, StoryObj } from "@storybook/react";

import {
  WebFingerVerifySurface,
  type WfvResult,
} from "./WebFingerVerifySurface.js";

const meta = { title: "H08/WebFingerVerify" } satisfies Meta;
export default meta;
type Story = StoryObj;

const PASS: WfvResult = {
  outcome: "pass",
  actorUrl: "https://hearth.sophia.example/users/aspasia",
  keyFingerprint:
    "SHA256:7a3f 9c21 04bb e8d5 · 2f6a 90c3 11de 4b7f",
};

const FAIL: WfvResult = {
  outcome: "fail",
  instance: "instance.tld",
};

export const Idle: Story = {
  render: () => (
    <div style={{ height: "100vh", background: "var(--bg)" }}>
      <WebFingerVerifySurface
        onRunCheck={() => PASS}
        initialHandle="@aspasia@hearth.sophia.example"
      />
    </div>
  ),
};

export const PassResult: Story = {
  render: () => (
    <div style={{ height: "100vh", background: "var(--bg)" }}>
      <WebFingerVerifySurface
        onRunCheck={() => Promise.resolve(PASS)}
        initialHandle="@aspasia@hearth.sophia.example"
      />
    </div>
  ),
};

export const FailResult: Story = {
  render: () => (
    <div style={{ height: "100vh", background: "var(--bg)" }}>
      <WebFingerVerifySurface
        onRunCheck={() => Promise.resolve(FAIL)}
        initialHandle="@bad@nonexistent.tld"
      />
    </div>
  ),
};
