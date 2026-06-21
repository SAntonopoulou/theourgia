/**
 * Field — label + control + hint/error wrapper. Stories cover the
 * TextInput, NumberInput, TextArea, Select children paired with various
 * Field states (required, hint, error).
 */
import type { Meta, StoryObj } from "@storybook/react";

import { Field } from "./Field.js";
import { NumberInput } from "./NumberInput.js";
import { Select } from "./Select.js";
import { TextArea } from "./TextArea.js";
import { TextInput } from "./TextInput.js";

// Field requires `label` and `children` — stub them in meta so render-only
// stories don't have to repeat the placeholders.
const meta = {
  title: "Primitives/Field",
  component: Field,
  tags: ["autodocs"],
  args: { label: "Email", children: null },
} satisfies Meta<typeof Field>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Text: Story = {
  render: () => (
    <Field label="Email" hint="We never share it.">
      <TextInput type="email" placeholder="aspasia@example.org" defaultValue="" />
    </Field>
  ),
};

export const Required: Story = {
  render: () => (
    <Field label="Magickal name" required hint="Only the public face of your practice.">
      <TextInput placeholder="Soror Ev. A." />
    </Field>
  ),
};

export const WithError: Story = {
  render: () => (
    <Field label="Email" error="That domain is not deliverable.">
      <TextInput type="email" defaultValue="aspasia@invalid" />
    </Field>
  ),
};

export const Multiline: Story = {
  render: () => (
    <Field label="Note" hint="Markdown is supported.">
      <TextArea rows={4} placeholder="Begin with a single sentence…" />
    </Field>
  ),
};

export const NumberValue: Story = {
  render: () => (
    <Field label="Coins per cast" hint="Defaults to three — the I Ching cast.">
      <NumberInput defaultValue={3} min={1} max={5} />
    </Field>
  ),
};

export const SelectValue: Story = {
  render: () => (
    <Field label="Tradition">
      <Select
        defaultValue="base"
        options={[
          { value: "base", label: "Base" },
          { value: "hellenic", label: "Hellenic" },
          { value: "thelemic", label: "Thelemic" },
        ]}
      />
    </Field>
  ),
};
