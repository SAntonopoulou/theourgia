/**
 * SandboxBrowser — admin route at ``/sandbox``.
 */

import { useNavigate } from "react-router-dom";

import {
  type SandboxRow,
  SandboxBrowserSurface,
  useTopbar,
} from "@theourgia/shared";

const SANDBOXES: SandboxRow[] = [
  {
    id: "sb-decanic-faces",
    label: "Decanic Faces preview",
    origin: "Decanic Faces v1.5.0",
    createdAgo: "4 days ago",
    expiresLabel: "Expires in 26 days",
    expiryNearby: false,
  },
  {
    id: "sb-vedic",
    label: "Trying the Vedic correspondences",
    origin: "Vedic Correspondences v1.2.0",
    createdAgo: "yesterday",
    expiresLabel: "Expires in 29 days",
    expiryNearby: false,
  },
  {
    id: "sb-goetic",
    label: "Goetic Hierarchy preview",
    origin: "Goetic Hierarchy v2.2.0",
    createdAgo: "3 weeks ago",
    expiresLabel: "Expires in 2 days",
    expiryNearby: true,
  },
];

export function SandboxBrowser() {
  const navigate = useNavigate();
  useTopbar(() => ({ title: "Sandbox" }));

  return (
    <SandboxBrowserSurface
      sandboxes={SANDBOXES}
      onOpen={(id) => navigate(`/sandbox/${id}`)}
      onPromote={(id: string) => {
        // eslint-disable-next-line no-console
        console.info("[sandbox] promote", id);
      }}
      onPreserve={(id: string) => {
        // eslint-disable-next-line no-console
        console.info("[sandbox] preserve", id);
      }}
      onDiscard={(id: string) => {
        // eslint-disable-next-line no-console
        console.info("[sandbox] discard", id);
      }}
    />
  );
}
