# Building a Theourgia plugin — tutorial

This walk-through takes you from an empty directory to a signed release
installed in a running vault, using only the commands and endpoints
that exist today. The worked example throughout is the shipped
reference plugin
[`plugins/theourgia-plugin-example-cipher/`](../../plugins/theourgia-plugin-example-cipher/) —
keep it open beside this document.

> Status note: the registry service (`registry/` in this monorepo) is
> code-complete for this flow but `plugins.theourgia.com` itself is not
> deployed yet. Every step below runs against a local registry
> (`uvicorn theourgia_registry.api.app:app --port 8001`). Validation of
> this tutorial by an external developer is a tracked launch-report
> item.

## 1. Scaffold

A plugin is a directory with a strict `plugin.toml` manifest at its
root and an importable Python package:

```
theourgia-plugin-my-cipher/
├── plugin.toml
├── pyproject.toml
├── README.md
├── LICENSE               # a real file, not a symlink (see §4)
└── src/
    └── theourgia_plugin_my_cipher/
        ├── __init__.py
        └── plugin.py
```

`plugin.toml` (see `backend/theourgia/core/plugins/manifest.py` for
the full schema — it is `extra="forbid"`, so typos fail loudly):

```toml
[plugin]
name = "theourgia-plugin-my-cipher"
version = "0.1.0"
author = "Your Name"
license = "AGPL-3.0-only"          # must be on the registry allowlist
description = "A demonstration cipher."
theourgia-version = ">=0.1.0"

[plugin.entrypoint]
backend = "theourgia_plugin_my_cipher.plugin:activate"

[plugin.capabilities]
capabilities = []                   # request ONLY what you need

[plugin.extension_points]
implemented = ["linguistic.cipher"]

[plugin.allowed_hosts]
hosts = []
```

The entrypoint receives a capability-scoped `PluginContext` — the only
supported interface into the host:

```python
from theourgia.core.plugins.context import PluginContext
from theourgia.core.plugins.extension_points import ExtensionPoint


def activate(ctx: PluginContext) -> None:
    ctx.register_extension(
        point=ExtensionPoint.CIPHER,
        name="my-cipher",
        handler={"mapping": {...}, "compute": my_compute},
        metadata={"display_name": "My Cipher", "language": "english"},
    )
```

Rules of the road:

- Request only the capabilities you use. The loader intersects your
  manifest with the user's grants — undeclared capabilities are never
  available, and broad requests make magicians (rightly) suspicious at
  the install-time capability review.
- Return a teardown callable from `activate` if you hold resources;
  otherwise the loader unregisters your extensions on deactivate.
- Never import from `theourgia.*` beyond the context/extension-point
  types — that is the stable surface.

## 2. Test locally

The loader runs plugins straight from a directory — no pip install:

```python
# test_my_plugin.py (run with the backend's pytest)
from theourgia.core.plugins.loader import PluginLoader
from theourgia.core.plugins.manifest import load_manifest
from theourgia.core.plugins.registry import ExtensionRegistry
from theourgia.core.plugins.extension_points import ExtensionPoint

def test_activates(my_plugin_on_syspath):
    registry = ExtensionRegistry()
    loader = PluginLoader(registry=registry)
    manifest = load_manifest("path/to/theourgia-plugin-my-cipher")
    loader.activate(manifest, granted_capabilities=set())
    assert registry.implementations_for(ExtensionPoint.CIPHER)
```

`backend/tests/test_reference_plugin.py` is the worked example,
including the `sys.path` fixture for src-layout packages.

## 3. Generate your author keypair

Your releases are signed with an Ed25519 key that only you hold:

```sh
openssl genpkey -algorithm ed25519 -out author.key
openssl pkey -in author.key -pubout -out author.pub
chmod 600 author.key
```

## 4. Package

The installer accepts a `tar.gz` with your plugin at the root or
inside a single top-level directory. It **refuses** symlinks, `..`
paths, and device files, so dereference links while packing (`h`):

```sh
cd ..   # parent of the plugin directory
tar --exclude='__pycache__' --exclude='*.pyc' \
    -czhf theourgia-plugin-my-cipher-0.1.0.tar.gz \
    theourgia-plugin-my-cipher/
```

## 5. Sign the release artifact

The artifact signature is Ed25519 over a domain-separated payload
binding the archive digest to your plugin's name and version (so a
signed archive can never be republished under another name):

```
theourgia-plugin-artifact-v1\n<slug>\n<version>\n<sha256-hex>
```

```python
# sign_artifact.py
import base64, hashlib, sys
from cryptography.hazmat.primitives import serialization

key = serialization.load_pem_private_key(
    open("author.key", "rb").read(), password=None,
)
archive = open(sys.argv[1], "rb").read()
sha = hashlib.sha256(archive).hexdigest()
payload = f"theourgia-plugin-artifact-v1\n{sys.argv[2]}\n{sys.argv[3]}\n{sha}".encode()
print(base64.b64encode(key.sign(payload)).decode())
```

