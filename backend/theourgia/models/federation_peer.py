"""Known federation peer instances — v1-026.

The operator-curated peer directory behind the Network Browser surface
(H08 §S3). A row is created when the operator adds a peer by URL; the
add path verifies the peer by fetching its
``/.well-known/theourgia/actor`` document and stores the announced DID.

Design notes:

* **status is a plain string** (not a DB enum) matching the surface's
  handshake vocabulary — ``successful`` / ``pending`` / ``refused`` /
  ``blocked``. New states never need a migration; unknown strings
  render as ``pending`` on the surface.
* **capability_token** is issued at peer-add time (spec §6 — the
  minimal v1 grant covering native-protocol inbox operations) and kept
  alongside the row so the operator can convey it to the peer. It is
  returned ONCE in the create response and omitted from list reads.
* **No reputation columns** — H08 honesty rules ban "trusted" /
  "verified" judgements; a peer is a URL, a DID, and a handshake state.
"""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import Column, DateTime, String, Text, UniqueConstraint
from sqlmodel import Field

from theourgia.models.base import IDMixin, TimestampMixin

__all__ = ["FederationPeer"]


class FederationPeer(IDMixin, TimestampMixin, table=True):
    __tablename__ = "federation_peer"
    __table_args__ = (
        UniqueConstraint("base_url", name="uq_federation_peer_base_url"),
    )

    base_url: str = Field(
        sa_column=Column(String(500), nullable=False),
        description="HTTPS base URL of the peer instance, no trailing slash.",
    )

    instance_did: str = Field(
        sa_column=Column(String(255), nullable=False),
        description="The DID the peer announced in its actor document.",
    )

    label: str | None = Field(
        default=None,
        sa_column=Column(String(255), nullable=True),
        description="Operator-supplied display label (optional).",
    )

    status: str = Field(
        default="pending",
        sa_column=Column(
            String(32), nullable=False, server_default="pending",
        ),
        description=(
            "Handshake state string — successful / pending / refused / "
            "blocked."
        ),
    )

    added_at: datetime = Field(
        sa_column=Column(DateTime(timezone=True), nullable=False),
        description="When the operator added the peer.",
    )

    last_seen_at: datetime | None = Field(
        default=None,
        sa_column=Column(DateTime(timezone=True), nullable=True),
        description="Last successful contact (actor fetch or heartbeat).",
    )

    capability_token: str | None = Field(
        default=None,
        sa_column=Column(Text, nullable=True),
        description=(
            "EdDSA capability token issued to this peer at add time "
            "(spec §6). Returned once on create; never in list reads."
        ),
    )
