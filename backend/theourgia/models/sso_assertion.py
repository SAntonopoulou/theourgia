"""SSO assertion (B141).

Per ``plan/12-batches-backend.md`` § B141.

A signed assertion the practitioner's vault issues for a
specific request — e.g. *"I, did:theourgia:hearth/aspasia,
consent to joining did:theourgia:aurora/coven for 24h."*

The Ed25519 signing happens in Phase 12.5 (cross-instance
transport). B141 stores the payload + a deterministic id so
the frontend SsoAuthorizeConsent surface can render the
consent moment + the revoke list.

Honesty rules wired here:

  · ``expires_at_utc`` defaults to now + 24h per H08 rule.
  · ``revoked_at`` once set is immutable (service-layer guard).
  · The signature column is nullable — B141 stores the
    payload only; B143+ fills the signature when the wire
    protocol comes online.
"""

from __future__ import annotations

from datetime import datetime
from typing import Optional
from uuid import UUID

from sqlalchemy import (
    Column,
    DateTime,
    ForeignKey,
    Index,
    String,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlmodel import Field

from theourgia.models.base import IDMixin, TimestampMixin

__all__ = ["SsoAssertion"]


class SsoAssertion(IDMixin, TimestampMixin, table=True):
    """One SSO assertion issued by this instance's user to a
    target DID."""

    __tablename__ = "sso_assertion"
    __table_args__ = (
        Index("ix_sso_assertion_issuer", "issuer_user_id"),
        Index(
            "ix_sso_assertion_issuer_expires",
            "issuer_user_id",
            "expires_at_utc",
        ),
    )

    issuer_user_id: UUID = Field(
        sa_column=Column(
            ForeignKey("user.id", ondelete="CASCADE"),
            nullable=False,
        ),
    )

    # did:theourgia:host:slug — the recipient.
    target_did: str = Field(
        sa_column=Column(String(255), nullable=False),
    )

    # JSON payload — scope-specific bag (e.g. {"action": "join_hub",
    # "hub_slug": "coven"}). The H08 SsoAuthorizeConsent modal
    # renders the three mandatory sections from this payload at
    # the API seam.
    scope_payload: dict = Field(
        default_factory=dict,
        sa_column=Column(JSONB, nullable=False, server_default="{}"),
    )

    expires_at_utc: datetime = Field(
        sa_column=Column(DateTime(timezone=True), nullable=False),
    )

    revoked_at: Optional[datetime] = Field(
        default=None,
        sa_column=Column(DateTime(timezone=True), nullable=True),
    )

    # Filled by B143+ (Ed25519 over canonical JSON; base64). NULL
    # until the wire protocol comes online — the assertion still
    # exists as an audit row.
    signature_b64: Optional[str] = Field(
        default=None,
        sa_column=Column(String(255), nullable=True),
    )
