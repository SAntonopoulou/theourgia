"""Maintainer-side endpoints — review queue + decisions + tier promotion +
maintainer roster.

Multi-maintainer from day 1: POST /maintainers lets a LEAD appoint
others; DELETE /maintainers/{author_id} sets `revoked_at` (never
deletes — past reviews remain attributed).

Rule 41: authors can't promote themselves to maintainer (the LEAD-
gated POST /maintainers is the only path).
Rule 44: maintainer review shows the diff between submissions; this
module doesn't compute the diff itself — the decision endpoint stores
the reviewer's note + the lifecycle transition.
"""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from theourgia_registry.api.deps import (
    CurrentLead,
    CurrentMaintainer,
    get_db_session,
)
from theourgia_registry.models.author import Author
from theourgia_registry.models.maintainer import (
    Maintainer,
    MaintainerRole,
)
from theourgia_registry.models.plugin import (
    Plugin,
    PluginTier,
    PluginVersion,
    ReviewNote,
    TierPromotion,
    VersionStatus,
)


__all__ = ["router"]


router = APIRouter()


# ── schemas ──────────────────────────────────────────────────────────


class QueueItem(BaseModel):
    model_config = ConfigDict(extra="forbid")

    submission_id: str
    plugin_id: str
    plugin_name: str
    author_did: str
    version: str
    license_spdx: str
    status: str
    submitted_at: str
    capabilities: list[str]


class QueueResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    queue: list[QueueItem]


class DecisionBody(BaseModel):
    model_config = ConfigDict(extra="forbid")

    decision: str = Field(
        pattern=r"^(accept_community|accept_official|reject|changes_requested)$",
    )
    note: str = Field(min_length=1, max_length=8000)


class DecisionRead(BaseModel):
    model_config = ConfigDict(extra="forbid")

    submission_id: str
    status: str
    decided_at: str
    decided_by_maintainer_id: str


class TierPromotionBody(BaseModel):
    model_config = ConfigDict(extra="forbid")

    to_tier: str = Field(pattern=r"^(official|community|unverified)$")
    justification: str = Field(min_length=1, max_length=4000)


class TierPromotionRead(BaseModel):
    model_config = ConfigDict(extra="forbid")

    plugin_id: str
    from_tier: str
    to_tier: str
    justification: str
    promoted_at: str


class AppointMaintainerBody(BaseModel):
    model_config = ConfigDict(extra="forbid")

    author_did: str
    role: str = Field(pattern=r"^(lead|reviewer)$")


