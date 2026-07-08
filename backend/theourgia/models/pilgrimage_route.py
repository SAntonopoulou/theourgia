"""Pilgrimage route — ordered sequence of pilgrimage_sites.

b108-2gx · FEATURES §13 · "Pilgrimage routes — ordered sequences
with notes (e.g. 'Eleusis route')".

Model shape:
- ``PilgrimageRoute`` — owner-scoped named route with optional
  description; visibility mirrors the sites' visibility model.
- ``PilgrimageRouteStop`` — join row between a route and a site,
  with ``order_index`` (0-based) and optional per-stop notes.

Precision floor + sealed rules follow from the sites: a route
that includes a sealed site never renders that stop on the public
map. The route render loops over the stops and applies the same
gating pilgrimage_sites already applies per row.
"""

from __future__ import annotations

from typing import Optional
from uuid import UUID

from sqlalchemy import Column, ForeignKey, Index, Text, UniqueConstraint
from sqlmodel import Field

from theourgia.models.base import IDMixin, SoftDeleteMixin, TimestampMixin


__all__ = ["PilgrimageRoute", "PilgrimageRouteStop"]


class PilgrimageRoute(IDMixin, TimestampMixin, SoftDeleteMixin, table=True):
    __tablename__ = "pilgrimage_route"
    __table_args__ = (
        Index("ix_pilgrimage_route_owner", "owner_id"),
    )

    owner_id: UUID = Field(
        sa_column=Column(
            ForeignKey("user.id", ondelete="CASCADE"),
            nullable=False,
        ),
    )
    name: str = Field(max_length=240, nullable=False)
    description: Optional[str] = Field(default=None, sa_column=Column(Text))
    # Reuse the existing visibility semantics from Entry / Publication.
    # Value is a string enum matching entry.visibility values:
    #   personal · viewer · network · public
    # Never stored as an enum column because the route can be
    # re-used across visibility surfaces in the future (federated
    # exports, etc.) without a schema break.
    visibility: str = Field(
        default="personal", max_length=16, nullable=False
    )


class PilgrimageRouteStop(IDMixin, TimestampMixin, table=True):
    __tablename__ = "pilgrimage_route_stop"
    __table_args__ = (
        Index("ix_route_stop_route", "route_id", "order_index"),
        UniqueConstraint(
            "route_id", "order_index", name="uq_route_stop_order"
        ),
    )

    route_id: UUID = Field(
        sa_column=Column(
            ForeignKey("pilgrimage_route.id", ondelete="CASCADE"),
            nullable=False,
        ),
    )
    site_id: UUID = Field(
        sa_column=Column(
            ForeignKey("pilgrimage_site.id", ondelete="CASCADE"),
            nullable=False,
        ),
    )
    order_index: int = Field(nullable=False, default=0)
    notes: Optional[str] = Field(default=None, sa_column=Column(Text))
