"""Instance-settings persistence.

One row per key. No user_id — settings here are instance-wide
operator toggles. RLS: admin-only write; read policy is enforced at
the service layer via the ``public`` flag on each definition.
"""

from __future__ import annotations

from typing import Optional
from uuid import UUID

from sqlalchemy import Column, ForeignKey, String, Text
from sqlmodel import Field

from theourgia.models.base import IDMixin, TimestampMixin

__all__ = ["InstanceSetting"]


class InstanceSetting(IDMixin, TimestampMixin, table=True):
    """One operator-supplied value for one instance settings key."""

    __tablename__ = "instance_setting"

    key: str = Field(
        sa_column=Column(String(128), nullable=False, unique=True),
        description="Dotted identifier matching a registered InstanceSettingDefinition.",
    )

    value_json: str = Field(
        sa_column=Column(Text, nullable=False),
        description=(
            "JSON-encoded value. The service layer validates against "
            "the registry."
        ),
    )

    schema_version: int = Field(
        default=1,
        description="Bumped if values for a key ever need migration.",
    )

    last_changed_by_user_id: Optional[UUID] = Field(
        default=None,
        sa_column=Column(
            ForeignKey("user.id", ondelete="SET NULL"),
            nullable=True,
        ),
        description=(
            "Admin who last wrote this row. Recorded for audit; "
            "null for values set via the operator CLI / migrations."
        ),
    )
