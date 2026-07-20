"""Signed-release verification + safe unpacking for registry installs.

Phase 14 § 5 ("signature verification on install") — the vault side of
the contract the registry publishes on its download endpoint:

  * ``sha256`` header — hex digest of the archive bytes
  * ``signature`` header — the author's Ed25519 signature over the
    domain-separated payload::

        b"theourgia-plugin-artifact-v1\n<slug>\n<version>\n<sha256-hex>"

  * ``author public key`` header — standard base64 of the raw 32-byte
    Ed25519 key pinned on the author's registry record

Policy note (plan § 5 + MBF ADR-0011): install-time verification is
**warn-not-block for BUNDLES** (data — an unsigned tarot deck can't
execute anything) but **block for plugin CODE**. This module implements
the block side: an unsigned or badly-signed plugin archive never
touches the plugins directory.

Unpacking is defensive: entries with absolute paths, ``..`` traversal,
links, or devices are rejected outright, and the uncompressed size is
capped so a crafted archive can't fill the disk.
"""

from __future__ import annotations

import base64
import hashlib
import io
import shutil
import tarfile
import tempfile
from pathlib import Path

from cryptography.exceptions import InvalidSignature
from cryptography.hazmat.primitives.asymmetric.ed25519 import (
    Ed25519PublicKey,
)

from theourgia.core.plugins.manifest import PluginManifest, load_manifest

__all__ = [
    "ARTIFACT_SIGNING_CONTEXT",
    "MAX_UNPACKED_BYTES",
    "ArtifactVerificationError",
    "PluginArchiveError",
    "artifact_signing_payload",
    "unpack_plugin_archive",
    "verify_release_artifact",
]


ARTIFACT_SIGNING_CONTEXT = "theourgia-plugin-artifact-v1"
"""Domain-separation prefix. MUST match the registry's
``theourgia_registry.models.artifact.ARTIFACT_SIGNING_CONTEXT``."""

MAX_UNPACKED_BYTES = 50 * 1024 * 1024
"""Cap on total uncompressed size (50 MB) — decompression-bomb guard."""


class ArtifactVerificationError(Exception):
    """The downloaded archive failed integrity / authenticity checks."""


class PluginArchiveError(Exception):
    """The archive is structurally unsafe or not a valid plugin package."""


def artifact_signing_payload(*, slug: str, version: str, sha256_hex: str) -> bytes:
    """The exact bytes the author signed — mirrors the registry."""
    return f"{ARTIFACT_SIGNING_CONTEXT}\n{slug}\n{version}\n{sha256_hex}".encode()


def verify_release_artifact(
    content: bytes,
    *,
    slug: str,
    version: str,
    expected_sha256: str,
    signature_b64: str,
    author_public_key_b64: str,
) -> str:
    """Verify the archive bytes against the registry's pinned headers.

    Returns the (recomputed) hex sha256 on success. Raises
    :class:`ArtifactVerificationError` on ANY failure — unsigned,
    tampered, or key-garbled archives are all install-blocking for
    plugin code (warn-not-block applies only to data bundles).
    """
    if not signature_b64:
        raise ArtifactVerificationError(
            "release is unsigned — plugin code installs require an "
            "author signature"
        )
    if not author_public_key_b64:
        raise ArtifactVerificationError(
            "registry did not pin an author public key for this release"
        )

    actual_sha256 = hashlib.sha256(content).hexdigest()
    if not expected_sha256:
        raise ArtifactVerificationError(
            "registry did not report a sha256 for this release",
        )
    if actual_sha256 != expected_sha256.lower():
        raise ArtifactVerificationError(
            "archive digest mismatch — downloaded bytes do not match "
            f"the registry's sha256 (expected {expected_sha256}, "
            f"got {actual_sha256})"
        )

    try:
        raw_key = base64.b64decode(author_public_key_b64)
        public_key = Ed25519PublicKey.from_public_bytes(raw_key)
    except Exception as exc:
        raise ArtifactVerificationError(
            "author public key from the registry is unreadable",
        ) from exc

    payload = artifact_signing_payload(
        slug=slug, version=version, sha256_hex=actual_sha256,
    )
    try:
        public_key.verify(base64.b64decode(signature_b64), payload)
    except (InvalidSignature, ValueError) as exc:
        raise ArtifactVerificationError(
            "artifact signature does not verify against the author key "
            "pinned in the registry record"
        ) from exc

    return actual_sha256


