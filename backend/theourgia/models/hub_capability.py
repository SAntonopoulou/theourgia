"""Hub capability matrix (B137).

Per ``plan/12-batches-backend.md`` § B137.

The eleven canonical capabilities a hub role can hold, plus the
``hub_role_capability`` join table that grants them. Built-in
roles ship with the H08-surface-12 default matrix; admins can
edit cells via PATCH ``/api/v1/hubs/{id}/roles``.

Wire-key impact: H08 surface 12 renders the role chip without
the ``hub_`` prefix. The Phase 01 ``MembershipRole`` enum stores
the prefixed form. The router strips at the API seam — see
``api/routers/v1/hubs.py``.
"""

from __future__ import annotations

import enum
from uuid import UUID

from sqlalchemy import Column, ForeignKey, Index, PrimaryKeyConstraint
from sqlmodel import Enum as SQLEnum
from sqlmodel import Field, SQLModel

from theourgia.models.identity import MembershipRole

__all__ = [
    "HubCapability",
    "HubRoleCapability",
    "DEFAULT_CAPABILITY_MATRIX",
    "HUB_ROLES",
]


class HubCapability(str, enum.Enum):
    """Eleven canonical capabilities a role can hold (H08 §S3 surface 12).

    Wire keys are STABLE — these names show up in the
    permission-denied banner verbatim and must never be renamed.
    """

    EDIT_HUB_CONTENT = "edit_hub_content"
    MODERATE_SUBMISSIONS = "moderate_submissions"
    MANAGE_MEMBERS = "manage_members"
    SEND_NEWSLETTERS = "send_newsletters"
    RUN_ANALYTICS_QUERIES = "run_analytics_queries"
    ACCEPT_FEDERATION_PEERS = "accept_federation_peers"
    EDIT_ROLE_DEFINITIONS = "edit_role_definitions"
    MANAGE_PERMISSION_MATRIX = "manage_permission_matrix"
    VIEW_AUDIT_LOG = "view_audit_log"
    SCHEDULE_GROUP_RITUALS = "schedule_group_rituals"
    APPROVE_CURATION_SUBMISSIONS = "approve_curation_submissions"


# Hub roles only — vault roles share the same enum but are NOT
# allowed in the matrix. Iteration helper.
HUB_ROLES: tuple[MembershipRole, ...] = (
    MembershipRole.HUB_ADMIN,
    MembershipRole.HUB_OFFICER,
    MembershipRole.HUB_MODERATOR,
    MembershipRole.HUB_MEMBER,
    MembershipRole.HUB_OBSERVER,
)


# Default capability matrix per the H08 surface 12 brief.
DEFAULT_CAPABILITY_MATRIX: dict[MembershipRole, frozenset[HubCapability]] = {
    MembershipRole.HUB_ADMIN: frozenset(HubCapability),
    MembershipRole.HUB_OFFICER: frozenset({
        HubCapability.EDIT_HUB_CONTENT,
        HubCapability.MODERATE_SUBMISSIONS,
        HubCapability.MANAGE_MEMBERS,
        HubCapability.SEND_NEWSLETTERS,
        HubCapability.RUN_ANALYTICS_QUERIES,
        HubCapability.ACCEPT_FEDERATION_PEERS,
        HubCapability.VIEW_AUDIT_LOG,
        HubCapability.SCHEDULE_GROUP_RITUALS,
        HubCapability.APPROVE_CURATION_SUBMISSIONS,
    }),
    MembershipRole.HUB_MODERATOR: frozenset({
        HubCapability.MODERATE_SUBMISSIONS,
        HubCapability.VIEW_AUDIT_LOG,
        HubCapability.SCHEDULE_GROUP_RITUALS,
        HubCapability.APPROVE_CURATION_SUBMISSIONS,
    }),
    MembershipRole.HUB_MEMBER: frozenset({
        HubCapability.SCHEDULE_GROUP_RITUALS,
    }),
    MembershipRole.HUB_OBSERVER: frozenset(),
}


class HubRoleCapability(SQLModel, table=True):
    """Per-(hub, role, capability) grant row.

    A row exists IFF the role in that hub holds the capability.
    Toggling a cell off in the H08 matrix surface deletes the
    row; toggling on inserts. The default seed (see
    ``DEFAULT_CAPABILITY_MATRIX``) is written at hub creation.
    """

    __tablename__ = "hub_role_capability"
    __table_args__ = (
        PrimaryKeyConstraint(
            "hub_id", "role", "capability",
            name="pk_hub_role_capability",
        ),
        Index("ix_hub_role_capability_hub", "hub_id"),
    )

    hub_id: UUID = Field(
        sa_column=Column(
            ForeignKey("hub.id", ondelete="CASCADE"),
            nullable=False,
        ),
    )
    role: MembershipRole = Field(
        sa_column=Column(
            SQLEnum(
                MembershipRole,
                name="membership_role",
                create_type=False,  # already exists from Phase 01
                values_callable=lambda obj: [m.value for m in obj],
            ),
            nullable=False,
        ),
    )
    capability: HubCapability = Field(
        sa_column=Column(
            SQLEnum(
                HubCapability,
                name="hub_capability",
                values_callable=lambda obj: [m.value for m in obj],
            ),
            nullable=False,
        ),
    )


# ─── API-seam helpers (strip-prefix at read / write) ────────────────

_BARE_TO_ROLE: dict[str, MembershipRole] = {
    "admin": MembershipRole.HUB_ADMIN,
    "officer": MembershipRole.HUB_OFFICER,
    "moderator": MembershipRole.HUB_MODERATOR,
    "member": MembershipRole.HUB_MEMBER,
    "observer": MembershipRole.HUB_OBSERVER,
}
_ROLE_TO_BARE: dict[MembershipRole, str] = {
    v: k for k, v in _BARE_TO_ROLE.items()
}


def bare_to_role(bare: str) -> MembershipRole:
    """Map ``"admin"`` → ``MembershipRole.HUB_ADMIN``. Raises
    KeyError on an unknown bare key."""
    return _BARE_TO_ROLE[bare]


def role_to_bare(role: MembershipRole) -> str:
    """Map ``MembershipRole.HUB_ADMIN`` → ``"admin"``. Raises
    KeyError if the role isn't a hub role."""
    return _ROLE_TO_BARE[role]
