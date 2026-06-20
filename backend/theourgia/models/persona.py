"""Persona model — multi-identity layer above User.

Every user has at least one Persona — the ``default`` one auto-created
at signup. Users who want separate practice contexts (public teaching
face vs. intimate working face) create additional Personas.

Personas are the federation-actor + sealed-key + social-face boundary.
Content tables that ship from Phase 02 onward reference ``owner_persona_id``
so future features write to the right ownership layer from the start.

The original Phase 01 ``Vault`` model continues to exist and continues
to reference User directly — it's the data-container layer beneath
Persona. A future migration may consolidate Vault into Persona; for
now they coexist, with Persona being the canonical ownership target
for new content tables.

See ``plan/persona-decision-2026-06-21.md`` for the full architectural
rationale.
"""

from __future__ import annotations

import enum
from typing import ClassVar, Optional
from uuid import UUID

from sqlalchemy import (
    Boolean,
    Column,
    ForeignKey,
    Index,
    String,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import CITEXT
from sqlmodel import Enum as SQLEnum
from sqlmodel import Field

from theourgia.models.base import IDMixin, TimestampMixin

__all__ = ["Persona", "PersonaKind"]


class PersonaKind(str, enum.Enum):
    """The persona's role within its user's account.

    - ``DEFAULT`` — the auto-created persona every user has. Exactly
      one per user (partial unique index in migration). Cannot be
      deleted; users who want to "delete their main identity" delete
      their entire account.
    - ``SECONDARY`` — additional personas a user has opted into.
      Freely creatable and deletable.
    """

    DEFAULT = "default"
    SECONDARY = "secondary"


class Persona(IDMixin, TimestampMixin, table=True):
    """A user's social / content / federation identity.

    A single user (auth principal) may have multiple Personas. Each
    Persona is a separate federation actor, owns its own content, and
    derives its own sealed-encryption keys. Users switch personas
    within their session without re-authenticating.

    See the decision doc for the full design rationale and migration
    path for content tables.
    """

    __tablename__ = "persona"
    __table_args__ = (
        UniqueConstraint("handle", name="uq_persona_handle"),
        Index("ix_persona_user_id", "user_id"),
        Index("ix_persona_user_kind", "user_id", "kind"),
    )

    # The auth principal this persona belongs to.
    user_id: UUID = Field(
        sa_column=Column(
            ForeignKey("user.id", ondelete="CASCADE"),
            nullable=False,
        ),
    )

    kind: PersonaKind = Field(
        sa_column=Column(
            SQLEnum(PersonaKind, name="persona_kind"),
            nullable=False,
        ),
        description="default (auto-created, one per user) or secondary",
    )

    handle: str = Field(
        sa_column=Column(CITEXT(), nullable=False),
        description=(
            "Instance-wide unique identifier used in federation actor "
            "URIs (e.g. 'soror_eua'). Case-insensitive."
        ),
    )

    display_name: str = Field(
        sa_column=Column(String(255), nullable=False),
        description="Name shown in UI and on the persona's public face.",
    )

    bio: str = Field(
        default="",
        sa_column=Column(String(2000), nullable=False, server_default=""),
    )

    is_active: bool = Field(
        default=True,
        sa_column=Column(Boolean, nullable=False, server_default="true"),
        description=(
            "Soft-deactivation flag. Inactive personas can't sign in / "
            "act / receive federation events; their content remains "
            "for archival. Distinct from delete (which removes the row)."
        ),
    )

    avatar_upload_id: Optional[UUID] = Field(
        default=None,
        sa_column=Column(
            ForeignKey("upload.id", ondelete="SET NULL"),
            nullable=True,
        ),
        description="Optional avatar image (an entry in the upload table).",
    )

    # Public-face configuration. Default: not publicly accessible —
    # the persona is private until the user opts into a public face.
    public_face_enabled: bool = Field(
        default=False,
        sa_column=Column(Boolean, nullable=False, server_default="false"),
    )
