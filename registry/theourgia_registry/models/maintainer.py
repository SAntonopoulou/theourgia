"""Registry maintainers (multi-maintainer from day 1, per H10 decision).

A maintainer is a registered author who has been granted review
privileges. The first maintainer is the ``bootstrap_maintainer_did``
from RegistrySettings — they create the initial Maintainer row at
first boot. After bootstrap, additional maintainers are appointed by
existing maintainers through ``POST /api/v1/maintainers``.

Rule 41: authors cannot promote themselves to maintainer. The check
gates every maintainer-only endpoint.
"""

from __future__ import annotations

import enum
from datetime import datetime
from uuid import UUID

from sqlalchemy import Column, DateTime, ForeignKey, UniqueConstraint
from sqlmodel import Enum as SQLEnum
from sqlmodel import Field

from theourgia_registry.models.base import IDMixin, TimestampMixin


class MaintainerRole(str, enum.Enum):
    """Role a maintainer holds.

    - ``LEAD`` — full powers, can appoint and revoke other maintainers.
    - ``REVIEWER`` — full review powers + tier-promotion + advisories,
      but cannot appoint or revoke other maintainers.

    Both roles can review every submission. The distinction is purely
    around maintainer-roster governance.
    """

    LEAD = "lead"
    REVIEWER = "reviewer"


class Maintainer(IDMixin, TimestampMixin, table=True):
    __tablename__ = "maintainer"
    __table_args__ = (
        UniqueConstraint("author_id", name="uq_maintainer_author"),
    )

    author_id: UUID = Field(
        sa_column=Column(
            ForeignKey("author.id", ondelete="CASCADE"), nullable=False,
        ),
    )
    role: MaintainerRole = Field(
        sa_column=Column(
            SQLEnum(
                MaintainerRole,
                name="maintainer_role",
                values_callable=lambda obj: [m.value for m in obj],
            ),
            nullable=False,
        ),
    )
    appointed_at: datetime = Field(
        sa_column=Column(DateTime(timezone=True), nullable=False),
    )
    appointed_by_author_id: UUID | None = Field(
        default=None,
        sa_column=Column(
            ForeignKey("author.id", ondelete="SET NULL"),
            nullable=True,
        ),
        description="The maintainer who appointed this one. NULL for the bootstrap maintainer.",
    )
    revoked_at: datetime | None = Field(
        default=None,
        sa_column=Column(DateTime(timezone=True), nullable=True),
        description="If set, this maintainer is no longer active. Past reviews remain attributed.",
    )