def _safe_members(tar: tarfile.TarFile) -> list[tarfile.TarInfo]:
    """Validate every member before extraction. Rejects traversal,
    links, devices, and decompression bombs."""
    members: list[tarfile.TarInfo] = []
    total = 0
    for member in tar.getmembers():
        name = member.name
        if name.startswith(("/", "\\")):
            raise PluginArchiveError(
                f"archive member has an absolute path: {name!r}"
            )
        parts = Path(name).parts
        if ".." in parts:
            raise PluginArchiveError(
                f"archive member escapes the extraction root: {name!r}"
            )
        if not (member.isfile() or member.isdir()):
            raise PluginArchiveError(
                f"archive member is not a regular file or directory: {name!r}"
            )
        total += max(member.size, 0)
        if total > MAX_UNPACKED_BYTES:
            raise PluginArchiveError(
                "archive expands past the "
                f"{MAX_UNPACKED_BYTES} byte unpack cap"
            )
        members.append(member)
    return members


def unpack_plugin_archive(
    content: bytes,
    *,
    slug: str,
    version: str,
    plugins_dir: Path,
) -> tuple[Path, PluginManifest]:
    """Unpack a VERIFIED archive into the loader's plugins directory.

    Extraction happens in a temp directory first; the manifest is
    parsed strictly (``plugin.toml`` at the package root or one level
    down) and cross-checked against the requested slug + version
    BEFORE anything lands in ``plugins_dir``. On success the package
    moves to ``plugins_dir/<manifest.name>`` (replacing a previous
    version's files) and ``(final_path, manifest)`` is returned.

    Raises :class:`PluginArchiveError` on any structural or manifest
    problem — nothing is left behind in ``plugins_dir`` on failure.
    """
    with tempfile.TemporaryDirectory(prefix="theourgia-plugin-") as tmp:
        tmp_path = Path(tmp)
        try:
            with tarfile.open(
                fileobj=io.BytesIO(content), mode="r:*",
            ) as tar:
                members = _safe_members(tar)
                # Belt and braces: our _safe_members vetting PLUS the
                # stdlib "data" filter (strips setuid bits, blocks
                # traversal/devices at the tarfile layer too).
                tar.extractall(tmp_path, members=members, filter="data")
        except tarfile.TarError as exc:
            raise PluginArchiveError(
                f"archive is not a readable tar file: {exc}"
            ) from exc

        # The manifest may sit at the archive root or inside a single
        # top-level directory (`name-version/plugin.toml`, the GitHub
        # release layout).
        manifest_path = tmp_path / "plugin.toml"
        package_root = tmp_path
        if not manifest_path.exists():
            candidates = [
                p for p in tmp_path.iterdir() if p.is_dir()
            ]
            if len(candidates) == 1 and (candidates[0] / "plugin.toml").exists():
                package_root = candidates[0]
                manifest_path = candidates[0] / "plugin.toml"
        if not manifest_path.exists():
            raise PluginArchiveError(
                "archive does not contain a plugin.toml at its root"
            )

        try:
            manifest = load_manifest(manifest_path)
        except Exception as exc:
            raise PluginArchiveError(
                f"plugin manifest failed strict validation: {exc}"
            ) from exc

        if manifest.name != slug:
            raise PluginArchiveError(
                f"manifest name {manifest.name!r} does not match the "
                f"requested plugin {slug!r}"
            )
        if manifest.version != version:
            raise PluginArchiveError(
                f"manifest version {manifest.version!r} does not match "
                f"the requested release {version!r}"
            )

        final_path = plugins_dir / manifest.name
        plugins_dir.mkdir(parents=True, exist_ok=True)
        if final_path.exists():
            shutil.rmtree(final_path)
        shutil.copytree(package_root, final_path)

    return final_path, manifest
