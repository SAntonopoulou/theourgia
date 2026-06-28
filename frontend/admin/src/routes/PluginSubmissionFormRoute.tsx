/**
 * PluginSubmissionForm — H10 A2 admin route (live, author-signed).
 *
 * The submit flow: user fills in fields → form submits → bridge
 * signs with the operator's Ed25519 key → registry receives the
 * signed POST. On 201 we navigate to A4 with the new submission's id.
 *
 * For v1, the manifest text / capability chips / version fields are
 * derived from a minimal local form. The full ".plugin/manifest.json
 * upload + parse" flow lands when we ship the file-picker bridge.
 *
 * Mounted at /registry/submit.
 */

import {
  PluginSubmissionFormSurface,
  type RegistryCapabilityChip,
  useTopbar,
} from "@theourgia/shared";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { apiMethods } from "../data/api.js";

const SAMPLE_MANIFEST = `{
  "name": "my-plugin",
  "version": "0.0.1",
  "description": "Short description.",
  "license_spdx": "AGPL-3.0-or-later",
  "capabilities": []
}`;

export function PluginSubmissionFormRoute() {
  const navigate = useNavigate();
  const [pluginName] = useState("my-plugin");
  const [pluginVersion] = useState("0.0.1");
  const [licenseSpdx] = useState("AGPL-3.0-or-later");
  const [sourceUrl, setSourceUrl] = useState(
    "https://github.com/your-org/your-plugin/releases/tag/v0.0.1",
  );
  const [signatureBase64, setSignatureBase64] = useState("0".repeat(8));

  useTopbar(() => ({
    title: "Submit plugin",
    subtitle: "Signed by your instance's author key",
  }));

  const capabilities: RegistryCapabilityChip[] = [];

  const submit = useMutation({
    mutationFn: async () =>
      apiMethods.submitPlugin({
        name: pluginName,
        version: pluginVersion,
        license_spdx: licenseSpdx,
        source_url: sourceUrl,
        signature_base64: signatureBase64,
        manifest: {},
        capabilities: [],
      }),
    onSuccess: (created) => {
      navigate(`/registry/submissions/${encodeURIComponent(created.id)}`);
    },
    onError: (err) => {
      console.error("PluginSubmissionForm · submit failed", err);
    },
  });

  return (
    <PluginSubmissionFormSurface
      manifestText={SAMPLE_MANIFEST}
      pluginName={pluginName}
      pluginVersion={pluginVersion}
      authorDid="—"  // surfaced by registry on submission; not shown pre-submit
      licenseSpdx={licenseSpdx}
      sourceUrl={sourceUrl}
      signatureBase64={signatureBase64}
      signatureKeyFingerprint="server-side · vault holds key"
      capabilities={capabilities}
      busy={submit.isPending}
      onSubmit={(payload) => {
        setSourceUrl(payload.sourceUrl);
        setSignatureBase64(payload.signature);
        submit.mutate();
      }}
      onReplaceManifest={() => {
        console.info(
          "PluginSubmissionForm · replace manifest requested · file picker queued",
        );
      }}
    />
  );
}
