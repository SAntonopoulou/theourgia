"""Identity and access models.

Tables in this module:

- ``user`` — credentials and 2FA configuration
- ``session`` — active login sessions with device metadata
- ``vault`` — a magician's personal namespace (one user can own multiple)
- ``hub`` — a network / group / sodality / order shared namespace
- ``membership`` — links users to vaults (owner / collaborator) and to
  hubs (admin / officer / member / observer)
- ``private_viewer`` — magician-issued credentials for trusted readers

The visibility model (``personal`` / ``viewer`` / ``network`` / ``public`` /
``sealed``) lives on content tables, not here. Identity tables only
describe *who* and *what they belong to*.

Row-Level Security policies are declared in the Alembic migration that
creates these tables, not at the SQLModel level. The application layer
enforces additional checks; RLS is defense-in-depth.
"""

from __future__ import annotations

import enum
from datetime import datetime
from typing import TYPE_CHECKING, Optional
from uuid import UUID

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    Column,
    DateTime,
    ForeignKey,
    Index,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import CITEXT, JSONB
from sqlmodel import Enum as SQLEnum
from sqlmodel import Field, SQLModel

from theourgia.models.base import IDMixin, TimestampMixin

if TYPE_CHECKING:
    pass

__all__ = [
    "User",
    "Session",
    "Vault",
    "Hub",
    "HubMembershipPolicy",
    "Membership",
    "MembershipRole",
    "PrivateViewer",
]


class HubMembershipPolicy(str, enum.Enum):
    """How members join a hub (H08 surface 3 + 5).

    ``PUBLIC`` — anyone can join immediately, no approval step.
    ``OWA``    — open-with-approval; anyone can request, an officer approves.
    ``PRIVATE`` — invite-only. **The default.**
    """

    PUBLIC = "public"
    OWA = "open_with_approval"
    PRIVATE = "private"


# ─────────────────────────────────────────────────────────────────────────────
# Enums (stored as PostgreSQL native enums via SQLEnum)
# ─────────────────────────────────────────────────────────────────────────────


class MembershipRole(str, enum.Enum):
    """Role of a membership row.

    Vault memberships use ``vault_owner`` / ``vault_collaborator`` /
    ``vault_viewer``; hub memberships use ``hub_admin`` / ``hub_officer`` /
    ``hub_moderator`` / ``hub_member`` / ``hub_observer``.

    The constraint that a membership row's role matches its target type
    (vault vs. hub) is enforced by a CHECK constraint in the migration.
    """

    # Vault roles
    VAULT_OWNER = "vault_owner"
    VAULT_COLLABORATOR = "vault_collaborator"
    VAULT_VIEWER = "vault_viewer"

    # Hub roles
    HUB_ADMIN = "hub_admin"
    HUB_OFFICER = "hub_officer"
    HUB_MODERATOR = "hub_moderator"
    HUB_MEMBER = "hub_member"
    HUB_OBSERVER = "hub_observer"


# ─────────────────────────────────────────────────────────────────────────────
# Tables
# ─────────────────────────────────────────────────────────────────────────────


class User(IDMixin, TimestampMixin, table=True):
    """A platform account.

    The ``User`` is the authenticatable principal: one human (typically)
    with one account. A user owns 0+ vaults and is a member of 0+ hubs.

    Authentication state (password hash, TOTP secret, WebAuthn credentials)
    lives on the user. The :class:`Session` table tracks active logins.
    """

    __tablename__ = "user"
    __table_args__ = (
        Index("ix_user_email_active", "email", unique=True),
    )

    # Email is the canonical identifier; case-insensitive via CITEXT
    email: str = Field(
        sa_column=Column(CITEXT(), nullable=False),
        description="User's primary email address (case-insensitive)",
    )

    # Argon2id password hash. Format: '$argon2id$v=19$m=...,t=...,p=...$salt$hash'
    # NULL is allowed for users authenticated only via WebAuthn / SSO.
    password_hash: Optional[str] = Field(
        default=None,
        sa_column=Column(String(255), nullable=True),
        description="Argon2id hash; null if user authenticates via WebAuthn only",
    )

    # TOTP shared secret (base32-encoded); null until user enrolls 2FA
    totp_secret: Optional[str] = Field(
        default=None,
        sa_column=Column(String(64), nullable=True),
    )

    # Email verification state
    email_verified_at: Optional[datetime] = Field(
        default=None,
        sa_column=Column(DateTime(timezone=True), nullable=True),
    )

    # Account lockout (set when too many failed login attempts)
    locked_until: Optional[datetime] = Field(
        default=None,
        sa_column=Column(DateTime(timezone=True), nullable=True),
    )
    failed_login_count: int = Field(default=0, nullable=False)


