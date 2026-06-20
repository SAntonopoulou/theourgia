# Phase 14 — Plugin Ecosystem

> The plugin SDK polished to be world-class. A plugin registry. Example plugins covering every extension point. Documentation, tutorials, and a sustainable contribution culture. This phase turns Theourgia from an application into a platform.

## Goal

Make Theourgia genuinely extensible by people who are not the original maintainers. Document every extension point exhaustively. Build five+ reference plugins to prove the SDK is usable. Stand up a community plugin registry. Make it possible for a magician of a tradition we did not anticipate to add their tradition's tools.

## Dependencies

- Phase 01 (Core Architecture) — plugin substrate
- Phase 02–13 — all the systems plugins might extend

## Deliverables

### 1. Plugin SDK
- Stable Python SDK at `theourgia-plugin-sdk` (separate package)
- Stable TypeScript SDK for frontend extension points
- Manifest schema (versioned)
- All extension points formally documented with type signatures
- Decorators and helpers for common patterns (registering a new divination system, a new calendar, a new cipher, a new sigil mode, etc.)
- Test-harness package: `theourgia-plugin-testkit` — lets plugin authors run their plugin against a mock Theourgia instance

### 2. Plugin manifest
```toml
# plugin.toml
name = "norse-runes-extended"
version = "1.2.0"
author = "..."
license = "AGPL-3.0"
description = "Younger Futhark, Anglo-Saxon Futhorc, and bind-rune designer extensions."
homepage = "..."

theourgia-version = ">=1.0.0,<2.0.0"

[capabilities]
read.entries = false
write.entries = false
read.entities = false
ui.editor.add-block = true
ui.divination.add-system = true
db.migrations = true
network.outbound = false
filesystem = false

[entrypoints]
backend = "norse_runes_extended:setup"
frontend = "dist/index.js"
migrations = "migrations/"
```

### 3. Extension points (formally defined)
Each with a documentation page, type signatures, and at least one reference implementation:
- **Calendar:** register a new calendar system with conversion and formatting
- **Astrology technique:** register a new dignity scheme, time-lord technique, or chart interpretation engine
- **Divination system:** register a new system (entry kind, generator, viewer, log)
- **Cipher:** register a new gematria cipher
- **Correspondence table:** register a default-loadable correspondence table
- **Sigil mode:** register a new sigil generation algorithm
- **Editor block:** register a new Tiptap node type
- **Entry kind:** register a new journal entry kind with its own schema and renderer
- **Dashboard widget:** add a widget to the home dashboard
- **Analytics chart:** add a new visualization type
- **Notification channel:** add a new delivery mechanism (Matrix, Signal, ntfy, etc.)
- **Exporter:** add a new export format
- **Importer:** add a new import format (e.g., from another journaling tool)
- **Federation message type:** add a new federation event kind
- **AP object type:** add a new ActivityPub object/activity type
- **Auth provider:** add an OAuth/OIDC provider
- **Storage backend:** add a new object-storage adapter
- **Email backend:** add a new email sending adapter

### 4. Reference plugins (shipped)
- `theourgia-plugin-runes-extended`: Younger Futhark + Anglo-Saxon Futhorc + bind-rune designer
- `theourgia-plugin-egyptian-decans`: Egyptian decanic chart layer
- `theourgia-plugin-correspondences-777`: imports Crowley's Liber 777 correspondence table (where text rights permit)
- `theourgia-plugin-import-day-one`: import from Day One journal exports
- `theourgia-plugin-export-obsidian`: export to Obsidian-compatible markdown vault
- `theourgia-plugin-notification-matrix`: send reminders via Matrix
- `theourgia-plugin-divination-tea-leaves`: tea-leaf reading log + symbol library (demonstrates a "non-mechanical" divination plugin)

### 5. Plugin registry
- A community-run Theourgia hub (`registry.theourgia.community` or similar — domain TBD by community)
- Hosts plugin metadata, version history, signature manifests
- Plugins themselves hosted on GitHub releases or PyPI
- Search UI in admin: browse, search, install, configure plugins from registry
- Per-plugin: signature verification on install, capability review screen before activation, version pinning, update notifications
- Vulnerability disclosure pipeline (signed advisories)

### 6. Plugin sandbox refinement
- Audit and tighten the sandbox: confirm no escape routes
- Per-capability prompt at install (like browser extension permissions)
- Run-time monitoring: plugins exceeding declared capabilities are logged and can be auto-disabled
- Process isolation option for high-risk plugins (subprocess workers communicating via IPC)

### 7. Documentation
- "Building a Theourgia plugin" tutorial (step-by-step, from scaffold to submission)
- Cookbook of common patterns
- API reference for every extension point
- Migration guide for plugin authors when Theourgia version changes
- "How to maintain a plugin" guide: testing, releases, signature management

### 8. Frontend
- Plugin browser (in registry / locally installed)
- Plugin configuration UI (per-plugin schema)
- Capability review at install
- Plugin status dashboard (active, errors, performance impact)
- Plugin update notifications

### 9. APIs
- `GET /api/v1/plugins/installed`
- `POST /api/v1/plugins/install` — from URL or registry
- `POST /api/v1/plugins/:id/activate`, `.../deactivate`, `.../uninstall`
- `GET /api/v1/plugins/registry/search`
- `POST /api/v1/plugins/:id/configure`

## Design notes

- Treat plugin authors as a first-class user persona. Build for them.
- Stable SDK is more important than rich SDK. We will inevitably get the SDK shape wrong; document a deprecation policy.
- Registry submissions should require: signed releases, declared license, declared maintainer, working test suite, capability justification.
- Bad plugins are inevitable. Make it easy to identify and disable them; impossible to install the truly malicious.

## Risks

- **Risk:** Plugin API churn breaks ecosystem. **Mitigation:** Strict semver; deprecation cycle; LTS plugin SDK versions.
- **Risk:** Malicious plugin slips through. **Mitigation:** Capability sandbox + signature requirements + community review process; clear vulnerability disclosure.
- **Risk:** Plugin SDK too complex to be approachable. **Mitigation:** Reference plugins exist as approachable starting points; cookbook with common patterns.

## Definition of Done

- [ ] SDK published to PyPI and npm with versioned, stable API
- [ ] All seven shipped reference plugins install, activate, and work in a fresh instance
- [ ] At least three community-built plugins exist (organic adoption check)
- [ ] Plugin registry up and serving
- [ ] Signature verification end-to-end
- [ ] Documentation tutorial walk-through validated by an external developer
- [ ] Capability sandbox audit by an external security reviewer signed off
- [ ] Plugin update flow exercised across breaking-change migration
