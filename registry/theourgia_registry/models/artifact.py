"""Release artifacts — the actual plugin archive bytes.

Phase 14 deliverable 5/10 close-out (v1-032): the registry hosts the
release archive itself so a vault can fetch + verify + install without
trusting a third-party file host.

Storage choice: the registry has no object-storage substrate (unlike
the vault host's R2 pipeline), and v1 plugin archives are small
(source-only Python packages). A DB bytea capped at 10 MB is the
lightest correct path; the cap is enforced at the route with an honest
413 naming the limit. If the ecosystem ever needs bigger artifacts, a
storage adapter slots in behind the same endpoints.

Integrity + authenticity contract (mirrored by the vault installer in
``backend/theourgia/core/plugins/install.py``):

  * ``sha256`` — hex digest of the archive bytes, computed server-side
    at upload time. Never trusted from the client.
  * ``signature_base64`` — the author's Ed25519 signature over the
    domain-separated payload::

        b"theourgia-plugin-artifact-v1\n<slug>\n<version>\n<sha256-hex>"

    Verified against the author's registered public key at upload time
    AND re-verified by every installing vault against the key the
    registry pins on the download response.

Artifacts are immutable — re-uploading a version's artifact is a 409.
A changed archive is a new version.
"""

from __future__ import annotations

from uuid import UUID

from sqlalchemy import Column, ForeignKey, Integer, LargeBinary, String, UniqueConstraint
from sqlmodel import Field

from theourgia_registry.models.base import IDMixin, TimestampMixin

__all__ = [
    "ARTIFACT_SIGNING_CONTEXT",
    "MAX_ARTIFACT_BYTES",
    "ReleaseArtifact",
    "artifact_signing_payload",
]


MAX_ARTIFACT_BYTES: int = 10 * 1024 * 1024
"""Hard cap on stored archive size (10 MB). Enforced with a 413."""

ARTIFACT_SIGNING_CONTEXT: str = "theourgia-plugin-artifact-v1"
"""Domain-separation prefix for the artifact signature payload."""


def artifact_signing_payload(*, slug: str, version: str, sha256_hex: str) -> bytes:
    """The exact bytes the author signs for a release artifact.

    Domain-separated so an artifact signature can never be replayed as
    a request signature (or vice versa), and bound to slug + version so
    a signed archive cannot be re-published under another name.
    """
    return f"{ARTIFACT_SIGNING_CONTEXT}\n{slug}\n{version}\n{sha256_hex}".encode()


class ReleaseArtifact(IDMixin, TimestampMixin, table=True):
    __tablename__ = "release_artifact"
    __table_args__ = (
        UniqueConstraint(
            "plugin_version_id", name="uq_release_artifact_version",
        ),
    )

    plugin_version_id: UUID = Field(
        sa_column=Column(
            ForeignKey("plugin_version.id", ondelete="CASCADE"),
            nullable=False,
        ),
    )
    content: bytes = Field(
        sa_column=Column(LargeBinary, nullable=False),
        description="The archive bytes (tar.gz or zip), capped at 10 MB.",
    )
    size_bytes: int = Field(
        sa_column=Column(Integer, nullable=False),
    )
    sha256: str = Field(
        sa_column=Column(String(64), nullable=False),
        description="Hex SHA-256 of content, computed server-side.",
    )
    signature_base64: str = Field(
        sa_column=Column(String(255), nullable=False),
        description=(
            "Author's Ed25519 signature over artifact_signing_payload(), "
            "base64. Verified at upload; republished on download."
        ),
    )
    content_type: str = Field(
        default="application/gzip",
        sa_column=Column(String(64), nullable=False),
    )
    uploaded_by_author_id: UUID = Field(
        sa_column=Column(
            ForeignKey("author.id", ondelete="RESTRICT"), nullable=False,
        ),
    )
