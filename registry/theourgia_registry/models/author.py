"""Plugin authors.

An author is identified by their DID. Single-sign-on with the vault
side: the author's vault-issued DID + Ed25519 signature is sufficient
to authenticate against the registry. This file just persists the
profile data the registry needs to know about — display name, contact,
homepage — so the registry surfaces don't have to fetch the vault
each time.
"""

from __future__ import annotations

from sqlalchemy import Column, String, UniqueConstraint
from sqlmodel import Field

from theourgia_registry.models.base import IDMixin, TimestampMixin


class Author(IDMixin, TimestampMixin, table=True):
    __tablename__ = "author"
    __table_args__ = (UniqueConstraint("did", name="uq_author_did"),)

    did: str = Field(sa_column=Column(String(255), nullable=False))
    display_name: str = Field(sa_column=Column(String(255), nullable=False))
    homepage: str | None = Field(default=None, sa_column=Column(String(500), nullable=True))
    contact_email: str | None = Field(
        default=None, sa_column=Column(String(320), nullable=True),
    )
    public_key_pem: str | None = Field(
        default=None,
        sa_column=Column(String(2048), nullable=True),
        description="Cached PEM-encoded Ed25519 public key from the author's vault DID document.",
    )
