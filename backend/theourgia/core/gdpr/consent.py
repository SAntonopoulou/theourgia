"""Consent management.

Per-user records of consent to specific processing purposes. Features
that engage in optional processing (federation, AI training, analytics
even when opt-in, etc.) consult :class:`ConsentResolver` before acting.

The default ``ConsentSet`` is **conservative**: no consent for any
optional purpose. The user must affirmatively grant consent for each.

Required processing (account operation, security, legal compliance)
doesn't ride this substrate — it happens regardless of consent state
because it's not optional.
"""

from __future__ import annotations

import enum
from collections.abc import Mapping
from dataclasses import dataclass, field
from typing import Protocol, runtime_checkable
from uuid import UUID

__all__ = [
    "ConsentPurpose",
    "ConsentResolver",
    "ConsentSet",
    "InMemoryConsentResolver",
]


class ConsentPurpose(str, enum.Enum):
    """Processing purposes a user can grant or refuse consent for."""

    FEDERATION_PUBLISH = "federation.publish"
    """Allow this user's published content to be replicated to
    federated peers. Without consent, content stays local."""

    AI_AGENT_INVOKE = "ai.agent_invoke"
    """Allow the daskalos (AI agent) to read this user's journal
    entries when invoked. Without consent, the agent declines."""

    ANALYTICS_AGGREGATE = "analytics.aggregate"
    """Allow this user's anonymized data to inform aggregate
    instance-level statistics. (Theourgia ships with zero telemetry by
    default — this consent only matters when an operator opts in to
    aggregate stats.)"""

    NEWSLETTER_SHARE_HUB = "newsletter.share_hub"
    """Allow the hub admin to include this user's published entries in
    a hub-wide newsletter."""

    EXTERNAL_SEARCH_INDEX = "search.external_index"
    """Allow this user's public content to be discoverable via
    external search engines (sitemap, robots.txt allowing). Off by
    default — practitioners often prefer obscurity."""


@dataclass(frozen=True, slots=True)
class ConsentSet:
    """A user's consent state across all purposes.

    Default: no consent for any optional purpose. Adding a new
    :class:`ConsentPurpose` doesn't break existing users — they
    implicitly haven't consented to the new purpose."""

    granted: frozenset[ConsentPurpose] = field(default_factory=frozenset)

    def is_granted(self, purpose: ConsentPurpose) -> bool:
        return purpose in self.granted

    def grant(self, purpose: ConsentPurpose) -> "ConsentSet":
        return ConsentSet(granted=self.granted | {purpose})

    def revoke(self, purpose: ConsentPurpose) -> "ConsentSet":
        return ConsentSet(granted=self.granted - {purpose})


@runtime_checkable
class ConsentResolver(Protocol):
    """Looks up a user's :class:`ConsentSet`. Production uses a
    DB-backed implementation; tests use :class:`InMemoryConsentResolver`."""

    async def get(self, user_id: UUID) -> ConsentSet:
        ...


class InMemoryConsentResolver:
    """Process-local resolver. Tests use this."""

    def __init__(
        self, consents: Mapping[UUID, ConsentSet] | None = None
    ) -> None:
        self._consents: dict[UUID, ConsentSet] = dict(consents or {})

    async def get(self, user_id: UUID) -> ConsentSet:
        return self._consents.get(user_id, ConsentSet())

    def set(self, user_id: UUID, consent: ConsentSet) -> None:
        self._consents[user_id] = consent

    def grant(self, user_id: UUID, purpose: ConsentPurpose) -> None:
        current = self._consents.get(user_id, ConsentSet())
        self._consents[user_id] = current.grant(purpose)

    def revoke(self, user_id: UUID, purpose: ConsentPurpose) -> None:
        current = self._consents.get(user_id, ConsentSet())
        self._consents[user_id] = current.revoke(purpose)
