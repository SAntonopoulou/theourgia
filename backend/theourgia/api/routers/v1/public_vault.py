"""Per-vault public page endpoint (B130).

Per ``plan/10-batches-backend.md`` § B130.

``GET /api/v1/vaults/{vault_id}/public`` returns the public-facing
payload the H07 Per-Vault Public Page surface consumes.
"""

from __future__ import annotations

from datetime import datetime
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, ConfigDict
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from theourgia.api.deps import get_db_session
from theourgia.models.newsletter_issue import (
    NewsletterIssue,
    NewsletterIssueStatus,
)
from theourgia.models.publications import (
    Publication,
    PublicationState,
)
from theourgia.models.subscription_tier import SubscriptionTier

__all__ = ["router"]

router = APIRouter()


# ── Schemas ────────────────────────────────────────────────────


class PublicVaultPublication(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str
    slug: str
    title: str
    summary: str | None
    cover_url: str | None
    kind: str
    pricing_model: str
    one_time_amount_cents: int | None
    currency: str
    published_at: datetime | None
    license: str


class PublicVaultTier(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str
    name: str
    description: str | None
    monthly_amount_cents: int
    currency: str
    is_primary: bool


class PublicVaultNewsletter(BaseModel):
    model_config = ConfigDict(extra="forbid")

    most_recent_subject: str | None
    most_recent_sent_at: datetime | None


class PublicVaultResponse(BaseModel):
    """The H07 Public Vault Page surface reads this 1:1."""

    model_config = ConfigDict(extra="forbid")

    vault_id: str
    # Caller's vault metadata. Stub strings until the user-profile
    # schema lands; the surface displays whatever's here.
    display_name: str
    pronouns: str | None
    bio: str | None
    license_label: str
    popular_sort_opt_in: bool

    publications: list[PublicVaultPublication]
    newsletter: PublicVaultNewsletter
    tiers: list[PublicVaultTier]


# ── Helpers ────────────────────────────────────────────────────


def _to_pub(pub: Publication) -> PublicVaultPublication:
    return PublicVaultPublication(
        id=str(pub.id),
        slug=pub.slug,
        title=pub.title,
        summary=pub.summary,
        cover_url=pub.cover_url,
        kind=pub.kind.value,
        pricing_model=pub.pricing_model,
        one_time_amount_cents=pub.one_time_amount_cents,
        currency=pub.currency,
        published_at=pub.published_at,
        license=pub.license.value,
    )


def _to_tier(tier: SubscriptionTier) -> PublicVaultTier:
    return PublicVaultTier(
        id=str(tier.id),
        name=tier.name,
        description=tier.description,
        monthly_amount_cents=tier.monthly_amount_cents,
        currency=tier.currency,
        is_primary=tier.is_primary,
    )


# ── Route ──────────────────────────────────────────────────────


@router.get(
    "/vaults/{vault_id}/public",
    response_model=PublicVaultResponse,
    tags=["public-vault"],
)
async def get_public_vault(
    vault_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db_session)],
) -> PublicVaultResponse:
    # LIVE publications only — withdrawn / draft / scheduled are
    # invisible from this surface.
    pub_stmt = (
        select(Publication)
        .where(Publication.owner_id == vault_id)
        .where(Publication.deleted_at.is_(None))
        .where(Publication.state == PublicationState.LIVE)
        .order_by(Publication.published_at.desc().nulls_last())
    )
    pubs = list((await db.execute(pub_stmt)).scalars().all())

    tier_stmt = (
        select(SubscriptionTier)
        .where(SubscriptionTier.owner_id == vault_id)
        .where(SubscriptionTier.deleted_at.is_(None))
        .where(SubscriptionTier.enabled.is_(True))
        .order_by(SubscriptionTier.monthly_amount_cents.asc())
    )
    tiers = list((await db.execute(tier_stmt)).scalars().all())

    # Most-recent SENT newsletter issue.
    issue_stmt = (
        select(NewsletterIssue)
        .where(NewsletterIssue.owner_id == vault_id)
        .where(NewsletterIssue.deleted_at.is_(None))
        .where(NewsletterIssue.status == NewsletterIssueStatus.SENT)
        .order_by(NewsletterIssue.sent_at.desc())
        .limit(1)
    )
    last_issue = (await db.execute(issue_stmt)).scalars().first()

    if not pubs and not tiers and last_issue is None:
        # Empty vault — return 404 so private vaults don't enumerate.
        raise HTTPException(
            status.HTTP_404_NOT_FOUND, "Vault has no public content.",
        )

    newsletter = PublicVaultNewsletter(
        most_recent_subject=last_issue.subject if last_issue else None,
        most_recent_sent_at=last_issue.sent_at if last_issue else None,
    )

    return PublicVaultResponse(
        vault_id=str(vault_id),
        # User-profile fields are stubs until the substrate lands.
        display_name="Soror Ευ. Α.",
        pronouns=None,
        bio=None,
        license_label="AGPL-3.0",
        # The H07 surface contract: popular-sort defaults OFF.
        popular_sort_opt_in=False,
        publications=[_to_pub(p) for p in pubs],
        newsletter=newsletter,
        tiers=[_to_tier(t) for t in tiers],
    )
