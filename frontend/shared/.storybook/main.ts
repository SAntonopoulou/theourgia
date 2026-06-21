/**
 * Storybook config for the @theourgia/shared design system.
 *
 * Renders every primitive in isolation under the four theme axes
 * (base / hellenic / thelemic × dark / light) so contributors can
 * verify visual fidelity against the designer's ``.dc.html`` files.
 *
 * See `feedback_docs_and_onboarding_from_day_one.md` — Storybook is a
 * product deliverable, not a dev aid.
 */
import type { StorybookConfig } from "@storybook/react-vite";

const config: StorybookConfig = {
  stories: [
    "../src/**/*.mdx",
    "../src/**/*.stories.@(ts|tsx)",
  ],
  addons: [
    "@storybook/addon-essentials",
    "@storybook/addon-interactions",
    "@storybook/addon-a11y",
  ],
  framework: {
    name: "@storybook/react-vite",
    options: {},
  },
  typescript: {
    check: false,
    reactDocgen: "react-docgen-typescript",
  },
  docs: {
    autodocs: "tag",
  },
};

export default config;
