"""Hub aggregate-analytics opt-in — v1-033 (Tier 3 #20).

FEATURES §9: cross-magician aggregate analytics are **opt-in,
network-scoped, differential-privacy noised, minimum-cohort gated**.
This table is the opt-in: a row means the member has consented to
their vault's counts entering the hub's noised aggregates.

Design notes:

* No row → the member's data NEVER enters an aggregate. There is no
  operator-side override and no default-on path.
* Deleting the row withdraws consent immediately — the cohort is
  recomputed from live rows on every query.
* The row stores nothing but the link + timestamp. No cached counts,
  no per-member statistics — aggregates are computed on demand and
  only their noised form ever leaves the query path.
"""

from __future__ import annotations

from datetime import datetime
from uuid import UUID

from sqlalchemy import Column, DateTime, ForeignKey, Index, PrimaryKeyConstraint
from sqlmodel import Field, SQLModel

__all__ = ["HubAggregateOptIn"]


class HubAggregateOptIn(SQLModel, table=True):
    __tablename__ = "hub_aggregate_optin"
    __table_args__ = (
        PrimaryKeyConstraint(
            "hub_id", "user_id",
            name="pk_hub_aggregate_optin",
        ),
        Index("ix_hub_aggregate_optin_user", "user_id"),
    )

    hub_id: UUID = Field(
        sa_column=Column(
            ForeignKey("hub.id", ondelete="CASCADE"),
            nullable=False,
        ),
    )
    user_id: UUID = Field(
        sa_column=Column(
            ForeignKey("user.id", ondelete="CASCADE"),
            nullable=False,
        ),
    )
    opted_in_at: datetime = Field(
        sa_column=Column(DateTime(timezone=True), nullable=False),
    )