class Session(IDMixin, TimestampMixin, table=True):
    """An active authenticated session.

    Sessions are opaque tokens stored hashed (SHA-256 of the token bytes)
    in this table. The plaintext token only ever exists in the user's
    browser (cookie) and the response that issued it.

    The ``revoked_at`` column allows logout-everywhere and per-device
    revocation; ``expires_at`` provides natural expiry.

    Multi-persona model: each session carries an ``active_persona_id``
    naming which of the user's personas is currently acting. The
    session's user_id is the auth principal (who logged in); the
    active_persona_id is which of that user's personas is in effect
    for the next request. Persona switching updates this column
    rather than issuing a new session token.
    """

    __tablename__ = "session"

    user_id: UUID = Field(
        sa_column=Column(ForeignKey("user.id", ondelete="CASCADE"), nullable=False, index=True),
    )

    active_persona_id: Optional[UUID] = Field(
        default=None,
        sa_column=Column(
            ForeignKey("persona.id", ondelete="SET NULL"),
            nullable=True,
            index=True,
        ),
        description=(
            "Which of the user's personas is currently acting. NULL "
            "for legacy sessions created before personas existed and "
            "for sessions in the brief moment between user creation "
            "and default-persona creation."
        ),
    )

    token_hash: bytes = Field(
        sa_column=Column(String(64), unique=True, nullable=False),  # hex-encoded SHA-256
        description="SHA-256 of the opaque session token, hex-encoded",
    )

    # Device fingerprint metadata (user-visible in 'active sessions' UI)
    user_agent: str = Field(default="", sa_column=Column(String(512), nullable=False))
    ip_address: Optional[str] = Field(
        default=None, sa_column=Column(String(45), nullable=True)
    )  # IPv6 max 45 chars

    expires_at: datetime = Field(sa_column=Column(DateTime(timezone=True), nullable=False))
    last_used_at: datetime = Field(sa_column=Column(DateTime(timezone=True), nullable=False))
    revoked_at: Optional[datetime] = Field(
        default=None,
        sa_column=Column(DateTime(timezone=True), nullable=True, index=True),
    )


class Vault(IDMixin, TimestampMixin, table=True):
    """A magician's personal namespace.

    The unit of personal data isolation. One user can own multiple vaults
    (e.g., different magickal personas, distinct practice contexts). All
    content tables carry a ``vault_id`` column and Row-Level Security
    restricts access to the owner and authorized viewers.
    """

    __tablename__ = "vault"
    __table_args__ = (
        UniqueConstraint("slug", name="uq_vault_slug"),
    )

    owner_id: UUID = Field(
        sa_column=Column(ForeignKey("user.id", ondelete="RESTRICT"), nullable=False, index=True),
    )

    # URL-safe identifier (e.g., 'sophia-magickal-record')
    slug: str = Field(sa_column=Column(String(64), nullable=False))

    # Display name; magickal name; what the world sees
    display_name: str = Field(sa_column=Column(String(255), nullable=False))

    # Short description / bio; shown on public face if vault has one
    description: str = Field(default="", sa_column=Column(String(2000), nullable=False))

    # Public-face configuration (filled in Phase 10)
    public_face_enabled: bool = Field(default=False, nullable=False)


