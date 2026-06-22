/**
 * Export surface primitive stories.
 */
import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";

import {
  EXPORT_BOUND_FORMATS,
  type ExportFormat,
  ExportFormatPicker,
} from "./ExportFormatPicker.js";
import { SealedExportNotice } from "./SealedExportNotice.js";

const meta = {
  title: "Export",
} satisfies Meta;

export default meta;
type Story = StoryObj;

const Frame = ({
  children,
  width = 320,
}: {
  children: React.ReactNode;
  width?: number;
}) => (
  <div style={{ padding: 22, background: "var(--bg)", maxWidth: width }}>
    {children}
  </div>
);

// ─── ExportFormatPicker ───────────────────────────────────────────

const Picker = ({ initial }: { initial: ExportFormat }) => {
  const [value, setValue] = useState<ExportFormat>(initial);
  return (
    <Frame>
      <ExportFormatPicker value={value} onChange={setValue} />
    </Frame>
  );
};

export const Picker_Pdf: Story = {
  name: "Format picker · PDF active",
  render: () => <Picker initial="pdf" />,
};

export const Picker_Markdown: Story = {
  name: "Format picker · Markdown active",
  render: () => <Picker initial="markdown" />,
};

export const Picker_Epub: Story = {
  name: "Format picker · EPUB active",
  render: () => <Picker initial="epub" />,
};

export const Picker_BoundVolume: Story = {
  name: "Format picker · Bound volume (PDF + EPUB)",
  render: () => (
    <Frame>
      <ExportFormatPicker
        value="pdf"
        formats={EXPORT_BOUND_FORMATS}
        metaOverrides={{
          pdf: { note: "Bound volume" },
          epub: { note: "Each entry a chapter" },
        }}
      />
    </Frame>
  ),
};

// ─── SealedExportNotice ───────────────────────────────────────────

export const Sealed_Several: Story = {
  name: "Sealed notice · 3 set aside",
  render: () => (
    <Frame width={420}>
      <SealedExportNotice sealedCount={3} />
    </Frame>
  ),
};

export const Sealed_One: Story = {
  name: "Sealed notice · 1 set aside (singular)",
  render: () => (
    <Frame width={420}>
      <SealedExportNotice sealedCount={1} />
    </Frame>
  ),
};

export const Sealed_None: Story = {
  name: "Sealed notice · none in selection",
  render: () => (
    <Frame width={420}>
      <SealedExportNotice sealedCount={0} />
    </Frame>
  ),
};
