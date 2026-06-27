/**
 * PluginSubmissionForm — H10 Cluster A2 surface copy.
 *
 * Rule 42 — license SPDX-validated, BLOCKING. Non-acceptable licenses
 * surface a --warn-soft block above the submit button.
 */

export const PREAMBLE =
  "Submit a new plugin or a new version. A maintainer reads every submission before it is accepted into a tier — there is no automated path. The registry holds your manifest and signature; the code itself stays where you publish it.";

export const ACCEPTED_LICENSES: readonly string[] = [
  "AGPL-3.0-only",
  "AGPL-3.0-or-later",
  "GPL-3.0-or-later",
  "LGPL-3.0-or-later",
  "MPL-2.0",
  "MIT",
  "BSD-2-Clause",
  "BSD-3-Clause",
  "Apache-2.0",
  "CC-BY-SA-4.0",
  "Unlicense",
];

export const HEADERS = {
  manifest: "Manifest",
  identity: "Identity",
  sourceDistribution: "Source distribution",
  signature: "Signature",
  capabilities: "Capabilities",
} as const;

export const FIELD_LABELS = {
  name: "Name",
  author: "Author",
  license: "License",
  authorSessionHint: "(your session)",
  acceptedLicenses: "Accepted licenses",
  spdxValidated: "SPDX-validated",
  licenseNotAccepted: "License is not in the accepted set",
} as const;

export const SOURCE_DISTRIBUTION_HINT =
  "The registry holds metadata and a signature. The code lives where you publish it.";

export const SOURCE_OPTIONS: readonly { key: SourceKind; label: string }[] = [
  { key: "github", label: "GitHub release (tag URL)" },
  { key: "pypi", label: "PyPI package + version" },
];

export type SourceKind = "github" | "pypi";

export const SIGNATURE_VERIFIED_PREFIX =
  "Verified against the key in your DID document — fingerprint";

export const SUBMIT_LABEL = "Submit for review";

export const MANIFEST_PARSED_PREFIX = "parsed";

export interface CapabilityChip {
  label: string;
  wireKey: string;
}