class MaintainerRead(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str
    author_did: str
    role: str
    appointed_at: str
    revoked: bool


# ── helpers ──────────────────────────────────────────────────────────


_QUEUE_STATUSES = (VersionStatus.PENDING_REVIEW, VersionStatus.UNDER_REVIEW)


_DECISION_TO_STATUS: dict[str, VersionStatus] = {
    "accept_community": VersionStatus.ACCEPTED_COMMUNITY,
    "accept_official": VersionStatus.ACCEPTED_OFFICIAL,
    "reject": VersionStatus.REJECTED,
    "changes_requested": VersionStatus.CHANGES_REQUESTED,
}


# ── endpoints ────────────────────────────────────────────────────────


@router.get(
    "/maintainer/queue",
    response_model=QueueResponse,
)
async def get_queue(
    maintainer: CurrentMaintainer,  # noqa: ARG001
    db: Annotated[AsyncSession, Depends(get_db_session)],
) -> QueueResponse:
    """Pending and under-review submissions, oldest first (FIFO).

    Rule 49 — no popularity rank; rule 9 — no count-of-installs across
    submissions. The queue is purely the lifecycle list."""
    rows = (
        await db.execute(
            select(Plugin, PluginVersion, Author)
            .join(PluginVersion, PluginVersion.plugin_id == Plugin.id)
            .join(Author, Author.id == Plugin.author_id)
            .where(PluginVersion.status.in_(_QUEUE_STATUSES))
            .order_by(PluginVersion.created_at.asc()),
        )
    ).all()
    items = [
        QueueItem(
            submission_id=str(version.id),
            plugin_id=str(plugin.id),
            plugin_name=plugin.name,
            author_did=author.did,
            version=version.version,
            license_spdx=version.license_spdx,
            status=version.status.value,
            submitted_at=version.created_at.isoformat(),
            capabilities=list(version.capabilities),
        )
        for plugin, version, author in rows
    ]
    return QueueResponse(queue=items)


@router.post(
    "/maintainer/submissions/{submission_id}/take",
    response_model=DecisionRead,
)
async def take_submission(
    submission_id: UUID,
    maintainer: CurrentMaintainer,
    db: Annotated[AsyncSession, Depends(get_db_session)],
) -> DecisionRead:
    """Transition a submission from pending_review to under_review.

    Marks this maintainer as the assignee. The submission is still
    pending a decision; this is FIFO claim mechanics — once claimed,
    other maintainers see it as `under_review` so they don't double-work.

    Idempotent: re-taking an already-under-review submission is a noop
    if YOU claimed it, 409 if someone else has."""
    version = (
        await db.execute(
            select(PluginVersion).where(PluginVersion.id == submission_id),
        )
    ).scalar_one_or_none()
    if version is None:
        raise HTTPException(status_code=404, detail="submission not found")

    if version.status == VersionStatus.UNDER_REVIEW:
        if version.decided_by_maintainer_id != maintainer.id:
            raise HTTPException(
                status_code=409,
                detail="this submission is already claimed by another maintainer",
            )
    elif version.status != VersionStatus.PENDING_REVIEW:
        raise HTTPException(
            status_code=409,
            detail=f"submission is in terminal state {version.status.value}",
        )

    version.status = VersionStatus.UNDER_REVIEW
    version.decided_by_maintainer_id = maintainer.id
    await db.commit()
    await db.refresh(version)

    return DecisionRead(
        submission_id=str(version.id),
        status=version.status.value,
        decided_at=(version.decided_at or datetime.now(tz=UTC)).isoformat(),
        decided_by_maintainer_id=str(maintainer.id),
    )


@router.post(
    "/maintainer/submissions/{submission_id}/decide",
    response_model=DecisionRead,
)
async def decide_submission(
    submission_id: UUID,
    body: DecisionBody,
    maintainer: CurrentMaintainer,
    db: Annotated[AsyncSession, Depends(get_db_session)],
) -> DecisionRead:
    """Issue a final or interim decision on a submission.

    Rule 44 — every decision MUST carry a non-empty reviewer note. The
    note is stored verbatim (no auto-formatting) and rendered on the
    author's A4 submission detail page.

    The decision vocabulary is fixed: accept_community / accept_official
    / reject / changes_requested. accept_official additionally promotes
    the Plugin's tier to OFFICIAL (via the same transaction).

    Terminal statuses (rejected, accepted_*) cannot be re-decided — the
    submission lifecycle is single-shot per submission. To revisit, the
    author submits a new version."""
    version = (
        await db.execute(
            select(PluginVersion).where(PluginVersion.id == submission_id),
        )
    ).scalar_one_or_none()
    if version is None:
        raise HTTPException(status_code=404, detail="submission not found")

    if version.status not in _QUEUE_STATUSES:
        raise HTTPException(
            status_code=409,
            detail=f"submission is in terminal state {version.status.value}",
        )

    plugin = (
        await db.execute(
            select(Plugin).where(Plugin.id == version.plugin_id),
        )
    ).scalar_one()

    new_status = _DECISION_TO_STATUS[body.decision]
    version.status = new_status
    version.decided_by_maintainer_id = maintainer.id
    version.decided_at = datetime.now(tz=UTC)

    note = ReviewNote(
        plugin_version_id=version.id,
        maintainer_id=maintainer.id,
        body=body.note,
    )
    db.add(note)

    if new_status == VersionStatus.ACCEPTED_OFFICIAL:
        plugin.tier = PluginTier.OFFICIAL
    elif new_status == VersionStatus.ACCEPTED_COMMUNITY:
        if plugin.tier == PluginTier.UNVERIFIED:
            plugin.tier = PluginTier.COMMUNITY

    await db.commit()
    await db.refresh(version)

    return DecisionRead(
        submission_id=str(version.id),
        status=version.status.value,
        decided_at=version.decided_at.isoformat(),
        decided_by_maintainer_id=str(maintainer.id),
    )


@router.post(
    "/maintainer/plugins/{plugin_id}/promote",
    response_model=TierPromotionRead,
)
async def promote_plugin(
    plugin_id: UUID,
    body: TierPromotionBody,
    maintainer: CurrentMaintainer,
    db: Annotated[AsyncSession, Depends(get_db_session)],
) -> TierPromotionRead:
    """Promote (or demote) a Plugin's tier — backs surface A7.

    Each promotion writes a TierPromotion row carrying the from/to tier
    + justification. The justification is the public-facing rationale
    that renders on the plugin's registry detail page (rule 29 — no
    invisible state changes; tier changes are audit-visible)."""
    plugin = (
        await db.execute(select(Plugin).where(Plugin.id == plugin_id))
    ).scalar_one_or_none()
    if plugin is None:
        raise HTTPException(status_code=404, detail="plugin not found")

    to_tier = PluginTier(body.to_tier)
    if to_tier == plugin.tier:
        raise HTTPException(
            status_code=409,
            detail=f"plugin already at tier {plugin.tier.value}",
        )

    from_tier = plugin.tier
    plugin.tier = to_tier
    promotion = TierPromotion(
        plugin_id=plugin.id,
        promoted_by_maintainer_id=maintainer.id,
        from_tier=from_tier,
        to_tier=to_tier,
        justification=body.justification,
    )
    db.add(promotion)
    await db.commit()
    await db.refresh(promotion)

    return TierPromotionRead(
        plugin_id=str(plugin.id),
        from_tier=from_tier.value,
        to_tier=to_tier.value,
        justification=promotion.justification,
        promoted_at=promotion.created_at.isoformat(),
    )


@router.post(
    "/maintainer/maintainers",
    response_model=MaintainerRead,
    status_code=status.HTTP_201_CREATED,
)
async def appoint_maintainer(
    body: AppointMaintainerBody,
    lead: CurrentLead,
    db: Annotated[AsyncSession, Depends(get_db_session)],
) -> MaintainerRead:
    """LEAD appoints another author as a maintainer.

    Rule 41 — self-appointment is the gated path the LEAD owns; an
    author cannot promote themselves. The LEAD CAN appoint themselves
    a co-LEAD (multi-LEAD is supported)."""
    candidate = (
        await db.execute(
            select(Author).where(Author.did == body.author_did),
        )
    ).scalar_one_or_none()
    if candidate is None:
        raise HTTPException(status_code=404, detail="author DID not registered")

    existing = (
        await db.execute(
            select(Maintainer).where(Maintainer.author_id == candidate.id),
        )
    ).scalar_one_or_none()
    if existing is not None and existing.revoked_at is None:
        raise HTTPException(
            status_code=409, detail="this author is already an active maintainer",
        )

    if existing is not None:
        existing.revoked_at = None
        existing.role = MaintainerRole(body.role)
        existing.appointed_at = datetime.now(tz=UTC)
        existing.appointed_by_author_id = lead.author_id
        await db.commit()
        await db.refresh(existing)
        new = existing
    else:
        new = Maintainer(
            author_id=candidate.id,
            role=MaintainerRole(body.role),
            appointed_at=datetime.now(tz=UTC),
            appointed_by_author_id=lead.author_id,
        )
        db.add(new)
        await db.commit()
        await db.refresh(new)

    return MaintainerRead(
        id=str(new.id),
        author_did=candidate.did,
        role=new.role.value,
        appointed_at=new.appointed_at.isoformat(),
        revoked=new.revoked_at is not None,
    )
