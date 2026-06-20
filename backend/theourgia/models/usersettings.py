"""Per-user settings persistence.

One row per (user, key) pair. The substrate's
:class:`UserSettingsStore` Protocol abstracts over this row layout;
production code wires a DB-backed store that translates Protocol
calls to selects / upserts / deletes on this table.

The row schema is intentionally small: user_id + key + value_json.
Value validation happens at the service layer against the registry.
The database doesn't enforce types — moving validation to the model
would constrain schema evolution and bypass the alias-fallback path.

RLS: owner-RW only. Each user reads and writes their own settings.
"""

from __future__ import annotations

from typing import Optional
from uuid import UUID

from sqlalchemy import (
    Column,
    ForeignKey,
    String,
    Text,
    UniqueConstraint,
)
from sqlmodel import Field

from theourgia.models.base import IDMixin, TimestampMixin

__all__ = ["UserSetting"]


class UserSetting(IDMixin, TimestampMixin, table=True):
    """One user's value for one settings key."""

    __tablename__ = "user_setting"
    __table_args__ = (
        UniqueConstraint(
            "user_id", "key", name="uq_user_setting_user_key"
        ),
    )

    user_id: UUID = Field(
        sa_column=Column(
            ForeignKey("user.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
    )

    key: str = Field(
        sa_column=Column(String(128), nullable=False),
        description="Dotted identifier matching a registered SettingDefinition.",
    )

    value_json: str = Field(
        sa_column=Column(Text, nullable=False),
        description=(
            "JSON-encoded value. The service layer validates against "
            "the registry; the DB just stores text."
        ),
    )

    schema_version: int = Field(
        default=1,
        description=(
            "Bumped if we ever need to migrate stored values for a key "
            "(e.g. enum-rename, type change). Currently 1 for all rows."
        ),
    )

    source: Optional[str] = Field(
        default=None,
        sa_column=Column(String(32), nullable=True),
        description=(
            "Where the value came from: 'user' (explicit edit), "
            "'import' (settings restore), 'migration' (substrate "
            "upgrade). Null = legacy/unspecified."
        ),
    )
