# Magickal Bundle Format (MBF) v1 — format reference

The single typed envelope for sharing magickal knowledge between
magicians, hubs, and the public registry (FEATURES §11). The design
decision record is [ADR-0011](../adr/0011-magickal-bundle-format.md)
— this page is the implementation reference for bundle authors and
integrators. Implementation lives in `backend/theourgia/core/bundles/`.

## Container

A bundle is a ZIP archive with the extension `.mbf` — inspectable
with `unzip -l` and any JSON viewer.

```
bundle.mbf (ZIP)
├── manifest.json          # REQUIRED — the envelope
├── payloads/              # one or more typed JSON documents
│   ├── entities.json
│   └── recipes.json
├── assets/                # optional binary files, referenced by relative path
│   └── seals/hekate.svg
└── signature.json         # optional detached signature block
```

Rules the reader enforces:

- Every payload and asset file's SHA-256 must match its manifest
  entry (mismatch is a hard error — this is corruption, distinct
  from signature verification).
- Every stored file must be declared in the manifest (nothing hides
  in the ZIP). `signature.json` is the one exception.
- All JSON files Theourgia writes are canonical JSON: sorted keys,
  no extraneous whitespace, UTF-8, `ensure_ascii=False`. Readers
  accept any valid JSON.

### Hard limits

| Limit | Value | Error |
| --- | --- | --- |
| Container size | 50 MB | `BundleTooLargeError` / HTTP 413 |
| Declared decompressed size | 200 MB (zip-bomb guard) | `BundleTooLargeError` / HTTP 413 |
| Total items across payloads | 10,000 | `TooManyItemsError` / HTTP 413 |

## manifest.json (schema `mbf/1`)

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
    "did": "did:theourgia:theourgia.com:vault:soror-eu-a",
    "public_key": "<base64 Ed25519 raw public key, optional>"
  },
  "license": {
    "spdx": "CC-BY-SA-4.0",
    "magickal_tags": ["share-alike"]
  },
  "source_citations": [{"citation": "…", "url": "…"}],
  "dependencies": [{"slug": "other-bundle", "version_range": ">=1.0.0 <2.0.0"}],
  "provenance": [{"slug": "…", "version": "…", "author_name": "…", "note": "…"}],
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

Validation (strict, `extra="forbid"` — unknown keys are errors):

- `type` — kebab-case. Values from the FEATURES §11 catalog are
  known; a well-formed but unknown type is still accepted and
  imports as **opaque-but-listed** (every item is reported, nothing
  is silently dropped). Malformed values (uppercase, spaces) are
  rejected.
- `slug` — kebab-case, ≤64 chars.
- `version` — strict SemVer (`1.2.3`, optional pre-release suffix).
- `license.magickal_tags` ⊆ {`for-members-only`, `for-initiates-only`,
  `no-derivatives`, `share-alike`, `public-domain`}.
- `provenance` — a list of links, **append-only**: a derived bundle
  copies the parent chain and appends one link. Import preserves the
  chain verbatim on the `installed_bundle` record; no API writes a
  shortened chain.
- `author.name` and `license.spdx` are required non-empty, so the
  attribution block can never be empty.
- `payloads` — at least one entry; payload paths are
  `payloads/<name>.json`; asset paths live under `assets/`.
- `closed_tradition: true` — import surfaces the respect-source
  notice, imported items keep their `tradition_tags` verbatim so the
  Phase 15 §14 public-share hard-block and AI-agent exclusion
  filters apply, and imported content is always personal-visibility.
  Public registry listing of such bundles is refused at submit time.

## Payload documents

Each `payloads/<kind>.json` is:

```json
{"kind": "<kind>", "items": [ { "ref": "…", … } ]}
```

Every item is a self-contained JSON object with a bundle-local `ref`
— a stable string id, unique within the payload, used for
cross-references within the bundle and for piecemeal import
selection. Items may carry their own `source_citation` where
item-level attribution differs from the bundle's.

### Item schemas per kind (v1)

v1 implements import + export for five kinds. Fields marked
**required** cause the item to be reported as `skipped` (with a
reason) when missing — never a silent drop.

#### `entities` (bundle type `pantheon`)

| Field | Notes |
| --- | --- |
| `ref` | **required** — bundle-local id |
| `name` | **required** |
| `kind` | entity kind (`goddess`, `daemon`, …); unknown values import as `other` |
| `glyph` | defaults to `entity` |
| `aliases`, `epithets` | string lists |
| `pronouns`, `gender` | optional strings |
| `summary`, `description` | optional |
| `tradition` | primary tradition tag; defaults to first of `tradition_tags` |
| `tradition_tags` | kept **verbatim** on import (closed-tradition propagation) |
| `attributions` | free-form correspondence dict |
| `notes_shareable` | shareable notes only — `notes_private` and `ancestor_profile` never travel |

Import semantics: imported entities are immutable nodes with
`origin="imported_from_bundle:<slug>@<version>"`; alias prompting
defaults to `distinct` — v1 creates no `entity_alias` rows; imports
never overwrite personal entities.

