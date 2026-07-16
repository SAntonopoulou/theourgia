# ADR-0011: Magickal Bundle Format (MBF) v1

- **Status:** proposed — **awaiting Soror Ευ. Α. review before content ships on it**
- **Date:** 2026-07-16
- **Deciders:** Soror Ευ. Α. (pending), Claude (drafting)
- **Tags:** #sharing, #format, #federation, #plugins

## Context and problem statement

FEATURES §11 promises a single typed envelope for sharing magickal
knowledge — pantheons, rituals, decks, correspondences, calendars,
cipher definitions, and more — between magicians, hubs, and the public
registry. Six shipped features are queued behind it: the seven content
bundles (Tier #14), newsletter delivery plugin slots, the sandbox
import flow, provenance/attribution enforcement, closed-tradition
handling, and the GDPR "data portability in MBF" export flavor.

The operator asked to weigh in on the schema before data ships. This
ADR is that reviewable artifact: the format is implemented behind it,
and the schema carries a version so a review-driven change lands as
MBF v2 with a migration path rather than a breaking rewrite.

## Decision drivers

- One format for all 30+ bundle types in the FEATURES §11 catalog —
  piecemeal-extractable, human-inspectable, diffable.
- Binary assets (deck art, seals, audio voces) must travel inside.
- Ed25519 creator signing, verifiable offline; unsigned bundles warn
  but are not blocked.
- Attribution and provenance cannot be stripped in transit.
- Closed-tradition declarations must survive export → import.
- GDPR portability: the same format serves "export my vault."

## Considered options

1. **Single JSON document** — simplest, but binary assets force
   base64 bloat and one giant file defeats piecemeal inspection.
2. **ZIP container with JSON manifest + typed payload files +
   assets/** — the EPUB/JAR pattern; streams, inspects with stock
   tools, keeps payloads separately hashable for piecemeal import.
3. **Git repository per bundle** — maximal provenance but heavyweight
   for recipients, and hosting assumptions leak into the format.

## Decision

Selected option: **Option 2 — a ZIP container, extension `.mbf`**.

### Container layout

```
bundle.mbf (ZIP)
├── manifest.json          # REQUIRED — the envelope
├── payloads/              # one or more typed JSON documents
│   ├── entities.json
│   └── correspondences.json
├── assets/                # optional binary files, referenced by relative path
│   └── seals/hekate.svg
└── signature.json         # optional detached signature block
```

### manifest.json (schema `mbf/1`)

```json
{
  "mbf_version": 1,
  "type": "pantheon",
  "name": "Hellenic Pantheon",
  "slug": "hellenic-pantheon",
  "version": "1.0.0",
  "description": "…",
  "author": {
    "name": "Soror Ευ. Α.",
    "did": "did:theourgia:theourgia.com:soror-eu-a",
    "public_key": "<base64 Ed25519 raw public key, optional>"
  },
  "license": {
    "spdx": "CC-BY-SA-4.0",
    "magickal_tags": ["share-alike"]
  },
  "source_citations": [
    {"citation": "…", "url": "…"}
  ],
  "dependencies": [
    {"slug": "other-bundle", "version_range": ">=1.0.0 <2.0.0"}
  ],
  "provenance": [
    {"slug": "…", "version": "…", "author_name": "…", "note": "…"}
  ],
  "closed_tradition": false,
  "closed_tradition_note": "",
  "created_at": "2026-07-16T00:00:00Z",
  "payloads": [
    {"path": "payloads/entities.json", "kind": "entities",
     "count": 13, "sha256": "<hex>"}
  ],
  "assets": [
    {"path": "assets/seals/hekate.svg", "sha256": "<hex>",
     "media_type": "image/svg+xml"}
  ]
}
```

Rules:

- `type` is one value from the FEATURES §11 catalog (kebab-case:
  `pantheon`, `tradition`, `ritual-set`, `correspondences`,
  `festival-calendar`, `tarot-deck`, `tarot-spreads`, `voces-library`,
  `dream-symbols`, `recipe-book`, `cipher-definitions`,
  `entry-templates`, …). Unknown types import as opaque-but-listed;
  nothing is silently dropped.
- `license.magickal_tags` ⊆ {`for-members-only`, `for-initiates-only`,
  `no-derivatives`, `share-alike`, `public-domain`}.
- `provenance` is append-only: a derived bundle copies the parent
  chain and appends one link. Import preserves the chain verbatim;
  there is no API that writes a shortened chain.
- `closed_tradition: true` bundles: import surfaces the respect-source
  notice and the imported content is tagged so the Phase 15 §14
  public-share hard-block and the AI-agent exclusion filters apply.
  Public registry listing of such bundles is refused at submit time.

### Payload documents

Each payload file is `{"kind": "<kind>", "items": [ … ]}` where each
item is a self-contained JSON object with a bundle-local `ref`
(stable string id for cross-references within the bundle, e.g. a
ritual referencing an entity by `ref`). Item schemas per kind are
versioned with the manifest (`mbf_version`) and documented in
`docs/developer/mbf.md`. Items carry their own `source_citation`
where item-level attribution differs from the bundle's.

### Signing (`signature.json`)

```json
{
  "algorithm": "ed25519",
  "public_key": "<base64 raw 32-byte key>",
  "signed_digest": "<base64 signature>",
  "digest_manifest": {
    "manifest.json": "<sha256 hex>",
    "payloads/entities.json": "<sha256 hex>",
    "assets/seals/hekate.svg": "<sha256 hex>"
  }
}
```

The signature is Ed25519 over the SHA-256 of the canonical JSON
(sorted keys, no whitespace) of `digest_manifest`. Verification:
recompute every file digest, compare to `digest_manifest`, verify the
signature, then compare `public_key` against the author's known key
if one is on record. Missing `signature.json` → import proceeds with
a visible "unsigned bundle" warning (FEATURES §11: warn, don't block).

### Import semantics (v1)

- `POST /api/v1/bundles/preview` — upload, validate, verify; returns
  the manifest, per-payload item listings, signature verdict, license
  + attribution block, and conflicts (existing same-name entities per
  the alias-graph model; existing same-slug bundles).
- `POST /api/v1/bundles/import` — commits a **user-selected subset**
  of items (piecemeal by design). Imported entities are immutable
  nodes with `origin="imported_from_bundle:<slug>@<version>"` per the
  §3 alias-graph model; import-time alias prompting defaults to
  `distinct`.
- Sandbox path: `POST /sandbox/import` stores the bundle bytes +
  manifest against the Sandbox row without materializing content;
  **promote** runs the real import. Sandbox isolation is therefore
  structural — nothing exists to leak into search or federation.
- Attribution surfaces prominently in the preview and persists on an
  `installed_bundle` record; no strip path exists.

### Export

`GET /api/v1/bundles/export?type=…&…` builds an `.mbf` from vault
content, signing with the vault's Ed25519 federation key when the
caller opts in. The GDPR full-vault export gains `format=mbf`.

## Rationale

The ZIP-of-JSON pattern is the only option that satisfies piecemeal
inspection, binary assets, offline signing, and stock-tool
transparency at once. Versioning the envelope (`mbf_version`) plus
per-kind payload docs lets the operator's review adjust item schemas
without invalidating the container design.

## Consequences

### Positive
- Unblocks Tier #14, sandbox promote, registry content tier, GDPR
  portability, and the federated-broadcast path in one substrate.
- Bundles are inspectable with `unzip -l` + any JSON viewer — matches
  the project's honesty-by-construction ethos.

### Negative / trade-offs
- ZIP is not streamable for enormous bundles; acceptable — bundles
  are knowledge artifacts, not media libraries (media stays in the
  Media Library; bundles reference by citation, not blob).
- Canonical-JSON signing requires discipline (one canonicalizer,
  property-tested) — same pattern already used by federation signing.
- Per-kind item schemas are the long tail; v1 documents the kinds the
  seven shipped bundles need and grows kind-by-kind.
