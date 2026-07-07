# theourgia-plugin-example-cipher

**Reference plugin — not intended for practical use.**

This is the smallest possible end-to-end demonstration of the Theourgia
plugin SDK. It exists to prove that the substrate wires up correctly
and to give plugin authors a copy-pasteable starting point.

## What it does

Registers a single trivial cipher at the `linguistic.cipher` extension
point:

- Slug: `example-unity`
- Language: `english`
- Mapping: every ASCII letter (`a`–`z`) → `1`
- Effect: `compute(word)` returns the letter-count of `word`

The name — "unity cipher" — is a nod to the arithmetic identity being
demonstrated, not a claim about any historical tradition.

## Why it exists

Phase 14 (Plugin Ecosystem) needs at least one round-trip through the
loader before third-party authors can trust the SDK. This plugin:

- Ships a valid `plugin.toml` against the strict Pydantic schema.
- Declares zero capabilities (proving pure data plugins are viable).
- Registers exactly one extension point, using the public
  `PluginContext.register_extension` API — no private imports.
- Is covered by `backend/tests/test_reference_plugin.py`, which loads
  the manifest from disk, activates via `PluginLoader`, and asserts
  the cipher is queryable through the registry.

## Layout

```
theourgia-plugin-example-cipher/
├── LICENSE                                 # AGPL-3.0-only (matches core)
├── README.md                               # this file
├── plugin.toml                             # manifest (Pydantic-validated)
├── pyproject.toml                          # PEP 517 packaging metadata
└── src/
    └── theourgia_plugin_example_cipher/
        ├── __init__.py                     # empty, marks the package
        └── plugin.py                       # `activate(ctx)` entrypoint
```

## License

[AGPL-3.0-only](./LICENSE) — same as Theourgia core. Third-party plugins
must declare AGPL-3.0-compatible licenses to install in the Theourgia
ecosystem.
