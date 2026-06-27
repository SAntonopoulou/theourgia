"""Federation replay-nonce store — Phase 12.5.

A signed federation request carries a unique identifier (the
``Signature-Input``'s ``created`` field plus the ``nonce`` parameter,
or for capability tokens the ``jti`` claim). The verifier MUST reject
duplicates within the replay window.

This table is the durable store of accepted nonces. A background job
periodically deletes rows older than the configured window so the
table stays bounded.

Schema:

- ``id``           UUID, primary key
- ``nonce_key``    the unique key (typically ``"<keyid>:<created>:<nonce>"``
                   for HTTP signatures, or ``"<iss>:<jti>"`` for capability
                   tokens). The full string is hashed to fit a stable column.
- ``observed_at``  when the verifier first accepted it
- ``expires_at``   when the row is eligible for cleanup (typically
                   ``observed_at + replay_window``)

A unique constraint on ``nonce_key`` makes duplicate-insert the
detection mechanism: try to insert, catch IntegrityError, surface a
replay-attack rejection.
"""

from __future__ import annotations

from datetime import datetime
from uuid import UUID

from sqlalchemy import (
    Column,
    DateTime,
    Index,
    String,
    UniqueConstraint,
)
from sqlmodel import Field

from theourgia.models.base import IDMixin


__all__ = ["FederationNonce"]


class FederationNonce(IDMixin, table=True):
    """One row per accepted federation-protocol nonce."""

    __tablename__ = "federation_nonce"
    __table_args__ = (
        UniqueConstraint("nonce_key", name="uq_federation_nonce_key"),
        Index("ix_federation_nonce_expires", "expires_at"),
    )

    nonce_key: str = Field(sa_column=Column(String(255), nullable=False))

    observed_at: datetime = Field(
        sa_column=Column(DateTime(timezone=True), nullable=False),
    )

    expires_at: datetime = Field(
        sa_column=Column(DateTime(timezone=True), nullable=False),
    )
