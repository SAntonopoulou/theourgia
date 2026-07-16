/**
 * VideoEmbedNode view tests — v1-013 (multi-provider video embeds).
 *
 * Renders the node view component directly with a stateful stand-in
 * for Tiptap's NodeViewProps (the view only reads `node.attrs`,
 * `updateAttributes` and `editor.isEditable`), so the iframe
 * invariants — never autoplay, always lazy — and the provider select
 * behavior are exercised as real DOM without mounting ProseMirror.
 *
 * `disableIframePageLoading` (vitest.config.ts) stops happy-dom from
 * actually fetching the embed hosts — the tests only assert on
 * attributes, and the suite must never fire third-party requests.
 */

import "@testing-library/jest-dom";

import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { NodeViewProps } from "@tiptap/react";
import { useState } from "react";
import { describe, expect, it } from "vitest";

import { VideoEmbedView } from "./VideoEmbedNode.js";
import {
  VIDEO_URL_PLACEHOLDERS,
  type VideoEmbedAttrs,
  makeDefaultVideoEmbedAttrs,
} from "./videoEmbed.js";

const YT_ID = "dQw4w9WgXcQ";
const CF_ID = "5d5bc37ffcf54c9b82e996823bffbb81";
const MUX_ID = "DS00Spx1CV902MCtPj5WknGlR102V5HFkDe";

function Harness({
  initial = {},
  editable = true,
}: {
  initial?: Partial<VideoEmbedAttrs>;
  editable?: boolean;
}) {
  const [attrs, setAttrs] = useState<Record<string, unknown>>({
    ...makeDefaultVideoEmbedAttrs(),
    ...initial,
  });
  const props = {
    node: { attrs },
    editor: { isEditable: editable },
    updateAttributes: (patch: Record<string, unknown>) => setAttrs((a) => ({ ...a, ...patch })),
  } as unknown as NodeViewProps;
  return <VideoEmbedView {...props} />;
}

const PROVIDER_CASES: {
  provider: VideoEmbedAttrs["provider"];
  attrs: Partial<VideoEmbedAttrs>;
  srcPrefix: string;
  seekParam: string;
}[] = [
  {
    provider: "youtube",
    attrs: { provider: "youtube", video_id: YT_ID, youtube_id: YT_ID },
    srcPrefix: `https://www.youtube-nocookie.com/embed/${YT_ID}`,
    seekParam: "start=135",
  },
  {
    provider: "cloudflare-stream",
    attrs: { provider: "cloudflare-stream", video_id: CF_ID },
    srcPrefix: `https://iframe.videodelivery.net/${CF_ID}`,
    seekParam: "startTime=135",
  },
  {
    provider: "mux",
    attrs: { provider: "mux", video_id: MUX_ID },
    srcPrefix: `https://player.mux.com/${MUX_ID}`,
    seekParam: "start-time=135",
  },
];

describe("VideoEmbedView — iframe invariants per provider", () => {
  it("renders a lazy, never-autoplaying iframe for each provider", () => {
    for (const { attrs, srcPrefix } of PROVIDER_CASES) {
      const { container, unmount } = render(<Harness initial={attrs} editable={false} />);
      const iframe = container.querySelector("iframe");
      expect(iframe).not.toBeNull();
      expect(iframe?.getAttribute("src")).toContain(srcPrefix);
      expect(iframe?.getAttribute("src")).not.toMatch(/autoplay/i);
      expect(iframe).toHaveAttribute("loading", "lazy");
      unmount();
    }
  });

  it("renders legacy b108-2hx attrs (youtube_id only) as the YouTube embed", () => {
    const { container } = render(<Harness initial={{ youtube_id: YT_ID }} editable={false} />);
    const iframe = container.querySelector("iframe");
    expect(iframe?.getAttribute("src")).toContain(
      `https://www.youtube-nocookie.com/embed/${YT_ID}`,
    );
    expect(iframe).toHaveAttribute("loading", "lazy");
  });

  it("keeps the captions marker for non-YouTube providers", () => {
    render(
      <Harness
        initial={{
          provider: "mux",
          video_id: MUX_ID,
          captions_url: "https://example.org/captions.vtt",
        }}
        editable={false}
      />,
    );
    expect(screen.getByTitle("Captions attached")).toBeInTheDocument();
  });
});

describe("VideoEmbedView — provider select", () => {
  it("ships the three plain provider labels", () => {
    render(<Harness />);
    const select = screen.getByLabelText("Video provider") as HTMLSelectElement;
    const labels = Array.from(select.options).map((o) => o.textContent);
    expect(labels).toEqual(["YouTube", "Cloudflare Stream", "Mux"]);
    expect(select.value).toBe("youtube");
  });

  it("switching provider swaps the URL placeholder and drops a mismatched embed", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <Harness initial={{ provider: "youtube", video_id: YT_ID, youtube_id: YT_ID }} />,
    );
    expect(container.querySelector("iframe")).not.toBeNull();
    expect(screen.getByPlaceholderText(VIDEO_URL_PLACEHOLDERS.youtube)).toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText("Video provider"), "mux");
    expect(screen.getByPlaceholderText(VIDEO_URL_PLACEHOLDERS.mux)).toBeInTheDocument();
    // A YouTube ID is not a valid Mux playback ID — no iframe from junk.
    expect(container.querySelector("iframe")).toBeNull();

    await user.selectOptions(screen.getByLabelText("Video provider"), "youtube");
    expect(container.querySelector("iframe")).not.toBeNull();
  });

  it("pasting another provider's URL flips the select (URLs self-identify)", () => {
    const { container } = render(<Harness />);
    const input = screen.getByPlaceholderText(VIDEO_URL_PLACEHOLDERS.youtube);
    fireEvent.change(input, {
      target: {
        value: `https://customer-f33zs165nr7gyfy4.cloudflarestream.com/${CF_ID}/watch`,
      },
    });
    fireEvent.blur(input);
    const select = screen.getByLabelText("Video provider") as HTMLSelectElement;
    expect(select.value).toBe("cloudflare-stream");
    expect(container.querySelector("iframe")?.getAttribute("src")).toContain(
      `https://iframe.videodelivery.net/${CF_ID}`,
    );
  });

  it("garbage input never produces an embed", () => {
    const { container } = render(<Harness />);
    const input = screen.getByPlaceholderText(VIDEO_URL_PLACEHOLDERS.youtube);
    fireEvent.change(input, { target: { value: "not a url or an id" } });
    fireEvent.blur(input);
    expect(container.querySelector("iframe")).toBeNull();
    expect((screen.getByLabelText("Video provider") as HTMLSelectElement).value).toBe("youtube");
  });
});

describe("VideoEmbedView — chapter seek per provider", () => {
  it("clicking a chapter timestamp seeks via each provider's documented param", async () => {
    const user = userEvent.setup();
    for (const { attrs, seekParam } of PROVIDER_CASES) {
      const { container, unmount } = render(
        <Harness
          initial={{
            ...attrs,
            chapters: [{ title: "The first sigil", start_seconds: 135 }],
          }}
          editable={false}
        />,
      );
      await user.click(screen.getByRole("button", { name: "2:15" }));
      const src = container.querySelector("iframe")?.getAttribute("src") ?? "";
      expect(src).toContain(seekParam);
      expect(src).not.toMatch(/autoplay/i);
      unmount();
    }
  });
});