#### `entry-templates` (bundle type `entry-templates`)

| Field | Notes |
| --- | --- |
| `ref`, `name` | **required** |
| `kind` | **required** — an `EntryType` value (`note`, `ritual`, …); unknown values skip |
| `body_template` | **required** — Tiptap-JSON as a string (an object is serialized) |
| `description`, `default_title_pattern`, `default_glyph`, `tradition`, `license` | optional |

Imported templates get `scope=personal`.

#### `tarot-spreads` (bundle type `tarot-spreads`)

| Field | Notes |
| --- | --- |
| `ref`, `name` | **required** |
| `slug` | defaults to `ref` |
| `description` | optional |
| `positions` | ordered list of `{index, name, meaning, x?, y?, rotation?}` |
| `layout_json` | free-form layout payload |

Imported spreads get `kind=custom`, `is_builtin=false`.

#### `voces` (bundle type `voces-library`)

| Field | Notes |
| --- | --- |
| `ref`, `name`, `source_text` | **required** |
| `source_citation` | **required non-empty** — the H05 per-row provenance honesty rule holds on import |
| `source_script` | one of the seven scripts; unknown values import as `custom` |
| `transliteration`, `ipa` | optional |
| `planetary_associations`, `elemental_associations` | string lists |
| `forked_from_bundled_id` | provenance of forks from the bundled corpus |

Cross-vault `linked_entity_ids` never travel.

#### `recipes` (bundle type `recipe-book`)

| Field | Notes |
| --- | --- |
| `ref`, `name` | **required** |
| `kind` | `incense` / `oil` / `wash` / `philtre`; unknown values import as `other` |
| `description` | optional |
| `ingredients` | list of `{name, amount, notes?}` |
| `steps` | list of `{text, duration_minutes?}` |
| `correspondences` | free-form dict |

Cross-vault `library_source_ids` / `entity_ids` never travel.
Imported recipes get `visibility=personal`.

## signature.json

```json
{
  "algorithm": "ed25519",
  "public_key": "<base64 raw 32-byte key>",
  "signed_digest": "<base64 signature>",
  "digest_manifest": {
    "manifest.json": "<sha256 hex>",
    "payloads/entities.json": "<sha256 hex>"
  }
}
```

The signature is Ed25519 over the SHA-256 of the canonical JSON
(sorted keys, no whitespace) of `digest_manifest`. Both standard and
URL-safe base64 are accepted, padded or not.

Verification recomputes every file digest, requires `digest_manifest`
to cover exactly the container's non-signature files, verifies the
signature, then compares `public_key` against the manifest author's
key when one is declared. Every outcome is a **verdict**:

- `verified` — everything checks out
- `unsigned` — no `signature.json`; the preview and import proceed
  with a visible "unsigned bundle" warning (FEATURES §11: **warn,
  don't block**) — never an exception
- `failed` — with a human-readable reason (tampering, coverage gap,
  key mismatch)

## Import semantics (v1)

- `POST /api/v1/bundles/preview` — multipart upload; validates,
  verifies, returns the manifest, the signature verdict, per-payload
  item listings (`ref`, `kind`, display name, importable flag), the
  license + attribution block, the closed-tradition declaration with
  the respect-source notice, and conflicts (existing same-name
  entities per the alias-graph model; existing same-slug installed
  bundle). No writes.
- `POST /api/v1/bundles/import` — multipart upload + optional
  `selected_refs` form field (JSON array of refs); commits the
  selected subset (piecemeal by design; omit to import everything).
  Imported content is **always personal visibility**. Creates an
  `installed_bundle` record carrying attribution (NOT NULL — cannot
  be stripped), the verbatim provenance chain, the signature verdict,
  and the closed-tradition flag.
- `GET /api/v1/bundles/installed` — the vault's install records,
  attribution always present.
- `GET /api/v1/bundles/export?type=…&sign=…` — builds an `.mbf`
  from vault content for one of the five implemented types
  (`pantheon`, `entry-templates`, `tarot-spreads`, `voces-library`,
  `recipe-book`). `sign=true` signs with the instance's Ed25519
  federation keypair. Closed-tradition declarations survive export:
  items whose tags intersect this instance's operator-curated closed
  list stamp the manifest `closed_tradition: true`.
- Sandbox path: `POST /api/v1/sandbox/import` (multipart,
  `kind=bundle`) stores the bundle bytes in the storage substrate
  and the parsed manifest on the sandbox row **without materializing
  content** — isolation is structural. `POST
  /api/v1/sandbox/{id}/promote` reads the bytes back, runs the real
  import (all items), and records the `installed_bundle` row. The
  30-day expiry / promote / discard semantics are unchanged.

## Unknown kinds

Payload kinds without a v1 importer (and bundles of unknown type)
are **opaque-but-listed**: the preview lists every item with
`importable: false`, and an import reports each such item as
`skipped` with a reason. Nothing is silently dropped, and the
`installed_bundle` record still preserves the full manifest for a
future importer.