class Hub(IDMixin, TimestampMixin, table=True):
    """A group / order / coven / sodality shared namespace.

    Hubs aggregate content from member vaults and have their own
    public face. The hub's federation identity is derived from its
    ``slug`` and the instance host. The Phase 01 sparse shape was
    extended in B137 (H08 surface set) — additions are nullable +
    default-backfill, so existing rows survive the migration.
    """

    __tablename__ = "hub"
    __table_args__ = (
        UniqueConstraint("slug", name="uq_hub_slug"),
        Index("ix_hub_owner", "owner_id"),
        Index("ix_hub_deleted_at", "deleted_at"),
    )

    slug: str = Field(sa_column=Column(String(64), nullable=False))
    display_name: str = Field(sa_column=Column(String(255), nullable=False))
    description: str = Field(
        default="", sa_column=Column(String(2000), nullable=False)
    )

    # Tradition tags (free-form labels for discovery)
    # Stored as a comma-separated string for simplicity at this stage;
    # later phases may move to a junction table if querying needs grow.
    tradition_tags: str = Field(
        default="", sa_column=Column(String(500), nullable=False)
    )

    # ── B137 (Phase 12) extensions ──────────────────────────────────
    # H08 surface set: tagline + policy + owner + curation flags +
    # public-face configuration. Nullable + default-backfilled so
    # the migration is non-destructive on existing rows.

    tagline: Optional[str] = Field(
        default=None, sa_column=Column(String(420), nullable=True),
    )

    owner_id: Optional[UUID] = Field(
        default=None,
        sa_column=Column(
            ForeignKey("user.id", ondelete="CASCADE"),
            nullable=True,
        ),
    )

    membership_policy: HubMembershipPolicy = Field(
        default=HubMembershipPolicy.PRIVATE,
        sa_column=Column(
            SQLEnum(
                HubMembershipPolicy,
                name="hub_membership_policy",
                values_callable=lambda obj: [m.value for m in obj],
            ),
            nullable=False,
            server_default=HubMembershipPolicy.PRIVATE.value,
        ),
    )

    accepts_sso: bool = Field(
        default=False,
        sa_column=Column(
            Boolean(), nullable=False, server_default="false",
        ),
    )

    auto_curates: bool = Field(
        default=False,
        sa_column=Column(
            Boolean(), nullable=False, server_default="false",
        ),
    )

    public_banner_url: Optional[str] = Field(
        default=None,
        sa_column=Column(String(2048), nullable=True),
    )

    public_tradition_tags: list[str] = Field(
        default_factory=list,
        sa_column=Column(
            JSONB(), nullable=False, server_default="[]",
        ),
    )

    deleted_at: Optional[datetime] = Field(
        default=None,
        sa_column=Column(DateTime(timezone=True), nullable=True),
    )


class Membership(IDMixin, TimestampMixin, table=True):
    """Links a user to a vault or a hub with a role.

    Exactly one of ``vault_id`` or ``hub_id`` is set per row; a CHECK
    constraint enforces this. The ``role`` value must match the target
    type (vault roles for vault links, hub roles for hub links) — also
    enforced by CHECK constraint in the migration.
    """

    __tablename__ = "membership"
    __table_args__ = (
        CheckConstraint(
            "(vault_id IS NOT NULL)::int + (hub_id IS NOT NULL)::int = 1",
            name="ck_membership_one_target",
        ),
        UniqueConstraint("user_id", "vault_id", name="uq_membership_user_vault"),
        UniqueConstraint("user_id", "hub_id", name="uq_membership_user_hub"),
    )

    user_id: UUID = Field(
        sa_column=Column(ForeignKey("user.id", ondelete="CASCADE"), nullable=False, index=True),
    )
    vault_id: Optional[UUID] = Field(
        default=None,
        sa_column=Column(ForeignKey("vault.id", ondelete="CASCADE"), nullable=True, index=True),
    )
    hub_id: Optional[UUID] = Field(
        default=None,
        sa_column=Column(ForeignKey("hub.id", ondelete="CASCADE"), nullable=True, index=True),
    )

    role: MembershipRole = Field(
        sa_column=Column(
            SQLEnum(MembershipRole, name="membership_role"),
            nullable=False,
        ),
    )


class PrivateViewer(IDMixin, TimestampMixin, table=True):
    """A magician-issued credential for a trusted reader.

    A vault owner mints a ``PrivateViewer`` to share a scoped subset of
    their journal with a specific person — a student, partner, working
    group member. The scope (which entries / tags / kinds the viewer can
    see) lives in the ``scope`` JSONB column on content tables; this row
    declares the identity and the binding to the vault.

    Authentication for private viewers happens via emailed magic links
    plus an optional password the viewer sets. Their session is recorded
    in :class:`Session` like any other user, but distinguished by
    ``is_private_viewer = True`` on the user row.
    """

    __tablename__ = "private_viewer"
    __table_args__ = (
        UniqueConstraint("vault_id", "user_id", name="uq_private_viewer_vault_user"),
    )

    vault_id: UUID = Field(
        sa_column=Column(ForeignKey("vault.id", ondelete="CASCADE"), nullable=False, index=True),
    )

    user_id: UUID = Field(
        sa_column=Column(ForeignKey("user.id", ondelete="CASCADE"), nullable=False, index=True),
    )

    # Free-form display name shown to the vault owner (e.g., "my student Iris")
    display_name: str = Field(default="", sa_column=Column(String(255), nullable=False))

    # When the vault owner revokes access. After revocation, the row is
    # retained for audit but the viewer can no longer read.
    revoked_at: Optional[datetime] = Field(
        default=None,
        sa_column=Column(DateTime(timezone=True), nullable=True),
    )