```sh
python sign_artifact.py theourgia-plugin-my-cipher-0.1.0.tar.gz \
    theourgia-plugin-my-cipher 0.1.0
```

Both sides of this contract live in
`registry/theourgia_registry/models/artifact.py` (verify-on-upload) and
`backend/theourgia/core/plugins/install.py` (verify-on-install).

## 6. Become a registry author (SSO bridge)

If you run your own vault, you never create a registry account — your
vault vouches for you:

```sh
# On YOUR vault (authenticated session):
curl -X POST https://your-vault/api/v1/sso/registry-assertion
# → { "assertion": {...}, "signature_b64": "...", "registry_sso_url": "..." }

# Exchange it at the registry:
curl -X POST <registry_sso_url> \
  -H 'Content-Type: application/json' \
  -d '{"assertion": {...}, "signature_b64": "..."}'
# → { "session_token": "...", "author_did": "did:theourgia:your-host" }
```

The assertion carries your author public key on first contact, which
registers it at the registry. The registry never overwrites an
existing key via SSO — see `registry/README.md` "SSO trust model".

Your vault operator must configure `THEOURGIA_AUTHOR_DID` and
`THEOURGIA_AUTHOR_PRIVATE_KEY_PATH` (pointing at `author.key` from §3).

## 7. Submit the version

Author-protected registry endpoints are signed per-request with your
author key: `X-Author-DID`, `X-Author-Timestamp`, and
`X-Author-Signature` over `sha256(body-hex) + "\n" + timestamp`
(scheme: `registry/theourgia_registry/core/did_auth.py`). The easiest
path is your vault's bridge, which signs server-side:

```sh
curl -X POST https://your-vault/api/v1/registry/author/submissions \
  -H 'Content-Type: application/json' \
  -d '{
    "name": "theourgia-plugin-my-cipher",
    "version": "0.1.0",
    "license_spdx": "AGPL-3.0-only",
    "description": "A demonstration cipher.",
    "source_url": "https://github.com/you/theourgia-plugin-my-cipher",
    "signature_base64": "<manifest signature>",
    "manifest": { ... },
    "capabilities": []
  }'
```

## 8. Upload the release artifact

```
POST /api/v1/author/plugins/{slug}/releases/{version}/artifact
  body: the raw tar.gz bytes  (max 10 MB)
  Content-Type: application/gzip
  X-Artifact-Signature: <output of §5>
  + the three DID-auth headers over the archive bytes
```

The registry recomputes the sha256 server-side, verifies your artifact
signature against your registered key, and stores the archive.
Artifacts are immutable — a changed archive is a new version (409 on
re-upload).

## 9. Review

A maintainer reviews your submission (diff shown, no approve-blind —
H10 rule 44) and accepts it to Community or Official tier. Only
accepted releases are downloadable. You cannot promote yourself
(rule 41).

## 10. Install into a vault

On any vault with `THEOURGIA_REGISTRY_URL` configured:

```sh
# Browse:
curl https://your-vault/api/v1/plugins/registry/search?q=cipher

# Install (version optional — omits → newest accepted release):
curl -X POST https://your-vault/api/v1/plugins/install-from-registry \
  -H 'Content-Type: application/json' \
  -d '{"slug": "theourgia-plugin-my-cipher", "version": "0.1.0",
       "approved_capabilities": []}'

# Activate:
curl -X POST https://your-vault/api/v1/plugins/<install-id>/activate
```

The vault verifies before anything touches disk: sha256 recomputed
locally, artifact signature checked against the author key the
registry pins, archive unpacked defensively, manifest parsed strictly
with name/version cross-checked. Unsigned or badly-signed plugin
**code is refused outright** (bundles — data — are warn-not-block;
code is block). On the next app startup (and immediately for the
current process lifecycle endpoints), the loader activates every
ACTIVE plugin with the capability set the magician actually granted —
one broken plugin never blocks boot; it is marked ERROR with the
reason on the plugin status dashboard.

## Troubleshooting

| Symptom | Cause |
| --- | --- |
| 400 `digest mismatch` at install | Archive bytes changed after signing — rebuild and re-sign |
| 400 `unsigned` | Release has no `X-Artifact-Signature` on record |
| 400 `manifest failed strict validation` | Typo in `plugin.toml` — the error names the field |
| 409 at artifact upload | Artifact already uploaded — bump the version |
| 410 at download | Plugin tombstoned or version withdrawn; the reason is in the body |
| 413 at upload | Archive over the 10 MB registry cap |
| Plugin state `error` after boot | Check `last_error` on `/api/v1/plugins/installed` — import/setup raised |
