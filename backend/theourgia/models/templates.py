"""Entry templates — reusable scaffolds for journal entries.

A practitioner picks a template ("Banishing", "Tarot Reading",
"Liber Resh"), the editor pre-fills a structured outline matching
the template's `body_template` (a Tiptap-JSON document with prompt
placeholders), the practitioner fills it in, the resulting entry
carries the template's `kind` and the user's customizations.

Three scopes:

* `personal` — visible only to the owner.
* `vault_shared` — visible to all the vault's authorized users.
* `publishable` — exported and listed in the marketplace (Phase 14).

Templates are JSON-serializable (`body_template` is text-stored JSON)
so they're portable across instances.
"""

from __future__ import annotations

import enum
from typing import Optional
from uuid import UUID

from sqlalchemy import Column, ForeignKey, Index, String, Text
from sqlmodel import Enum as SQLEnum
from sqlmodel import Field

from theourgia.models.base import IDMixin, SoftDeleteMixin, TimestampMixin
from theourgia.models.entries import EntryType

__all__ = ["EntryTemplate", "TemplateScope"]


class TemplateScope(str, enum.Enum):
    """Who can use this template."""

    PERSONAL = "personal"
    VAULT_SHARED = "vault_shared"
    PUBLISHABLE = "publishable"


class EntryTemplate(IDMixin, TimestampMixin, SoftDeleteMixin, table=True):
    """A reusable scaffold for entries.

    The ``body_template`` is the Tiptap-JSON document the editor
    loads when the user picks this template. It can contain prompt
    placeholders ("What did you observe?") that the editor renders
    as ghosted text.

    Built-in templates ship with ``owner_id IS NULL`` and
    ``scope = publishable``; user templates set ``owner_id`` and
    typically scope to ``personal``.
    """

    __tablename__ = "entry_template"
    __table_args__ = (
        Index("ix_entry_template_owner_id", "owner_id"),
        Index("ix_entry_template_kind", "kind"),
        Index("ix_entry_template_scope", "scope"),
    )

    name: str = Field(
        sa_column=Column(String(128), nullable=False),
    )

    description: str = Field(
        sa_column=Column(String(1024), nullable=False, server_default=""),
    )

    kind: EntryType = Field(
        sa_column=Column(
            SQLEnum(
                EntryType,
                name="entry_type",
                values_callable=lambda obj: [m.value for m in obj],
                create_type=False,
            ),
            nullable=False,
        ),
        description="The EntryType this template produces.",
    )

    scope: TemplateScope = Field(
        default=TemplateScope.PERSONAL,
        sa_column=Column(
            SQLEnum(
                TemplateScope,
                name="template_scope",
                values_callable=lambda obj: [m.value for m in obj],
            ),
            nullable=False,
            server_default="personal",
        ),
    )

    body_template: str = Field(
        sa_column=Column(Text, nullable=False),
        description=(
            "Tiptap-JSON document the editor loads. Stored as text "
            "for portability across instances; the editor parses on "
            "read."
        ),
    )

    default_title_pattern: Optional[str] = Field(
        default=None,
        sa_column=Column(String(256), nullable=True),
        description=(
            "Pre-fill pattern for the entry title, e.g. "
            "``\"Banishing — {date}\"``. Substitutions supported by "
            "the editor."
        ),
    )

    default_glyph: str = Field(
        default="feather",
        sa_column=Column(String(64), nullable=False, server_default="feather"),
    )

    owner_id: Optional[UUID] = Field(
        default=None,
        sa_column=Column(
            ForeignKey("user.id", ondelete="SET NULL"),
            nullable=True,
            index=True,
        ),
        description=(
            "User who authored. NULL for built-in templates shipped "
            "with the application."
        ),
    )

    tradition: Optional[str] = Field(
        default=None,
        sa_column=Column(String(64), nullable=True),
        description=(
            "Free-form tradition tag (e.g. 'thelemic', 'hellenic', "
            "'wicca') for marketplace filtering."
        ),
    )

    license: Optional[str] = Field(
        default=None,
        sa_column=Column(String(64), nullable=True),
        description=(
            "SPDX identifier for publishable templates. NULL for "
            "personal / vault-shared scope."
        ),
    )
